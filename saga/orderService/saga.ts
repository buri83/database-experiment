import amqplib from "amqplib";
import { Queues } from "../queues";
import { Order, OrderStatus, updateOrderStatus } from "./index";
import { createMachine, interpret, Interpreter, StateMachine } from "xstate";

namespace State {
    export enum Forward {
        Init = "Init",
        UserVerifying = "UserVerifying",
        PointTaking = "PointTaking",
        CreditCardAuthorizing = "CreditCardAuthorizing",
        Completed = "Completed",
    }

    export enum Backward {
        PointRefunding = "PointRefunding",
        RolledBack = "RolledBack",
        RollBackFailed = "RollBackFailed",
    }
}

type State = State.Forward | State.Backward;

const orderStateMachine = createMachine<State>({
    id: "orderStateMachine",
    initial: State.Forward.Init,

    states: {
        // Forwards
        [State.Forward.Init]: {
            on: { success: State.Forward.UserVerifying, failed: State.Backward.RolledBack },
        },
        [State.Forward.UserVerifying]: {
            on: { success: State.Forward.PointTaking, failed: State.Backward.RolledBack },
        },
        [State.Forward.PointTaking]: {
            on: { success: State.Forward.CreditCardAuthorizing, failed: State.Backward.RolledBack },
        },
        [State.Forward.CreditCardAuthorizing]: {
            on: { success: State.Forward.Completed, failed: State.Backward.PointRefunding },
        },
        [State.Forward.Completed]: {
            type: "final",
        },

        // BackWards
        [State.Backward.PointRefunding]: {
            on: { success: State.Backward.RolledBack, failed: State.Backward.RollBackFailed },
        },
        [State.Backward.RolledBack]: {
            type: "final",
        },
        [State.Backward.RollBackFailed]: {
            type: "final",
        },
    },
});
interface OrderState {
    order: Order;
    state: State;
}
const db: { [K: string]: OrderState } = {};

async function saga(): Promise<void> {
    const conn = await amqplib.connect("amqp://mq");

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(Queues.OrderCreated);
    await ch1.assertQueue(Queues.SagaReply);

    // Listener
    ch1.consume(Queues.OrderCreated, (msg) => {
        if (!msg) {
            console.log("Consumer cancelled by server");
            return;
        }

        const order: Order = JSON.parse(msg.content.toString());
        updateOrderStatus(order.id, OrderStatus.Pending);
        db[order.id] = {
            order,
            state: orderStateMachine.initialState.value as State,
        };
        ch1.sendToQueue(Queues.SagaReply, Buffer.from(JSON.stringify({ orderId: order.id, success: true })));

        console.log(`OrderCreated: ${order.id}`);
        ch1.ack(msg);
    });

    ch1.consume(Queues.SagaReply, (msg) => {
        if (!msg) {
            console.log("Consumer cancelled by server");
            return;
        }
        const reply = JSON.parse(msg.content.toString());
        console.log(`Reply received: ${msg.content.toString()}`);

        const orderId = reply.orderId;

        const event = reply.success ? "success" : "failed";
        const status = orderStateMachine.transition(db[orderId].state, event).value as State;

        console.log(`orderId=${orderId}, ${db[orderId].state} --> ${status}\n`);

        db[orderId].state = status;

        const order = db[orderId].order;
        switch (status) {
            // Forwards
            case State.Forward.UserVerifying:
                ch1.sendToQueue(
                    Queues.VerifyUser,
                    Buffer.from(JSON.stringify({ orderId: orderId, userId: order.userId }))
                );
                break;

            case State.Forward.PointTaking:
                ch1.sendToQueue(
                    Queues.TakePoint,
                    Buffer.from(JSON.stringify({ orderId: orderId, userId: order.userId, pointUse: order.pointUse }))
                );
                break;

            case State.Forward.CreditCardAuthorizing:
                ch1.sendToQueue(
                    Queues.AuthorizeCreditCard,
                    Buffer.from(JSON.stringify({ orderId: orderId, cardNumber: order.cardNumber }))
                );
                break;

            case State.Forward.Completed:
                updateOrderStatus(order.id, OrderStatus.Approved);
                break;

            // Backwards
            case State.Backward.PointRefunding:
                ch1.sendToQueue(
                    Queues.RefundPoint,
                    Buffer.from(
                        JSON.stringify({ orderId: orderId, userId: order.userId, pointRefunded: order.pointUse })
                    )
                );
                break;

            case State.Backward.RollBackFailed:
                updateOrderStatus(order.id, OrderStatus.Broken);
                break;

            case State.Backward.RolledBack:
                updateOrderStatus(order.id, OrderStatus.Rejected);
                break;
        }

        ch1.ack(msg);
    });

    console.log("sage listen");
}

saga();

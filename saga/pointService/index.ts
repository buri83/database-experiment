import * as amqplib from "amqplib";
import { Queues } from "../queues";

interface Point {
    userId: number;
    amount: number;
}

const db: Point[] = [
    {
        userId: 1,
        amount: 10000,
    },
    {
        userId: 2,
        amount: 0,
    },
    {
        userId: 4,
        amount: 600,
    },
];

async function main(): Promise<void> {
    const conn = await amqplib.connect("amqp://mq");

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(Queues.TakePoint);
    await ch1.assertQueue(Queues.RefundPoint);

    // Listener
    ch1.consume(Queues.TakePoint, (msg) => {
        if (!msg) {
            console.log("Consumer cancelled by server");
            return;
        }
        console.log(`Received TakePoint: ${msg.content.toString()}`);
        const data = JSON.parse(msg.content.toString());
        const user = db.find((d) => d.userId === Number(data.userId));

        const success = Boolean(user && user.amount >= data.pointUse);
        if (success) {
            db[data.userId].amount -= data.pointUse;
        }

        ch1.sendToQueue(Queues.SagaReply, Buffer.from(JSON.stringify({ orderId: data.orderId, success: success })));
        ch1.ack(msg);

        console.log(db);
    });

    ch1.consume(Queues.RefundPoint, (msg) => {
        if (!msg) {
            console.log("Consumer cancelled by server");
            return;
        }
        console.log(`Received RefundPoint: ${msg.content.toString()}`);
        const data = JSON.parse(msg.content.toString());
        const user = db.find((d) => d.userId === Number(data.userId));

        const success = Boolean(user && user.amount);
        if (success) {
            db[data.userId].amount += data.pointRefunded;
        }

        ch1.sendToQueue(Queues.SagaReply, Buffer.from(JSON.stringify({ orderId: data.orderId, success: success })));
        ch1.ack(msg);

        console.log(db);
    });
}

main();
console.log("PointService started");

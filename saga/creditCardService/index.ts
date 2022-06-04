import * as amqplib from "amqplib";
import { Queues } from "../queues";

enum CardStatus {
    Enabled = "Enabled",
    Disabled = "Disabled",
    Expired = "Expired",
}

interface Card {
    cardNumber: string;
    status: CardStatus;
}

const db: Card[] = [
    {
        cardNumber: "111-111-111",
        status: CardStatus.Enabled,
    },
    {
        cardNumber: "222-222-222",
        status: CardStatus.Enabled,
    },
    {
        cardNumber: "333-333-333",
        status: CardStatus.Disabled,
    },
    {
        cardNumber: "444-444-444",
        status: CardStatus.Expired,
    },
];

async function main(): Promise<void> {
    const queue = Queues.AuthorizeCreditCard;
    const conn = await amqplib.connect("amqp://mq");

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(queue);

    // Listener
    ch1.consume(queue, (msg) => {
        if (!msg) {
            console.log("Consumer cancelled by server");
            return;
        }
        console.log(`Received: ${msg.content.toString()}`);
        const data = JSON.parse(msg.content.toString());
        const card = db.find((d) => d.cardNumber === data.cardNumber);
        const isValid = !!card && card.status === CardStatus.Enabled;
        ch1.sendToQueue(Queues.SagaReply, Buffer.from(JSON.stringify({ orderId: data.orderId, success: isValid })));
        ch1.ack(msg);

        console.log(db);
    });
}

main();
console.log("UserService started");

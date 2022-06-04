import * as amqplib from "amqplib";

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
    const queue = "tasks";
    const conn = await amqplib.connect("amqp://localhost");

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(queue);

    // Listener
    ch1.consume(queue, (msg) => {
        if (msg !== null) {
            console.log("Recieved:", msg.content.toString());
            ch1.ack(msg);
        } else {
            console.log("Consumer cancelled by server");
        }
    });

    // // Sender
    // const ch2 = await conn.createChannel();

    // setInterval(() => {
    //     ch2.sendToQueue(queue, Buffer.from("something to do"));
    // }, 1000);
}

main();
console.log("UserService started");

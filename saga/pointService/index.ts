import * as amqplib from "amqplib";

interface Point {
    userId: number;
    amount: number;
}

const db: Point[] = [
    {
        userId: 1,
        amount: 0,
    },
    {
        userId: 2,
        amount: 300,
    },
    {
        userId: 4,
        amount: 600,
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
console.log("PointService started");

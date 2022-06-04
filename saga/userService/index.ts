import * as amqplib from "amqplib";

enum UserStatus {
    Verified = "Verified",
    Rejected = "Rejected",
}

interface User {
    id: number;
    name: string;
    status: UserStatus;
}

const db: User[] = [
    {
        id: 1,
        name: "tawashi",
        status: UserStatus.Verified,
    },
    {
        id: 2,
        name: "amarimono",
        status: UserStatus.Verified,
    },
    {
        id: 4,
        name: "elden",
        status: UserStatus.Rejected,
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

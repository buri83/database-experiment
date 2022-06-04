import * as amqplib from "amqplib";
import { Queues } from "../queues";

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
    const conn = await amqplib.connect("amqp://localhost");

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(Queues.VerifyUser);

    // Listener
    ch1.consume(Queues.VerifyUser, (msg) => {
        if (!msg) {
            console.log("Consumer cancelled by server");
            return;
        }
        console.log(`Received: ${msg.content.toString()}`);
        const data = JSON.parse(msg.content.toString());
        const user = db.find((d) => d.id === Number(data.userId));
        const isValid = !!user && user.status === UserStatus.Verified;
        ch1.sendToQueue(Queues.SagaReply, Buffer.from(JSON.stringify({ orderId: data.orderId, success: isValid })));
        ch1.ack(msg);
    });

    // // Sender
    // const ch2 = await conn.createChannel();

    // setInterval(() => {
    //     ch2.sendToQueue(queue, Buffer.from("something to do"));
    // }, 1000);
}

main();
console.log("UserService started");

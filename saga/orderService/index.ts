import amqplib from "amqplib";
import express from "express";
import parser from "body-parser";
import "./saga";
import { Queues } from "../queues";

export enum OrderStatus {
    Created = "Created",
    Pending = "Pending",
    Approved = "Approved",
    Rejected = "Rejected",
    Broken = "Broken",
}

export interface Order {
    id: number;
    userId: number;
    cardNumber: string;
    amount: number;
    pointUse: number;
    status: OrderStatus;
}

const db: { [K: string]: Order } = {};

export function updateOrderStatus(orderId: number, status: OrderStatus): void {
    db[orderId].status = status;
}

const app = express();
app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.post("/orders/", async (req, res, next) => {
    const nextId = Math.max(0, ...Object.values(db).map((d) => d.id)) + 1;
    const order: Order = {
        id: nextId,
        userId: Number(req.body.userId),
        cardNumber: req.body.cardNumber,
        pointUse: Number(req.body.pointUse),
        amount: Number(req.body.amount),
        status: OrderStatus.Created,
    };
    db[order.id] = order;

    // Sender
    const conn = await amqplib.connect("amqp://localhost");
    const channel = await conn.createChannel();

    channel.sendToQueue(Queues.OrderCreated, Buffer.from(JSON.stringify(order)));
    res.redirect("/orders/");
});
app.get("/orders/", (req, res, next) => {
    res.send(`
        <h1>create a order</h1>
        <form action="" method="POST">
            userId: <input type="text" name="userId"></br>
            amount: <input type="number" name="amount"></br>
            pointUse: <input type="number" name="pointUse"></br>
            cardNumber: <input type="text" name="cardNumber"></br>

            <input type="submit" value="send">
        </form>

        <pre>${JSON.stringify(db, null, 2)}</pre>
    `);
});

app.listen(3000);
console.log("PointService started");

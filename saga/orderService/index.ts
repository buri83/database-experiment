import amqplib from "amqplib";
import express from "express";
import parser from "body-parser";
import { queue } from "./saga";

enum OrderStatus {
    Pending = "Pending",
    Approved = "Approved",
    Rejected = "Rejected",
}

interface Order {
    id: number;
    userId: number;
    cardNumber: string;
    amount: number;
    status: OrderStatus;
}

const db: Order[] = [];

const app = express();
app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.post("/orders/", async (req, res, next) => {
    const nextId = Math.max(0, ...db.map((d) => d.id)) + 1;
    const order: Order = {
        id: nextId,
        userId: req.body.userId,
        cardNumber: req.body.cardNumber,
        amount: req.body.amount,
        status: OrderStatus.Pending,
    };
    db.push(order);

    // Sender
    const conn = await amqplib.connect("amqp://localhost");
    const channel = await conn.createChannel();

    channel.sendToQueue(queue, Buffer.from(JSON.stringify({ orderId: order.id })));
    res.redirect("/orders/");
});
app.get("/orders/", (req, res, next) => {
    res.send(`
        <h1>create a order</h1>
        <form action="" method="POST">
            userId: <input type="text" name="userId"></br>
            amount: <input type="number" name="amount"></br>
            cardNumber: <input type="text" name="cardNumber"></br>

            <input type="submit" value="send">
        </form>

        <pre>${JSON.stringify(db, null, 2)}</pre>
    `);
});

app.listen(3000);
console.log("PointService started");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

const messages = [];

app.get("/", (req, res) => {
    const html = `
        <h1>Send Message</h1>
        <form action="/messages/" method=POST>
            <input type=text name=message>
            <input type=submit>
        </form>

        <hr>
        <pre>${JSON.stringify(messages.slice().reverse(), null, 1)}</pre>
    `;
    res.send(html);
});

app.post("/messages/", (req, res) => {
    messages.push({
        timestamp: new Date().toISOString(),
        message: req.body.message,
        clientIp: req.ip,
    });
    res.redirect("/");
});

app.listen(3000);

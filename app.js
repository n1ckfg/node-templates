"use strict";

// ~ ~ ~   1. SETUP   ~ ~ ~
// This boilerplate will not typically change
const express = require("express");
const app = express();

const fs = require("fs");
const dotenv = require("dotenv").config();

const path = require("path")
const url = require("url");
const assert = require("assert");

const debug = process.env.DEBUG || "true";

let options;

if (!debug) {
    options = {
        key: fs.readFileSync(process.env.KEY_PATH),
        cert: fs.readFileSync(process.env.CERT_PATH)
    };
}

const https = require("https").createServer(options, app);

const port_http = process.env.PORT_HTTP || 8080;
const port_https = process.env.PORT_HTTPS || 443;
const port_ws = process.env.PORT_WS || 4321;

// This is where the client site will be served from
const PUBLIC_PATH = path.join(__dirname, "public");

// This is how frequently the server will check for messages, in ms.
// default -- pingInterval: 25000, pingTimeout: 60000
// low latency -- pingInterval: 5000, pingTimeout: 10000
const ping_interval = 5000;
const ping_timeout = 10000;

let io, http;

if (!debug) {
    http = require("http");

    http.createServer(function(req, res) {
        res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
        res.end();
    }).listen(port_http);

    io = require("socket.io")(https, { 
        pingInterval: ping_interval,
        pingTimeout: ping_timeout
    });
} else {
    http = require("http").Server(app);

    io = require("socket.io")(http, { 
        pingInterval: ping_interval,
        pingTimeout: ping_timeout
    });
}

// Serve static files from PUBLIC_PATH:
app.use(express.static(PUBLIC_PATH)); 

// Default to index.html if no file given:
app.get("/", function(req, res) {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"))
});

// Start the server:
if (!debug) {
    https.listen(port_https, function() {
        console.log("\nNode.js listening on https port " + port_https);
    });
} else {
    http.listen(port_http, function() {
        console.log("\nNode.js listening on http port " + port_http);
    });
}

// Optional: This is a webhook
// It will update the deployed server automatically when a new commit is made to its git repo.
const cmd = require("node-cmd");
const crypto = require("crypto"); 
const bodyParser = require("body-parser");

app.use(bodyParser.json());

const onWebhook = (req, res) => {
    let hmac = crypto.createHmac("sha1", process.env.SECRET);
    let sig = `sha1=${hmac.update(JSON.stringify(req.body)).digest("hex")}`;

    if (req.headers["x-github-event"] === "push" && sig === req.headers["x-hub-signature"]) {
        cmd.run("chmod +x ./redeploy.sh"); 
        cmd.run("./redeploy.sh");
        cmd.run("refresh");
    }

    return res.sendStatus(200);
}

app.post("/redeploy", onWebhook);

app.get("/", function(req, res) {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ 

// ~ ~ ~   2. OPERATIONS   ~ ~ ~
// Here is where you'll typically make customizations.

io.on("connection", function(socket) {
    console.log("A socket.io user connected.");

    socket.on("disconnect", function(event) {
        console.log("A socket.io user disconnected.");
    });

    socket.on("ClientMessageExample", function(data) {
        console.log("Received client message: " + data);
    });
});

// This will repeat at the given interval in ms.
const loopInterval = 5000;

setInterval(function() {
    io.emit("ServerMessageExample", "Hello from server.");
}, loopInterval);

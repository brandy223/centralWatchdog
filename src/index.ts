
const dotenv = require('dotenv');
dotenv.config();

const Network = require('./utils/Network');
const Database = require('./utils/Database');
const theme = require('./utils/ColorScheme').theme;

const express = require('express');
const app = express();
const http = require('http')
const { Server } = require("socket.io");

app.use(express.json());

const corsOptions = {
    // origin: '192.168.10.58',
    origin: '*',
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200,
    credentials: true
}

async function main(): Promise<void> {
    await Database.centralServerDatabaseInit();

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: corsOptions,
        allowEIO3: true, // false by default
    });

    io.on("error", () => {
        console.log(theme.error("Error"));
    });

    io.on('connection', (socket: any) => {
        console.log(theme.info("New connection from " + socket.request.connection.remoteAddress.substring(7)));

        socket.on("message", function (message: object) {
            console.log(message);
            socket.broadcast.emit("message", message);
        });

        socket.on("disconnect", function () {
            console.log(theme.warning("Client disconnected"));
        });
    });

    server.listen(process.env.SERVER_PORT, () => {
        console.log(`Server listening on port ${process.env.SERVER_PORT}`);
    });
}

main();
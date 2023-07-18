
const dotenv = require('dotenv');
dotenv.config();

const Database = require('./utils/Database');
const Message = require('./utils/Message');
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

    const nodeServersMainSockets = new Map();

    io.on("error", () => {
        console.log(theme.error("Error"));
    });

    io.on('connection', (socket: any) => {
        console.log(theme.info("New connection " + socket.id + " from " + socket.request.connection.remoteAddress.substring(7)));

        socket.on("message", async (message: object) => {
            console.log(message);
            socket.to("main").emit("room_broadcast", message);
            console.log(theme.info("Message's broadcasted"));

            // Message Parsing
            await Message.parseMessage(message);
        });

        socket.on("disconnect", () => {
            if (nodeServersMainSockets.has(socket.id)) {
                console.log(theme.warning("Main Client " + socket.id + " disconnected : " + nodeServersMainSockets.get(socket.id)));
                nodeServersMainSockets.delete(socket.id);
            }
            else console.log(theme.warning("Client " + socket.id + " disconnected"));
        });

        socket.on("main_connection", async (ip: string) => {
           console.log(theme.warningBright("New Main Connection from " + ip));
           socket.emit("main_connection_ack", "OK");
           socket.join("main");
           socket.to("main").emit("room_broadcast", "New server connected: " + ip);
           nodeServersMainSockets.set(socket.id, ip);
        });
    });

    server.listen(process.env.SERVER_PORT, () => {
        console.log(`Server listening on port ${process.env.SERVER_PORT}`);
    });
}

main();
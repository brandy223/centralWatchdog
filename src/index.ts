
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
    await centralServerDatabaseInit();

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

async function centralServerDatabaseInit(): Promise<void> {
    let serverPriority = 1;

    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined) throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY IF ANOTHER CENTRAL SERVER EXISTS IN DATABASE
    if (await Database.isThereAnotherCentralServer(ip)) {
        serverPriority = 0;
    }

    // VERIFY SERVER EXISTS IN DATABASE
    if (!await Database.isServerInDatabase(ip)) {
        await Database.addServerToDatabase(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Added node server to database`);
        return;
    }

    // IF SERVER ALREADY IN DATABASE
    if (!await Database.isServerCentral(ip) || !await Database.isPortSet(ip) || !await Database.isServerPrioritySet(ip)) {
        await Database.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Updated server information`);
        return;
    }

    // IF SERVERS INFORMATION ARE CORRECT
    if (await Database.isPortSet(ip)) {
        const server = await Database.getServerByIP(ip);
        if (server.port !== Number(process.env.SERVER_PORT)) {
            await Database.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server port to ${process.env.SERVER_PORT}`);
        }
    }
    if (await Database.isServerPrioritySet(ip)) {
        const server = await Database.getServerByIP(ip);
        if (server.priority !== serverPriority) {
            await Database.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server priority to ${serverPriority}`);
        }
    }
}

const dotenv = require('dotenv');
dotenv.config();

const Network = require('./utils/Network');
const Database = require('./utils/Database');

const express = require('express');
const app = express();
const http = require('http')
const { Server } = require("socket.io");

const corsOptions = {
    // origin: '192.168.10.58',
    origin: '*',
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200,
    credentials: true
}

// app.use(express.json());
// app.use(bodyParser.urlencoded({extended: true}));

async function main(): Promise<void> {
    await centralServerDatabaseInit();

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: corsOptions,
        allowEIO3: true, // false by default
    });

    console.log(io);

    io.on("error", function () {
        console.log("error");
    });

    // app.post('/', async (req: any, res: any) => {
    //     console.log(req.body);
    //     res.body = { status: "OK" };
    //     res.send(res.body);
    // });

    io.on('connection', (socket: any) => {
        console.log("New connection");
        // socket.on("open_session", function (session: any) {
        //     console.log(session);
        //     socket.session = session;
        //     console.log("socket.session à la connexion: ");
        //     console.log(socket.session);
        // });
        //
        // socket.on("disconnect", function () {
        //     console.log("socket.session à la déconnexion: ");
        //     console.log(socket.session);
        // });
        //
        // socket.on("message", function (message: object) {
        //     console.log(message);
        //     socket.broadcast.emit("message", message);
        // });
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
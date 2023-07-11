
const dotenv = require('dotenv');
dotenv.config();

const Network = require('./utils/Network');
const Database = require('./utils/Database');

const express = require('express');
const app = express();
const bodyParser = express.json();
const http = require('http')

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200,
    credentials: true
}

app.use(bodyParser);
// app.use(bodyParser.urlencoded({extended: true}));

async function main(): Promise<void> {
    await centralServerDatabaseInit();
    const io = await centralWebServerInit();

    // app.post('/', async (req: any, res: any) => {
    //     console.log(req.body);
    //     res.body = { status: "OK" };
    //     res.send(res.body);
    // });

    io.sockets.on('connection', (socket: any) => {
        socket.on("open_session", function (session: any) {
            console.log(session);
            socket.session = session;
            console.log("socket.session à la connexion: ");
            console.log(socket.session);
        });

        socket.on("disconnect", function () {
            console.log("socket.session à la déconnexion: ");
            console.log(socket.session);
        });

        socket.on("message", function (message: object) {
            console.log(message);
            socket.broadcast.emit("message", message);
        });
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

    // VERIFY SERVER EXISTS IN DATABASE
    if (await Database.isThereAnotherCentralServer(ip)) serverPriority = 0;

    if (!await Database.isServerInDatabase(ip)) {
        await Database.addServerToDatabase(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Added node server to database`);
    } else {
        if (!await Database.isServerCentral(ip) || !await Database.isPortSet(ip) || !await Database.isServerPrioritySet(ip)) {
            await Database.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server information`);
        }
        else if (await Database.isPortSet(ip)) {
            const server = await Database.getServerByIP(ip);
            if (server.port !== Number(process.env.SERVER_PORT)) {
                await Database.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
                console.log(`Updated server port to ${process.env.SERVER_PORT}`);
            }
        }
    }
}

async function centralWebServerInit(): Promise<any> {
    // WEB SERVER SETUP
    const server = http.createServer(app);
    server.listen(process.env.SERVER_PORT, () => {
        console.log(`Server listening on port ${process.env.SERVER_PORT}`);
    });
    return require('socket.io')(server, {
        cors: corsOptions,
        allowEIO3: true
    });
}
import {sendEmail} from "./Actions/SendEmail";

const dotenv = require('dotenv');
dotenv.config();

const Database = require('./utils/Database');
const Message = require('./utils/Message');
const Mail = require("./Actions/SendEmail");
const Array = require('./utils/Utilities/Array');
const theme = require('./utils/ColorScheme').theme;

const express = require('express');
const app = express();
const http = require('http')
const { Server } = require("socket.io");
const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: 30,
    checkperiod: 60,
    deleteOnExpire: true,
});

app.use(express.json());

async function main(): Promise<void> {
    await Database.centralServerDatabaseInit();

    // await Mail.sendEmail("1150@bonifay.fr", "Ceci est un test.");

    let jobsIds = (await Database.getAllJobs()).map((job: any) => job.id);
    cache.set("jobsIds", jobsIds);
    let serversIds = (await Database.getServersIdsOfJobs(jobsIds)).map((server: any) => server.serverId);
    let serversIpAddr = (await Database.getServersByIds(serversIds)).map((server: any) => server.ipAddr);
    const corsOptions = {
        // * WHITELIST
        origin: serversIpAddr,
        // origin: '192.168.10.58',
        // origin: '*',
        methods: ['GET', 'POST'],
        optionsSuccessStatus: 200,
        credentials: true
    }

    const jobsInterval = setInterval(async () => {
        await updateJobsListInCache();
    }, Number(process.env.GLOBAL_REFRESH_PERIOD));

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
            // await Message.parseMessage(message);
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

    cache.on("set", async (key: string, value: any[]) => {
       switch(key) {
           case "jobsIds":
               jobsIds = value;
               serversIds = (await Database.getServersIdsOfJobs(jobsIds)).map((server: any) => server.serverId);
               serversIpAddr = (await Database.getServersByIds(serversIds)).map((server: any) => server.ipAddr);
               break;
       }
    });
}

main();

async function updateJobsListInCache() {
    const jobsIds = (await Database.getAllJobs()).map((job: any) => job.id);
    if (cache.get("jobsIds") !== undefined && (await Array.compareArrays(cache.get("jobsIds"), jobsIds))) return;
    cache.set("jobsIds", jobsIds);
    console.log(theme.debug(`Jobs IDs: ${JSON.stringify(jobsIds)}`));
}
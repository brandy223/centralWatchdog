
const events = require('events');
export const eventEmitter = new events.EventEmitter();
const dotenv = require('dotenv');
dotenv.config();

const Database = require('./utils/Database');
const Network = require('./utils/Network');
const Services = require('./utils/Services');
const Mail = require("./actions/SendEmail");
const ArrayUtils = require('./utils/utilities/Array');
const theme = require('./utils/ColorScheme').theme;

const express = require('express');
const app = express();
const http = require('http')
const { Server } = require("socket.io");
const NodeCache = require("node-cache");
const cache = new NodeCache({
    stdTTL: 30,
    checkperiod: 60,
    deleteOnExpire: true,
});

app.use(express.json());

async function main(): Promise<void> {
    await Database.centralServerDatabaseInit();

    // await Mail.main("brandy232@proton.me", 0,
    //     {
    //         server: {
    //             id: 1,
    //             ipAddr: "192.168.10.58"
    //         }, status: "KO",
    //         statusInfo: ["false", "0 out of 10"],
    //     }
    // );

    let jobsIds = (await Database.getAllJobs()).map((job: any) => job.id);
    cache.set("jobsIds", jobsIds);
    let serversIds = (await Database.getServersIdsOfJobs(jobsIds)).map((server: any) => server.serverId);
    let serversIpAddr = (await Database.getServersByIds(serversIds)).map((server: any) => server.ipAddr);

    const jobsInterval = setInterval(async () => {
        await updateJobsListInCache();
    }, Number(process.env.GLOBAL_REFRESH_PERIOD));

    const corsOptions = {
        // * WHITELIST
        origin: serversIpAddr,
        methods: ['GET', 'POST'],
        optionsSuccessStatus: 200,
        credentials: true
    }

    const server = http.createServer(app);
    const io = new Server(server, {
        cors: corsOptions,
        allowEIO3: true, // false by default
    });

    const nodeServersMainSockets: Map<string, string> = new Map();
    const serverConnectionsInfo: Map<string, number[]> = new Map();
    const checkOnServer = Services.serverConnectionsWatchdog(serverConnectionsInfo, serversIpAddr);

    io.on("error", () => {
        console.log(theme.error("Error"));
    });

    io.on('connection', (socket: any) => {
        const connectServerIp = socket.request.connection.remoteAddress.substring(7);
        serverConnectionsInfo.set(connectServerIp, [((Array.from(serverConnectionsInfo.get(connectServerIp)?.values() ?? [0])[0]) ?? 0) + 1, Date.now()]);
        console.log(theme.info("New connection " + socket.id + " from " + connectServerIp));

        socket.on("message", async (message: object) => {
            console.log(message);
            socket.to("main").emit("room_broadcast", message);
            console.log(theme.info("Message's broadcast"));

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

        eventEmitter.on("server_not_connected_state", async (message: any) => {
            socket.to("main").emit("room_broadcast", message);
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
    if (cache.get("jobsIds") !== undefined && (await ArrayUtils.compareArrays(cache.get("jobsIds"), jobsIds))) return;
    cache.set("jobsIds", jobsIds);
    console.log(theme.debug(`New jobs IDs: ${JSON.stringify(jobsIds)}`));
}
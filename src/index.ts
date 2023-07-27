
const events = require('events');
export const eventEmitter = new events.EventEmitter();
const dotenv = require('dotenv');
dotenv.config();

// DATABASE
const s = require('./utils/database/Servers');
const j = require('./utils/database/Jobs');
const misc = require('./utils/database/Misc');

const ServicesUtils = require('./utils/Services');
const ArrayUtils = require('./utils/utilities/Array');
const theme = require('./utils/ColorScheme').theme;
const removeApiCashMessage = require('./actions/SendGlobalMessage').deleteMessage;
const { messageHandler } = require('./handlers/MessageHandler');

import { Jobs, Servers, ServersOfJobs } from "@prisma/client";
import {Socket} from "socket.io";
import {PingTemplate, ServiceObjectTemplate, ServiceTestTemplate} from "./templates/DataTemplates";

const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: 30,
    checkperiod: 60,
    deleteOnExpire: true
});

app.use(express.json());

async function main(): Promise<void> {
    await misc.centralServerDatabaseInit();

    let jobsIds: number[] = (await j.getAllJobs()).map((job: Jobs) => job.id);
    let serversIds: number[] = (await s.getServersIdsOfJobs(jobsIds)).map((server: ServersOfJobs) => server.serverId);
    let serversIpAddr: string[] = (await s.getServersByIds(serversIds)).map((server: Servers) => server.ipAddr);
    console.log(theme.debug(`New jobs IDs: ${JSON.stringify(jobsIds)}`));
    cache.set("jobsIds", jobsIds, 60*60);

    const jobsInterval = setInterval((): void => {
        updateJobsListInCache();
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
    let checkOnServer = ServicesUtils.serverConnectionsWatchdog(serverConnectionsInfo, serversIpAddr);
    const socketListenersMap: Map<Socket, (data: any) => void> = new Map();

    io.on("error", () => {
        console.log(theme.error("Error"));
    });

    io.on('connection', (socket: Socket): void => {
        const serverNotConnectedListener = (message: any) => {
            socket.to("main").emit("room_broadcast", message);
        }
        socketListenersMap.set(socket, serverNotConnectedListener);

        const connectedServerIp: string = socket.handshake.address.substring(7);
        serverConnectionsInfo.set(connectedServerIp, [((Array.from(serverConnectionsInfo.get(connectedServerIp)?.values() ?? [0])[0]) ?? 0) + 1, Date.now()]);
        console.log(theme.info("New connection " + socket.id + " from " + connectedServerIp));

        socket.on("message", async (message: any): Promise<void> => {
            console.log(message);
            socket.to("main").emit("room_broadcast", message);
            console.log(theme.info("Message's broadcast"));

            // Message Parsing
            switch (message.messageType) {
                case 1:
                    const refactoredPingMessage: PingTemplate = new PingTemplate(message.server.id, message.server.ip, message.status, message.pingInfo);
                    await messageHandler(refactoredPingMessage);
                    break;
                case 2:
                    const refactoredServiceMessage: ServiceTestTemplate = new ServiceTestTemplate(message.service.id, message.service.name, message.server.id, message.server.ip, message.job.id, message.status);
                    await messageHandler(refactoredServiceMessage);
                    break;
                case 3:
                    // TODO: TO BE IMPLEMENTED
                    break;
                case 4:
                    const refactoredObjectMessage: ServiceObjectTemplate = new ServiceObjectTemplate(message.object.id, message.object.name, message.object.value, message.object.status);
                    await messageHandler(refactoredObjectMessage);
                    break;
            }
            // await messageHandler(message);
        });

        socket.on("disconnect", (): void => {
            if (nodeServersMainSockets.has(socket.id)) {
                console.log(theme.warning("Main Client " + socket.id + " disconnected : " + nodeServersMainSockets.get(socket.id)));
                nodeServersMainSockets.delete(socket.id);
            }
            else console.log(theme.warning("Client " + socket.id + " disconnected"));

            eventEmitter.off("server_not_connected_state", socketListenersMap.get(socket));
            socketListenersMap.delete(socket);
        });

        socket.on("main_connection", async (ip: string): Promise<void> => {
           console.log(theme.warningBright("New Main Connection from " + ip));
           socket.emit("main_connection_ack", "OK");
           socket.join("main");
           socket.to("main").emit("room_broadcast", "New server connected: " + ip);
           nodeServersMainSockets.set(socket.id, ip);
        });

        socket.on("test_connection", async (message: string): Promise<void> => {
            socket.emit("test_connection_ack", "OK");
            console.log(theme.debug("Test connection from " + connectedServerIp + " : " + message));
        });

        eventEmitter.on("server_not_connected_state", serverNotConnectedListener);
    });

    server.listen(process.env.SERVER_PORT, (): void => {
        console.log(`Server listening on port ${process.env.SERVER_PORT}`);
    });

    cache.on("set", async (key: string, value: (number | string)[]): Promise<void> => {
       switch(key) {        // * In case other keys are added
           case "jobsIds":
               clearInterval(checkOnServer);
               jobsIds = value as number[];
               serversIds = (await s.getServersIdsOfJobs(jobsIds)).map((server: ServersOfJobs) => server.serverId);
               serversIpAddr = (await s.getServersByIds(serversIds)).map((server: Servers) => server.ipAddr);
               checkOnServer = ServicesUtils.serverConnectionsWatchdog(serverConnectionsInfo, serversIpAddr);
               break;
       }
    });

    cache.on("expired", async (key: string, value: (number | string)[]): Promise<void> => {
        switch (key) {
            case "jobsIds":
                jobsIds = (await j.getAllJobs()).map((job: Jobs) => job.id);
                cache.set("jobsIds", jobsIds, 60*60);
                break;
        }
        if (key.includes("apiCash_message")) await removeApiCashMessage(value[0] as number);
    });
}

main();

/**
 * Update the jobs list in cache
 * @returns {Promise<void>}
 */
async function updateJobsListInCache(): Promise<void> {
    const jobsIds: number[] = (await j.getAllJobs()).map((job: Jobs) => job.id);
    if (cache.get("jobsIds") !== undefined && (await ArrayUtils.compareArrays(cache.get("jobsIds"), jobsIds))) return;
    cache.set("jobsIds", jobsIds);
    console.log(theme.debug(`New jobs IDs: ${JSON.stringify(jobsIds)}`));
}
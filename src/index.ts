import {pfSenseServicesWatchdog} from "./utils/Services";

const dotenv = require('dotenv');
dotenv.config();
export const config = require("../config.json").config;

const events = require('events');
export const eventEmitter = new events.EventEmitter();

// DATABASE
const s = require('./utils/database/Servers');
const se = require('./utils/database/Services');
const sd = require('./utils/database/ServiceData');
const j = require('./utils/database/Jobs');
const pfs = require('./utils/database/PfSenses');
const pfsv = require('./utils/database/PfSenseServices');
const svd = require('./utils/database/ServiceData');
const misc = require('./utils/database/Misc');

// UTILS
const ServicesUtils = require('./utils/Services');
const Timer = require('./utils/Timer');
const ArrayUtils = require('./utils/utilities/Array');
const theme = require('./utils/ColorScheme').theme;
const removeApiCashMessage = require('./actions/SendGlobalMessage').deleteMessage;
const { messageHandler } = require('./handlers/MessageHandler');

// TYPES
import {
    Jobs,
    PfSenseAndServices,
    PfSenses,
    PfSenseServices,
    Servers,
    ServersOfJobs,
    Services,
    ServicesData
} from "@prisma/client";
import {Socket} from "socket.io";
import {
    PfSenseServiceTemplate,
    PingTemplate,
    ServiceDataTemplate,
    ServiceTestTemplate
} from "./templates/DataTemplates";

// SERVER
const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const NodeCache = require("node-cache");
export const cache = new NodeCache({
    stdTTL: config.cache.default_ttl,
    checkperiod: config.cache.check_period,
    deleteOnExpire: config.cache.deleteOnExpire
});

app.use(express.json());

async function main(): Promise<void> {
    let jobsIds: number[] = [];
    let serversIds: number[] = [];
    let serversIpAddr: string[] = [];

    let pfSensesIds: number[] = [];
    let dataServicesIds: number[] = [];
    let servicesDataWrapper: any[] = [];
    let servicesDataTasks: any[] = [];

    await misc.centralServerDatabaseInit();
    await updateJobsListInCache();
    jobsIds = cache.get("jobsIds") ?? [];

    const corsOptions = {
        // * WHITELIST - Not used because of browser connection
        origin: "*",
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
    const socketListenersMap: Map<Socket, (data: any) => void> = new Map();

    // SERVERS
    jobsIds = cache.get("jobsIds") ?? [];
    serversIds = (await s.getServersIdsOfJobs(jobsIds)).map((server: ServersOfJobs) => server.serverId);
    serversIpAddr = (await s.getServersByIds(serversIds)).map((server: Servers) => server.ipAddr);
    let checkOnServers = ServicesUtils.serverConnectionsWatchdog(serverConnectionsInfo, serversIpAddr);

    // PF SENSES
    await updatePfSensesListInCache();
    pfSensesIds = cache.get("pfSensesIds") ?? [];
    let checkOnPfSenses = ServicesUtils.pfSenseServicesWatchdog(pfSensesIds);

    // SERVICES DATA
    await updateDataServicesInCache();
    dataServicesIds = cache.get("dataServicesIds") ?? [];
    servicesDataWrapper = await ServicesUtils.getServiceDataValueFromServiceFunctionsInArray(await se.getServicesByIds(dataServicesIds));
    if (servicesDataWrapper[0] !== -1) servicesDataTasks = await Timer.executeTimedTask(servicesDataWrapper, [config.servicesData.check_period]);

    io.on("error", () => {
        console.log(theme.error("Error with socket"));
    });

    let nmbOfConnections: number = 0;

    io.on('connection', (socket: Socket): void => {
        console.log(nodeServersMainSockets);
        console.log(socketListenersMap.size);
        nmbOfConnections++;
        console.log("\n\nNumber of connections: " + nmbOfConnections);



        const serverConnectionListener = (message: any) => {
            socket.to("main").emit("room_broadcast", message);
        }
        socketListenersMap.set(socket, serverConnectionListener);

        const serviceDataValueListener = (message: any) => {
            socket.to("main").emit("room_broadcast", message);
        }
        socketListenersMap.set(socket, serviceDataValueListener);

        const pfSenseServiceListener = (message: any) => {
            socket.to("main").emit("room_broadcast", message);
        }
        socketListenersMap.set(socket, pfSenseServiceListener);

        const connectedServerIp: string = socket.handshake.address.substring(7);
        serverConnectionsInfo.set(connectedServerIp, [((Array.from(serverConnectionsInfo.get(connectedServerIp)?.values() ?? [0])[0]) ?? 0) + 1, Date.now()]);
        console.log(theme.info("New connection " + socket.id + " from " + connectedServerIp));

        socket.on("message", async (message: any): Promise<void> => {
            console.log(message);
            socket.to("main").emit("room_broadcast", message);
            console.log(theme.info("Message's broadcasted"));

            // Message Parsing
            let refactoredMessage: PingTemplate | ServiceTestTemplate;
            switch (message.messageType) {
                case 1:
                    refactoredMessage = new PingTemplate(message.server.id, message.server.ip, message.status, message.pingInfo);
                    await messageHandler(refactoredMessage);
                    break;
                case 2:
                    refactoredMessage = new ServiceTestTemplate(message.service.id, message.service.name, message.server.id, message.server.ip, message.job.id, message.status);
                    await messageHandler(refactoredMessage);
                    break;
                default:
                    console.log(theme.error("Unknown message type"));
                    break;
            }
        });

        socket.on("disconnect", (): void => {
            if (nodeServersMainSockets.has(socket.id)) {
                console.log(theme.warning("Main Client " + socket.id + " disconnected : " + nodeServersMainSockets.get(socket.id)));
                nodeServersMainSockets.delete(socket.id);
            }
            else console.log(theme.warning("Client " + socket.id + " disconnected"));

            eventEmitter.off("server_connection_state", socketListenersMap.get(socket));
            eventEmitter.off("service_data_state_broadcast", socketListenersMap.get(socket));
            eventEmitter.off("pfsense_service_state_broadcast", socketListenersMap.get(socket));
            socketListenersMap.delete(socket);
        });

        socket.on("main_connection",(ip: string): void => {
           console.log(theme.warningBright("New Main Connection from " + ip));
           socket.emit("main_connection_ack", "OK");
           socket.join("main");
           socket.to("main").emit("room_broadcast", "New server connected: " + ip);
           nodeServersMainSockets.set(socket.id, ip);
        });

        socket.on("browser_connection",(): void => {
            console.log(theme.warningBright("New Browser Connection from " + connectedServerIp));
            socket.join("main");
        });

        socket.on("test_connection",(message: string): void => {
            socket.emit("test_connection_ack", "OK");
            console.log(theme.debug("Test connection from " + connectedServerIp + " : " + message));
        });

        eventEmitter.on("server_connection_state", serverConnectionListener);
        eventEmitter.on("pfsense_service_state_broadcast", pfSenseServiceListener);
        eventEmitter.on("service_data_state_broadcast", serviceDataValueListener);
    });

    eventEmitter.on("server_connection_state", async (message: any): Promise<void> => {
        const refactoredObjectMessage: PingTemplate = new PingTemplate(message.server.id, message.server.ip, message.status, message.pingInfo);
        await messageHandler(refactoredObjectMessage);
    });
    eventEmitter.on("service_data_state_broadcast", async (message: any): Promise<void> => {
        const refactoredObjectMessage: ServiceDataTemplate = new ServiceDataTemplate(message.service.id, message.service.name, message.serviceData.id, message.serviceData.name, message.value, message.status);
        await messageHandler(refactoredObjectMessage);
    });
    eventEmitter.on("pfsense_service_state_broadcast", async (message: any): Promise<void> => {
        const refactoredObjectMessage: PfSenseServiceTemplate = new PfSenseServiceTemplate(message.pfSense.id, message.pfSense.ip, message.pfSenseService.id, message.pfSenseService.name, message.pfSenseService.pfSendeRequestId, message.status);
        await messageHandler(refactoredObjectMessage);
    });

    server.listen(config.mainServer.port, (): void => {
        console.log(`Server listening on port ${config.mainServer.port}`);
    });

    cache.on("set", async (key: string, value: (number | string)[]): Promise<void> => {
       switch(key) {
           case "jobsIds":
               clearInterval(checkOnServers);
               jobsIds = value as number[];
               serversIds = (await s.getServersIdsOfJobs(jobsIds)).map((server: ServersOfJobs) => server.serverId);
               serversIpAddr = (await s.getServersByIds(serversIds)).map((server: Servers) => server.ipAddr);
               checkOnServers = ServicesUtils.serverConnectionsWatchdog(serverConnectionsInfo, serversIpAddr);
               break;
           case "pfSensesIds":
               clearInterval(checkOnPfSenses);
               pfSensesIds = value as number[];
               checkOnPfSenses = ServicesUtils.pfSenseServicesWatchdog(pfSensesIds);
               break;
           case "dataServicesIds":
               await Timer.clearAllIntervals(servicesDataTasks);
               dataServicesIds = value as number[];
               servicesDataWrapper = await ServicesUtils.getServiceDataValueFromServiceFunctionsInArray(await svd.getServicesDataByIds(dataServicesIds));
               if (servicesDataWrapper[0] !== -1) servicesDataTasks = await Timer.executeTimedTask(servicesDataWrapper, [config.servicesData.check_period]);
               break;
       }
    });

    cache.on("del", async (key: string, value: (number | string)[]): Promise<void> => {
        switch (key) {
            case "jobsIds":
                await updateJobsListInCache();
                break;
            case "pfSensesIds":
                await updatePfSensesListInCache();
                break;
            case "dataServicesIds":
                await updateDataServicesInCache();
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
    cache.set("jobsIds", jobsIds, config.jobs.cache_duration);
    console.log(theme.debug(`Jobs ids updated in cache`));
}

/**
 * Update the pfSenses list in cache
 * @returns {Promise<void>}
 */
async function updatePfSensesListInCache(): Promise<void> {
    const assignedPfSenseServices: PfSenseAndServices[] = await pfsv.getAllPfSenseServicesAssignedToAPfSense();
    const pfSenseIds: number[] = await ArrayUtils.getUniqueValuesFromArray(assignedPfSenseServices.map((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseId));
    if (cache.get("pfSensesIds") !== undefined && (await ArrayUtils.compareArrays(cache.get("pfSensesIds"), pfSenseIds))) return;
    cache.set("pfSensesIds", pfSenseIds, config.pfSense.cache_duration);
    console.log(theme.debug(`PfSenses ids updated in cache`));
}

/**
 * Update the data services in cache
 * @returns {Promise<void>}
 */
async function updateDataServicesInCache(): Promise<void> {
    const dataServices: Services[] = await se.getServicesByType(1);
    const dataServicesIds: number[] = dataServices.map((service: Services) => service.id);
    if (cache.get("dataServicesIds") !== undefined && (await ArrayUtils.compareArrays(cache.get("dataServicesIds"), dataServicesIds))) return;
    cache.set("dataServicesIds", dataServicesIds, config.servicesData.cache_duration);
    console.log(theme.debug(`Services Data updated in cache`));
}
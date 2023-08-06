
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
    await misc.centralServerDatabaseInit();

    let jobsIds: number[] = (await j.getAllJobs()).map((job: Jobs) => job.id);
    let serversIds: number[] = (await s.getServersIdsOfJobs(jobsIds)).map((server: ServersOfJobs) => server.serverId);
    let serversIpAddr: string[] = (await s.getServersByIds(serversIds)).map((server: Servers) => server.ipAddr);
    console.log(theme.debug(`New jobs IDs: ${JSON.stringify(jobsIds)}`));
    cache.set("jobsIds", jobsIds, config.jobs.cache_duration);

    const jobsInterval = setInterval((): void => {
        updateJobsListInCache();
    }, config.jobs.check_period);

    const corsOptions = {
        // * WHITELIST
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
    let checkOnServer = ServicesUtils.serverConnectionsWatchdog(serverConnectionsInfo, serversIpAddr);
    const socketListenersMap: Map<Socket, (data: any) => void> = new Map();

    // PFSENSES
    let test = setInterval(async (): Promise<void> => {
        let assignedPfSenseServices: PfSenseAndServices[] = await pfsv.getAllPfSenseServicesAssignedToAPfSense();
        let pfSenseIds: number[] = await ArrayUtils.getUniqueValuesFromArray(assignedPfSenseServices.map((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseId));
        let pfSenses: PfSenses[] = await pfs.getPfSensesByIds(pfSenseIds);
        for (let pfSense of pfSenses) {
            const pfSenseData: any = await ServicesUtils.getPfSenseData(pfSense.ip);
            // if (pfSenseData === {}) continue;
            const pfSenseServices: PfSenseServices[] = await pfsv.getPfSenseServicesByIds(assignedPfSenseServices.filter((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseId === pfSense.id).map((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseServiceId));
            for (let pfSenseService of pfSenseServices) {
                let hitData: number[] = [];
                let correspondingIndex: number = 0;
                for (const [index, value] of pfSenseData.data.entries()) {
                    if (value.name === pfSenseService.name) hitData.push(index);
                }
                if (hitData.length === 0) return;
                if (hitData.length > 1) {
                    if (pfSenseService.pfSenseRequestId === null) return;
                    for (let index of hitData) {
                        if (pfSenseData.data[index].id === pfSenseService.pfSenseRequestId) {
                            correspondingIndex = pfSenseData.data[index].id;
                            break;
                        }
                    }
                } else correspondingIndex = hitData[0];

                const status: string[] = [pfSenseData.data[correspondingIndex].status, pfSenseData.data[correspondingIndex]?.enabled];
                const pfSenseServiceData: PfSenseServiceTemplate = await ServicesUtils.makePfSenseServiceJSON(pfSense, pfSenseService, status);
                console.log(theme.bgInfo("Message to be send in broadcast : "));
                console.log(pfSenseServiceData);
                eventEmitter.emit("pfsense_service_state_broadcast", pfSenseServiceData);
            }
        }
    }, config.pfSense.check_period);

    // SERVICES DATA

    // NON GROUPED
    // let servicesData: ServicesData[] = (await sd.getAllServicesData()).filter((serviceData: ServicesData) => (serviceData.url !== null && serviceData.url !== ""));
    // if (servicesData.length !== 0) {
    //     let servicesDataWrapper: any[] = await ServicesUtils.getServiceDataValueFunctionsInArray(servicesData);
    //     let servicesDataTasks: any[] = await Timer.executeTimedTask(servicesDataWrapper, [config.servicesData.check_period]);
    // }

    // GROUPED
    let dataServices: Services[] = await se.getServicesByType(1);
    if (dataServices.length !== 0) {
        let servicesGroupedDataWrapper: any[] = await ServicesUtils.getServiceDataValueFromServiceFunctionsInArray(dataServices);
        let servicesGroupedDataTasks: any[] = await Timer.executeTimedTask(servicesGroupedDataWrapper, [config.servicesData.check_period]);
    }

    io.on("error", () => {
        console.log(theme.error("Error"));
    });

    io.on('connection', (socket: Socket): void => {
        const serverNotConnectedListener = (message: any) => {
            socket.to("main").emit("room_broadcast", message);
        }
        socketListenersMap.set(socket, serverNotConnectedListener);

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
            console.log(theme.info("Message's broadcast"));

            // Message Parsing
            let refactoredMessage: PingTemplate | ServiceTestTemplate | PfSenseServiceTemplate | ServiceDataTemplate;
            switch (message.messageType) {
                case 1:
                    refactoredMessage = new PingTemplate(message.server.id, message.server.ip, message.status, message.pingInfo);
                    await messageHandler(refactoredMessage);
                    break;
                case 2:
                    refactoredMessage = new ServiceTestTemplate(message.service.id, message.service.name, message.server.id, message.server.ip, message.job.id, message.status);
                    await messageHandler(refactoredMessage);
                    break;
                // case 3:
                //     // TODO: TO BE IMPLEMENTED
                //     break;
                // case 4:
                //     const refactoredObjectMessage: ServiceDataTemplate = new ServiceDataTemplate(message.serviceData.id, message.serviceData.name, message.value, message.status);
                //     await messageHandler(refactoredObjectMessage);
                //     break;
            }
        });

        socket.on("disconnect", (): void => {
            if (nodeServersMainSockets.has(socket.id)) {
                console.log(theme.warning("Main Client " + socket.id + " disconnected : " + nodeServersMainSockets.get(socket.id)));
                nodeServersMainSockets.delete(socket.id);
            }
            else console.log(theme.warning("Client " + socket.id + " disconnected"));

            eventEmitter.off("server_not_connected_state", socketListenersMap.get(socket));
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

        eventEmitter.on("server_not_connected_state", serverNotConnectedListener);
        eventEmitter.on("pfsense_service_state_broadcast", pfSenseServiceListener);
        eventEmitter.on("service_data_state_broadcast", serviceDataValueListener);
    });

    server.listen(config.mainServer.port, (): void => {
        console.log(`Server listening on port ${config.mainServer.port}`);
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
                cache.set("jobsIds", jobsIds, config.jobs.cache_duration);
                break;
        }
        if (key.includes("apiCash_message")) await removeApiCashMessage(value[0] as number);
    });

    eventEmitter.on("service_data_state_broadcast", async (message: any): Promise<void> => {
        const refactoredObjectMessage: ServiceDataTemplate = new ServiceDataTemplate(message.service.id, message.service.name, message.serviceData.id, message.serviceData.name, message.value, message.status);
        await messageHandler(refactoredObjectMessage);
    });
    eventEmitter.on("pfsense_service_state_broadcast", async (message: any): Promise<void> => {
        const refactoredObjectMessage: PfSenseServiceTemplate = new PfSenseServiceTemplate(message.pfSense.id, message.pfSense.ip, message.pfSenseService.id, message.pfSenseService.name, message.pfSenseService.pfSendeRequestId, message.status);
        await messageHandler(refactoredObjectMessage);
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
    console.log(theme.debug(`New jobs IDs: ${JSON.stringify(jobsIds)}`));
}
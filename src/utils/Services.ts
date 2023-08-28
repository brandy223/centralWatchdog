
// DATABASE
import {PfSenseServiceTemplate, PingTemplate, ServiceDataTemplate} from "../templates/DataTemplates";
import {AxiosResponse} from "axios";
import {Servers, ServicesData, Services, PfSenses, PfSenseServices, PfSenseAndServices} from "@prisma/client";
import {config, io} from "../index";

const axios = require('axios');
const request = require('request');

const s = require("./database/Servers");
const sd = require("./database/ServiceData");
const pfs = require("./database/PfSenses");
const pfsv = require("./database/PfSenseServices");
const ServicesUtils = require("./Services");

const Network = require("./Network");
const theme = require("./ColorScheme").theme;

const Template = require("../templates/DataTemplates");

import {messageHandler} from "../handlers/MessageHandler";
import {ping, testConnectionToSocket} from "./Network";

/**
 * Make a JSON object that contains the id of the server, its IP address and its status
 * @param {Servers} server The server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @param {number | null} serverType The type of the server (0 if null => default type for classic server, decided in PingTemplate Class)
 * @returns {PingTemplate} The JSON object
 * @throws {Error} If the pingInfo is empty
 */
export function makeServerPingJSON (server: Servers, status: string, pingInfo: string[], serverType: null): PingTemplate {
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(server.id, server.ipAddr, status, pingInfo, serverType);
}

/**
 * Make a JSON object that contains the information of the pfSense server
 * @param {PfSenses} pfSense The pfSense server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @returns {PingTemplate} The JSON object
 * @throws {Error} If the pingInfo is empty
 */
export function makePfSensePingJSON (pfSense: PfSenses, status: string, pingInfo: string[]): PingTemplate {
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(pfSense.id, pfSense.ip, status, pingInfo, 1);
}

/**
 * Make a JSON object that contains the id of the service object, its name its status and its value
 * @param {Services} service The service object
 * @param {ServicesData} serviceDataObject The service data object
 * @param {string[]} status The status of the service object
 * @param {number | string} value The value of the service object
 * @returns {ServiceDataTemplate} The JSON object
 * @throws {Error} If the status is empty
 */
export function makeServiceDataJSON (service: Services, serviceDataObject: ServicesData, status: string[], value: number | string): ServiceDataTemplate {
    if (status.length === 0) throw new Error("Status is empty");
    return new Template.ServiceDataTemplate(service.id, service.name, serviceDataObject.id, serviceDataObject.name, value, status);
}

/**
 * Make a JSON object that contains the pfSense data (id, ip of pfsense, id, name and optional id of the service, status)
 * @param {PfSenses} pfSense The pfSense object
 * @param {PfSenseServices} pfSenseService The pfSense service object
 * @param {string[]} status The status of the pfSense service object
 * @returns {PfSenseServiceTemplate} The JSON object
 * @throws {Error} If the status is empty
 */
export function makePfSenseServiceJSON (pfSense: PfSenses, pfSenseService: PfSenseServices, status: string[]): PfSenseServiceTemplate {
    if (status.length === 0) throw new Error("Status is empty");
    return new Template.PfSenseServiceTemplate(pfSense.id, pfSense.ip, pfSenseService.id, pfSenseService.name, pfSenseService.pfSenseRequestId, status);
}

/**
 * Watch for server connections and ping them if they have not tried to connect for a while
 * @param {Map<string, number[]>} serverConnectionsInfo The map that contains the number of connections for each server
 * @param {string[]} serversIpAddr The list of servers IP addresses to watch
 * @returns {NodeJS.Timer} The interval
 */
export function serverConnectionsWatchdog(serverConnectionsInfo: Map<string, number[]>, serversIpAddr: string[]): NodeJS.Timer {
    return setInterval(async (): Promise<void> => {
        if (serversIpAddr.length === 0) {
            console.log(theme.warning("No servers found to watch"));
            return;
        }
        for (const serverIP of serversIpAddr) {
            let flag: boolean = false;
            const numberOfConnections: number = Array.from(serverConnectionsInfo.get(serverIP)?.values() ?? [0])[0];
            if ((serverConnectionsInfo.get(serverIP) === undefined)
                || (numberOfConnections === 0)
                || (Math.abs((Array.from(serverConnectionsInfo.get(serverIP)?.values() ?? [Date.now()])[1]) - Date.now()) > config.nodeServers.max_time_between_connections)) {

                flag = true;
                if (numberOfConnections === 0) console.log(theme.warningBright("Server " + serverIP + " has 0 connections, trying to ping..."));
                else console.log(theme.warningBright("Server " + serverIP + " has not connected for a while, trying to ping..."));
            }
            const isUp: string[] = await Network.ping(serverIP);
            const status: string = isUp[0] ? "OK" : "KO";
            if (!isUp[0]) console.log(theme.errorBright("Server " + serverIP + " is down!"));
            else {
                if (flag) {
                    isUp.push("Problem with NodeJS App probably");
                    console.log(theme.warning("Server " + serverIP + " is up! But not sending any data..."));
                } else {
                    console.log(theme.warning("Server " + serverIP + " is up! No problem detected"));
                }
            }
            const server: Servers = await s.getServerByIP(serverIP);
            if (server === null) throw new Error("Server not found in database");
            const messageToSend: PingTemplate = await makeServerPingJSON(
                {
                    "id": server.id,
                    "ipAddr": server.ipAddr,
                    "type": server.type,
                    "port": server.port,
                    "priority": server.priority,
                    "sshUser": server.sshUser,
                    "serviceStatusCmd": server.serviceStatusCmd
                }, status, isUp, null
            )
            console.log(theme.bgDebug("Broadcasting message: "));
            console.log(messageToSend);
            io.to("main").emit("room_broadcast", messageToSend);
            await messageHandler(messageToSend);
        }
    }, config.nodeServers.check_period);
}

/**
 * Watch for pfsense services and send their data
 * @param {number[]} pfSenseIds The list of pfSense ids to watch
 * @returns {NodeJS.Timer} The interval
 */
export function pfSenseServicesWatchdog(pfSenseIds: number[]): NodeJS.Timer {
    return setInterval(async (): Promise<void> => {
        if (pfSenseIds.length === 0) {
            console.log("No pfSensesIds in cache");
            return;
        }
        const assignedPfSenseServices: PfSenseAndServices[] = await pfsv.getAllPfSenseServicesAssignedToAPfSense();
        const pfSenses: PfSenses[] = await pfs.getPfSensesByIds(pfSenseIds);
        for (const pfSense of pfSenses) {

                //* PING of pfSense
            const isUp: string[] = await Network.ping(pfSense.ip);
            const status: string = isUp[0].includes("true") ? "OK" : "KO";

                //* BROADCAST of pfSense ping state
            const messageToSend: PingTemplate = await makePfSensePingJSON(pfSense, status, isUp)
            console.log(theme.bgDebug("Broadcasting message: "));
            console.log(messageToSend);
            io.to("main").emit("room_broadcast", messageToSend);
            await messageHandler(messageToSend);

            if (status === "KO") continue;

            const pfSenseData: any = await ServicesUtils.getPfSenseData(pfSense.ip);
            // if (pfSenseData === {}) continue;
            // TODO: change this to the return value when there is "nothing returned"

            const pfSenseServices: PfSenseServices[] = await pfsv.getPfSenseServicesByIds(assignedPfSenseServices.filter((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseId === pfSense.id).map((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseServiceId));
            if (pfSenseServices.length === 0) {
                console.log(theme.warning("No pfSense services found for pfSense " + pfSense.ip));
                continue;
            }
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
                io.to("main").emit("room_broadcast", pfSenseServiceData);
                await messageHandler(pfSenseServiceData);
            }
        }
    }, config.pfSense.check_period);
}

/**
 * Put in functions the process to get the value of the service data from a group, get the value and broadcast it
 * @param {Services[]} services The list of services to watch (of type 1)
 * @returns {Promise<any[]>} The list of functions to execute
 */
export async function getServiceDataValueFromServiceFunctionsInArray(services: Services[]): Promise<any[]> {
    if (services === null || services.length === 0) {
        console.log(theme.warning("No services found"));
        return [-1];
    }
    const getServiceDataValueFunctions: (() => void)[] = [];
    for (const s of services) {
        const service = (service: Services): (() => void) => {
            return async (): Promise<void> => {
                const servicesDatas: ServicesData[] = await sd.getServicesDataByServiceId(service.id);
                if (servicesDatas.length === 0) return;
                if (service.url === null || service.url === "") return;

                const axiosRes: AxiosResponse = await axios.get(service.url);
                // ? ADD Another line depending on state value ??
                const status: string[] = [axiosRes.status === 200 ? "OK" : "KO"];

                for (const serviceData of servicesDatas) {
                    for (const propertyName in axiosRes.data) {
                        // Assign value to service data
                        if (serviceData.nameInResponse !== propertyName) continue;
                        const res: ServiceDataTemplate = await makeServiceDataJSON(service, serviceData, status, axiosRes.data[propertyName]);
                        console.log(theme.bgInfo("Message to be send in broadcast : "));
                        console.log(res);
                        io.to("main").emit("room_broadcast", res);
                        await messageHandler(res);
                    }
                }
            }
        }
        const serviceObjectFunction = service(s);
        getServiceDataValueFunctions.push(serviceObjectFunction);
    }
    return getServiceDataValueFunctions;
}

/**
 * Make request to a PfSense ip and returns its response
 * @param {string} ip The PfSense ip address
 * @returns {Promise<JSON>} The PfSense response
 */
export async function getPfSenseData(ip: string): Promise<JSON> {
    return new Promise<JSON> (async (resolve: any, reject: any): Promise<void> => {
        const credentials: string = process.env.PFSENSE_USER + ":" + process.env.PFSENSE_PASSWORD;
        const auth: string = "Basic " + btoa(credentials);

        const token: string = await getPfSenseAuth(ip, auth);
        if (token === "") {
            console.log(theme.error("Error while getting token for pfSense " + ip));
            resolve({});
        }

        const uri: string = config.apis.pfsense_url.replace("${ip}", ip) + "/services"
        const auth2: string = "Bearer " + token;

        await request.get(uri, {
                headers: {
                    Authorization: auth2
                },
                rejectUnauthorized: false,
                requestCert: true,
                agent: false,
            }, (err: any, res: any, body: any): void => {
                if (err) {
                    console.error(theme.error(err));
                    resolve();
                }
                resolve(JSON.parse(body));
            }
        );
    });
}

/**
 * Get the pfSense auth token
 * @param ip The pfSense ip address
 * @param auth The pfSense auth string
 * @returns {Promise<string>} The token
 */
export async function getPfSenseAuth(ip: string, auth: string): Promise<string> {
    return new Promise<string> (async (resolve: any, reject: any): Promise<void> => {
        const uri: string = config.apis.pfsense_url.replace("${ip}", ip) + "/access_token";

        await request.post(uri, {
            headers: {
                "Authorization": auth
            },
            rejectUnauthorized: false,
            requestCert: true,
            agent: false,
        }, (err: any, res: any, body: any): void => {
            if (err) {
                console.error(theme.error(err));
                resolve("");
            }
            resolve((JSON.parse(body)).data.token);
        });
    });
}

/**
 * Watch for the main server state (which has a priority of 1) in case of state change (Down)
 * @param {Servers} thisServer The server to watch
 * @param {Servers} otherCentralServer The other central server
 * @returns {Promise<NodeJS.Timer>} The timer
 */
export async function mainServerWatchdog(thisServer: Servers, otherCentralServer: Servers): Promise<NodeJS.Timer> {
    return setInterval(async (): Promise<void> => {
        const mainServerPingInfo: string[] = await ping(thisServer.ipAddr);
        const mainServerSocketState: boolean = await testConnectionToSocket(otherCentralServer.ipAddr, otherCentralServer.port?.toString()
            ?? config.mainServer.port.toString())
        const mainServerState: string[] = mainServerPingInfo.concat(mainServerSocketState.toString());
        const messageToSend: PingTemplate = await makeServerPingJSON(
            {
                "id": otherCentralServer.id,
                "ipAddr": otherCentralServer.ipAddr,
                "type": otherCentralServer.type,
                "port": otherCentralServer.port,
                "priority": otherCentralServer.priority,
                "sshUser": otherCentralServer.sshUser,
                "serviceStatusCmd": otherCentralServer.serviceStatusCmd,
            }, mainServerPingInfo[0], mainServerState, null
        );
        console.log(theme.bgDebug("Broadcasting message: "));
        console.log(messageToSend);
        io.to("main").emit("room_broadcast", messageToSend);
        await messageHandler(messageToSend);
    }, config.mainServer.check_period);
}
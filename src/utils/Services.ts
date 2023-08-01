
// DATABASE
import {PingTemplate, ServiceDataTemplate} from "../templates/DataTemplates";
import {AxiosResponse} from "axios";
const axios = require('axios');
const request = require('request');

const s = require("./database/Servers");
const sd = require("./database/ServiceData");

const Network = require("./Network");
const theme = require("./ColorScheme").theme;
const eventEmitter = require("../index").eventEmitter;

import {Servers, ServicesData, Services} from "@prisma/client";
import {config} from "../index";

const Template = require("../templates/DataTemplates");

/**
 * Make a JSON object that contains the id of the server, its IP address and its status
 * @param {Servers} server The server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @returns {PingTemplate} The JSON object
 * @throws {Error} If the pingInfo is empty
 */
export function makeServerPingJSON (server: Servers, status: string, pingInfo: string[]): PingTemplate {
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(server.id, server.ipAddr, status, pingInfo);
}

/**
 * Make a JSON object that contains the id of the service object, its name its status and its value
 * @param {ServicesData} serviceObject The service object
 * @param {string[]} status The status of the service object
 * @param {number | string} value The value of the service object
 * @returns {ServiceDataTemplate} The JSON object
 * @throws {Error} If the status is empty
 */
export function makeServiceDataJSON (serviceObject: ServicesData, status: string[], value: number | string): ServiceDataTemplate {
    if (status.length === 0) throw new Error("Status is empty");
    return new Template.ServiceDataTemplate(serviceObject.id, serviceObject.name, value, status);
}

/**
 * Watch for server connections and ping them if they have not tried to connect for a while
 * @param {Map<string, number[]>} serverConnectionsInfo The map that contains the number of connections for each server
 * @param {string[]} serversIpAddr The list of servers IP addresses to watch
 * @returns {NodeJS.Timeout} The interval
 */
export async function serverConnectionsWatchdog(serverConnectionsInfo: Map<string, number[]>, serversIpAddr: string[]): Promise<NodeJS.Timeout> {
    return setInterval(async (): Promise<void> => {
        for (const serverIP of serversIpAddr) {
            const numberOfConnections: number = Array.from(serverConnectionsInfo.get(serverIP)?.values() ?? [0])[0];
            if ((serverConnectionsInfo.get(serverIP) === undefined)
                || (numberOfConnections === 0)
                || (Math.abs((Array.from(serverConnectionsInfo.get(serverIP)?.values() ?? [Date.now()])[1]) - Date.now()) > config.nodeServers.max_time_between_connections)) {

                if (numberOfConnections === 0) console.log(theme.warningBright("Server " + serverIP + " has 0 connections, trying to ping..."));
                else console.log(theme.warningBright("Server " + serverIP + " has not connected for a while, trying to ping..."));
                const isUp: string[] = await Network.ping(serverIP);
                const status: string = isUp[0] ? "OK" : "KO";
                if (!isUp[0]) console.log(theme.errorBright("Server " + serverIP + " is down!"));
                else {
                    isUp.push("Problem with NodeJS App probably");
                    console.log(theme.warning("Server " + serverIP + " is up! But not sending any data..."));
                }
                const server: Servers = await s.getServerByIP(serverIP);
                if (server === null) throw new Error("Server not found in database");
                const messageToSend: PingTemplate = await makeServerPingJSON(
                    {
                        "id": server.id,
                        "ipAddr": server.ipAddr,
                        "type": server.type,
                        "port": server.port,
                        "priority": server.priority
                    }, status, isUp
                )
                console.log(theme.bgDebug("Broadcasting message: "));
                console.log(messageToSend);
                eventEmitter.emit("server_not_connected_state", messageToSend);
            }
        }
    }, config.nodeServers.check_period);
}

/**
 * Put in functions the process to get the value of the service data from url and broadcast it
 * @param {ServicesData[]} objects The list of services data to watch
 * @returns {Promise<any[]>} The list of functions to execute
 */
export async function getServiceDataValueFunctionsInArray(objects: ServicesData[]): Promise<any[]> {
    if (objects.length === 0) {
        console.log(theme.warning("No service objects found"));
        // TODO: need to verify in index main file when this happens
        return [];
    }
    const getServiceObjectValueFunctions: (() => void)[] = [];
    for (const obj of objects) {
        const serviceObject = (obj: ServicesData): (() => void) => {
            return async (): Promise<void> => {
                if (obj.url === null || obj.url === "") return;
                const axiosRes: AxiosResponse = await axios.get(obj.url);
                console.log(axiosRes.data);
                const status: string[] = [axiosRes.status === 200 ? "OK" : "KO"];
                // ADD Another line depending on state value ??
                const res: ServiceDataTemplate = await makeServiceDataJSON(obj, status, axiosRes.data);
                eventEmitter.emit("service_data_state_broadcast", res);
                console.log(theme.bgInfo("Message to be send in broadcast : "));
                console.log(res);
            }
        }
        const serviceObjectFunction = serviceObject(obj);
        getServiceObjectValueFunctions.push(serviceObjectFunction);
    }
    return getServiceObjectValueFunctions;
}

/**
 * Put in functions the process to get the value of the service data from a group, get the value and broadcast it
 * @param {Services[]} services The list of services to watch (of type 1)
 * @returns {Promise<any[]>} The list of functions to execute
 */
export async function getServiceDataValueFromServiceFunctionsInArray(services: Services[]): Promise<any[]> {
    if (services.length === 0) {
        console.log(theme.warning("No services found"));
        // TODO: need to verify in index main file when this happens
        return [];
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
                        const res: ServiceDataTemplate = await makeServiceDataJSON(serviceData, status, axiosRes.data[propertyName]);
                        eventEmitter.emit("service_data_state_broadcast", res);
                        console.log(theme.bgInfo("Message to be send in broadcast : "));
                        console.log(res);
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
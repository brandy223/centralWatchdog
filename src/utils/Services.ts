
// DATABASE
import {PingTemplate} from "../templates/DataTemplates";

const s = require("./database/Servers");

const Network = require("./Network");
const theme = require("./ColorScheme").theme;
const eventEmitter = require("../index").eventEmitter;

import { Servers } from "@prisma/client";

const Template = require("../templates/DataTemplates");

/**
 * Make a JSON object that contains the id of the server, its IP address and its status
 * @param {Servers} server The server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @returns {JSON} The JSON object
 * @throws {Error} If the pingInfo is empty
 * @throws {Error} If the server is not found in the database
 */
export function makeServerPingJSON (server: Servers, status: string, pingInfo: string[]): PingTemplate {
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(server.id, server.ipAddr, status, pingInfo);
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
                || (Math.abs((Array.from(serverConnectionsInfo.get(serverIP)?.values() ?? [Date.now()])[1]) - Date.now()) > Number(process.env.SERVERS_CHECK_PERIOD))) {

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
    }, Number(process.env.SERVERS_CHECK_PERIOD));
}
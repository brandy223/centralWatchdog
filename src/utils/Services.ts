
const Database = require("./Database");
const Network = require("./Network");
const theme = require("./ColorScheme").theme;
const eventEmitter = require("../index").eventEmitter;

const Template = require("../templates/DataTemplates");

/**
 * Make a JSON object that contains the id of the server, its IP address and its status
 * @param {any} server The server object
 * @param {string} status The status of the server
 * @param {string[]} pingInfo Information about the ping
 * @returns {any} The JSON object
 * @throws {Error} If the server is null or undefined
 * @throws {Error} If the server does not have an id
 * @throws {Error} If the server does not have an ipAddr
 * @throws {Error} If the pingInfo is empty
 */
export function makeServerPingJSON (server: any, status: string, pingInfo: string[]) : any {
    if (server === undefined || server === null) throw new Error("Server is null or undefined");
    if (server.id === undefined || server.id === null) throw new Error("Server does not have an id");
    if (server.ipAddr === undefined || server.ipAddr === null) throw new Error("Server does not have an ipAddr");
    if (pingInfo.length === 0) throw new Error("Ping info is empty");
    return new Template.PingTemplate(server.id, server.ipAddr, status, pingInfo).toJSON();
}

/**
 * Watch for server connections and ping them if they have not try to connect for a while
 * @param {Map<string, number[]>} serverConnectionsInfo The map that contains the number of connections for each server
 * @param {string[]} serversIpAddr The list of servers IP addresses to watch
 * @returns {NodeJS.Timeout} The interval
 */
export async function serverConnectionsWatchdog(serverConnectionsInfo: Map<string, number[]>, serversIpAddr: string[]): Promise<NodeJS.Timeout> {
    return setInterval(async () => {
        for (const serverIP of serversIpAddr) {
            const numberOfConnections = Array.from(serverConnectionsInfo.get(serverIP)?.values() ?? [0])[0];
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
                const messageToSend = await makeServerPingJSON(
                    {
                        "id": (await Database.getServerByIP(serverIP)).id,
                        "ipAddr": serverIP,
                    }, status, isUp
                )
                console.log(theme.bgDebug("Broadcasting message: "));
                console.log(messageToSend);
                eventEmitter.emit("server_not_connected_state", messageToSend);
            }
        }
    }, Number(process.env.SERVERS_CHECK_PERIOD));
}
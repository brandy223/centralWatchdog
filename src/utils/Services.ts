
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
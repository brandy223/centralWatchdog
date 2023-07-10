
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    log: ['query', 'info', 'warn']
});

/**
 * Check if a server exists in the database
 * @param ip The ip of the server
 * @returns {Promise<boolean>} True if the server exists in the database, false otherwise
 * @throws {Error} If the ip is null or undefined
 */
export async function isServerInDatabase (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server !== undefined && server !== null;
}

/**
 * Check if the server is the central server
 * @param ip The ip of the server
 * @returns {Promise<boolean>} True if the server is the central server, false otherwise
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function isServerCentral (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    console.log(server);
    if (server === undefined || server === null) throw new Error("Server is not in database");
    return server.type === "CENTRAL";
}

/**
 * Check if the port is set
 * @param ip
 * @returns {Promise<boolean>} True if the port is set, false otherwise
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the server is not the central server
 */
export async function isPortSet (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    if (!await isServerCentral(ip)) throw new Error("Server is not the central server");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server?.port !== null;
}

/**
 * Get server by ip
 * @param ip The ip of the server
 * @returns {Promise<*>} The server
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function getServerByIP (ip: string) : Promise<any> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    const server = prisma.servers.findUnique({where: {ipAddr: ip}});
    if (server === undefined || server === null) throw new Error("Server is not in database");
    return server;
}

/**
 * Get Node servers
 * @returns {Promise<*>} Array of node servers
 * @throws {Error} No node servers in the database
 */
export async function getNodeServers () : Promise<any> {
    const nodeServers = await prisma.servers.findMany({where: {type: "Node"}});
    if (nodeServers === undefined || nodeServers === null) throw new Error("No node servers in database");
    return nodeServers;
}

/**
 * Add a server to the database
 * @param ip The ip of the server
 * @param type The type of the server (CENTRAL or NODE)
 * @param port The port of the server (null if it's a node)
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the type is null or undefined
 * @throws {Error} If the server is already in the database
 */
export async function addServerToDatabase (ip: string, type: string, port: number | null) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (type === undefined || type === null) throw new Error("Type is null or undefined");
    if (await isServerInDatabase(ip)) throw new Error("Server is already in database");
    await prisma.servers.create({
        data: {
            ipAddr: ip,
            type: type,
            port: port
        }
    });
}

/**
 * Update server's type
 * @param ip
 * @param type
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the type is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function updateServerType (ip: string, type: string) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (type === undefined || type === null) throw new Error("Type is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: { type: type }
    });
}

/**
 * Update server's port
 * @param ip
 * @param port
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the port is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function updateServerPort (ip: string, port: number) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (port === undefined || port === null) throw new Error("Port is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: { port: port }
    });
}
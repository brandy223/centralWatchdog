
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

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
    if (server === null || server === undefined) throw new Error("Server is not in database");
    return server?.type === "Central";
}

/**
 * Check is there is another central server in the database
 * @param ip The ip of the current server
 * @returns {Promise<boolean>} True if there is another central server in the database, false otherwise
 */
export async function isThereAnotherCentralServer (ip: string) : Promise<boolean> {
    const centralServers = await prisma.servers.findMany({
        where: {
            type: "Central",
            ipAddr: {
                not: ip
            }
        }
    });
    return centralServers.length > 0;
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
 * Check if the server priority is set
 * @param ip The ip of the server
 * @returns {Promise<boolean>} True if the server priority is set, false otherwise
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the server is not the central server
 */
export async function isServerPrioritySet (ip: string) : Promise<boolean> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    if (!await isServerCentral(ip)) throw new Error("Server is not the central server");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server?.priority !== null;
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
 * @param type The type of the server (Central or Node)
 * @returns {Promise<*>} Array of node servers
 * @throws {Error} No node servers in the database
 */
export async function getServerByType (type: string) : Promise<any> {
    const nodeServers = await prisma.servers.findMany({where: {type: type}});
    if (nodeServers === undefined || nodeServers === null) throw new Error("No node servers in database");
    return nodeServers;
}

/**
 * Add a server to the database
 * @param ip The ip of the server
 * @param type The type of the server (CENTRAL or NODE)
 * @param port The port of the server (null if it's a node)
 * @param priority The priority of the server (null if it's a node,
 * 1 if it's the central server,0 if it's the backup central server)
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the type is null or undefined
 * @throws {Error} If the server is already in the database
 */
export async function addServerToDatabase (ip: string, type: string, port: number | null, priority: number) : Promise<void> {
    if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (type === undefined || type === null) throw new Error("Type is null or undefined");
    if (await isServerInDatabase(ip)) throw new Error("Server is already in database");
    await prisma.servers.create({
        data: {
            ipAddr: ip,
            type: type,
            port: port,
            priority: priority
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

/**
 * Update server's priority
 * @param ip
 * @param priority
 * @returns {Promise<void>}
 * @throws {Error} If the ip is null or undefined
 * @throws {Error} If the priority is null or undefined
 * @throws {Error} If the server is not in the database
 */
export async function updateServerPriority (ip: string, priority: number) : Promise<void> {
if (ip === undefined || ip === null) throw new Error("IP is null or undefined");
    if (priority === undefined || priority === null) throw new Error("Priority is null or undefined");
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: { priority: priority }
    });
}
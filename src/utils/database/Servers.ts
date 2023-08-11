
import { Servers, ServersOfJobs } from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Check if a server exists in the database
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server exists in the database, false otherwise
 */
export async function isServerInDatabase (ip: string) : Promise<boolean> {
    return (await getServerByIP(ip)) !== null;
}

/**
 * Check if the server is the central server
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server is the central server, false otherwise
 */
export async function isServerCentral (ip: string) : Promise<boolean> {
    return (await getServerByIP(ip)).type === "Central";
}

/**
 * Check is there is another central server in the database
 * @param {string} ip The ip of the current server
 * @returns {Promise<[boolean, Servers]>} True if there is another central server in the database and the server, false otherwise
 */
export async function isThereAnotherCentralServer (ip: string) : Promise<[boolean, Servers]> {
    const server: Servers[] = await prisma.servers.findMany({
        where: {
            type: "Central",
            ipAddr: {
                not: ip
            }
        }
    })
    return [server.length !== 0, server[0]];
}

/**
 * Check if the port is set
 * @param {string} ip
 * @returns {Promise<boolean>} True if the port is set, false otherwise
 */
export async function isPortSet (ip: string) : Promise<boolean> {
    return (await getServerByIP(ip)).port !== null;
}

/**
 * Check if the server priority is set
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server priority is set, false otherwise
 */
export async function isServerPrioritySet (ip: string) : Promise<boolean> {
    return (await getServerByIP(ip)).priority !== null;
}

/**
 * Get server by ip
 * @param {string} ip The ip of the server
 * @returns {Promise<Servers>} The server
 */
export async function getServerByIP (ip: string) : Promise<Servers> {
    return prisma.servers.findUnique({where: {ipAddr: ip}});
}

/**
 * Get servers by type
 * @param {string} type The type of the server (Central or Node)
 * @returns {Promise<Servers[]>} Array of node servers
 */
export async function getServerByType (type: string) : Promise<Servers[]> {
    return prisma.servers.findMany({ where: {type: type}});
}

/**
 * Get servers by ids
 * @param {number[]} ids The ids of the servers
 * @returns {Promise<Servers[]>} Array of servers
 */
export async function getServersByIds (ids: number[]) : Promise<Servers[]> {
    if (ids.length === 0) {
        console.log("No ids provided");
        return [];
    }
    return prisma.servers.findMany({where: {id: {in: ids}}});
}

/**
 * Add a server to the database
 * @param {string} ip The ip of the server
 * @param {string} type The type of the server (CENTRAL or NODE)
 * @param {number} port The port of the server
 * @param {number} priority The priority of the server (null if it's a node,
 * 1 if it's the central server,0 if it's the backup central server)
 * @returns {Promise<void>}
 * @throws {Error} If the server is already in the database
 */
export async function addServerToDatabase (ip: string, type: string, port: number, priority: number) : Promise<void> {
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
 * Update server's info
 * @param {string} ip The ip of the server
 * @param {string} type The type of the server (CENTRAL or NODE)
 * @param {number} port The port of the server (null if it's a node)
 * @param {number} priority The priority of the server (null if it's a node)
 * @returns {Promise<void>}
 * @throws {Error} If the server is not in the database
 */
export async function updateServer (ip: string, type: string, port: number, priority: number) : Promise<void> {
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    await prisma.servers.update({
        where: { ipAddr: ip },
        data: {
            type: type,
            port: port,
            priority: priority
        }
    });
}

/**
 * Get servers ids of jobs
 * @param {number[]} ids The ids of the jobs
 * @returns {Promise<ServersOfJobs[]>} Array of servers ids
 */
export async function getServersIdsOfJobs (ids: number[]) : Promise<ServersOfJobs[]> {
    if (ids.length === 0) {
        console.log("No ids provided");
        return [];
    }
    return prisma.serversOfJobs.findMany({
        where: {
            jobId: {
                in: ids
            }
        }
    });
}

/**
 * Get current central server (which has a priority of 1)
 * @returns {Promise<Servers>} The central server
 */
export async function getCurrentCentralServer () : Promise<Servers> {
    return (await prisma.servers.findMany({where: {priority: 1}}))[0];
}
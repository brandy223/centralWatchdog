
const { PrismaClient } = require('@prisma/client');
const Network = require('./Network');

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
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server !== undefined && server !== null;
}

/**
 * Check if the server is the central server
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server is the central server, false otherwise
 * @throws {Error} If the server is not in the database
 */
export async function isServerCentral (ip: string) : Promise<boolean> {
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    if (server === null) throw new Error("Server is not in database");
    return server?.type === "Central";
}

/**
 * Check is there is another central server in the database
 * @param {string} ip The ip of the current server
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
 * @param {string} ip
 * @returns {Promise<boolean>} True if the port is set, false otherwise
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the server is not the central server
 */
export async function isPortSet (ip: string) : Promise<boolean> {
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    if (!await isServerCentral(ip)) throw new Error("Server is not the central server");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server?.port !== null;
}

/**
 * Check if the server priority is set
 * @param {string} ip The ip of the server
 * @returns {Promise<boolean>} True if the server priority is set, false otherwise
 * @throws {Error} If the server is not in the database
 * @throws {Error} If the server is not the central server
 */
export async function isServerPrioritySet (ip: string) : Promise<boolean> {
    if (!await isServerInDatabase(ip)) throw new Error("Server is not in database");
    if (!await isServerCentral(ip)) throw new Error("Server is not the central server");
    const server = await prisma.servers.findUnique({ where: { ipAddr: ip } });
    return server?.priority !== null;
}

/**
 * Get server by ip
 * @param {string} ip The ip of the server
 * @returns {Promise<*>} The server
 * @throws {Error} If the server is not in the database
 */
export async function getServerByIP (ip: string) : Promise<any> {
    const server = prisma.servers.findUnique({where: {ipAddr: ip}});
    if (server === null) throw new Error("Server is not in database");
    return server;
}

/**
 * Get servers by type
 * @param {string} type The type of the server (Central or Node)
 * @returns {Promise<*>} Array of node servers
 * @throws {Error} No node servers in the database
 */
export async function getServerByType (type: string) : Promise<any> {
    const servers = await prisma.servers.findMany({where: {type: type}});
    if (servers.length === 0) throw new Error("No servers in database");
    return servers;
}

/**
 * Get server by id
 * @param {number} id The id of the server
 * @returns {Promise<*>} The server
 */
export async function getServerById (id: number) : Promise<any> {
    return prisma.servers.findUnique({where: {id: id}});
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
 * Get all the state values of a server
 * @param {number} id The id of the server
 * @returns {Promise<*>} The state values of the server
 * @throws {Error} If the server is not in the database
 */
export async function getServerStateValues (id: number) : Promise<any> {
    if ((await getServerById(id)) === undefined) throw new Error("Server is not in database");
    return prisma.stateValues.findMany({where: {serverId: id}});
}

/**
 * Initialize the central server in database
 */
export async function centralServerDatabaseInit(): Promise<void> {
    let serverPriority = 1;

    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined) throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY IF ANOTHER CENTRAL SERVER EXISTS IN DATABASE
    if (await isThereAnotherCentralServer(ip)) {
        serverPriority = 0;
    }

    // VERIFY SERVER EXISTS IN DATABASE
    if (!await isServerInDatabase(ip)) {
        await addServerToDatabase(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Added central server to database`);
        return;
    }

    // IF SERVER ALREADY IN DATABASE
    if (!await isServerCentral(ip) || !await isPortSet(ip) || !await isServerPrioritySet(ip)) {
        await updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Updated server information`);
        return;
    }

    // IF SERVERS INFORMATION ARE CORRECT
    if (await isPortSet(ip)) {
        const server = await getServerByIP(ip);
        if (server.port !== Number(process.env.SERVER_PORT)) {
            await updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server port to ${process.env.SERVER_PORT}`);
        }
    }
    if (await isServerPrioritySet(ip)) {
        const server = await getServerByIP(ip);
        if (server.priority !== serverPriority) {
            await updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server priority to ${serverPriority}`);
        }
    }
}
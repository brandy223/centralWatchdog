
const { PrismaClient } = require('@prisma/client');
import {Servers, Jobs, StateValues, ServersOfJobs, Scenarios, ActionsOfScenarios, Actions} from "@prisma/client";
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
    return (await getServerByIP(ip)) !== undefined;
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
 * @returns {Promise<boolean>} True if there is another central server in the database, false otherwise
 */
export async function isThereAnotherCentralServer (ip: string) : Promise<boolean> {
    return (await prisma.servers.findMany({
        where: {
            type: "Central",
            ipAddr: {
                not: ip
            }
        }
    })).length > 0;
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
 * Get server by id
 * @param {number} id The id of the server
 * @returns {Promise<Servers>} The server
 */
export async function getServerById (id: number) : Promise<Servers> {
    return prisma.servers.findUnique({where: {id: id}});
}

/**
 * Get job by id
 * @param {number} id The id of the job
 * @returns {Promise<Jobs>} The job
 */
export async function getJobById (id: number) : Promise<Jobs> {
    return prisma.jobs.findUnique({where: {id: id}});
}

/** Get state value by id
 * @param {number} id The id of the state value
 * @returns {Promise<StateValues>} The state value
 */
export async function getStateValueById (id: number) : Promise<StateValues> {
    return prisma.stateValues.findUnique({where: {id: id}});
}

/**
 * Get all jobs
 * @returns {Promise<Jobs[]>} Array of jobs
 */
export async function getAllJobs () : Promise<Jobs[]> {
    return prisma.jobs.findMany();
}

/**
 * Get servers by ids
 * @param {number[]} ids The ids of the servers
 * @returns {Promise<Servers[]>} Array of servers
 * @throws {Error} If ids is empty
 */
export async function getServersByIds (ids: number[]) : Promise<Servers[]> {
    if (ids.length === 0) throw new Error("Ids is empty");
    return prisma.servers.findMany({where: {id: {in: ids}}});
}

/**
 * Get servers ids of jobs
 * @param {number[]} ids The ids of the jobs
 * @returns {Promise<ServersOfJobs[]>} Array of servers ids
 * @throws {Error} If ids is empty
 */
export async function getServersIdsOfJobs (ids: number[]) : Promise<ServersOfJobs[]> {
    if (ids.length === 0) throw new Error("Ids is empty");
    return prisma.serversOfJobs.findMany({
        where: {
            jobId: {
                in: ids
            }
        }
    });
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
 * @returns {Promise<StateValues[]>} The state values of the server
 * @throws {Error} If the server is not in the database
 */
export async function getServerStateValues (id: number) : Promise<StateValues[]> {
    if ((await getServerById(id)) === undefined) throw new Error("Server is not in database");
    return prisma.stateValues.findMany({where: {serverId: id}});
}

/**
 * Get all the state values of a job
 * @param {number} id The id of the job
 * @returns {Promise<StateValues[]>} The state values of the job
 * @throws {Error} If the job is not in the database
 */
export async function getJobStateValues (id: number) : Promise<StateValues[]> {
if ((await getJobById(id)) === undefined) throw new Error("Job is not in database");
    return prisma.stateValues.findMany({where: {jobId: id}});
}

/**
 * Get scenario by id
 * @param {number} id The id of the scenario
 * @returns {Promise<Scenarios>} The scenario
 */
export async function getScenarioById (id: number) : Promise<Scenarios> {
    return prisma.scenarios.findUnique({where: {id: id}});
}

/**
 * Get actions of a scenario
 * @param {number} id The id of the scenario
 * @returns {Promise<ActionsOfScenarios[]>} The actions of the scenario
 * @throws {Error} If the scenario is not in the database
 */
export async function getScenarioActionsIds (id: number) : Promise<ActionsOfScenarios[]> {
    if ((await getScenarioById(id)) === undefined) throw new Error("Scenario is not in database");
    return prisma.actionsOfScenarios.findMany({ where: {scenarioId: id}});
}

/**
 * get actions by ids
 * @param {number[]} ids The ids of the actions to get
 * @returns {Promise<Actions[]>} The actions
 */
export async function getActionsByIds (ids: number[]) : Promise<Actions[]> {
    return prisma.actions.findMany({where: {id: {in: ids}}});
}

/**
 * Initialize the central server in database
 */
export async function centralServerDatabaseInit(): Promise<void> {
    let serverPriority: number = 1;

    // GET LOCAL IP
    const ip: string = await Network.getLocalIP();
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
    const server: Servers = await getServerByIP(ip);
    if (await isPortSet(ip)) {
        if (server?.port !== Number(process.env.SERVER_PORT)) {
            await updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server port to ${process.env.SERVER_PORT}`);
        }
    }
    if (await isServerPrioritySet(ip)) {
        if (server?.priority !== serverPriority) {
            await updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server priority to ${serverPriority}`);
        }
    }
}

import { StateValues } from '@prisma/client';

const s = require("./Servers");
const j = require("./Jobs");
const so = require("./ServiceObject");
const pfsv = require("./PfSenseServices");

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/** Get state value by id
 * @param {number} id The id of the state value
 * @returns {Promise<StateValues>} The state value
 */
export async function getStateValueById (id: number) : Promise<StateValues> {
    return prisma.stateValues.findUnique({where: {id: id}});
}

/**
 * Get all the state values of a server
 * @param {number} id The id of the server
 * @returns {Promise<StateValues[]>} The state values of the server
 * @throws {Error} If the server is not in the database
 */
export async function getServerStateValues (id: number) : Promise<StateValues[]> {
    if ((await s.getServersByIds([id])).length === 0) throw new Error("Server is not in database");
    return prisma.stateValues.findMany({where: {serverId: id}});
}

/**
 * Get all the state values of a job
 * @param {number} id The id of the job
 * @returns {Promise<StateValues[]>} The state values of the job
 * @throws {Error} If the job is not in the database
 */
export async function getJobStateValues (id: number) : Promise<StateValues[]> {
    if ((await j.getJobById(id)) === null) throw new Error("Job is not in database");
    return prisma.stateValues.findMany({where: {jobId: id}});
}

/**
 * Get all the state values of a pfSense service
 * @param {number} id the id of the pfSense service
 * @returns {Promise<StateValues[]>} The state values of the pfSense Service
 * @throws {Error} If the pfSense service is not in the database
 */
export async function getPfSenseServiceStateValues(id: number): Promise<StateValues[]> {
    if ((await pfsv.getPfSenseServicesByIds([id])) === null) throw new Error("PfSense Service is not in database");
    return prisma.stateValues.findMany({where: {pfSenseServiceId: id}});
}

/**
 * Get all the state values of an object
 * @param {number} id The id of the object
 * @returns {Promise<StateValues[]>} The state values of the object
 * @throws {Error} If the object is not in the database
 */
export async function getDataStateValues (id: number) : Promise<StateValues[]> {
    if ((await so.getServiceObjectsByIds([id])) === null) throw new Error("Object is not in database");
    return prisma.stateValues.findMany({where: {dataId: id}});
}
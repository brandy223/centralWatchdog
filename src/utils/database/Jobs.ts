
import { Jobs } from '@prisma/client';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get job by id
 * @param {number} id The id of the job
 * @returns {Promise<Jobs>} The job
 */
export async function getJobById (id: number) : Promise<Jobs> {
    return prisma.jobs.findUnique({where: {id: id}});
}

/**
 * Get all jobs
 * @returns {Promise<Jobs[]>} Array of jobs
 */
export async function getAllJobs () : Promise<Jobs[]> {
    return prisma.jobs.findMany();
}
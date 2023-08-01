import {PfSenseServices} from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get pfSenseServices by ids
 * @param {number[]} ids The ids of the pfSenseServices
 * @returns {Promise<PfSenseServices[]>} The pfSenseServices
 */
export async function getPfSenseServicesByIds(ids: number[]) : Promise<PfSenseServices[]> {
    return prisma.pfSenseServices.findMany({ where: { id: { in: ids }}});
}
import {PfSenseAndServices, PfSenses} from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get pfSenses by ids
 * @param {number[]} ids The ids of the pfSenses
 * @returns {Promise<PfSenses[]>} The pfSenses
 */
export async function getPfSensesByIds(ids: number[]) : Promise<PfSenses[]> {
    return prisma.pfSenses.findMany({ where: { id: { in: ids }}});
}

export async function getPfSensesOfPfSenseServicesIds(ids: number[]): Promise<PfSenses[]> {
    const pfSenseServices: PfSenseAndServices[] = await prisma.pfSenseAndServices.findMany({where: {pfSenseServiceId: {in: ids}}});
    if (pfSenseServices.length === 0) return [];
    return getPfSensesByIds(pfSenseServices.map((pfSenseService: PfSenseAndServices) => pfSenseService.pfSenseId));
}
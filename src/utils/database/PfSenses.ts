import {PfSenses, PfSenseServices} from "@prisma/client";
import {getPfSenseData} from "../Services";

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

/**
 * Get all pf senses in db with grabAllValues boolean set to true,
 * make a request to it, then parse the response and add all the elements to the database
 * @returns {Promise<void>}
 */
export async function pfSenseDatabaseInit() : Promise<void> {
    const targetedPfSenses: PfSenses[] = await prisma.pfSenses.findMany({where: {grabAllValues: true}});
    if (targetedPfSenses.length === 0) {
        console.log("No pfSense to grab values from");
        return;
    }
    for (const pfSense of targetedPfSenses) {
        const pfSenseResponse: any = await getPfSenseData(pfSense.ip);
        const pfSenseData: any = pfSenseResponse.data;
        for (const data of pfSenseData) {
            const existingData: PfSenseServices[] = await prisma.pfSenseServices.findMany({
                where: {
                    name: data.name,
                    description: data.description,
                    pfSenseRequestId: data.id
                }}
            );
            let dataId: number = existingData[0] ? existingData[0].id : -1;
            if (existingData.length === 0) {
                const insertedData: any = await prisma.pfSenseServices.create({
                    data: {
                        name: data.name,
                        description: data.description != null ? data.description : undefined,
                        pfSenseRequestId: data.id != null ? data.id : undefined,
                    }
                });
                dataId = insertedData.id;
            }
            if ((await prisma.pfSenseAndServices.findUnique({
                where: {
                    pfSenseId_pfSenseServiceId: { pfSenseId: pfSense.id, pfSenseServiceId: dataId }
                }
            })) === null) {
                await prisma.pfSenseAndServices.create({
                    data: {
                        pfSenseId: pfSense.id,
                        pfSenseServiceId: dataId
                    }
                });
            }
        }
    }
}
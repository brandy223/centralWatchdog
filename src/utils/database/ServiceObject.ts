
import {ServicesObjects, ServicesAndObjects} from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get services objects by ids
 * @param {number[]} ids The ids of the services objects
 * @returns {Promise<ServicesObjects[]>} The services objects
 */
export async function getServiceObjectsByIds (ids: number[]) : Promise<ServicesObjects[]> {
    return prisma.servicesObjects.findMany({where: {id: {in: ids}}});
}

/**
 * Get services objects of a service by its id
 * @param {number} id The id of the service
 * @returns {Promise<ServicesObjects[]>} The services objects
 */
export async function getServiceObjectsOfServiceById (id: number) : Promise<ServicesObjects[]> {
    const servicesObjects: ServicesAndObjects[] = await prisma.servicesAndObjects.findMany({where: {serviceId: id}});
    return getServiceObjectsByIds(servicesObjects.map((serviceObject: ServicesAndObjects) => serviceObject.objectId));
}
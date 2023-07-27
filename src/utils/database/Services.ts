
import {Services, ServicesOfServers} from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get services by ids
 * @param {number[]} ids The ids of the services
 * @returns {Promise<Services[]>} The services
 * @throws {Error} If no ids are provided
 */
export async function getServicesByIds (ids: number[]) : Promise<Services[]> {
    if (ids.length === 0) throw new Error("No ids provided");
    return prisma.services.findMany({where: {id: {in: ids}}});
}

/**
 * Get services of a server by its id
 * @param {number} id The id of the server
 * @returns {Promise<Services[]>} The services
 */
export async function getServicesOfServerById (id: number) : Promise<Services[]> {
    const services: ServicesOfServers[] = await prisma.servicesOfServers.findMany({where: {serverId: id}});
    return getServicesByIds(services.map((service: ServicesOfServers) => service.serviceId));
}
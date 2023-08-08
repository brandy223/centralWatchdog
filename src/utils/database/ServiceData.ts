import {ServicesAndData, ServicesData} from "@prisma/client";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get all services objects
 * @returns {Promise<ServicesData[]>} The services objects
 */
export async function getAllServicesData () : Promise<ServicesData[]> {
    return prisma.servicesData.findMany();
}

/**
 * Get service data by id
 * @param {number[]} ids The ids of the services' data
 * @returns {Promise<ServicesData[]>} The services data
 */
export async function getServicesDataByIds (ids: number[]) : Promise<ServicesData[]> {
    return prisma.servicesData.findMany({where: {id: {in: ids}}});
}

/**
 * Get all services Data from service id
 * @param {number} id The id of the service
 * @returns {Promise<ServicesData[]>} The services objects
 */
export async function getServicesDataByServiceId (id: number) : Promise<ServicesData[]> {
    const servicesDataIds: number[] = (await prisma.servicesAndData.findMany({where: {serviceId: id}})).map((serviceData: ServicesAndData) => serviceData.dataId);
    return await getServicesDataByIds(servicesDataIds);
}
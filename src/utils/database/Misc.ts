
import { Servers } from "@prisma/client";

const s = require("./Servers");
const Network = require('../Network');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Initialize the central server in database
 */
export async function centralServerDatabaseInit(): Promise<void> {
    let serverPriority: number = 1;

    // GET LOCAL IP
    const ip: string = await Network.getLocalIP();
    console.log(`Local IP: ${ip}`);

    // VERIFY IF ANOTHER CENTRAL SERVER EXISTS IN DATABASE
    if (await s.isThereAnotherCentralServer(ip)) {
        serverPriority = 0;
    }

    // VERIFY SERVER EXISTS IN DATABASE
    if (!await s.isServerInDatabase(ip)) {
        await s.addServerToDatabase(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Added central server to database`);
        return;
    }

    // IF SERVER ALREADY IN DATABASE
    if (!await s.isServerCentral(ip) || !await s.isPortSet(ip) || !await s.isServerPrioritySet(ip)) {
        await s.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
        console.log(`Updated server information`);
        return;
    }

    // IF SERVERS INFORMATION ARE CORRECT
    const server: Servers = await s.getServerByIP(ip);
    if (await s.isPortSet(ip)) {
        if (server?.port !== Number(process.env.SERVER_PORT)) {
            await s.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server port to ${process.env.SERVER_PORT}`);
        }
    }
    if (await s.isServerPrioritySet(ip)) {
        if (server?.priority !== serverPriority) {
            await s.updateServer(ip, "Central", Number(process.env.SERVER_PORT), serverPriority);
            console.log(`Updated server priority to ${serverPriority}`);
        }
    }
}
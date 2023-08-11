
import { Servers } from "@prisma/client";
import {config} from "../../index";

const s = require("./Servers");
const Network = require('../Network');

/**
 * Initialize the central server in database
 */
export async function centralServerDatabaseInit(): Promise<Servers | undefined> {
    let serverPriority: number = 1;

    // GET LOCAL IP
    const ip: string = await Network.getLocalIP();
    console.log(`Local IP: ${ip}`);

    // VERIFY IF ANOTHER CENTRAL SERVER EXISTS IN DATABASE
    const anotherServerCheck: [boolean, Servers] = await s.isThereAnotherCentralServer(ip);
    if (anotherServerCheck[0] && anotherServerCheck[1] !== null && anotherServerCheck[1].priority === 1) {
        serverPriority = 2;
    }

    // VERIFY SERVER EXISTS IN DATABASE
    if (!await s.isServerInDatabase(ip)) {
        await s.addServerToDatabase(ip, "Central", config.mainServer.port, serverPriority);
        console.log(`Added central server to database`);
        return;
    }

    // IF SERVER ALREADY IN DATABASE
    if (!await s.isServerCentral(ip) || !await s.isPortSet(ip) || !await s.isServerPrioritySet(ip)) {
        await s.updateServer(ip, "Central", config.mainServer.port, serverPriority);
        console.log(`Updated server information`);
        return;
    }

    // IF SERVERS INFORMATION ARE CORRECT
    const server: Servers = await s.getServerByIP(ip);
    if (await s.isPortSet(ip)) {
        if (server?.port !== config.mainServer.port) {
            await s.updateServer(ip, "Central", config.mainServer.port, serverPriority);
            console.log(`Updated server port to ${config.mainServer.port}`);
        }
    }
    if (await s.isServerPrioritySet(ip)) {
        if (server?.priority !== serverPriority) {
            await s.updateServer(ip, "Central", config.mainServer.port, serverPriority);
            console.log(`Updated server priority to ${serverPriority}`);
        }
    }

    return s.getServerByIP(ip);
}
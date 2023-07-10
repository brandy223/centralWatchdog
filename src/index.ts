
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const http = require('http').createServer(app);

const Network = require('./utils/Network');
const Database = require('./utils/Database');

async function main(): Promise<void> {

    // GET LOCAL IP
    const ip = await Network.getLocalIP();
    if (ip === undefined) throw new Error("Could not get local IP");
    else
        console.log(`Local IP: ${ip}`);

    // VERIFY SERVER EXISTS IN DATABASE
    const isServerInDatabase = await Database.isServerInDatabase(ip);
    if (!isServerInDatabase) {
        await Database.addServerToDatabase(ip, "Central", process.env.SERVER_PORT);
        console.log(`Added node server to database`);
    } else {
        const isServerCentral = await Database.isServerCentral(ip);
        if (!isServerCentral) {
            await Database.updateServerType(ip, "Central");
        }

    }
}

main();
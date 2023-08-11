'use strict';

import {config} from "../index";

const ip = require("ip");
const pingConfig = {
    timeout: config.ping.timeout,
    extra: config.ping.extra
}

/**
 * Get the local IP address of the machine
 * @returns {Promise<string>} The local IP address of the machine
 */
export async function getLocalIP () : Promise<string> {
    return await ip.address();
}

/**
 * Ping an IP Address
 * @param {string} ip
 * @returns {Promise<string[]>} True if the IP Address is reachable, false otherwise + ping info
 */
export async function ping (ip: string) : Promise<string[]> {
    const ping = require('ping');
    const res = await ping.promise.probe(ip, pingConfig);
    const output: string[] = extractPingInfo(res.output);
    output.unshift(res.alive.toString());
    return output;
}

/**
 * Function to extract ping information from ping output
 * @param {string} pingOutput The output of the ping command
 * @returns {string[]} Array that contains the number of packets sent, received and lost
 */
export function extractPingInfo (pingOutput: string) : string[] {
    const temp: string[] = pingOutput.trim().split("\n");
    if (temp[0].includes("unknown host")) return ["unknown host"];
    return temp[temp.length - 2].split(",").map((part: string) => part.trim());
}

/**
 * Ping all the IP Addresses in the list with an interval of 10 seconds between each ping and a timeout of 5 seconds
 * @param {string[]} ipList The list of IP Addresses to ping
 * @returns {Promise<string[]>} The list of reachable IP Addresses
 * @throws {Error} If the IP List is empty
 */
export async function pingServers (ipList: string[]) : Promise<string[]> {
    if (ipList.length === 0) throw new Error("IP List is empty");
    const reachableIPList: string[] = [];
    for (const ip of ipList) {
        if (await ping(ip)) reachableIPList.push(ip);
    }
    return reachableIPList;
}

/**
 * Test connection with server socket
 * @param {string} ip
 * @param {number} port
 * @returns {Promise<boolean>} True if the connection is established, false otherwise
 */
export function testConnectionToSocket (ip: string, port: string) : Promise<boolean> {
    return new Promise((resolve, reject): void => {
        const socket = require('socket.io-client')(`http://${ip}:${port}`,
            {
                reconnection: false,
                transports: ["polling"],
                allowEIO3: true, // false by default
            });
        socket.on('connect', (): void => {
            socket.emit("test_connection", "OK");
        });
        socket.on("test_connection_ack", async (message: string): Promise<void> => {
            console.log("Test connection ack: " + message);
            socket.disconnect();
            socket.close();
            resolve(true);
        });
        socket.on("error", (error: any): void => {
            console.log("Error: " + error);
            resolve(false);
            socket.disconnect();
            socket.close();
        });
        socket.on('connect_error', (): void => {
            resolve(false);
            socket.disconnect();
            socket.close()
        });
    });
}
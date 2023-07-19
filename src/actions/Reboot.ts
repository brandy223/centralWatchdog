
const { spawn } = require("node:child_process");
const theme = require('../utils/ColorScheme').theme;

/**
 * Reboot the server
 * @param {number} ip The ip of the server
 * @param {string} user The user of the server
 * @returns {Promise<void>} Nothing
 * @throws {Error} If the server is not reachable
 */
export async function reboot(ip: number, user: string): Promise<void> {
    const arg1 = `${user}@${ip}`;
    const arg2 = "sudo reboot";
    const conn = spawn("ssh", [arg1, arg2]);

    conn.stdout.on("data", (data: any): void => {
        console.log(theme.debugBright("Data from ssh connexion : " + data.toString()));
    });

    conn.stderr.on("data", (err: any): void => {
        console.error(theme.bgError("Error when trying to reboot server : " + err.toString()));
    });

    conn.on("close", (code: number): void => {
        if (code === 0) {
            console.log(theme.bgSuccess("Server rebooted successfully"));
        } else {
            console.error(theme.bgError(`Process (from reboot()) exited with code ${code}`));
        }
    });
}
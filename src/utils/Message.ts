
import { serviceMessageHandler } from "../handlers/ServiceMessageHandler";
const theme = require('./ColorScheme').theme;

/**
 * Parse message from server and execute the corresponding action
 * @param {any} message Message to parse
 * @return {Promise<void>}
 */
export async function parseMessage(message: any): Promise<void> {
    switch (Number(message.messageType)) {
        // Ping Message
        case 1:
            break;
        // Service Message
        case 2:
            await serviceMessageHandler(message);
            break;
        // Main Central Server Down
        case -1:
            break
        default:
            console.log(theme.error("Unknown message type"));
    }
}

async function pingMessageHandler(message: object): Promise<void> {

}
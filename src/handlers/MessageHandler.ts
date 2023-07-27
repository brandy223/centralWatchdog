
import { actionHandler } from "./ActionHandler";
const theme = require('../utils/ColorScheme').theme;

/**
 * Parse message from server and execute the corresponding action
 * @param {any} message Message to parse
 * @return {Promise<void>}
 */
export async function messageHandler(message: any): Promise<void> {
    switch (Number(message.messageType)) {
        case 1: // PING
        case 2: // SERVICE
            await actionHandler(message);
            break;
        // Main Central Server Down
        case -1:
            break
        default:
            console.log(theme.error("Unknown message type"));
    }
}
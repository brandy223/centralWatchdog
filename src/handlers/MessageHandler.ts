
import { actionHandler } from "./ActionHandler";
const theme = require('../utils/ColorScheme').theme;

/**
 * Parse message from server and execute the corresponding action
 * @param {any} message Message to parse
 * @return {Promise<void>}
 */
export async function messageHandler(message: any): Promise<void> {
    switch (Number(message.messageType)) {
        case 1: //*  PING
        case 2: //*  SERVICE
            await actionHandler(message);
            break;
        case 3: //*  PfSense
            break;
        case 4: //*  Services values (Tâches compta, ...)
            break;
        case -1: //* Main Central Server Down
            break
        default:
            console.log(theme.error("Unknown message type"));
    }
}
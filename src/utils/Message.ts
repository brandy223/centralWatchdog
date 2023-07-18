
const Database = require('./Database');
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
            const stateValues: any[] = await Database.getServerStateValues(message.job.id);
            if (stateValues.length === 0) {
                console.log("test");
                break;
            }
            console.log(stateValues);
            break;
        // Main Central Server Down
        case -1:
            break
        default:
            console.log(theme.error("Unknown message type"));
    }
}

/**
 *
 */
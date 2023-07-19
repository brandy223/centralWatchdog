
const Database = require('./Database');
const MapUtils = require('./utilities/Map');
const theme = require('./ColorScheme').theme;

const sendMessage = require('../actions/SendMessage').sendMessage;
const sendEmail = require('../actions/SendEmail').sendEmail;
const sendGlobalMessage = require('../actions/SendGlobalMessage').sendGlobalMessage;
const reboot = require('../actions/Reboot').reboot;

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

async function pingMessageHandler(message: any): Promise<void> {

}

async function serviceMessageHandler(message: any): Promise<void> {
    const stateValues: any[] = await Database.getJobStateValues(message.job.id);
    if (stateValues.length === 0) return;

    const stateValuesMap = new Map<number, [boolean, number]>();
    for (const stateValue of stateValues) {
        let isStateValueTrue = false;
        switch(stateValue.typeOfValue) {
            case 1:
                if (message.status[1].includes(stateValue.value)) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            case 2:
                // TODO : Check if it's the right way to do it - 0 or 1 ???
                if (message.status[0] < stateValue.value) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            case 3:
                if (message.status[0] > stateValue.value) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            default:
                console.log(theme.error("Unknown type of value"));
                break;
        }
    }
    const highestPriorityStateValue = MapUtils.getHighestPriorityStateValue(stateValuesMap);
    if (highestPriorityStateValue[0] === -1) return;
    const stateValue = await Database.getStateValueById(highestPriorityStateValue[0].key());
    if (stateValue === null) throw new Error("State value is not in database");
    const scenario = await Database.getScenarioById(stateValue.scenarioId);
    const actionsIds: any[] = await Database.getScenarioActionsIds(scenario.id);
    const actions: any[] = await Database.getActionsByIds(actionsIds);
    for (const action of actions) {
        switch (action.name.toLowerCase()) {
            case "sendmail":
                // TODO: DETERMINE RECEIVER BEFORE SENDING
                await sendMessage(action, message);
                break;
            case "sendmessage":
                // TODO: DETERMINE RECEIVER BEFORE SENDING
                await sendEmail(action, message);
                break;
            case "sendglobalmessage":
                await sendGlobalMessage(action, message);
                break;
            case "reboot":
                const server = await Database.getServerById(message.server.id);
                await reboot(server.ipAddr, process.env.SSH_USER);
                break;
            default:
                console.log(theme.error("Unknown type of action"));
                break;
        }
    }
}

const Database = require('./Database');
const MapUtils = require('./Utilities/Map');
const theme = require('./ColorScheme').theme;

const sendMessage = require('../Actions/SendMessage').sendMessage;
const sendEmail = require('../Actions/SendEmail').sendEmail;
const sendGlobalMessage = require('../Actions/SendGlobalMessage').sendGlobalMessage;

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
        switch(stateValue.typeOfValue) {
            case 1:
                let isStateValueTrue = false;
                if (message.status[1].includes(stateValue.value)) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            case 2:
                break;
            case 3:
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
    // Execute actions

}
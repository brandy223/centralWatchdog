import {
    Actions,
    ActionsOfScenarios, Actors, ActorsAndLists,
    ActorsForScenarios,
    ActorsListsForScenarios,
    Scenarios,
    StateValues
} from "@prisma/client";

const Database = require('./Database');
const MapUtils = require('./utilities/Map');
const ArrayUtils = require('./utilities/Array');
const theme = require('./ColorScheme').theme;

const actionUtils = require('../actions/Utilities');
const sendMessage = require('../actions/SendMessage').sendMessage;

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

async function pingMessageHandler(message: object): Promise<void> {

}

async function serviceMessageHandler(message: any): Promise<void> {
    const stateValues: any[] = await Database.getJobStateValues(message.job.id);
    if (stateValues.length === 0) return;

    const stateValuesMap = new Map<number, [boolean, number]>();
    for (const stateValue of stateValues) {
        let isStateValueTrue: boolean = false;
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
    const highestPriorityStateValue: number = MapUtils.getHighestPriorityStateValue(stateValuesMap);
    if (highestPriorityStateValue === -1) return;
    const stateValue: StateValues = await Database.getStateValueById(highestPriorityStateValue);
    if (stateValue === null) throw new Error("State value is not in database");
    const scenario: Scenarios = await Database.getScenarioById(stateValue.scenarioId);
    const actionsIds: ActionsOfScenarios[] = await Database.getScenarioActionsIds(scenario.id);
    const actions: Actions[] = await Database.getActionsByIds(actionsIds.map((action: ActionsOfScenarios) => action.actionId))
    for (const action of actions) {
        switch (action.name.toLowerCase()) {
            case "sendmail":

                const actorsIdsListToNotify: number[] = await actionUtils.getActorsIdsForAction(scenario.id, action.id);
                const actorsListToNotify: Actors[] = await Database.getActorsByIds(actorsIdsListToNotify);
                await actionUtils.sendEmailToActors(actorsListToNotify, 1, message);

                // TODO: Refactor code there

                break;
            case "sendmessage":
                // TODO: DETERMINE RECEIVER BEFORE SENDING
                // await sendEmail(action, message);
                break;
            case "sendglobalmessage":
                // await sendGlobalMessage(action, message);
                break;
            case "reboot":
                const server = await Database.getServerById(message.server.id);
                // await reboot(server.ipAddr, process.env.SSH_USER);
                break;
            default:
                console.log(theme.error("Unknown type of action"));
                break;
        }
    }
}
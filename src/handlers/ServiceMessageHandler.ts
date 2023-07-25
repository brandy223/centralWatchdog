const Database = require("../utils/Database");
import {theme} from "../utils/ColorScheme";
const MapUtils = require("../utils/utilities/Map");
import {Actions, ActionsOfScenarios, Actors, Scenarios, StateValues} from "@prisma/client";
const actionUtils = require("../actions/Utilities");
import {stateValuesHandler} from "./StateValuesHandler";

export async function serviceMessageHandler(message: any): Promise<void> {
    const stateValues: any[] = await Database.getJobStateValues(message.job.id);
    if (stateValues.length === 0) return;

    const stateValuesMap = await stateValuesHandler(message.status, stateValues);
    const highestPriorityStateValue: number = MapUtils.getHighestPriorityStateValue(stateValuesMap);
    if (highestPriorityStateValue === -1) return;

    // GET SCENARIO ID FROM STATE VALUE ID
    const scenario: Scenarios = await Database.getScenarioFromStateValueId(highestPriorityStateValue);
    const actions: Actions[] = await Database.getActionsFromStateValueId(highestPriorityStateValue);

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
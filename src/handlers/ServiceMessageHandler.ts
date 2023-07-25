
import {Actions, Actors, Scenarios, Servers} from "@prisma/client";

// DATABASE
const s = require("../utils/database/Servers");
const sv = require("../utils/database/StateValues");
const sc = require("../utils/database/Scenarios");
const dbActions = require("../utils/database/Actions");
const dbActors = require("../utils/database/Actors");

import { stateValuesHandler } from "./StateValuesHandler";
const sendEmail = require("../actions/SendEmail").main;
const MapUtils = require("../utils/utilities/Map");

import {theme} from "../utils/ColorScheme";

export async function serviceMessageHandler(message: any): Promise<void> {
    const stateValues: any[] = await sv.getJobStateValues(message.job.id);
    if (stateValues.length === 0) return;

    const stateValuesMap = await stateValuesHandler(message.status, stateValues);
    const highestPriorityStateValue: number = MapUtils.getHighestPriorityStateValue(stateValuesMap);
    if (highestPriorityStateValue === -1) return;

    // GET SCENARIO ID FROM STATE VALUE ID
    const scenario: Scenarios = await sc.getScenarioFromStateValueId(highestPriorityStateValue);
    const actions: Actions[] = await dbActions.getActionsFromStateValueId(highestPriorityStateValue);

    for (const action of actions) {
        switch (action.name.toLowerCase()) {

            case "sendmail":
                const actorsIdsListToNotify: number[] = await dbActors.getActorsIdsForAction(scenario.id, action.id);
                const actorsListToNotify: Actors[] = await dbActors.getActorsByIds(actorsIdsListToNotify);
                await sendEmail(actorsListToNotify, 1, message);

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
                const server: Servers[] = await s.getServersByIds([message.server.id]);
                // await reboot(server.ipAddr, process.env.SSH_USER);
                break;
            default:
                console.log(theme.error("Unknown type of action"));
                break;
        }
    }
}
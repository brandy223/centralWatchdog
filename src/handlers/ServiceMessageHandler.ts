
import {Actions, Actors, Scenarios, Servers} from "@prisma/client";

// DATABASE
const s = require("../utils/database/Servers");
const sv = require("../utils/database/StateValues");
const sc = require("../utils/database/Scenarios");
const dbActions = require("../utils/database/Actions");
const dbActors = require("../utils/database/Actors");

import { stateValuesHandler } from "./StateValuesHandler";
const sendEmail = require("../actions/SendEmail").main;
const sendMessage = require("../actions/SendMessage").main;
const MapUtils = require("../utils/utilities/Map");

import {theme} from "../utils/ColorScheme";
import {isItTheGoodTime} from "../actions/Utilities";

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
                if (!(await isItTheGoodTime())) break;
                await sendEmail(await dbActors.getActorsListToNotify(scenario.id, action.id), 1, message);
                break;
            case "sendmessage":
                if (!(await isItTheGoodTime())) break;
                await sendMessage(await dbActors.getActorsListToNotify(scenario.id, action.id), message);
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
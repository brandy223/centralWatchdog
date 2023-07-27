
import {Actions, Scenarios, Servers, Services, StateValues} from "@prisma/client";

// DATABASE
const s = require("../utils/database/Servers");
const sv = require("../utils/database/StateValues");
const svc = require("../utils/database/Services");
const sc = require("../utils/database/Scenarios");
const dbActions = require("../utils/database/Actions");
const dbActors = require("../utils/database/Actors");

import { stateValuesHandler } from "./StateValuesHandler";
const sendEmail = require("../actions/SendEmail").main;
const sendMessage = require("../actions/SendMessage").main;
const sendGlobalMessage = require("../actions/SendGlobalMessage").main;
const MapUtils = require("../utils/utilities/Map");

import {theme} from "../utils/ColorScheme";
import {isItTheGoodTime} from "../actions/Utilities";

import { PingTemplate, ServiceTestTemplate } from "../templates/DataTemplates";

/**
 * Parse message from server and execute the corresponding action
 * @param {PingTemplate | ServiceTestTemplate} message Message to parse
 * @return {Promise<void>}
 */
export async function actionHandler(message: (PingTemplate | ServiceTestTemplate)): Promise<void> {
    let stateValues: StateValues[] = [];

    if (message instanceof PingTemplate && message.messageType === 1) stateValues = await sv.getServerStateValues(message.server.id);
    else if (message instanceof ServiceTestTemplate && message.messageType === 2) stateValues = await sv.getJobStateValues(message.job.id);
    if (stateValues.length === 0) return;

    const stateValuesMap = await stateValuesHandler(message, stateValues);
    const highestPriorityStateValue: number = MapUtils.getHighestPriorityStateValue(stateValuesMap);
    if (highestPriorityStateValue === -1) return;

    // GET SCENARIO ID FROM STATE VALUE ID
    const scenario: Scenarios = await sc.getScenarioFromStateValueId(highestPriorityStateValue);
    const actions: Actions[] = await dbActions.getActionsFromStateValueId(highestPriorityStateValue);

    for (const action of actions) {
        switch (action.name.toLowerCase()) {
            case "sendmail":
                if (!(await isItTheGoodTime())) break;
                await sendEmail(await dbActors.getActorsListToNotify(scenario.id, action.id), message);
                break;
            case "sendmessage":
                if (!(await isItTheGoodTime())) break;
                await sendMessage(await dbActors.getActorsListToNotify(scenario.id, action.id), message);
                break;
            case "sendglobalmessage":
                // TODO: APICASH IS FOR EXTERNAL OBJECTS THAT DEPENDS ON SERVICES,
                // * NEED TO RETHINK THE WAY OF WORKING OF THIS MESSAGE
                // const service: Services[] = await svc.getServicesByIds([message.service.id]);
                // await sendGlobalMessage(service[0], highestPriorityStateValue, message.status[1]);
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
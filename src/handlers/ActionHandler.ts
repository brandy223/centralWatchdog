
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
const gm = require("../actions/SendGlobalMessage");
const MapUtils = require("../utils/utilities/Map");

import {theme} from "../utils/ColorScheme";
import {isItTheGoodTime} from "../actions/Utilities";

import {
    PingTemplate,
    ServiceDataTemplate,
    ServiceTestTemplate
} from "../templates/DataTemplates";

/**
 * Parse message from server and execute the corresponding action
 * @param {PingTemplate | ServiceTestTemplate | ServiceDataTemplate} message Message to parse
 * @return {Promise<void>}
 */
export async function actionHandler(message: (PingTemplate | ServiceTestTemplate | ServiceDataTemplate)): Promise<void> {
    let stateValues: StateValues[] = [];

    switch(message.messageType) {
        case 1:
            if (message instanceof PingTemplate)
                stateValues = await sv.getServerStateValues(message.server.id);
            break;
        case 2:
            if (message instanceof ServiceTestTemplate)
                stateValues = await sv.getJobStateValues(message.job.id);
            break;
        case 3:
            // TODO: TO BE IMPLEMENTED
            break;
        case 4:
            if (message instanceof ServiceDataTemplate)
                stateValues = await sv.getDataStateValues(message.serviceData.id);
            break;
    }
    if (stateValues.length === 0) return;

    let highestPriorityStateValue: number = stateValues[0].priority;

    if (stateValues.length > 1) {
        const stateValuesMap = await stateValuesHandler(message, stateValues);
        if (stateValuesMap.size === 0) return;
        highestPriorityStateValue = MapUtils.getHighestPriorityStateValue(stateValuesMap);
        if (highestPriorityStateValue === -1) return;
    }

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
                //* Essentially for services objects
                const globalMessageInfo: string[] = await gm.createInCacheNameAndMessageContent(message, highestPriorityStateValue);
                await gm.main(globalMessageInfo[0], globalMessageInfo[1], highestPriorityStateValue);
                break;
            case "reboot":
                // const server: Servers[] = await s.getServersByIds([message.server.id]);
                // await reboot(server.ipAddr, process.env.SSH_USER);
                break;
            default:
                console.log(theme.error("Unknown type of action"));
                break;
        }
    }
}
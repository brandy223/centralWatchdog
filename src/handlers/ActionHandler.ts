
import {Actions, Scenarios, StateValues} from "@prisma/client";

// DATABASE
const sv = require("../utils/database/StateValues");
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
    PfSenseServiceTemplate,
    PingTemplate,
    ServiceDataTemplate,
    ServiceTestTemplate
} from "../templates/DataTemplates";
import {reboot} from "../actions/Reboot";

/**
 * Parse message from server and execute the corresponding action
 * @param {PingTemplate | ServiceTestTemplate | PfSenseServiceTemplate | ServiceDataTemplate} message Message to parse
 * @return {Promise<void>}
 */
export async function actionHandler(message: (PingTemplate | ServiceTestTemplate | PfSenseServiceTemplate | ServiceDataTemplate)): Promise<void> {
    let stateValues: StateValues[] = [];

    switch(message.messageType) {
        case 1:
            if (message instanceof PingTemplate && message.serverType === 0)
                stateValues = await sv.getServerStateValues(message.server.id);
            else if (message instanceof PingTemplate && message.serverType === 1)
                stateValues = await sv.getPfSenseStateValues(message.server.id);
            break;
        case 2:
            if (message instanceof ServiceTestTemplate)
                stateValues = await sv.getJobStateValues(message.job.id);
            break;
        case 3:
            if (message instanceof PfSenseServiceTemplate)
                stateValues = await sv.getPfSenseServiceStateValues(message.pfSenseService.id);
            break;
        case 4:
            if (message instanceof ServiceDataTemplate)
                stateValues = await sv.getDataStateValues(message.serviceData.id);
            break;
    }
    if (stateValues.length === 0) return;

    const stateValuesMap: Map<number, [boolean, number]> = await stateValuesHandler(message, stateValues);
    if (stateValuesMap.size === 0) return;
    const highestPriorityStateValueId: number = MapUtils.getHighestPriorityStateValue(stateValuesMap);
    if (highestPriorityStateValueId === -1) return;

    // GET SCENARIO ID FROM STATE VALUE ID
    const scenario: Scenarios = await sc.getScenarioFromStateValueId(highestPriorityStateValueId);
    const actions: Actions[] = await dbActions.getActionsFromStateValueId(highestPriorityStateValueId);

    const stateValue: StateValues = await sv.getStateValueById(highestPriorityStateValueId);

    for (const action of actions) {
        switch (action.name.toLowerCase()) {
            case "sendmail":
                if (!(await isItTheGoodTime())) break;
                await sendEmail(await dbActors.getActorsListToNotify(scenario.id, action.id), message, stateValue);
                break;
            case "sendmessage":
                if (!(await isItTheGoodTime())) break;
                await sendMessage(await dbActors.getActorsListToNotify(scenario.id, action.id), message);
                break;
            case "sendglobalmessage":
                //* Essentially for services objects
                const globalMessageInfo: string[] = await gm.createInCacheNameAndMessageContent(message, stateValuesMap.get(highestPriorityStateValueId)![1], stateValue.description);
                await gm.main(globalMessageInfo[0], globalMessageInfo[1], stateValuesMap.get(highestPriorityStateValueId)![1]);
                break;
            case "reboot":
                let serverIp: string = ""
                if (message instanceof PingTemplate) serverIp = message.server.ip;
                else if (message instanceof ServiceTestTemplate) serverIp = message.server.ip;
                else return;
                // TODO: implement reboot for services with systemctl
                break;
            default:
                console.log(theme.error("Unknown type of action"));
                break;
        }
    }
}
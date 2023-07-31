
import {StateValues} from "@prisma/client";

import {theme} from "../utils/ColorScheme";
import {PingTemplate, ServiceDataTemplate, ServiceTestTemplate} from "../templates/DataTemplates";

/**
 * Parse message from server and execute the corresponding action
 * @param {PingTemplate | ServiceTestTemplate | ServiceDataTemplate} message Message to parse
 * @param stateValues State values to check
 * @returns {Promise<Map>}
 */
export async function stateValuesHandler(message: PingTemplate | ServiceTestTemplate | ServiceDataTemplate, stateValues: StateValues[]): Promise<Map<number, [boolean, number]>> {
    const stateValuesMap = new Map<number, [boolean, number]>();

    for (const stateValue of stateValues) {
        let isStateValueTrue: boolean = false;
        switch(stateValue.typeOfValue) {
            // * STRING
            case 1:
                switch(message.messageType) {
                    // SERVICE
                    case 2:
                        if (message instanceof ServiceTestTemplate && message.status[1].includes(stateValue.value)) isStateValueTrue = true;
                        stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                        break;
                }

                break;
            // * INFERIOR INT
            case 2:
                switch(message.messageType) {
                    // PING
                    case 1:
                        let pingPercentage: number = 0;
                        if (message instanceof PingTemplate) pingPercentage = Number(message.pingInfo[2].split("%")[0]);
                        if (pingPercentage < Number(stateValue.value)) isStateValueTrue = true;
                        stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                        break;
                }
                break;
            // * SUPERIOR INT
            case 3:
                break;
            default:
                console.log(theme.error("Unknown state value type"));
                break;
        }
    }
    return stateValuesMap;
}

import {theme} from "../utils/ColorScheme";
import {StateValues} from "@prisma/client";

/**
 *
 * @param messageStatus
 * @param stateValues
 * @returns {Promise<Map>}
 */
export async function stateValuesHandler(messageStatus: string[], stateValues: StateValues[]): Promise<Map<number, [boolean, number]>> {
    const stateValuesMap = new Map<number, [boolean, number]>();

    for (const stateValue of stateValues) {
        let isStateValueTrue: boolean = false;
        switch(stateValue.typeOfValue) {
            case 1:
                if (messageStatus[1].includes(stateValue.value)) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            case 2:
                // TODO : Check if it's the right way to do it - 0 or 1 ???
                if (messageStatus[0] < stateValue.value) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            case 3:
                if (messageStatus[0] > stateValue.value) isStateValueTrue = true;
                stateValuesMap.set(stateValue.id, [isStateValueTrue, Number(stateValue.priority)]);
                break;
            default:
                console.log(theme.error("Unknown type of value"));
                break;
        }
    }
    return stateValuesMap;
}
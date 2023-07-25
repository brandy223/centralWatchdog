
import {ActorsForScenarios, ActorsListsForScenarios} from "@prisma/client";

/**
 * Returns the unique values from an array
 * @param {any[]} array The array to get the unique values from
 * @returns {Promise<any[]>} The unique values
 */
export async function getUniqueValuesFromArray(array: any[]): Promise<any[]> {
    const uniqueValues: any[] = [];
    for (const value of array) {
        if (!uniqueValues.includes(value)) uniqueValues.push(value);
    }
    return uniqueValues;
}


/**
 * Compare 2 arrays
 * @param {any[]} a First array
 * @param {any[]} b Second array
 * @return {boolean} True if the arrays are the same, false otherwise
 * @throws {Error} No arrays given
 */
export async function compareArrays(a: any[], b: any[]): Promise<boolean> {
    if (a.length === 0 || b.length === 0) throw new Error("No arrays given");
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        const objA = a[i];
        const objB = b[i];
        if (JSON.stringify(objA) !== JSON.stringify(objB)) return false;
    }
    return true;
}

/**
 * Returns the indexes of the highest priority actors
 * @param {ActorsForScenarios[]} actors The actors to get the highest priority from
 * @return {Promise<ActorsForScenarios[]>} The actors with the highest priority
 * @throws {Error} If no actors are given
 */
export async function getHighestPriorityActors(actors: ActorsForScenarios[]): Promise<ActorsForScenarios[]> {
    if (actors.length === 0) throw new Error("No actors given");
    const highestPriority: number = Math.min(...actors.map((actor: ActorsForScenarios): number => actor.priority));
    return actors.filter((actor: ActorsForScenarios): boolean => actor.priority === highestPriority);
}

/**
 * Returns the indexes of the highest priority actors lists
 * @param {ActorsListsForScenarios[]} actorsLists The actors lists to get the highest priority from
 * @return {Promise<ActorsListsForScenarios[]>} The actors lists with the highest priority
 * @throws {Error} If no actors lists are given
 */
export async function getHighestPriorityActorsLists(actorsLists: ActorsListsForScenarios[]): Promise<ActorsListsForScenarios[]> {
    if (actorsLists.length === 0) throw new Error("No actors lists given");
    const highestPriority: number = Math.min(...actorsLists.map((actorList: ActorsListsForScenarios): number => actorList.priority));
    return actorsLists.filter((actorList: ActorsListsForScenarios): boolean => actorList.priority === highestPriority);
}
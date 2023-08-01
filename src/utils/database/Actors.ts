
import {
    Actors,
    ActorsAndLists,
    ActorsForScenarios,
    ActorsListsForScenarios
} from '@prisma/client';

const dbActors = require('./Actors');
const utils = require('../../actions/Utilities');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get actors by ids
 * @param {number[]} ids The id of the actor
 * @returns {Promise<Actors[]>} The actor
 */
export async function getActorsByIds (ids: number[]) : Promise<Actors[]> {
    return prisma.actors.findMany({where: {id: {in: ids}}});
}

/**
 * Get actors of an action of a scenario
 * @param {number} actionId The id of the action
 * @param {number} scenarioId The id of the scenario
 * @returns {Promise<ActorsForScenarios[]>} The actors of the action of the scenario
 */
export async function getActionActors (actionId: number, scenarioId: number) : Promise<ActorsForScenarios[]> {
    return prisma.actorsForScenarios.findMany({where: {actionId: actionId, scenarioId: scenarioId}});
}

/**
 * Get all actors from actor list
 * @param {number} id The id of the actor list
 * @returns {Promise<ActorsAndLists[]>} The actors
 */
export async function getAllActorsFromList (id: number) : Promise<ActorsAndLists[]> {
    return prisma.actorsAndLists.findMany({where: {listId: id}});
}

/**
 * Get actors list of an action of a scenario
 * @param {number} actionId The id of the action
 * @param {number} scenarioId The id of the scenario
 * @returns {Promise<ActorsListsForScenarios[]>} The actors list of the action of the scenario
 */
export async function getActionActorsList (actionId: number, scenarioId: number) : Promise<ActorsListsForScenarios[]> {
    return prisma.actorsListsForScenarios.findMany({where: {actionId: actionId, scenarioId: scenarioId}});
}

/**
 * Give actors lists depending on the scenario and the action
 * @param {number} scenarioId The id of the scenario
 * @param {number} actionId The id of the action
 * @returns {Promise<number[] | undefined>} The actors lists IDs
 */
export async function getActorsIdsForAction (scenarioId: number, actionId: number) : Promise<number[]> {
    // FIND ACTORS AND ACTORS LISTS OF ACTION
    const actorsIds: ActorsForScenarios[] = await dbActors.getActionActors(actionId, scenarioId);
    const actorsListsIds: ActorsListsForScenarios[] = await dbActors.getActionActorsList(actionId, scenarioId);

    const actorsIdsMap = new Map<number, number>();
    if (actorsIds.length !== 0) {
        for (const actor of actorsIds) {
            actorsIdsMap.set(actor.actorId, actor.priority);
        }
    }
    if (actorsListsIds.length !== 0) {
        for (const actorList of actorsListsIds) {
            const actorsIds: number[] = (await dbActors.getAllActorsFromList(actorList.listId)).map((actor: ActorsAndLists) => actor.actorId);
            for (const actorId of actorsIds) {
                const mapValue: number | undefined = actorsIdsMap.get(actorId)
                if (mapValue !== undefined && mapValue < actorList.priority) continue;
                actorsIdsMap.set(actorId, actorList.priority);
            }
        }
    }

    // GET FREE ACTORS
    const excludedPriorityValues: number[] = [];
    const freeActorsIds: Map<number, number> = await getFreeActorsIds(actorsIdsMap, excludedPriorityValues);

    return [...freeActorsIds.keys()];
}

/**
 * Get free actors of a list of actors ids
 * @param {ActorsForScenarios[]} actorsIds The actors ids
 * @param {number[]} excludedPriorityValues The priority values to exclude
 * @returns {Promise<ActorsForScenarios[]>} The free actors
 * @throws {Error} If priority to exclude is undefined
 */
async function getFreeActorsIds (actorsIds: Map<number, number>, excludedPriorityValues: number[]) : Promise<Map<number, number>> {
    let highestPriorityActor = new Map<number, number>;
    let freeActors = new Map<number, number>();
    let freeActorsCounter: number = 0;

    // DETERMINE HIGHEST PRIORITY ACTORS
    if (actorsIds.size !== 0)
        highestPriorityActor  = await getHighestPriorityActors(actorsIds, []);

    for (const [actorId, priority] of highestPriorityActor) {
        if (await utils.isPersonFree(actorId)) {
            freeActorsCounter++;
            freeActors.set(actorId, priority);
        }
    }
    if (freeActorsCounter === 0) {
        const priorityToExclude: number | undefined = highestPriorityActor.get(0);
        if (priorityToExclude === undefined) throw new Error("Priority to exclude is undefined");
        excludedPriorityValues.push(priorityToExclude);
        await getFreeActorsIds(actorsIds, excludedPriorityValues);
    }
    return freeActors;
}

/**
 * Returns the indexes of the highest priority actors
 * @param {Map<number, number>} actorsIds The actors to get the highest priority from
 * @param {number[]} excludedPriorityValues The priority values to exclude
 * @return {Promise<ActorsForScenarios[]>} The actors with the highest priority
 * @throws {Error} If no actors are given
 */
async function getHighestPriorityActors(actorsIds: Map<number, number>, excludedPriorityValues: number[]): Promise<Map<number, number>> {
    if (actorsIds.size === 0) throw new Error("No actors given");
    const highestPriorityActors: Map<number, number> = new Map();
    let highestPriority: number = 100;      // Just a random high number that will not be reached
    for (const [actorId, priority] of actorsIds) {
        if (priority < highestPriority && !excludedPriorityValues.includes(priority)) {
            highestPriority = priority;
            highestPriorityActors.clear();
            highestPriorityActors.set(actorId, priority);
        }
        else if (priority === highestPriority && !excludedPriorityValues.includes(priority)) {
            highestPriorityActors.set(actorId, priority);
        }
    }

    return highestPriorityActors;
}

/**
 * Get actors List to notify
 * @param {number} scenarioId The id of the scenario
 * @param {number} actionId The id of the action
 * @returns {Promise<Actors[]>} The actors list to notify
 */
export async function getActorsListToNotify (scenarioId: number, actionId: number) : Promise<Actors[]> {
    const actorsIdsListToNotify: number[] = await dbActors.getActorsIdsForAction(scenarioId, actionId);
    if (actorsIdsListToNotify.length === 0) return [];
    return dbActors.getActorsByIds(actorsIdsListToNotify);
}
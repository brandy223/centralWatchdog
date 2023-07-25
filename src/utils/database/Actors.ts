
import {
    Actors,
    ActorsAndLists,
    ActorsForScenarios,
    ActorsListsForScenarios
} from '@prisma/client';

const dbActors = require('./Actors');
const ArrayUtils = require('../utilities/Array');

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
 * @returns {Promise<number[]>} The actors lists IDs
 */
export async function getActorsIdsForAction (scenarioId: number, actionId: number) : Promise<number[]> {
    // FIND ACTORS AND ACTORS LISTS OF ACTION
    const actorsIds: ActorsForScenarios[] = await dbActors.getActionActors(actionId, scenarioId);
    console.log(actorsIds);
    const actorsListsIds: ActorsListsForScenarios[] = await dbActors.getActionActorsList(actionId, scenarioId);
    console.log(actorsListsIds);

    let highestPriorityActor: ActorsForScenarios[] = [];
    let highestPriorityActorList: ActorsListsForScenarios[] = [];

    // DETERMINE HIGHEST PRIORITY ACTOR
    if (actorsIds.length !== 0)
        highestPriorityActor  = await ArrayUtils.getHighestPriorityActors(actorsIds);

    // DETERMINE HIGHEST PRIORITY ACTOR LIST
    if (actorsListsIds.length !== 0)
        highestPriorityActorList = await ArrayUtils.getHighestPriorityActorsLists(actorsListsIds);

    if (actorsListsIds.length !== 0 && !(highestPriorityActor[0].priority < highestPriorityActorList[0].priority))
        return (await dbActors.getAllActorsFromList(highestPriorityActorList[0].listId)).map((actor: ActorsAndLists) => actor.actorId);
    else
        return highestPriorityActor.map((actor: ActorsForScenarios) => actor.actorId);
}
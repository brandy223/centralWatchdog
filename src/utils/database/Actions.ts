
import {Actions, ActionsOfScenarios, Scenarios} from '@prisma/client';

const sc = require('./Scenarios');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * get actions by ids
 * @param {number[]} ids The ids of the actions to get
 * @returns {Promise<Actions[]>} The actions
 */
export async function getActionsByIds (ids: number[]) : Promise<Actions[]> {
    return prisma.actions.findMany({where: {id: {in: ids}}});
}

/**
 * Get actions of a scenario
 * @param {number} id The id of the scenario
 * @returns {Promise<ActionsOfScenarios[]>} The actions of the scenario
 * @throws {Error} If the scenario is not in the database
 */
export async function getScenarioActionsIds (id: number) : Promise<ActionsOfScenarios[]> {
    if ((await sc.getScenarioById(id)) === null) throw new Error("Scenario is not in database");
    return prisma.actionsOfScenarios.findMany({ where: {scenarioId: id}});
}

/**
 * Get actions from state value id
 * @param {number} id The id of the state value
 * @returns {Promise<Actions[]>} The actions
 */
export async function getActionsFromStateValueId(id: number): Promise<Actions[]> {
    const scenario: Scenarios = await sc.getScenarioFromStateValueId(id);
    const actionsIds: ActionsOfScenarios[] = await getScenarioActionsIds(scenario.id);

    return getActionsByIds(actionsIds.map((action: ActionsOfScenarios) => action.actionId));
}
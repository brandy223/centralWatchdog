
import { Scenarios, StateValues } from '@prisma/client';

const sv = require('./StateValues');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(
    {
        // log: ["query", "info", "warn", "error"],
    },
);

/**
 * Get scenario by id
 * @param {number} id The id of the scenario
 * @returns {Promise<Scenarios>} The scenario
 */
export async function getScenarioById (id: number) : Promise<Scenarios> {
    return prisma.scenarios.findUnique({where: {id: id}});
}

/**
 * Get scenario from state value id
 * @param {number} id The id of the state value
 * @returns {Promise<Scenarios>} The scenario
 * @throws {Error} If the state value is not in the database
 */
export async function getScenarioFromStateValueId (id: number) : Promise<Scenarios> {
    const stateValue: StateValues = await sv.getStateValueById(id);
    if (stateValue === null) throw new Error("State value is not in database");

    return getScenarioById(stateValue.scenarioId);
}
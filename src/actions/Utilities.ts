import {AxiosResponse} from "axios";
import {Actors, ActorsAndLists, ActorsForScenarios, ActorsListsForScenarios} from "@prisma/client";
const Database = require('../utils/Database');
const ArrayUtils = require('../utils/utilities/Array');
const sendEmail = require('../actions/SendEmail').main;

const axios = require('axios');

/**
 * Verify if someone is free to receive a message / mail
 * @param {number} id The id of the person
 * @returns {Promise<boolean>} True if the person is free, false otherwise
 * @throws {Error} If the person ID does not exist
 */
export async function isPersonFree (id: number) : Promise<boolean> {
    const today: Date = new Date();
    const day: number = today.getDate();
    const month: number = today.getMonth() + 1;
    const year: number = today.getFullYear();
    let apiUrl: string = `http://manager.reseau.lan/index.php/checkDispoUserByDate?date-debut=${month}/${day}/${year}&id=${id}`
    const res: AxiosResponse<any> = await axios.get(apiUrl);

    if (JSON.stringify(res.data).includes("undefined")) throw new Error("Person ID does not exist");
    return !JSON.stringify(res.data).includes("Absent");
}

/**
 * Give actors lists depending on the scenario and the action
 * @param {number} scenarioId The id of the scenario
 * @param {number} actionId The id of the action
 * @returns {Promise<number[]>} The actors lists IDs
 */
export async function getActorsIdsForAction (scenarioId: number, actionId: number) : Promise<number[]> {
    // FIND ACTORS AND ACTORS LISTS OF ACTION
    const actorsIds: ActorsForScenarios[] = await Database.getActionActors(actionId, scenarioId);
    console.log(actorsIds);
    const actorsListsIds: ActorsListsForScenarios[] = await Database.getActionActorsList(actionId, scenarioId);
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
        return (await Database.getAllActorsFromList(highestPriorityActorList[0].listId)).map((actor: ActorsAndLists) => actor.actorId);
    else
        return highestPriorityActor.map((actor: ActorsForScenarios) => actor.actorId);
}

/**
 * Send email to a list of actors
 * @param {Actors[]} actors The actors to send the email to
 * @param {number} typeOfMessage The type of message
 * @param {any} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the list of actors is empty
 */
export async function sendEmailToActors (actors: Actors[], typeOfMessage: number, data: any) : Promise<void> {
    if (actors.length === 0) throw new Error("No actors given");

    // TODO: NEED TO ADD COOL DOWN

    for (const actor of actors) {
        if ((await isPersonFree(actor.id))) {
            if (actor.email !== null) {
                await sendEmail(actor.email, typeOfMessage, data);
            }
        }
    }
}
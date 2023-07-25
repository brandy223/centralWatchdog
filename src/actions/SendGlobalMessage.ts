import {Services} from "@prisma/client";

const theme = require("../utils/ColorScheme").theme;
const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.APICASH_DB_HOST,
    user: process.env.APICASH_DB_USER,
    password: process.env.APICASH_DB_PASSWORD,
    database: process.env.APICASH_DB_NAME,
});
const cache = require("../index").cache;
const arrayUtils = require("../utils/utilities/Array");

type Message = {
    mes_id: number,
    mess_content: string,
    mess_begin: number,
    mess_end: number,
    // mess_site: string,
    // USR_0: string
}

/**
 * Set global message on apiCash
 * @param {Services} service The service that is the target of the message
 * @param {number} scenarioPriority The priority of the scenario (for the inCache name)
 * @param {string} messageContent The content of the message
 * @returns {Promise<void>}
 */
export async function sendGlobalMessage (service: Services, scenarioPriority: number, messageContent: string) : Promise<void> {
    const inCacheName: string = `${service.name}_apiCash_message_${scenarioPriority}`;
    const cachedMessage: Message | undefined = cache.get(inCacheName);

    if (cachedMessage === undefined) {
        // VERIFY IF MESSAGE EXISTS WITH ANOTHER PRIORITY
        const priorities: number[] = [1, 2, 3, 4];
        const prioritiesToTest: number[] = priorities.filter((priority: number) => priority !== scenarioPriority);
        const prioritiesToSuppress: number[] = [];

        for (const priority of prioritiesToTest)
            if (priority > scenarioPriority) prioritiesToSuppress.push(priority);

        for (const priority of prioritiesToSuppress) {
            const inCacheName: string = `${service.name}_apiCash_message_${priority}`;
            const cachedMessage: Message | undefined = cache.get(inCacheName);
            if (cachedMessage !== undefined) {
                await deleteMessage(cachedMessage.mes_id);
                cache.del(inCacheName);
            }
        }
        // IF NOT THE SAME CONTENT, THEN MESSAGE WITH HIGHER PRIORITY PROBABLY EXISTS
        if (!(await arrayUtils.compareArrays(prioritiesToSuppress, prioritiesToTest))) {
            const higherPriorities: number[] = prioritiesToTest.filter((priority: number) => prioritiesToSuppress.indexOf(priority) === -1);
            for (const priority of higherPriorities) {
                const inCacheName: string = `${service.name}_apiCash_message_${priority}`;
                const cachedMessage: Message | undefined = cache.get(inCacheName);
                if (cachedMessage !== undefined) return;
            }
        }

        // MESSAGE CREATE
        const createdMessage = await createMessage(messageContent);
        const message = await getMessage(createdMessage.mes_id as number);
        message["priority"] = scenarioPriority;
        cache.set(inCacheName, message, 60*60);
        return;
    }

    // * MESSAGE UPDATE

    // IF MESSAGE END DATE IS REACHED
    if (cachedMessage.mess_end < Date.now() / 1000) {
        const today: Date = new Date();
        const messageEndDate: Date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        await updateMessageEndDate(cachedMessage.mes_id, messageEndDate);
    }

    // IF MESSAGE CONTENT IS DIFFERENT
    if (cachedMessage.mess_content !== messageContent) {
        await updateMessageContent(cachedMessage.mes_id, messageContent);
        cache.set(inCacheName, (await getMessage(cachedMessage.mes_id))["priority"] = scenarioPriority, 60*60);
    }
}

/**
 * Create a message on apiCash
 * @param {string} messageContent The content of the message
 * @returns {Promise<any>}
 * @throws {Error} If an error occurred while creating the message
 */
async function createMessage(messageContent: string): Promise<any> {
    const today: Date = new Date();
    const messageEndDate: Date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return new Promise((resolve, reject): void => {
        connection.query("INSERT INTO m_apicash_message (mess_content, mess_begin, mess_end, USR_0, priority) VALUES (?, ?, ?, ?, 1)", [messageContent, today.getTime() / 1000, messageEndDate.getTime() / 1000, ""], (err: any, result: any) => {
            if (err) throw err;
            console.log(theme.success("Message created successfully : " + JSON.stringify(result)));
            resolve({
                mes_id: result.insertId,
            });
        });
    });
}

/**
 * Update a message content from apiCash with its id
 * @param {number} messageId The id of the message to update
 * @param {string} messageContent The new content of the message
 * @returns {Promise<void>}
 * @throws {Error} If an error occurred while updating the message content
 */
async function updateMessageContent(messageId: number, messageContent: string): Promise<void> {
    connection.query("UPDATE m_apicash_message SET mess_content = ? WHERE mes_id = ?", [messageContent, messageId], (err: any, result: any) => {
        if (err) throw err;
        console.log(theme.success("Message content updated successfully : " + JSON.stringify(result)));
    });
}

/**
 * Update a message end date from apiCash with its id
 * @param {number} messageId The id of the message to update
 * @param {Date} messageEndDate The new end date of the message
 * @returns {Promise<void>}
 * @throws {Error} If an error occurred while updating the message end date
 */
async function updateMessageEndDate(messageId: number, messageEndDate: Date): Promise<void> {
    connection.query("UPDATE m_apicash_message SET mess_end = ? WHERE mes_id = ?", [messageEndDate.getTime() / 1000, messageId], (err: any, result: any) => {
        if (err) throw err;
        console.log(theme.success("Message end date updated successfully : " + JSON.stringify(result)));
    });
}

/**
 * Delete a message from apiCash with its id
 * @param {number} messageId The id of the message to delete
 * @returns {Promise<void>}
 */
export async function deleteMessage(messageId: number): Promise<void> {
    connection.query("DELETE FROM m_apicash_message WHERE mes_id = ?", [messageId], (err: any, result: any): void => {
        if (err) throw err;
        console.log(theme.success("Message deleted successfully : " + JSON.stringify(result)));
    });
}

/**
 * Get message from apiCash with its id
 * @param {number} messageId The id of the message to get
 * @returns {Promise<any>}
 * @throws {Error} If an error occurred while getting the message
 */
async function getMessage(messageId: number): Promise<any> {
    return new Promise((resolve, reject): void => {
        connection.query("SELECT * FROM m_apicash_message WHERE mes_id = ?", [messageId], (err: any, result: any) => {
            if (err) reject(err);
            console.log(theme.success("Message retrieved successfully : " + JSON.stringify(result)));

            resolve({
                mes_id: result[0].mes_id,
                mess_content: result[0].mess_content,
                mess_begin: result[0].mess_begin,
                mess_end: result[0].mess_end,
            });
        });
    });
}

import { theme } from "../ColorScheme";

const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.APICASH_DB_HOST,
    user: process.env.APICASH_DB_USER,
    password: process.env.APICASH_DB_PASSWORD,
    database: process.env.APICASH_DB_NAME,
});

/**
 * Create a message on apiCash
 * @param {string} messageContent The content of the message
 * @returns {Promise<any>}
 * @throws {Error} If an error occurred while creating the message
 */
export async function createMessage(messageContent: string): Promise<any> {
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
export async function updateMessageContent(messageId: number, messageContent: string): Promise<void> {
    connection.query("UPDATE m_apicash_message SET mess_content = ? WHERE mess_id = ?", [messageContent, messageId], (err: any, result: any) => {
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
export async function updateMessageEndDate(messageId: number, messageEndDate: Date): Promise<void> {
    connection.query("UPDATE m_apicash_message SET mess_end = ? WHERE mess_id = ?", [messageEndDate.getTime() / 1000, messageId], (err: any, result: any) => {
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
    connection.query("DELETE FROM m_apicash_message WHERE mess_id = ?", [messageId], (err: any, result: any): void => {
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
export async function getMessage(messageId: number): Promise<any> {
    return new Promise((resolve, reject): void => {
        connection.query("SELECT * FROM m_apicash_message WHERE mess_id = ?", [messageId], (err: any, result: any) => {
            if (err) reject(err);
            console.log(theme.success("Message retrieved successfully : " + JSON.stringify(result)));

            resolve({
                mess_id: result[0].mess_id,
                mess_content: result[0].mess_content,
                mess_begin: result[0].mess_begin,
                mess_end: result[0].mess_end,
            });
        });
    });
}
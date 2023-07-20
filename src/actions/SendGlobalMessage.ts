
const theme = require("../utils/ColorScheme").theme;
const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.APICASH_DB_HOST,
    user: process.env.APICASH_DB_USER,
    password: process.env.APICASH_DB_PASSWORD,
    database: process.env.APICASH_DB_NAME,
});

/**
 * Set global message on apiCash
 * @returns {Promise<void>}
 * @throws {Error} If the email is null or undefined
 * @throws {Error} If the message is null or undefined
 * @throws {Error} If the email is not valid
 * @throws {Error} If the email is not reachable
 */
export async function sendGlobalMessage (email: string, message: string) : Promise<void> {
    // TODO : need to keep created messages in db in order to delete them later if needed
    // TODO: Need to store messageId in cache, but how to identify the message ?
}

/**
 * Create a message on apiCash
 * @param {string} messageContent The content of the message
 * @returns {Promise<void>}
 * @throws {Error} If an error occurred while creating the message
 */
async function createMessage(messageContent: string) {
    const today = new Date();
    const messageEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    console.log(today.getTime());
    connection.query("INSERT INTO m_apicash_message (mess_content, mess_begin, mess_end, USR_0) VALUES (?, ?, ?, ?)", [messageContent, today.getTime() / 1000, messageEndDate.getTime() / 1000, ""], (err: any, result: any) => {
        if (err) throw err;
        console.log(theme.success("Message created successfully : " + result.toString()));
    });
}

/**
 * Update a message content from apiCash with its id
 * @param {number} messageId The id of the message to update
 * @param {string} messageContent The new content of the message
 * @returns {Promise<void>}
 * @throws {Error} If an error occurred while updating the message content
 */
async function updateMessageContent(messageId: number, messageContent: string) {
    connection.query("UPDATE m_apicash_message SET mess_content = ? WHERE mes_id = ?", [messageContent, messageId], (err: any, result: any) => {
        if (err) throw err;
        console.log(theme.success("Message content updated successfully : " + result.toString()));
    });
}

/**
 * Update a message end date from apiCash with its id
 * @param {number} messageId The id of the message to update
 * @param {Date} messageEndDate The new end date of the message
 * @returns {Promise<void>}
 * @throws {Error} If an error occurred while updating the message end date
 */
async function updateMessageEndDate(messageId: number, messageEndDate: Date) {
    connection.query("UPDATE m_apicash_message SET mess_end = ? WHERE mes_id = ?", [messageEndDate.getTime() / 1000, messageId], (err: any, result: any) => {
        if (err) throw err;
        console.log(theme.success("Message end date updated successfully : " + result.toString()));
    });
}

/**
 * Delete a message from apiCash with its id
 * @param {number} messageId The id of the message to delete
 * @returns {Promise<void>}
 */
async function deleteMessage(messageId: number) {
    connection.query("DELETE FROM m_apicash_message WHERE mes_id = ?", [messageId], (err: any, result: any) => {
        if (err) throw err;
        console.log(theme.success("Message deleted successfully : " + result.toString()));
    });
}

/**
 * Get message from apiCash with its id
 * @param {number} messageId The id of the message to get
 * @returns {Promise<any>}
 * @throws {Error} If an error occurred while getting the message
 */
async function getMessage(messageId: number) {
    return new Promise((resolve, reject) => {
        connection.query("SELECT * FROM m_apicash_message WHERE mes_id = ?", [messageId], (err: any, result: any) => {
            if (err) reject(err);
            console.log(theme.success("Message retrieved successfully : " + result.toString()));
            resolve(result);
        });
    });
}
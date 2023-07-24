
const axios = require('axios').default;

/**
 * Send a message to someone
 * @param {string} number The number to send the message to
 * @param {string} message The message to send
 * @returns {Promise<void>}
 */
export async function sendMessage (number: string, message: string) : Promise<void> {
    await axios.post(process.env.SEND_SMS_ROUTE + "?numeros=[\"" + number + "\"]&message=" + message);
}
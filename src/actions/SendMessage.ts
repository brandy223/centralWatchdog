
import { Actors } from "@prisma/client";

const axios = require('axios').default;
const { theme } = require("../utils/ColorScheme");

import { PingTemplate, ServiceTestTemplate} from "../templates/DataTemplates";

let lastMessageSent = new Map<number, number>;

/**
 * Send message to a list of actors
 * @param {Actors[]} actors The actors to send the message to
 * @param {PingTemplate | ServiceTestTemplate} message The message content
 * @returns {Promise<void>}
 * @throws {Error} If the list of actors is empty
 */
export async function main(actors: Actors[], message: PingTemplate | ServiceTestTemplate) : Promise<void> {
    if (actors.length === 0) throw new Error("No actors given");

    for (const actor of actors) {
        if (actor.number === null || actor.number === "") {
            console.log(theme.warning(`Actor ${actor.id} has no number`));
            continue;
        }
        const lastMessageSentTime: number | undefined = lastMessageSent.get(actor.id);
        if (lastMessageSentTime !== undefined && Math.abs(lastMessageSentTime - Date.now()) < Number(process.env.MESSAGE_COOLDOWN)) {
            console.log(theme.warning(`Actor ${actor.id} has already been notified less than ${process.env.MESSAGE_COOLDOWN}ms ago`));
            continue;
        }
        lastMessageSent.set(actor.id, Date.now());

        let messageContent: string = "";
        switch (message.messageType) {
            case 1:
                if (message instanceof PingTemplate) messageContent = `Problem with Server : ${message.server.ip} ! More info in mail.`;
                break;
            case 2:
                if (message instanceof ServiceTestTemplate) messageContent = `Problem with Service : ${message.service.name} on Server : ${message.server.ip} ! More info in mail.`;
                break;
            default:
                console.log(theme.error("Unknown message type"));
                return;
        }

        await sendMessage(actor.number, messageContent);
    }
}

/**
 * Send a message to someone
 * @param {string} number The number to send the message to
 * @param {string} message The message to send
 * @returns {Promise<void>}
 */
export async function sendMessage (number: string, message: string) : Promise<void> {
    await axios.post(process.env.SEND_SMS_ROUTE + "?numeros=[\"" + number + "\"]&message=" + message);
    console.log(theme.info(`Message sent to ${number}`));
}
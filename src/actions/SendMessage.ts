
import { Actors } from "@prisma/client";

const axios = require('axios').default;
const { theme } = require("../utils/ColorScheme");

import {
    PfSenseServiceTemplate,
    PingTemplate,
    ServiceDataTemplate,
    ServiceTestTemplate
} from "../templates/DataTemplates";
import {config} from "../index";

let lastMessageSent = new Map<number, number>;

/**
 * Send message to a list of actors
 * @param {Actors[]} actors The actors to send the message to
 * @param {PingTemplate | ServiceTestTemplate | PfSenseServiceTemplate | ServiceDataTemplate} message The message content
 * @returns {Promise<void>}
 * @throws {Error} If the list of actors is empty
 */
export async function main(actors: Actors[], message: PingTemplate | ServiceTestTemplate | PfSenseServiceTemplate | ServiceDataTemplate) : Promise<void> {
    if (actors.length === 0) throw new Error("No actors given");

    for (const actor of actors) {
        if (actor.number === null || actor.number === "") {
            console.log(theme.warning(`Actor ${actor.id} has no number`));
            continue;
        }

        const lastMessageSentTime: number | undefined = lastMessageSent.get(actor.id);
        if (lastMessageSentTime !== undefined) {
            const intervalTime: number = Math.abs(lastMessageSentTime - Date.now());
            if (intervalTime < config.message.cooldown) {
                console.log(theme.warning(`Actor ${actor.id} has already been notified less than ${config.message.cooldown}ms ago (${intervalTime}ms)`));
                continue;
            }
        }

        let messageContent: string = "";
        switch (message.messageType) {
            case 1:
                if (message instanceof PingTemplate) messageContent = `Problem with Server : ${message.server.ip} ! More info in mail.`;
                break;
            case 2:
                if (message instanceof ServiceTestTemplate) messageContent = `Problem with Service : ${message.service.name} on Server : ${message.server.ip} ! More info in mail.`;
                break;
            case 3:
                if (message instanceof PfSenseServiceTemplate) messageContent = `Problem with PfSense Service : ${message.pfSenseService.name} on Server : ${message.pfSense.ip} ! More info in mail.`;
                break;
            case 4:
                if (message instanceof  ServiceDataTemplate) messageContent = `Problem with Service Data : ${message.serviceData.name} : ${message.value}. Status : ${message.status.toString()}. More info in mail.`
                break;
            default:
                console.log(theme.error("Unknown message type"));
                return;
        }
        if (messageContent === "") {
            console.log(theme.error("Message content is empty"));
            return;
        }

        lastMessageSent.set(actor.id, Date.now());
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
    await axios.post(config.apis.sms_url + "?numeros=[\"" + number + "\"]&message=" + message);
    console.log(theme.info(`Message sent to ${number}`));
}
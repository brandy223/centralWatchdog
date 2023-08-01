import {Services, ServicesObjects} from "@prisma/client";
import {
    PingTemplate,
    ServiceDataTemplate,
    ServiceTestTemplate
} from "../templates/DataTemplates";
import {theme} from "../utils/ColorScheme";
import {config} from "../index";

// DATABASE
const apiCash = require("../utils/database/ApiCash");
const sv = require("../utils/database/Services");
const o = require("../utils/database/ServiceObject");

const arrayUtils = require("../utils/utilities/Array");

type Message = {
    mes_id: number,
    mess_content: string,
    mess_begin: number,
    mess_end: number,
    // mess_site: string,
    // USR_0: string,
    // priority: number
}

/**
 * Set global message on apiCash
 * @param {string} inCacheName The inCache name of the message
 * @param {string} messageContent The content of the message
 * @param {number} scenarioPriority The priority of the scenario
 * @returns {Promise<void>}
 */
export async function main (inCacheName: string, messageContent: string, scenarioPriority: number) : Promise<void> {
    const cache = require("../index").cache;
    const cachedMessage: Message | undefined = cache.get(inCacheName);

    if (cachedMessage === undefined) {
        // VERIFY IF MESSAGE EXISTS WITH ANOTHER PRIORITY
        const priorities: number[] = [1, 2, 3, 4];
        const prioritiesToTest: number[] = priorities.filter((priority: number) => priority !== scenarioPriority);
        const prioritiesToSuppress: number[] = [];

        for (const priority of prioritiesToTest)
            if (priority > scenarioPriority) prioritiesToSuppress.push(priority);

        for (const priority of prioritiesToSuppress) {
            let newCacheName: string = inCacheName.substring(0, inCacheName.length - 1) + priority;
            const cachedMessage: Message | undefined = cache.get(newCacheName);
            if (cachedMessage !== undefined) {
                await apiCash.deleteMessage(cachedMessage.mes_id);
                cache.del(newCacheName);
            }
        }
        // IF NOT THE SAME CONTENT, THEN MESSAGE WITH HIGHER PRIORITY PROBABLY EXISTS
        if (!(await arrayUtils.compareArrays(prioritiesToSuppress, prioritiesToTest))) {
            const higherPriorities: number[] = prioritiesToTest.filter((priority: number) => prioritiesToSuppress.indexOf(priority) === -1);
            for (const priority of higherPriorities) {
                let newCacheName: string = inCacheName.substring(0, inCacheName.length - 1) + priority;
                const cachedMessage: Message | undefined = cache.get(newCacheName);
                if (cachedMessage !== undefined) return;
            }
        }

        // MESSAGE CREATE
        const createdMessage = await apiCash.createMessage(messageContent);
        const message = await apiCash.getMessage(createdMessage.mes_id as number);
        message["priority"] = scenarioPriority;
        cache.set(inCacheName, message, config.apiCash.cache_duration);
        return;
    }

    // * MESSAGE UPDATE

    // IF MESSAGE END DATE IS REACHED
    if (cachedMessage.mess_end < Date.now() / 1000) {
        const today: Date = new Date();
        const messageEndDate: Date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        await apiCash.updateMessageEndDate(cachedMessage.mes_id, messageEndDate);
    }

    // IF MESSAGE CONTENT IS DIFFERENT
    if (cachedMessage.mess_content !== messageContent) {
        await apiCash.updateMessageContent(cachedMessage.mes_id, messageContent);
        cache.set(inCacheName, (await apiCash.getMessage(cachedMessage.mes_id))["priority"] == scenarioPriority, 60*60);
    }
}

/**
 * Create the inCache name for the message and its content
 * @param { PingTemplate | ServiceTestTemplate | ServiceDataTemplate } message the message that contains the information
 * @param { number } scenarioPriority the priority of the scenario
 * @returns { string[] } the inCache name and message content
 */
export async function createInCacheNameAndMessageContent (message: (PingTemplate | ServiceTestTemplate | ServiceDataTemplate), scenarioPriority: number) : Promise<string[]> {
    let inCacheName: string = "";
    let messageContent: string = "";

    switch(message.messageType) {
        case 1:
            if (message instanceof PingTemplate) {
                inCacheName = `${message.server.ip}_apiCash_message_${scenarioPriority}`;
                const servicesNames: string[] = await sv.getServicesOfServerById(message.server.id).map((service: Services) => service.name);
                messageContent = `Le serveur ${message.server.ip} est injoignable. Les services suivants sont impactés : ${servicesNames.join(", ")}`;
                //? TODO: implement state value description ??
            }
            break;
        case 2:
            if (message instanceof ServiceTestTemplate) {
                inCacheName = `${message.service.name}_apiCash_message_${scenarioPriority}`;
                const objectsNames: string[] = (await o.getServiceObjectsOfServiceById(message.service.id)).map((object: ServicesObjects) => object.name);
                messageContent = `Le service ${message.service.name} est injoignable. Les objets suivants sont impactés : ${objectsNames.join(", ")}`;
                //? TODO: implement state value description ??
            }
            break;
        case 3:
            // TODO: TO BE IMPLEMENTED
            break;
        case 4:
            if (message instanceof ServiceDataTemplate) {
                inCacheName = `${message.serviceData.name}_apiCash_message_${scenarioPriority}`;
                messageContent = `UNDEFINED`;
                // TODO: Define message content HERE
            }
            break;
        default:
            console.log(theme.error("Message type not recognized"));
            break;
    }
    return [inCacheName, messageContent];
}
import {Servers, Services} from "@prisma/client";

// DATABASE
const apiCash = require("../utils/database/ApiCash");

const cache = require("../index").cache;
const arrayUtils = require("../utils/utilities/Array");

type Message = {
    mes_id: number,
    mess_content: string,
    mess_begin: number,
    mess_end: number,
    // mess_site: string,
    // USR_0: string
    // priority: number
}

/**
 * Set global message on apiCash
 * @param {Services | Servers} target The service that is the target of the message
 * @param {number} scenarioPriority The priority of the scenario (for the inCache name)
 * @param {string} messageContent The content of the message
 * @returns {Promise<void>}
 */
export async function main (target: Services | Servers, scenarioPriority: number, messageContent: string) : Promise<void> {
    let inCacheName: string = "";
    if (typeof target === "Services") inCacheName = `${target.name}_apiCash_message_${scenarioPriority}`;
    else inCacheName = `${target.ipAddr}_apiCash_message_${scenarioPriority}`;

    const cachedMessage: Message | undefined = cache.get(inCacheName);

    if (cachedMessage === undefined) {
        // VERIFY IF MESSAGE EXISTS WITH ANOTHER PRIORITY
        const priorities: number[] = [1, 2, 3, 4];
        const prioritiesToTest: number[] = priorities.filter((priority: number) => priority !== scenarioPriority);
        const prioritiesToSuppress: number[] = [];

        for (const priority of prioritiesToTest)
            if (priority > scenarioPriority) prioritiesToSuppress.push(priority);

        for (const priority of prioritiesToSuppress) {
            let inCacheName: string = "";
            if (typeof target === "Services") inCacheName = `${target.name}_apiCash_message_${scenarioPriority}`;
            else inCacheName = `${target.ipAddr}_apiCash_message_${scenarioPriority}`;
            const cachedMessage: Message | undefined = cache.get(inCacheName);
            if (cachedMessage !== undefined) {
                await apiCash.deleteMessage(cachedMessage.mes_id);
                cache.del(inCacheName);
            }
        }
        // IF NOT THE SAME CONTENT, THEN MESSAGE WITH HIGHER PRIORITY PROBABLY EXISTS
        if (!(await arrayUtils.compareArrays(prioritiesToSuppress, prioritiesToTest))) {
            const higherPriorities: number[] = prioritiesToTest.filter((priority: number) => prioritiesToSuppress.indexOf(priority) === -1);
            for (const priority of higherPriorities) {
                let inCacheName: string = "";
                if (typeof target === "Services") inCacheName = `${target.name}_apiCash_message_${scenarioPriority}`;
                else inCacheName = `${target.ipAddr}_apiCash_message_${scenarioPriority}`;
                const cachedMessage: Message | undefined = cache.get(inCacheName);
                if (cachedMessage !== undefined) return;
            }
        }

        // MESSAGE CREATE
        const createdMessage = await apiCash.createMessage(messageContent);
        const message = await apiCash.getMessage(createdMessage.mes_id as number);
        message["priority"] = scenarioPriority;
        cache.set(inCacheName, message, 60*60);
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
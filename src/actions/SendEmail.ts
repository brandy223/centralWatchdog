
import {Actors, StateValues} from "@prisma/client";
import {config} from "../index";

import {PingTemplate, ServiceDataTemplate, ServiceTestTemplate} from "../templates/DataTemplates";

const validator = require('email-validator');
const theme = require("../utils/ColorScheme").theme;
const nodemailer = require('nodemailer');
const mailerConfig = {
    mail: {
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        ignoreTLS: config.mail.ignoreTLS
    }
};
const transporter = nodemailer.createTransport(mailerConfig.mail, {
    from: `Watchdog <${config.mail.author}>`,
});

/**
 * Email object
 * @param {string} receiver The email receiver
 * @param {string} subject The email subject
 * @param {string} text The email text
 * @param {string} html The email html
 */
interface Email {
    receiver: string;
    subject: string;
    text: string;
    html: string;
}

let lastEmailSent = new Map<number, number>;

/**
 * Send email to a list of actors
 * @param {Actors[]} actors The actors to send the email to
 * @param {PingTemplate | ServiceTestTemplate | ServiceDataTemplate} message The type of message
 * @param {StateValues} stateValue The state value
 * @returns {Promise<void>}
 * @throws {Error} If the list of actors is empty
 */
export async function main(actors: Actors[], message: PingTemplate | ServiceTestTemplate | ServiceDataTemplate, stateValue: StateValues) : Promise<void> {
    if (actors.length === 0) throw new Error("No actors given");

    for (const actor of actors) {
        if (actor.email === null) {
            console.log(theme.warning(`Actor ${actor.id} has no email`));
            continue;
        }

        const lastEmailSentTime: number | undefined = lastEmailSent.get(actor.id);
        if (lastEmailSentTime !== undefined) {
            const intervalTime: number = Math.abs(lastEmailSentTime - Date.now());
            if (intervalTime < config.mail.cooldown) {
                console.log(theme.warning(`Actor ${actor.id} has already been notified less than ${config.mail.cooldown}ms ago (${intervalTime}ms)`));
                continue;
            }
        }
        lastEmailSent.set(actor.id, Date.now());
        await email(actor.email, message, stateValue);
    }
}

/**
 * Main function to send an email
 * @param {string} to The email receiver
 * @param {PingTemplate | ServiceTestTemplate | ServiceDataTemplate} message The type of message
 * @param {StateValues} stateValue The state value
 * @returns {Promise<void>}
 * @throws {Error} If the email is not valid
 * @example of data: {server: { id: 1, ipAddr: "192.168.10.58" }, status: "KO", statusInfo: ["false", "0 out of 10"]"}
 */
export async function email(to: string, message: PingTemplate | ServiceTestTemplate | ServiceDataTemplate, stateValue: StateValues): Promise<void> {
    if (!validator.validate(to)) throw new Error("Email is not valid");
    const emailToSend = await emailConstructor(to, message, stateValue);
    await sendEmail(emailToSend);
}

/**
 * Email constructor
 * @param {string} email
 * @param {PingTemplate | ServiceTestTemplate | ServiceDataTemplate} message The type of message
 * @param {StateValues} stateValue The state value
 * @returns {Promise<Email>}
 * @throws {Error} If the type of message is not valid
 */
async function emailConstructor(email: string, message: PingTemplate | ServiceTestTemplate | ServiceDataTemplate, stateValue: StateValues): Promise<Email> {
    let subject: string = "";
    let text: string = "";
    let html: string = "";
    let data: string = "";

    switch (message.messageType) {
        // SERVER PING
        case 1:
            if (message instanceof PingTemplate) {
                data = message.pingInfo.join(", ");
                subject = `Server ${message.server.ip} is ${message.status}`;
                text = `Server ${message.server.ip} is ${message.status}<br><u>More info:</u> ${data}`;
                html = `<h3>${subject}</h3><p>${text}</p>`;
            }
            break;
        // SERVICE TEST
        case 2:
            if (message instanceof ServiceTestTemplate) {
                data = message.status[1];
                const status: string = message.status[1] === "true" ? "active" : "inactive";
                subject = `Service ${message.service.name}'s status on Server ${message.server.ip} is ${status}`;
                text = `Service ${message.service.name}'s status on Server ${message.server.ip} is ${message.status[1]}<br><u>More info:</u> ${data}`;
                html = `<h3>${subject}</h3><p>${text}</p>`;
            }
            break;
        case 4:
            if (message instanceof ServiceDataTemplate) {
                data = stateValue.description ? stateValue.description : "No Data";
                subject = `Service Data ${message.serviceData.name}'s value : ${message.value}`;
                text = `Service Data ${message.serviceData.name} request's status : ${message.status[0]}<br><u>State value description :</u> ${data}`;
                html = `<h3>${subject}</h3><p>${text}</p>`;
            }
            break;
        default:
            throw new Error("Type of message is not valid");
    }

    return {
        receiver: email,
        subject: subject,
        text: text,
        html: html
    }
}

/**
 * Email someone
 * @param {Email} email The email object
 * @returns {Promise<void>}
 * @throws {Error} If the email is not reachable
 */
async function sendEmail (email: Email) : Promise<void> {
    const mail = {
        to: email.receiver,
        subject: email.subject,
        text: email.text,
        html: email.html
    };

    await transporter.sendMail(mail, (err: Error, info: any) => {
        if (err) {
            console.log(theme.bgError("Email not sent: " + err));
            return;
        }
        console.log(theme.successBright('Email sent: ' + info.response));
    });
}
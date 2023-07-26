
import {Actors} from "@prisma/client";

const validator = require('email-validator');
const theme = require("../utils/ColorScheme").theme;
const nodemailer = require('nodemailer');
const config = {
    mail: {
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        secure: false,
        ignoreTLS: true,
    }
};
const transporter = nodemailer.createTransport(config.mail, {
    from: `Watchdog <${process.env.MAIL_AUTHOR}>`,
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
 * @param {number} typeOfMessage The type of message
 * @param {any} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the list of actors is empty
 */
export async function main(actors: Actors[], typeOfMessage: number, data: any) : Promise<void> {
    if (actors.length === 0) throw new Error("No actors given");

    console.log(actors);

    for (const actor of actors) {
        if (actor.email === null) {
            console.log(theme.warning(`Actor ${actor.id} has no email`));
            continue;
        }
        const lastEmailSentTime: number | undefined = lastEmailSent.get(actor.id);
        if (lastEmailSentTime !== undefined && Math.abs(lastEmailSentTime - Date.now()) < Number(process.env.EMAIL_COOLDOWN)) {
            console.log(theme.warning(`Actor ${actor.id} has already been notified less than ${process.env.EMAIL_COOLDOWN}ms ago`));
            continue;
        }
        lastEmailSent.set(actor.id, Date.now());
        await email(actor.email, typeOfMessage, data);
    }
}

/**
 * Main function to send an email
 * @param {string} to The email receiver
 * @param {number} typeOfMessage The type of message
 * @param {any} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the email is not valid
 * @example of data: {server: { id: 1, ipAddr: "192.168.10.58" }, status: "KO", statusInfo: ["false", "0 out of 10"]"}
 */
export async function email(to: string, typeOfMessage: number, data: any): Promise<void> {
    if (!validator.validate(to)) throw new Error("Email is not valid");
    const emailToSend = await emailConstructor(to, typeOfMessage, data);
    await sendEmail(emailToSend);
}

/**
 * Email constructor
 * @param {string} email
 * @param {number} typeOfMessage
 * @param {any} data
 * @returns {Promise<Email>}
 * @throws {Error} If the type of message is not valid
 */
async function emailConstructor(email: string, typeOfMessage: number, data: any): Promise<Email> {
    let subject: string = "";
    let text: string = "";
    let html: string = "";

    switch (typeOfMessage) {
        // SERVER PING
        case 0:
            subject = `Server ${data.server.ipAddr} is ${data.status}`;
            console.log(data);
            data.statusInfo.shift()
            text = `Server ${data.server.ipAddr} is ${data.status}<br><u>More info:</u> ${data.statusInfo}`;
            html = `<h3>${subject}</h3><p>${text}</p>`;
            break;
        // SERVICE TEST
        case 1:
           subject = `Service ${data.service.name} on server ${data.server.ipAddr} is ${data.status}`;
            text = `Service ${data.service.name} on server ${data.server.ipAddr} is ${data.status}\nMore info: ${data.statusInfo}`;
            html = `<h3>Service ${data.service.name} on server ${data.server.ipAddr} is ${data.status}</h3>`;
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
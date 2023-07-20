
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

/**
 * Main function to send an email
 * @param {string} email
 * @param {number} typeOfMessage
 * @param {any} data
 * @returns {Promise<void>}
 * @throws {Error} If the email is not valid
 * @example of data: {server: { id: 1, ipAddr: "192.168.10.58" }, status: "KO", statusInfo: ["false", "0 out of 10"]"}
 */
export async function main(email: string, typeOfMessage: number, data: any): Promise<void> {
    if (!validator.validate(email)) throw new Error("Email is not valid");
    const emailToSend = await emailConstructor(email, typeOfMessage, data);
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
            data.statusInfo.shift()
            text = `Server ${data.server.ipAddr} is ${data.status}<br><u>More info:</u> ${data.statusInfo}`;
            html = `<h3>${subject}</h3><p>${text}</p>`;
            break;
        // SERVICE TEST
        // case 1:
        //     subject = `Service ${data.service.name} on server ${data.server.ipAddr} is ${data.status}`;
        //     text = `Service ${data.service.name} on server ${data.server.ipAddr} is ${data.status}\nMore info: ${data.statusInfo}`;
        //     html = `<h3>Service ${data.service.name} on server ${data.server.ipAddr} is ${data.status}</h3>`;
        //     break;
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
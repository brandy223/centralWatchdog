
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
 * Email someone
 * @param {string} email The email to send the message to
 * @param {number} typeOfMessage The type of message to send
    * @param {any} data The data to send
 * @returns {Promise<void>}
 * @throws {Error} If the email is not valid
 * @throws {Error} If the email is not reachable
 * @example of data: {server: { id: 1, ipAddr: "192.168.10.58" }, status: "KO", statusInfo: ["false", "0 out of 10"]"}
 */
export async function sendEmail (email: string, typeOfMessage: number, data: any) : Promise<void> {

    if (!validator.validate(email)) throw new Error("Email is not valid");

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

    const mail = {
        to: email,
        subject: subject,
        text: text,
        html: html
    };

    await transporter.sendMail(mail, (err: Error, info: any) => {
        if (err) {
            console.log(theme.bgError("Email not sent: " + err));
            return;
        }
        console.log(theme.successBright('Email sent: ' + info.response));
    });
}
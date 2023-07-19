
const validator = require('email-validator');

const nodemailer = require('nodemailer');
const config = {
    mail: {
        host: process.env.MAIL_HOST,
        // port: process.env.MAIL_PORT,
        secure: false,
        port: 25,
        // auth: {
        //     user: process.env.MAIL_AUTH_USER,
        //     pass: process.env.MAIL_AUTH_PASS
        // },
        // tls: {
        //     rejectUnauthorized: true,
        //     minVersion: 'TLSv1.2',
        // }
        ignoreTLS: true,
    }
};
const transporter = nodemailer.createTransport(config, {
    from: `TEST <${process.env.MAIL_AUTHOR}>`
});

/**
 * Email someone
 * @param {string} email The email to send the message to
 * @param {string} message The message to send
 * @returns {Promise<void>}
 * @throws {Error} If the email is not valid
 * @throws {Error} If the email is not reachable
 */
export async function sendEmail (email: string, message: string) : Promise<void> {

    if (!validator.validate(email)) throw new Error("Email is not valid");

    const mail = {
        to: email,
        subject: 'TEST',
        text: message,
        // html: message
    };

    await transporter.sendMail(mail, (err: Error, info: any) => {
        if (err) throw new Error("Email not sent");
        console.log('Email sent: ' + info.response);
        // TODO: proper email + logs
    });
}
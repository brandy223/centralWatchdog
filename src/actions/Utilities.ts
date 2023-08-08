import {AxiosResponse} from "axios";
import {config} from "../index";
import {theme} from "../utils/ColorScheme";
const axios = require('axios');

/**
 * Verify if someone is free to receive a message / mail
 * @param {number} id The id of the person
 * @returns {Promise<boolean>} True if the person is free, false otherwise
 */
export async function isPersonFree (id: number) : Promise<boolean> {
    const today: Date = new Date();
    const day: number = today.getDate();
    const month: number = today.getMonth() + 1;
    const year: number = today.getFullYear();
    let apiUrl: string = config.apis.holidays_url
        .replace("${day}", day.toString())
        .replace("${month}", month.toString())
        .replace("${year}", year.toString())
        .replace("${id}", id.toString());
    const res: AxiosResponse<any> = await axios.get(apiUrl);

    if (JSON.stringify(res.data).includes("undefined")) {
        console.log(theme.warning("Person ID does not exist"));
        return false;
    }
    return !JSON.stringify(res.data).includes("Absent");
}

/**
 * Verify if it is the good time to send a message / mail
 * @returns {Promise<boolean>} True if it is the good time, false otherwise
 */
export async function isItTheGoodTime() : Promise<boolean> {
    const date: Date = new Date();
    const hour: number = date.getHours();
    return hour <= config.misc.max_hour && hour >= config.misc.min_hour;
}
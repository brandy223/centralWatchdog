import {AxiosResponse} from "axios";
const axios = require('axios');

/**
 * Verify if someone is free to receive a message / mail
 * @param {number} id The id of the person
 * @returns {Promise<boolean>} True if the person is free, false otherwise
 * @throws {Error} If the person ID does not exist
 */
export async function isPersonFree (id: number) : Promise<boolean> {
    const today: Date = new Date();
    const day: number = today.getDate();
    const month: number = today.getMonth() + 1;
    const year: number = today.getFullYear();
    let apiUrl: string = `http://manager.reseau.lan/index.php/checkDispoUserByDate?date-debut=${month}/${day}/${year}&id=${id}`
    const res: AxiosResponse<any> = await axios.get(apiUrl);

    if (JSON.stringify(res.data).includes("undefined")) throw new Error("Person ID does not exist");
    return !JSON.stringify(res.data).includes("Absent");
}
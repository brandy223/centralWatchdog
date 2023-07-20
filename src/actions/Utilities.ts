
const axios = require('axios');

/**
 * Verify if someone is free to receive a message / mail
 * @param {number} id The id of the person
 * @returns {Promise<boolean>} True if the person is free, false otherwise
 * @throws {Error} If the person ID does not exist
 */
export async function isPersonFree (id: number) : Promise<boolean> {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    let apiUrl = `http://manager.reseau.lan/index.php/checkDispoUserByDate?date-debut=${month}/${day}/${year}&id=${id}`
    const res = await axios.get(apiUrl);

    if (JSON.stringify(res.data).includes("undefined")) throw new Error("Person ID does not exist");
    return !JSON.stringify(res.data).includes("Absent");
}
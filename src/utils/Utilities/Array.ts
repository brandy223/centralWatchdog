/**
 * Returns the unique values from an array
 * @param {any[]} array The array to get the unique values from
 * @returns {Promise<any[]>} The unique values
 */
export async function getUniqueValuesFromArray(array: any[]): Promise<any[]> {
    const uniqueValues = [];
    for (const value of array) {
        if (!uniqueValues.includes(value)) uniqueValues.push(value);
    }
    return uniqueValues;
}
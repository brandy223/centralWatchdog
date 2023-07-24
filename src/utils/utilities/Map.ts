
/**
 * Function to get the highest priority state value in a map (key, [boolean, priority])
 * @param {Map<number, [boolean, number]>} map The map to get the highest priority state value from
 * @returns {number} The key to the highest priority state value
 * @throws {Error} If the map is empty
 */
export function getHighestPriorityStateValue(map: Map<number, [boolean, number]>): number {
    if (map.size === 0) throw new Error("Map is empty");
    let highestPriority: number = 0;
    let highestPriorityKey: number = -1;
    for (const [key, [boolean, priority]] of map.entries()) {
        if (boolean && priority > highestPriority) {
            highestPriority = priority;
            highestPriorityKey = key;
        }
    }
    return highestPriorityKey;
}

/**
 * Execute a timed task
 * @param {any[]} functions
 * @param {number[]} intervals
 * @return {Promise<any[]>} Array of setIntervals variables
 * @throws {Error} If the number of functions and intervals is not the same
 */
export async function executeTimedTask(functions: (() => void)[], intervals: number[]): Promise<any[]> {
    if (functions.length !== intervals.length)
        throw new Error("The number of functions and intervals must be the same");

    const intervalsTabs: any[] = [];

    for (let i = 0; i < functions.length; i++) {
        const fct = functions[i];
        const interval: number = intervals[i];

        const intervalVar = setInterval((): void => {
            fct();
        }, interval);

        intervalsTabs.push(intervalVar);
    }
    return intervalsTabs;
}

/**
 * Clear all intervals in an array
 * @param {any[]} intervalsTab Array of setIntervals functions
 * @return {void}
 */
export function clearAllIntervals(intervalsTab: any[]): void {
    if (intervalsTab.length === 0) {
        console.log("The array is empty");
        return;
    }
    for (const interval of intervalsTab) {
        clearInterval(interval);
    }
}
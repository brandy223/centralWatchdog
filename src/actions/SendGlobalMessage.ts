
/**
 * Set global message on apicash
 * @returns {Promise<void>}
 * @throws {Error} If the email is null or undefined
 * @throws {Error} If the message is null or undefined
 * @throws {Error} If the email is not valid
 * @throws {Error} If the email is not reachable
 */
export async function sendGlobalMessage (email: string, message: string) : Promise<void> {
    // TODO : need to keep created messages in db in order to delete them later if needed
}
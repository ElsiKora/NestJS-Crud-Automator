/**
 * Creates a formatted error with the library prefix
 * @param {string} message - The error message
 * @returns {Error} The formatted error object
 */
export function ErrorException(message: string): Error {
	return new Error(`[NestJS-Crud-Automator] ${message}`);
}

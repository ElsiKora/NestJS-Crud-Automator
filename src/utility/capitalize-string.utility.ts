/**
 * Capitalizes the first letter of a string and makes the rest lowercase
 * @param {string} string - The string to capitalize
 * @returns {string} The capitalized string
 */
export function CapitalizeString(string: string): string {
	return string.charAt(0).toUpperCase() + string.toLowerCase().slice(1);
}

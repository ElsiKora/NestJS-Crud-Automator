/**
 * Converts a string to camel case format with special handling for known compound words
 * @param {string} string - The string to convert to camel case
 * @returns {string} The camel-cased string
 */
export function CamelCaseString(string: string): string {
	const knownCompounds: Record<string, string> = {
		getlist: "GetList",
		partialupdate: "PartialUpdate",
	};

	const hasInternalCaps: boolean = /[a-z][A-Z]/.test(string);

	if (hasInternalCaps) {
		const firstChar: string = string.charAt(0).toUpperCase();

		return firstChar + string.slice(1);
	}

	const cleanString: string = string.replaceAll(/[^a-z0-9]+/gi, " ");
	const words: Array<string> = cleanString.split(" ");

	if (words.length === 1 && words[0]) {
		const word: string = words[0].toLowerCase();

		if (knownCompounds[word]) {
			return knownCompounds[word];
		}

		return word.charAt(0).toUpperCase() + word.slice(1);
	}

	return words
		.map((word: string) => {
			if (!word) return "";

			const lowerWord: string = word.toLowerCase();

			if (knownCompounds[lowerWord]) {
				return knownCompounds[lowerWord];
			}

			return word.charAt(0).toUpperCase() + lowerWord.slice(1);
		})
		.join("");
}

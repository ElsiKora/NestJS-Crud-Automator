export function CamelCaseString(string: string): string {
	const knownCompounds: Record<string, string> = {
		getlist: "GetList",
		partialupdate: "PartialUpdate",
	};

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

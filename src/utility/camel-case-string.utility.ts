export function CamelCaseString(string: string): string {
	const cleanString: string = string.replaceAll(/[^a-z0-9]+/gi, " ");

	const words: Array<string> = cleanString.split(" ");

	if (words.length === 1) {
		return words[0].charAt(0).toUpperCase() + words[0].toLowerCase().slice(1);
	}

	return words
		.map((word: string) => {
			if (!word) return "";

			return word.charAt(0).toUpperCase() + word.toLowerCase().slice(1);
		})
		.join("");
}

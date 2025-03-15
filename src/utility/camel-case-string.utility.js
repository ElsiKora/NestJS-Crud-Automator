export function CamelCaseString(string) {
    const knownCompounds = {
        getlist: "GetList",
        partialupdate: "PartialUpdate",
    };
    const cleanString = string.replaceAll(/[^a-z0-9]+/gi, " ");
    const words = cleanString.split(" ");
    if (words.length === 1) {
        const word = words[0].toLowerCase();
        if (knownCompounds[word]) {
            return knownCompounds[word];
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return words
        .map((word) => {
        if (!word)
            return "";
        const lowerWord = word.toLowerCase();
        if (knownCompounds[lowerWord]) {
            return knownCompounds[lowerWord];
        }
        return word.charAt(0).toUpperCase() + lowerWord.slice(1);
    })
        .join("");
}
//# sourceMappingURL=camel-case-string.utility.js.map
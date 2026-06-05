export default {
	"*": (files) => {
		const commands = [`prettier --write --ignore-unknown ${files.join(" ")}`];

		const filteredFiles = files.filter((file) => !file.includes("test/") && !file.includes("tsconfig") && !file.includes("vitest") && !file.includes("CHANGELOG"));

		const eslintFiles = filteredFiles.filter((fileName) => {
			const validExtensions = ["js", "jsx", "mjs", "cjs", "ts", "tsx", "json", "jsonc", "yml", "yaml"];
			const fileExtension = fileName.split(".").pop();
			const hasValidExtension = validExtensions.includes(fileExtension);
			const hasNoExtension = !fileName.includes(".");

			return hasValidExtension && !hasNoExtension;
		});

		return eslintFiles.length > 0 ? [...commands, `eslint --fix --max-warnings=0 --no-ignore ${eslintFiles.join(" ")}`] : commands;
	},
};

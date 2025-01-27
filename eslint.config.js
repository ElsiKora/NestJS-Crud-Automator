import createConfig from "@elsikora/eslint-config";

export default [
	{
		ignores: ["**/node_modules/", "**/.git/", "**/dist/", "**/build/", "**/coverage/", "**/.vscode/", "**/.idea/", "**/*.min.js", "**/*.bundle.js"],
	},
	...createConfig({
		withCheckFile: true,
		withJavascript: true,
		withJson: true,
		withNest: true,
		withNode: true,
		withPackageJson: true,
		withPerfectionist: true,
		withPrettier: true,
		withRegexp: true,
		withSonar: true,
		withStylistic: true,
		withTypeorm: true,
		withTypescript: true,
		withUnicorn: true,
		withYaml: true,
	}),
];

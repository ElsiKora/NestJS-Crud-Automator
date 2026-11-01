import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "unplugin-dts/rollup";

const MANIFEST = JSON.parse(readFileSync(path.resolve("package.json"), "utf8"));
const EXTERNAL_PACKAGES = [...Object.keys(MANIFEST.dependencies ?? {}), ...Object.keys(MANIFEST.peerDependencies ?? {})];

/**
 * Keeps Node.js builtins, every dependency and every peer dependency, including their subpaths, out of the bundle.
 * @param {string} id - Module specifier as written in the source.
 * @returns {boolean} Whether the module stays an import.
 */
function isExternal(id) {
	return id.startsWith("node:") || EXTERNAL_PACKAGES.some((packageName) => id === packageName || id.startsWith(`${packageName}/`));
}

const OUTPUT_DIRECTORY = path.resolve("dist");
const SOURCE_DIRECTORY = path.resolve("src");
const RELATIVE_SPECIFIER_PATTERN = /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}(?:\/[^"']*)?)\2/g;
// JSDoc and line comments carry example imports that are not part of the module graph
const COMMENT_LINE_PATTERN = /^\s*(?:\*|\/\/|\/\*)/;

/**
 * Adds explicit extensions to the relative imports of a generated declaration file.
 * TypeScript keeps specifiers as written in the source, and `moduleResolution: nodenext` consumers need the extension.
 * @param {string} filePath - Output path of the declaration file.
 * @param {string} content - Declaration file content.
 * @returns {{ content: string } | undefined} The rewritten declaration content, or undefined for files that are not declarations.
 */
function addDeclarationExtensions(filePath, content) {
	if (!filePath.endsWith(".d.ts")) {
		return;
	}

	const sourceDirectory = path.dirname(path.join(SOURCE_DIRECTORY, path.relative(OUTPUT_DIRECTORY, filePath)));

	return {
		content: content
			.split("\n")
			.map((line) => (COMMENT_LINE_PATTERN.test(line) ? line : line.replaceAll(RELATIVE_SPECIFIER_PATTERN, (_match, prefix, quote, specifier) => `${prefix}${quote}${resolveDeclarationSpecifier(sourceDirectory, specifier, filePath)}${quote}`)))
			.join("\n"),
	};
}

/**
 * Resolves an extensionless relative declaration specifier to the `.js` path a Node.js ESM consumer loads.
 * @param {string} sourceDirectory - Source directory of the declaration that holds the specifier.
 * @param {string} specifier - Relative specifier as TypeScript emitted it.
 * @param {string} declarationPath - Output path of the declaration, used in the error message.
 * @returns {string} The specifier with an explicit `.js` or `/index.js` suffix.
 * @throws {Error} If the specifier matches no source module.
 */
function resolveDeclarationSpecifier(sourceDirectory, specifier, declarationPath) {
	if (specifier.endsWith(".js")) {
		return specifier;
	}

	const target = path.resolve(sourceDirectory, specifier);

	if (existsSync(`${target}.ts`)) {
		return `${specifier}.js`;
	}

	if (existsSync(path.join(target, "index.ts"))) {
		return `${specifier.replace(/\/$/, "")}/index.js`;
	}

	throw new Error(`Cannot resolve declaration import "${specifier}" in ${declarationPath}`);
}

export default {
	external: isExternal,
	input: "src/index.ts",
	output: {
		dir: "dist",
		entryFileNames: (chunkInfo) => {
			if (chunkInfo.name.includes("node_modules")) {
				return chunkInfo.name.replace("node_modules", "external") + ".js";
			}

			return "[name].js";
		},
		format: "esm",
		preserveModules: true,
		preserveModulesRoot: "src",
		sourcemap: true,
	},
	plugins: [
		resolve({
			include: ["node_modules/tslib/**"],
		}),
		typescript({
			declaration: false,
			outDir: "dist",
			sourceMap: true,
			tsconfig: "./tsconfig.build.json",
		}),
		dts({
			beforeWriteFile: addDeclarationExtensions,
			entryRoot: "src",
			outDirs: ["dist"],
			tsconfigPath: "./tsconfig.build.json",
		}),
	],
};

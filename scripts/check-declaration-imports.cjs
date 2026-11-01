#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const outputRoot = path.resolve("dist");
const manifest = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
const declaredPackages = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})]);
// Packages without an exports map: the only subpaths dist may import from them
const subpathAllowlist = new Map([["lodash", /^[A-Za-z]+\.js$/]]);
const invalidDeclarationPaths = [];
const extensionlessImports = [];
const invalidPackageImports = [];
// Specifiers in `from "..."`, `import("...")`, `require("...")` and side-effect `import "..."` forms
const specifierPattern = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
// JSDoc and line comments carry example imports that are not part of the module graph
const commentLinePattern = /^\s*(?:\*|\/\/|\/\*)/;
const exportKeysCache = new Map();
const sideEffectProblems = [];
const sourceMapFiles = [];

/**
 * Returns the explicit (non-wildcard) subpath keys of a package's exports map, or undefined when it has none.
 * @param {string} packageName - Package name.
 * @returns {Set<string> | undefined} The explicit keys, such as "." and "./internal".
 */
function getExplicitExportKeys(packageName) {
	if (!exportKeysCache.has(packageName)) {
		const packageManifest = JSON.parse(fs.readFileSync(path.resolve("node_modules", packageName, "package.json"), "utf8"));
		const exportsField = packageManifest.exports;
		let keys;

		if (typeof exportsField === "string" || Array.isArray(exportsField)) {
			keys = new Set(["."]);
		} else if (exportsField && typeof exportsField === "object") {
			const subpathKeys = Object.keys(exportsField).filter((key) => key.startsWith("."));

			keys = new Set(subpathKeys.length > 0 ? subpathKeys.filter((key) => !key.includes("*")) : ["."]);
		}

		exportKeysCache.set(packageName, keys);
	}

	return exportKeysCache.get(packageName);
}

/**
 * Checks a bare specifier: Node.js builtins with `node:`, declared packages, and only their root or an explicit exports key.
 * @param {string} specifier - Bare import specifier.
 * @returns {string | undefined} Why the import is not allowed, or undefined when it is.
 */
function getPackageImportProblem(specifier) {
	if (specifier.startsWith("node:")) {
		return undefined;
	}

	const segments = specifier.split("/");
	const packageName = specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
	const subpath = segments.slice(specifier.startsWith("@") ? 2 : 1).join("/");

	if (!declaredPackages.has(packageName)) {
		return `${packageName} is not in dependencies or peerDependencies`;
	}

	if (subpath === "") {
		return undefined;
	}

	const exportKeys = getExplicitExportKeys(packageName);

	if (exportKeys === undefined) {
		return subpathAllowlist.get(packageName)?.test(subpath) ? undefined : `${packageName} has no exports map and "${subpath}" is not allowlisted`;
	}

	return exportKeys.has(`./${subpath}`) ? undefined : `"./${subpath}" is not an explicit key of the ${packageName} exports map`;
}

/**
 * Finds console output, process.stdout and process.stderr writes, and .env loading in emitted JavaScript.
 * The package logs only through LoggerUtility and reads configuration only from process.env, so none of these may appear.
 * The file is parsed, so comments and JSDoc examples do not count.
 * @param {string} filePath - Path of the emitted file, for the parser.
 * @param {string} fileContent - Emitted JavaScript.
 * @returns {Array<string>} One description per occurrence, with its line number.
 */
function getSideEffectProblems(filePath, fileContent) {
	const sourceFile = ts.createSourceFile(filePath, fileContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	const problems = [];

	const report = (node, description) => {
		problems.push(`${description} at line ${String(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1)}`);
	};

	const visit = (node) => {
		if (ts.isIdentifier(node) && node.text === "console" && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) {
			report(node, "console");
		} else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "process" && ["stderr", "stdout"].includes(node.name.text)) {
			report(node, `process.${node.name.text}`);
		} else if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "process" && ts.isStringLiteralLike(node.argumentExpression) && ["stderr", "stdout"].includes(node.argumentExpression.text)) {
			report(node, `process.${node.argumentExpression.text}`);
		} else if (ts.isIdentifier(node) && node.text === "loadEnvFile") {
			report(node, "loadEnvFile");
		} else if (ts.isStringLiteralLike(node) && (node.text === "dotenv" || node.text.startsWith("dotenv/") || /(^|[\\/])\.env(\.|$)/.test(node.text))) {
			report(node, `"${node.text}"`);
		}

		ts.forEachChild(node, visit);
	};

	visit(sourceFile);

	return problems;
}

function scanDirectory(directoryPath) {
	for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
		const entryPath = path.join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			scanDirectory(entryPath);
			continue;
		}

		if (entry.name.endsWith(".map")) {
			sourceMapFiles.push(path.relative(process.cwd(), entryPath));
			continue;
		}

		if (!entry.name.endsWith(".d.ts") && !entry.name.endsWith(".js")) {
			continue;
		}

		const fileContent = fs.readFileSync(entryPath, "utf8");
		const relativePath = path.relative(process.cwd(), entryPath);

		if (entry.name.endsWith(".d.ts") && fileContent.includes("node_modules/")) {
			invalidDeclarationPaths.push(relativePath);
		}

		if (fileContent.includes("sourceMappingURL=")) {
			sourceMapFiles.push(`${relativePath} (sourceMappingURL)`);
		}

		if (entry.name.endsWith(".js")) {
			for (const problem of getSideEffectProblems(entryPath, fileContent)) {
				sideEffectProblems.push(`${relativePath}: ${problem}`);
			}
		}

		for (const line of fileContent.split("\n")) {
			if (commentLinePattern.test(line)) {
				continue;
			}

			for (const match of line.matchAll(specifierPattern)) {
				const specifier = match[1];

				if (!specifier.startsWith(".")) {
					const problem = getPackageImportProblem(specifier);

					if (problem) {
						invalidPackageImports.push(`${relativePath}: "${specifier}" (${problem})`);
					}

					continue;
				}

				// A declaration resolves "./x.js" to "./x.d.ts"; type-only modules have no .js output
				const target = entry.name.endsWith(".d.ts") ? specifier.replace(/\.js$/, ".d.ts") : specifier;

				if (!specifier.endsWith(".js") || !fs.existsSync(path.resolve(path.dirname(entryPath), target))) {
					extensionlessImports.push(`${relativePath}: "${specifier}"`);
				}
			}
		}
	}
}

if (!fs.existsSync(outputRoot)) {
	process.stderr.write(`Build output does not exist: ${outputRoot}\n`);
	process.exit(1);
}

scanDirectory(outputRoot);

// Bundled third-party code lands in dist/external; a declared package must stay an import instead
const vendoredPackages = [...declaredPackages].filter((packageName) => fs.existsSync(path.join(outputRoot, "external", packageName)));

if (vendoredPackages.length > 0) {
	process.stderr.write(`Generated output bundles declared packages instead of importing them:\n${vendoredPackages.map((packageName) => `- dist/external/${packageName}`).join("\n")}\n`);
	process.exit(1);
}

if (invalidDeclarationPaths.length > 0) {
	process.stderr.write(`Generated declarations contain local node_modules paths:\n${invalidDeclarationPaths.map((filePath) => `- ${filePath}`).join("\n")}\n`);
	process.exit(1);
}

if (invalidPackageImports.length > 0) {
	process.stderr.write(`Generated output imports packages outside dependencies and peerDependencies, or paths inside them:\n${invalidPackageImports.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

if (sourceMapFiles.length > 0) {
	process.stderr.write(`Generated output has source maps, which would point at the unpublished src:\n${sourceMapFiles.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

if (sideEffectProblems.length > 0) {
	process.stderr.write(`Generated output writes to the console or process streams, or loads a .env file:\n${sideEffectProblems.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

if (extensionlessImports.length > 0) {
	process.stderr.write(`Generated output has relative imports without a .js extension or without a matching file:\n${extensionlessImports.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

process.stdout.write("Generated declarations are package-relative, every package import is a declared dependency's root or explicit exports key, and every relative import has a .js extension and a matching file, and nothing writes to the console or process streams or loads a .env file.\n");

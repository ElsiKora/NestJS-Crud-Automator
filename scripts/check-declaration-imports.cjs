#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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

function scanDirectory(directoryPath) {
	for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
		const entryPath = path.join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			scanDirectory(entryPath);
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

if (invalidDeclarationPaths.length > 0) {
	process.stderr.write(`Generated declarations contain local node_modules paths:\n${invalidDeclarationPaths.map((filePath) => `- ${filePath}`).join("\n")}\n`);
	process.exit(1);
}

if (invalidPackageImports.length > 0) {
	process.stderr.write(`Generated output imports packages outside dependencies and peerDependencies, or paths inside them:\n${invalidPackageImports.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

if (extensionlessImports.length > 0) {
	process.stderr.write(`Generated output has relative imports without a .js extension or without a matching file:\n${extensionlessImports.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

process.stdout.write("Generated declarations are package-relative, every package import is a declared dependency's root or explicit exports key, and every relative import has a .js extension and a matching file.\n");

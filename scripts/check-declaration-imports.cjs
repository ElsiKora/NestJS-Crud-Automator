#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const outputRoot = path.resolve("dist");
const invalidDeclarationPaths = [];
const privateSwaggerImportPaths = [];
const extensionlessImports = [];
const privateSwaggerImportPattern = /@nestjs\/swagger\/dist/;
// Relative specifiers in `from "..."`, `import("...")` and side-effect `import "..."` forms
const relativeSpecifierPattern = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}(?:\/[^"']*)?)["']/g;
// JSDoc and line comments carry example imports that are not part of the module graph
const commentLinePattern = /^\s*(?:\*|\/\/|\/\*)/;

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

		if (privateSwaggerImportPattern.test(fileContent)) {
			privateSwaggerImportPaths.push(relativePath);
		}

		if (entry.name.endsWith(".d.ts") && fileContent.includes("node_modules/")) {
			invalidDeclarationPaths.push(relativePath);
		}

		for (const line of fileContent.split("\n")) {
			if (commentLinePattern.test(line)) {
				continue;
			}

			for (const match of line.matchAll(relativeSpecifierPattern)) {
				const specifier = match[1];
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

if (privateSwaggerImportPaths.length > 0) {
	process.stderr.write(`Generated output imports private @nestjs/swagger paths:\n${privateSwaggerImportPaths.map((filePath) => `- ${filePath}`).join("\n")}\n`);
	process.exit(1);
}

if (extensionlessImports.length > 0) {
	process.stderr.write(`Generated output has relative imports without a .js extension or without a matching file:\n${extensionlessImports.map((entry) => `- ${entry}`).join("\n")}\n`);
	process.exit(1);
}

process.stdout.write("Generated declarations are package-relative, every relative import has a .js extension and a matching file, and no generated file imports private @nestjs/swagger paths.\n");

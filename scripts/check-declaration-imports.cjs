#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const declarationRoots = ["dist/esm", "dist/cjs"].map((directoryPath) => path.resolve(directoryPath));
const invalidDeclarationPaths = [];

function scanDirectory(directoryPath) {
	for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
		const entryPath = path.join(directoryPath, entry.name);

		if (entry.isDirectory()) {
			scanDirectory(entryPath);
			continue;
		}

		if (!entry.name.endsWith(".d.ts")) {
			continue;
		}

		if (fs.readFileSync(entryPath, "utf8").includes("node_modules/")) {
			invalidDeclarationPaths.push(path.relative(process.cwd(), entryPath));
		}
	}
}

for (const declarationRoot of declarationRoots) {
	if (!fs.existsSync(declarationRoot)) {
		process.stderr.write(`Declaration output does not exist: ${declarationRoot}\n`);
		process.exit(1);
	}

	scanDirectory(declarationRoot);
}

if (invalidDeclarationPaths.length > 0) {
	process.stderr.write(`Generated declarations contain local node_modules paths:\n${invalidDeclarationPaths.map((filePath) => `- ${filePath}`).join("\n")}\n`);
	process.exit(1);
}

process.stdout.write("Generated declaration imports are package-relative.\n");

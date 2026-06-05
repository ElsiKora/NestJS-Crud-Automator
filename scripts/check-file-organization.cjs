#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const rootPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(process.cwd(), "src");
const issues = [];

function writeWarning(message) {
	process.stderr.write(`${message}\n`);
}

function isTsFile(entry) {
	return entry.isFile() && entry.name.endsWith(".ts");
}

function scanDirectory(directoryPath) {
	const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
	const files = entries.filter(isTsFile);
	const subdirectories = entries.filter((entry) => entry.isDirectory());

	const hasIndex = files.some((entry) => entry.name === "index.ts");
	const nonIndexFiles = files.filter((entry) => entry.name !== "index.ts");
	const hasContent = nonIndexFiles.length > 0 || subdirectories.length > 0;
	const relativePath = path.relative(rootPath, directoryPath);
	const isRootOrRootChild = relativePath === "" || !relativePath.includes(path.sep);

	if (hasContent && !hasIndex) {
		issues.push({
			type: "missing-index",
			directory: directoryPath,
			files: nonIndexFiles.map((entry) => entry.name),
		});
	}

	if (!isRootOrRootChild && nonIndexFiles.length === 1 && subdirectories.length === 0) {
		issues.push({
			type: "single-file-directory",
			directory: directoryPath,
			files: nonIndexFiles.map((entry) => entry.name),
		});
	}

	const prefixMap = new Map();

	for (const entry of nonIndexFiles) {
		const baseName = entry.name.replace(/\.ts$/, "");
		const parts = baseName.split("-");
		const prefix = parts[0];

		if (!prefix) {
			continue;
		}

		if (!prefixMap.has(prefix)) {
			prefixMap.set(prefix, []);
		}

		prefixMap.get(prefix).push(entry.name);
	}

	for (const [prefix, groupedFiles] of prefixMap.entries()) {
		if (groupedFiles.length < 2) {
			continue;
		}

		issues.push({
			type: "prefix-grouping",
			directory: directoryPath,
			prefix,
			files: groupedFiles,
		});
	}

	for (const entry of subdirectories) {
		scanDirectory(path.join(directoryPath, entry.name));
	}
}

if (!fs.existsSync(rootPath)) {
	writeWarning(`Path does not exist: ${rootPath}`);
	process.exit(1);
}

scanDirectory(rootPath);

if (issues.length === 0) {
	writeWarning("No file organization issues found.");
	process.exit(0);
}

writeWarning(`Found ${issues.length} potential file organization issue(s):`);

for (const issue of issues) {
	writeWarning(`\n- ${issue.type} in ${issue.directory}`);

	if (issue.prefix) {
		writeWarning(`  prefix: ${issue.prefix}`);
	}

	writeWarning(`  files: ${issue.files.join(", ")}`);
}

process.exit(1);

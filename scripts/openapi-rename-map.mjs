#!/usr/bin/env node
// Prints a JSON { oldComponentName: newComponentName } map for two OpenAPI documents of one application.
// Usage: node openapi-rename-map.mjs <old-openapi.json> <new-openapi.json> > rename-map.json
//
// Components are paired by where operations use them, never by how they are named. An old name with
// several new names, and an old component that no operation reaches, are reported on stderr and left out of the map.

import { readFileSync } from "node:fs";

const COMPONENT_REFERENCE_PREFIX = "#/components/schemas/";
const HTTP_METHODS = ["delete", "get", "head", "options", "patch", "post", "put", "trace"];
const SCHEMA_LIST_KEYWORDS = ["allOf", "anyOf", "oneOf"];

function readDocument(filePath) {
	try {
		const document = JSON.parse(readFileSync(filePath, "utf8"));

		if (!document || typeof document !== "object" || Array.isArray(document)) {
			throw new Error("the file is not a JSON object");
		}

		return document;
	} catch (error) {
		process.stderr.write(`Cannot read OpenAPI document ${String(filePath)}: ${error.message}\n`);
		process.exit(1);
	}
}

function getComponentName(schema) {
	const reference = schema?.$ref;

	return typeof reference === "string" && reference.startsWith(COMPONENT_REFERENCE_PREFIX) ? reference.slice(COMPONENT_REFERENCE_PREFIX.length) : undefined;
}

function createPairing(oldDocument, newDocument) {
	const newNamesByOldName = new Map();
	const oldSchemas = oldDocument.components?.schemas ?? {};
	const newSchemas = newDocument.components?.schemas ?? {};

	function walkSchemas(oldSchema, newSchema, route) {
		if (!oldSchema || !newSchema) {
			return;
		}

		const oldName = getComponentName(oldSchema);
		const newName = getComponentName(newSchema);

		if (oldName !== undefined && newName !== undefined) {
			const routesByNewName = newNamesByOldName.get(oldName) ?? new Map();
			const isVisited = routesByNewName.has(newName);

			newNamesByOldName.set(oldName, routesByNewName);

			if (!isVisited) {
				routesByNewName.set(newName, route);
				walkSchemas(oldSchemas[oldName], newSchemas[newName], route);
			}

			return;
		}

		if (oldName !== undefined || newName !== undefined) {
			walkSchemas(oldName === undefined ? oldSchema : oldSchemas[oldName], newName === undefined ? newSchema : newSchemas[newName], route);

			return;
		}

		for (const [propertyName, oldProperty] of Object.entries(oldSchema.properties ?? {})) {
			walkSchemas(oldProperty, newSchema.properties?.[propertyName], route);
		}

		walkSchemas(oldSchema.items, newSchema.items, route);

		for (const keyword of SCHEMA_LIST_KEYWORDS) {
			for (const [index, oldItem] of (oldSchema[keyword] ?? []).entries()) {
				walkSchemas(oldItem, newSchema[keyword]?.[index], route);
			}
		}
	}

	function walkContent(oldContent, newContent, route) {
		for (const [contentType, oldMedia] of Object.entries(oldContent ?? {})) {
			walkSchemas(oldMedia?.schema, newContent?.[contentType]?.schema, route);
		}
	}

	for (const [path, oldPathItem] of Object.entries(oldDocument.paths ?? {})) {
		for (const method of HTTP_METHODS) {
			const oldOperation = oldPathItem?.[method];
			const newOperation = newDocument.paths?.[path]?.[method];

			if (!oldOperation || !newOperation) {
				continue;
			}

			const route = `${method.toUpperCase()} ${path}`;

			for (const oldParameter of oldOperation.parameters ?? []) {
				const newParameter = (newOperation.parameters ?? []).find((parameter) => parameter.name === oldParameter.name && parameter.in === oldParameter.in);

				walkSchemas(oldParameter.schema, newParameter?.schema, route);
			}

			walkContent(oldOperation.requestBody?.content, newOperation.requestBody?.content, route);

			for (const [status, oldResponse] of Object.entries(oldOperation.responses ?? {})) {
				walkContent(oldResponse?.content, newOperation.responses?.[status]?.content, route);
			}
		}
	}

	return newNamesByOldName;
}

function compareNames([left], [right]) {
	return left < right ? -1 : Number(left > right);
}

function main() {
	const [oldDocumentPath, newDocumentPath] = process.argv.slice(2);
	const oldDocument = readDocument(oldDocumentPath);
	const newDocument = readDocument(newDocumentPath);
	const newNamesByOldName = createPairing(oldDocument, newDocument);
	const pairs = [...newNamesByOldName.entries()].sort(compareNames);
	const renames = pairs.filter(([oldName, routesByNewName]) => routesByNewName.size === 1 && !routesByNewName.has(oldName)).map(([oldName, routesByNewName]) => [oldName, [...routesByNewName.keys()][0]]);
	const ambiguous = pairs.filter(([, routesByNewName]) => routesByNewName.size > 1);

	const unmatched = Object.keys(oldDocument.components?.schemas ?? {})
		.filter((oldName) => !newNamesByOldName.has(oldName))
		.sort();

	process.stdout.write(`${JSON.stringify(Object.fromEntries(renames), null, "\t")}\n`);

	if (ambiguous.length > 0) {
		process.stderr.write("Ambiguous old names, not in the map:\n");

		for (const [oldName, routesByNewName] of ambiguous) {
			const newNames = [...routesByNewName.entries()].sort(compareNames).map(([newName, route]) => `${newName} (${route})`);

			process.stderr.write(`  ${oldName} -> ${newNames.join(", ")}\n`);
		}
	}

	if (unmatched.length > 0) {
		process.stderr.write("Old components that no operation pairs with a new component, not in the map:\n");

		for (const oldName of unmatched) {
			process.stderr.write(`  ${oldName}\n`);
		}
	}
}

main();

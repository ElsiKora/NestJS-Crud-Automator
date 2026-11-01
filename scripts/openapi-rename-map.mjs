#!/usr/bin/env node
// Prints a JSON { oldComponentName: newComponentName } map for two OpenAPI JSON documents of one application.
// Usage: node openapi-rename-map.mjs <old-openapi.json> <new-openapi.json> > rename-map.json
//
// Components are paired by where operations use them, never by how they are named. An old name with several new names,
// an old component in a oneOf or anyOf that cannot be paired safely, and an old component that no operation reaches
// are reported on stderr and left out of the map. A document that cannot be read or has an invalid shape fails with exit code 1.

import { readFileSync } from "node:fs";

const USAGE = "Usage: node openapi-rename-map.mjs <old-openapi.json> <new-openapi.json> > rename-map.json";
const HTTP_METHODS = ["delete", "get", "head", "options", "patch", "post", "put", "trace"];
const MEMBER_LIST_KEYWORDS = ["anyOf", "oneOf"];
const REFERENCE_PREFIX = "#/components/";
const MAXIMUM_REFERENCE_CHAIN = 64;
const YAML_EXTENSION_PATTERN = /\.ya?ml$/i;

/** An invalid document shape, reported as a message without a stack trace. */
class DocumentShapeError extends Error {}

/**
 * Reads and parses an OpenAPI JSON document, or exits with a message.
 * @param {string} filePath - Document path.
 * @returns {Record<string, unknown>} The parsed document.
 */
function readDocument(filePath) {
	let text;

	try {
		text = readFileSync(filePath, "utf8");
	} catch (error) {
		fail(`Cannot read OpenAPI document ${filePath}: ${error.message}`);
	}

	const trimmed = text.trimStart();

	if (YAML_EXTENSION_PATTERN.test(filePath) || (trimmed.length > 0 && !trimmed.startsWith("{") && !trimmed.startsWith("["))) {
		fail(`Cannot read OpenAPI document ${filePath}: YAML is not supported; pass JSON`);
	}

	let document;

	try {
		document = JSON.parse(text);
	} catch (error) {
		fail(`Cannot read OpenAPI document ${filePath}: ${error.message}`);
	}

	if (!isObject(document)) {
		fail(`Cannot read OpenAPI document ${filePath}: the file is not a JSON object`);
	}

	return document;
}

/**
 * Prints a message on stderr and exits with code 1.
 * @param {string} message - Message to print.
 * @returns {never} Never returns.
 */
function fail(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

/**
 * Tells whether a value is a JSON object.
 * @param {unknown} value - Value to check.
 * @returns {boolean} Whether the value is a non-array object.
 */
function isObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns an optional object member of a document, or an empty object when it is missing.
 * @param {unknown} value - Member value.
 * @param {string} where - Location used in the error message.
 * @returns {Record<string, unknown>} The member.
 */
function asObject(value, where) {
	if (value === undefined || value === null) {
		return {};
	}

	if (!isObject(value)) {
		throw new DocumentShapeError(`${where} must be an object`);
	}

	return value;
}

/**
 * Returns an optional array member of a document, or an empty array when it is missing.
 * @param {unknown} value - Member value.
 * @param {string} where - Location used in the error message.
 * @returns {Array<unknown>} The member.
 */
function asArray(value, where) {
	if (value === undefined || value === null) {
		return [];
	}

	if (!Array.isArray(value)) {
		throw new DocumentShapeError(`${where} must be an array`);
	}

	return value;
}

/**
 * Splits a local component reference into its section and decoded name.
 * @param {unknown} reference - `$ref` value.
 * @returns {{ name: string; section: string } | undefined} The section (for example `schemas`) and the name with JSON pointer escapes decoded.
 */
function parseReference(reference) {
	if (typeof reference !== "string" || !reference.startsWith(REFERENCE_PREFIX)) {
		return undefined;
	}

	const [section, name, ...rest] = reference.slice(REFERENCE_PREFIX.length).split("/");

	if (!section || name === undefined || rest.length > 0) {
		return undefined;
	}

	return { name: name.replaceAll("~1", "/").replaceAll("~0", "~"), section };
}

/**
 * Creates the lookups of one document.
 * @param {Record<string, unknown>} document - OpenAPI document.
 * @param {string} label - `old` or `new`, used in error messages.
 * @returns {{ getComponent: (section: string, name: string) => unknown; resolve: (value: unknown, section: string, where: string) => unknown; schemaName: (schema: unknown) => string | undefined; schemas: Record<string, unknown> }} The lookups.
 */
function createLookups(document, label) {
	const components = asObject(document.components, `${label} components`);
	const schemas = asObject(components.schemas, `${label} components.schemas`);

	const getComponent = (section, name) => {
		const sectionValue = asObject(components[section], `${label} components.${section}`);

		return Object.hasOwn(sectionValue, name) ? sectionValue[name] : undefined;
	};

	// Follows `$ref` chains of components/responses, parameters and requestBodies, with a bound on the chain length.
	const resolve = (value, section, where) => {
		let current = value;

		for (let step = 0; step < MAXIMUM_REFERENCE_CHAIN; step++) {
			const reference = isObject(current) ? parseReference(current.$ref) : undefined;

			if (!reference) {
				return current;
			}

			if (reference.section !== section) {
				return undefined;
			}

			current = getComponent(section, reference.name);
		}

		throw new DocumentShapeError(`${label} ${where} has a $ref chain longer than ${MAXIMUM_REFERENCE_CHAIN} or a $ref cycle`);
	};

	const schemaName = (schema) => {
		const reference = isObject(schema) ? parseReference(schema.$ref) : undefined;

		return reference?.section === "schemas" ? reference.name : undefined;
	};

	return { getComponent, resolve, schemaName, schemas };
}

/**
 * Pairs the components of two documents by where their operations use them.
 * @param {Record<string, unknown>} oldDocument - Document before the rename.
 * @param {Record<string, unknown>} newDocument - Document after the rename.
 * @returns {{ newNamesByOldName: Map<string, Map<string, string>>; oldSchemas: Record<string, unknown>; unsafeByOldName: Map<string, Array<string>> }} New names with the first route that pairs them, and old names whose oneOf or anyOf member could not be paired.
 */
function createPairing(oldDocument, newDocument) {
	const oldLookups = createLookups(oldDocument, "old");
	const newLookups = createLookups(newDocument, "new");
	const newNamesByOldName = new Map();
	const unsafeByOldName = new Map();

	const resolveSchema = (lookups, schema) => {
		const name = lookups.schemaName(schema);

		return name === undefined ? schema : Object.hasOwn(lookups.schemas, name) ? lookups.schemas[name] : undefined;
	};

	const getPropertyNames = (lookups, schema) => {
		const resolved = resolveSchema(lookups, schema);
		const names = new Set();

		for (const part of [resolved, ...(isObject(resolved) && Array.isArray(resolved.allOf) ? resolved.allOf.map((item) => resolveSchema(lookups, item)) : [])]) {
			if (isObject(part) && isObject(part.properties)) {
				for (const propertyName of Object.keys(part.properties)) {
					names.add(propertyName);
				}
			}
		}

		return [...names].sort().join("\u0000");
	};

	const markUnsafe = (oldSchema, reason) => {
		const oldName = oldLookups.schemaName(oldSchema);

		if (oldName !== undefined) {
			unsafeByOldName.set(oldName, [...(unsafeByOldName.get(oldName) ?? []), reason]);
		}
	};

	// Says why a member without a discriminator mapping cannot be paired by position, naming a member that only moved.
	const describeUnsafeMember = (oldKeys, newKeys, index) => {
		const isUnique = (keys, value) => keys.indexOf(value) === keys.lastIndexOf(value);

		if (!isUnique(oldKeys, oldKeys[index]) || (index < newKeys.length && !isUnique(newKeys, newKeys[index]))) {
			return "has no discriminator mapping, and another member has the same property names";
		}

		const newIndex = newKeys.indexOf(oldKeys[index]);

		if (newIndex !== -1 && isUnique(newKeys, oldKeys[index])) {
			return `moved to member ${String(newIndex)} in the new document, and members without a discriminator mapping pair only at the same position`;
		}

		return index < newKeys.length ? "has no discriminator mapping, and the new member at that position has other property names" : "has no discriminator mapping, and the new document has no member at that position";
	};

	// Pairs oneOf or anyOf members by discriminator mapping key, or by position when the two members have the same property names and no other member of either list has them.
	const pairMembers = (oldSchema, newSchema, keyword, route, pending, where) => {
		const oldMembers = asArray(oldSchema[keyword], `old ${where}.${keyword}`);
		const newMembers = asArray(newSchema[keyword], `new ${where}.${keyword}`);
		const oldMapping = isObject(oldSchema.discriminator) ? asObject(oldSchema.discriminator.mapping, `old ${where}.discriminator.mapping`) : undefined;
		const newMapping = isObject(newSchema.discriminator) ? asObject(newSchema.discriminator.mapping, `new ${where}.discriminator.mapping`) : undefined;

		if (oldMapping && newMapping && Object.keys(oldMapping).length > 0) {
			const toSchema = (value) => ({ $ref: typeof value === "string" && value.startsWith("#") ? value : `${REFERENCE_PREFIX}schemas/${String(value)}` });

			for (const [key, value] of Object.entries(oldMapping)) {
				if (Object.hasOwn(newMapping, key)) {
					pending.push([toSchema(value), toSchema(newMapping[key]), route]);
				}
			}

			return;
		}

		const oldKeys = oldMembers.map((member) => getPropertyNames(oldLookups, member));
		const newKeys = newMembers.map((member) => getPropertyNames(newLookups, member));

		for (const [index, oldMember] of oldMembers.entries()) {
			const isSafe = index < newMembers.length && oldKeys[index] === newKeys[index] && oldKeys.indexOf(oldKeys[index]) === oldKeys.lastIndexOf(oldKeys[index]) && newKeys.indexOf(newKeys[index]) === newKeys.lastIndexOf(newKeys[index]);

			if (isSafe) {
				pending.push([oldMember, newMembers[index], route]);
			} else {
				markUnsafe(oldMember, `${keyword} member ${String(index)} (${route}) ${describeUnsafeMember(oldKeys, newKeys, index)}`);
			}
		}
	};

	// Walks two schemas side by side with an explicit stack, so a deep document cannot overflow the call stack.
	const walkSchemas = (rootOldSchema, rootNewSchema, route) => {
		const pending = [[rootOldSchema, rootNewSchema, route]];

		while (pending.length > 0) {
			const [oldSchema, newSchema, currentRoute] = pending.pop();

			if (!isObject(oldSchema) || !isObject(newSchema)) {
				continue;
			}

			const oldName = oldLookups.schemaName(oldSchema);
			const newName = newLookups.schemaName(newSchema);

			if (oldName !== undefined && newName !== undefined) {
				const routesByNewName = newNamesByOldName.get(oldName) ?? new Map();

				newNamesByOldName.set(oldName, routesByNewName);

				if (!routesByNewName.has(newName)) {
					routesByNewName.set(newName, currentRoute);
					pending.push([resolveSchema(oldLookups, oldSchema), resolveSchema(newLookups, newSchema), currentRoute]);
				}

				continue;
			}

			if (oldName !== undefined || newName !== undefined) {
				pending.push([resolveSchema(oldLookups, oldSchema), resolveSchema(newLookups, newSchema), currentRoute]);

				continue;
			}

			const where = `schema in ${currentRoute}`;
			const newProperties = asObject(newSchema.properties, `new ${where}.properties`);

			for (const [propertyName, oldProperty] of Object.entries(asObject(oldSchema.properties, `old ${where}.properties`))) {
				if (Object.hasOwn(newProperties, propertyName)) {
					pending.push([oldProperty, newProperties[propertyName], currentRoute]);
				}
			}

			pending.push([oldSchema.items, newSchema.items, currentRoute], [oldSchema.additionalProperties, newSchema.additionalProperties, currentRoute]);

			const newAllOf = asArray(newSchema.allOf, `new ${where}.allOf`);

			for (const [index, oldItem] of asArray(oldSchema.allOf, `old ${where}.allOf`).entries()) {
				pending.push([oldItem, newAllOf[index], currentRoute]);
			}

			for (const keyword of MEMBER_LIST_KEYWORDS) {
				asArray(oldSchema[keyword], `old ${where}.${keyword}`);

				// An old list without a new list leaves its members to the unmatched section.
				if (oldSchema[keyword] !== undefined && newSchema[keyword] !== undefined) {
					pairMembers(oldSchema, newSchema, keyword, currentRoute, pending, where);
				}
			}
		}
	};

	const walkContent = (oldContent, newContent, route, where) => {
		const newMedia = asObject(newContent, `new ${where}.content`);

		for (const [contentType, oldMedia] of Object.entries(asObject(oldContent, `old ${where}.content`))) {
			if (Object.hasOwn(newMedia, contentType) && isObject(oldMedia) && isObject(newMedia[contentType])) {
				walkSchemas(oldMedia.schema, newMedia[contentType].schema, route);
			}
		}
	};

	const oldPaths = asObject(oldDocument.paths, "old paths");
	const newPaths = asObject(newDocument.paths, "new paths");

	for (const [path, oldPathItem] of Object.entries(oldPaths)) {
		const newPathItem = Object.hasOwn(newPaths, path) ? asObject(newPaths[path], `new paths.${path}`) : {};

		for (const method of HTTP_METHODS) {
			const oldOperation = asObject(asObject(oldPathItem, `old paths.${path}`)[method], `old ${method.toUpperCase()} ${path}`);
			const newOperation = asObject(newPathItem[method], `new ${method.toUpperCase()} ${path}`);

			if (Object.keys(oldOperation).length === 0 || Object.keys(newOperation).length === 0) {
				continue;
			}

			const route = `${method.toUpperCase()} ${path}`;

			const resolveParameters = (lookups, operation, label) =>
				asArray(operation.parameters, `${label} ${route} parameters`).map((parameter, index) => {
					const resolved = lookups.resolve(parameter, "parameters", `${route} parameter ${String(index)}`);

					if (!isObject(resolved)) {
						throw new DocumentShapeError(`${label} ${route} parameter ${String(index)} must be an object`);
					}

					return resolved;
				});
			const oldParameters = resolveParameters(oldLookups, oldOperation, "old");
			const newParameters = resolveParameters(newLookups, newOperation, "new");

			for (const oldParameter of oldParameters) {
				const newParameter = newParameters.find((parameter) => parameter.name === oldParameter.name && parameter.in === oldParameter.in);

				walkSchemas(oldParameter.schema, newParameter?.schema, route);
			}

			const oldBody = asObject(oldLookups.resolve(oldOperation.requestBody, "requestBodies", `${route} requestBody`), `old ${route} requestBody`);
			const newBody = asObject(newLookups.resolve(newOperation.requestBody, "requestBodies", `${route} requestBody`), `new ${route} requestBody`);

			walkContent(oldBody.content, newBody.content, route, `${route} requestBody`);

			const newResponses = asObject(newOperation.responses, `new ${route} responses`);

			for (const [status, oldResponseValue] of Object.entries(asObject(oldOperation.responses, `old ${route} responses`))) {
				const oldResponse = asObject(oldLookups.resolve(oldResponseValue, "responses", `${route} response ${status}`), `old ${route} response ${status}`);
				const newResponse = asObject(Object.hasOwn(newResponses, status) ? newLookups.resolve(newResponses[status], "responses", `${route} response ${status}`) : undefined, `new ${route} response ${status}`);

				walkContent(oldResponse.content, newResponse.content, route, `${route} response ${status}`);
			}
		}
	}

	return { newNamesByOldName, oldSchemas: oldLookups.schemas, unsafeByOldName };
}

/**
 * Compares two entries by their key.
 * @param {[string, unknown]} left - First entry.
 * @param {[string, unknown]} right - Second entry.
 * @returns {number} Sort order.
 */
function compareNames([left], [right]) {
	return left < right ? -1 : Number(left > right);
}

/**
 * Prints the rename map on stdout and the names left out of it on stderr.
 * @returns {void}
 */
function main() {
	const [oldDocumentPath, newDocumentPath] = process.argv.slice(2);

	if (!oldDocumentPath || !newDocumentPath) {
		fail(USAGE);
	}

	const oldDocument = readDocument(oldDocumentPath);
	const newDocument = readDocument(newDocumentPath);
	let pairing;

	try {
		pairing = createPairing(oldDocument, newDocument);
	} catch (error) {
		fail(`Cannot map the OpenAPI documents: ${error instanceof DocumentShapeError ? error.message : String(error?.message ?? error)}`);
	}

	const { newNamesByOldName, oldSchemas, unsafeByOldName } = pairing;
	const pairs = [...newNamesByOldName.entries()].sort(compareNames);
	const renames = pairs.filter(([oldName, routesByNewName]) => routesByNewName.size === 1 && !routesByNewName.has(oldName) && !unsafeByOldName.has(oldName)).map(([oldName, routesByNewName]) => [oldName, [...routesByNewName.keys()][0]]);
	const ambiguous = [...new Set([...pairs.filter(([, routesByNewName]) => routesByNewName.size > 1).map(([oldName]) => oldName), ...unsafeByOldName.keys()])].sort();

	const unmatched = Object.keys(oldSchemas)
		.filter((oldName) => !newNamesByOldName.has(oldName) && !unsafeByOldName.has(oldName))
		.sort();

	process.stdout.write(`${JSON.stringify(Object.fromEntries(renames), null, "\t")}\n`);

	if (ambiguous.length > 0) {
		process.stderr.write("Ambiguous old names, not in the map:\n");

		for (const oldName of ambiguous) {
			const routesByNewName = newNamesByOldName.get(oldName) ?? new Map();
			const details = [...[...routesByNewName.entries()].sort(compareNames).map(([newName, route]) => `${newName} (${route})`), ...(unsafeByOldName.get(oldName) ?? [])];

			process.stderr.write(`  ${oldName} -> ${details.join(", ")}\n`);
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

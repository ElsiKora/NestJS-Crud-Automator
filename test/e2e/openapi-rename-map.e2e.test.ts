import "reflect-metadata";

import type { OpenAPIObject } from "@nestjs/swagger";
import type { SpawnSyncReturns } from "node:child_process";

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createE2eRenameMapDocument } from "./openapi-rename-map";

const SCRIPT_PATH: string = fileURLToPath(new URL("../../scripts/openapi-rename-map.mjs", import.meta.url));
// Captured on dev at ec4a659d, which still has the 4.x names, by running createE2eRenameMapDocument there and formatting the JSON with Prettier.
const OLD_DOCUMENT_PATH: string = fileURLToPath(new URL("openapi-rename-map/app.dev-openapi.json", import.meta.url));
const SIGNATURE_PATTERN: RegExp = /[\da-f]{64}/g;

describe("openapi-rename-map script (E2E)", () => {
	let directory: string;
	let newDocument: OpenAPIObject;
	let newDocumentPath: string;

	const run = (oldPath: string, newPath: string): SpawnSyncReturns<string> => spawnSync(process.execPath, [SCRIPT_PATH, oldPath, newPath], { encoding: "utf8" });

	beforeAll(async () => {
		directory = mkdtempSync(path.join(tmpdir(), "openapi-rename-map-"));
		newDocument = await createE2eRenameMapDocument();
		newDocumentPath = path.join(directory, "new.json");
		writeFileSync(newDocumentPath, JSON.stringify(newDocument));
	});

	afterAll(() => {
		rmSync(directory, { force: true, recursive: true });
	});

	it("maps old names with one new name, across two controllers on one entity and a custom route, and leaves unchanged names out", () => {
		const result: SpawnSyncReturns<string> = run(OLD_DOCUMENT_PATH, newDocumentPath);

		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({
			E2eRenameMapItemEntityCreateBodyDTO: "E2eRenameMapAdminItemCreateBodyDTO",
			E2eRenameMapItemEntityCreateResponseDTO: "E2eRenameMapAdminItemCreateResponseDTO",
			E2eRenameMapRecordEntityCreateBodyDTO: "E2eRenameMapRecordSubmitBodyDTO",
			E2eRenameMapRecordEntityGetResponseDTO: "E2eRenameMapRecordGetResponseDTO",
		});
	});

	it("reports an old name with two new names as ambiguous and old components without a pair as unmatched", () => {
		const result: SpawnSyncReturns<string> = run(OLD_DOCUMENT_PATH, newDocumentPath);

		expect(result.stderr.replaceAll(SIGNATURE_PATTERN, "<signature>").trimEnd().split("\n")).toEqual([
			"Ambiguous old names, not in the map:",
			"  E2eRenameMapItemEntityGetListResponseDTO -> E2eRenameMapAdminItemGetListResponseDTO (GET /admin/rename-map-items), E2eRenameMapPublicItemGetListResponseDTO (GET /public/rename-map-items)",
			"  E2eRenameMapItemEntityGetListResponseItemsDTO -> E2eRenameMapAdminItemGetListPageDTO (GET /admin/rename-map-items), E2eRenameMapPublicItemGetListPageDTO (GET /public/rename-map-items)",
			"  E2eRenameMapItemEntityGetResponseDTO -> E2eRenameMapAdminItemGetResponseDTO (GET /admin/rename-map-items/{id}), E2eRenameMapPublicItemGetResponseDTO (GET /public/rename-map-items/{id})",
			"Old components that no operation pairs with a new component, not in the map:",
			"  E2eRenameMapAdminItemControllerE2eRenameMapItemEntityGetListQuery<signature>DTO",
			"  E2eRenameMapItemEntityGetParametersDTO",
			"  E2eRenameMapPublicItemControllerE2eRenameMapItemEntityGetListQuery<signature>DTO",
			"  E2eRenameMapRecordEntityGetParametersDTO",
		]);
	});

	it("reports the components of a removed route as unmatched and keeps the rest of the map", () => {
		const reducedPath: string = path.join(directory, "reduced.json");
		const { "/rename-map-records/submit": _removed, ...paths } = newDocument.paths;

		writeFileSync(reducedPath, JSON.stringify({ ...newDocument, paths }));

		const result: SpawnSyncReturns<string> = run(OLD_DOCUMENT_PATH, reducedPath);

		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout)).not.toHaveProperty("E2eRenameMapRecordEntityCreateBodyDTO");
		expect(JSON.parse(result.stdout)).toHaveProperty("E2eRenameMapRecordEntityGetResponseDTO", "E2eRenameMapRecordGetResponseDTO");
		expect(result.stderr).toContain("  E2eRenameMapRecordEntityCreateBodyDTO\n");
	});

	it("fails when a document cannot be read", () => {
		const invalidPath: string = path.join(directory, "invalid.json");

		writeFileSync(invalidPath, "{ not json");

		for (const result of [run(path.join(directory, "missing.json"), newDocumentPath), run(OLD_DOCUMENT_PATH, invalidPath)]) {
			expect(result.status).toBe(1);
			expect(result.stdout).toBe("");
			expect(result.stderr).toContain("Cannot read OpenAPI document");
		}
	});

	it("applies the map with the command shown in the docs", () => {
		const documentation: string = readFileSync(fileURLToPath(new URL("../../docs/core-concepts/dtos/page.mdx", import.meta.url)), "utf8");
		const commandBody: string | undefined = /node -e '(.+?)' src\/client\.ts/.exec(documentation)?.[1];
		const mapPath: string = path.join(directory, "rename-map.json");
		const filePath: string = path.join(directory, "client.ts");

		writeFileSync(mapPath, run(OLD_DOCUMENT_PATH, newDocumentPath).stdout);
		writeFileSync(filePath, 'const a = "#/components/schemas/E2eRenameMapRecordEntityGetResponseDTO"; const b = "E2eRenameMapRecordEntityGetResponseDTOSuffix";');

		const result: SpawnSyncReturns<string> = spawnSync(process.execPath, ["-e", String(commandBody), filePath], { cwd: directory, encoding: "utf8" });

		expect(result.status).toBe(0);
		expect(readFileSync(filePath, "utf8")).toBe('const a = "#/components/schemas/E2eRenameMapRecordGetResponseDTO"; const b = "E2eRenameMapRecordEntityGetResponseDTOSuffix";');
	});
});

describe("openapi-rename-map script on hand-written documents (E2E)", () => {
	let directory: string;

	/**
	 * Writes two documents and runs the script on them.
	 * @param {unknown} oldDocument - Document before the rename.
	 * @param {unknown} newDocument - Document after the rename.
	 * @returns {SpawnSyncReturns<string>} The script result.
	 */
	const runOn = (oldDocument: unknown, newDocument: unknown): SpawnSyncReturns<string> => {
		const oldPath: string = path.join(directory, "old.json");
		const newPath: string = path.join(directory, "new.json");

		writeFileSync(oldPath, JSON.stringify(oldDocument));
		writeFileSync(newPath, JSON.stringify(newDocument));

		return spawnSync(process.execPath, [SCRIPT_PATH, oldPath, newPath], { encoding: "utf8" });
	};

	const reference = (name: string): { $ref: string } => ({ $ref: `#/components/schemas/${name}` });

	/**
	 * Builds a document with one GET /pets operation that returns the given schema.
	 * @param {unknown} schema - Response schema.
	 * @param {Record<string, unknown>} schemas - Component schemas.
	 * @returns {object} The document.
	 */
	const petsDocument = (schema: unknown, schemas: Record<string, unknown>): object => ({ components: { schemas }, openapi: "3.0.0", paths: { "/pets": { get: { responses: { "200": { content: { "application/json": { schema } } } } } } } });

	const cat = { properties: { meows: { type: "boolean" } }, type: "object" };
	const dog = { properties: { barks: { type: "boolean" } }, type: "object" };

	beforeAll(() => {
		directory = mkdtempSync(path.join(tmpdir(), "openapi-rename-map-hand-written-"));
	});

	afterAll(() => {
		rmSync(directory, { force: true, recursive: true });
	});

	it("pairs reordered oneOf members by discriminator mapping key", () => {
		const result: SpawnSyncReturns<string> = runOn(
			petsDocument({ discriminator: { mapping: { cat: "#/components/schemas/Cat", dog: "#/components/schemas/Dog" }, propertyName: "kind" }, oneOf: [reference("Cat"), reference("Dog")] }, { Cat: cat, Dog: dog }),
			petsDocument({ discriminator: { mapping: { cat: "#/components/schemas/PetCat", dog: "#/components/schemas/PetDog" }, propertyName: "kind" }, oneOf: [reference("PetDog"), reference("PetCat")] }, { PetCat: cat, PetDog: dog }),
		);

		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({ Cat: "PetCat", Dog: "PetDog" });
		expect(result.stderr).toBe("");
	});

	it("pairs oneOf members without a discriminator by position only when their property names identify them", () => {
		const kept: SpawnSyncReturns<string> = runOn(petsDocument({ oneOf: [reference("Cat"), reference("Dog")] }, { Cat: cat, Dog: dog }), petsDocument({ oneOf: [reference("PetCat"), reference("PetDog")] }, { PetCat: cat, PetDog: dog }));
		const reordered: SpawnSyncReturns<string> = runOn(petsDocument({ anyOf: [reference("Cat"), reference("Dog")] }, { Cat: cat, Dog: dog }), petsDocument({ anyOf: [reference("PetDog"), reference("PetCat")] }, { PetCat: cat, PetDog: dog }));
		const alike: SpawnSyncReturns<string> = runOn(petsDocument({ oneOf: [reference("Cat"), reference("Dog")] }, { Cat: {}, Dog: {} }), petsDocument({ oneOf: [reference("PetDog"), reference("PetCat")] }, { PetCat: {}, PetDog: {} }));
		const changed: SpawnSyncReturns<string> = runOn(petsDocument({ oneOf: [reference("Cat"), reference("Dog")] }, { Cat: cat, Dog: dog }), petsDocument({ oneOf: [reference("PetCat"), reference("PetBird")] }, { PetBird: { properties: { sings: { type: "boolean" } }, type: "object" }, PetCat: cat }));

		expect(JSON.parse(kept.stdout)).toEqual({ Cat: "PetCat", Dog: "PetDog" });
		expect(JSON.parse(reordered.stdout)).toEqual({});
		expect(reordered.stderr.trimEnd().split("\n")).toEqual(["Ambiguous old names, not in the map:", "  Cat -> anyOf member 0 (GET /pets) moved to member 1 in the new document, and members without a discriminator mapping pair only at the same position", "  Dog -> anyOf member 1 (GET /pets) moved to member 0 in the new document, and members without a discriminator mapping pair only at the same position"]);
		expect(JSON.parse(alike.stdout)).toEqual({});
		expect(alike.stderr.trimEnd().split("\n")).toEqual(["Ambiguous old names, not in the map:", "  Cat -> oneOf member 0 (GET /pets) has no discriminator mapping, and another member has the same property names", "  Dog -> oneOf member 1 (GET /pets) has no discriminator mapping, and another member has the same property names"]);
		expect(JSON.parse(changed.stdout)).toEqual({ Cat: "PetCat" });
		expect(changed.stderr.trimEnd().split("\n")).toEqual(["Ambiguous old names, not in the map:", "  Dog -> oneOf member 1 (GET /pets) has no discriminator mapping, and the new member at that position has other property names"]);
	});

	it("follows references to components/parameters, requestBodies and responses, and decodes JSON pointer escapes", () => {
		const document = (suffix: string): object => ({
			components: {
				parameters: { Filter: { in: "query", name: "filter", schema: reference(`Filter${suffix}`) } },
				requestBodies: { Body: { content: { "application/json": { schema: reference(`Body${suffix}`) } } } },
				responses: { Ok: { content: { "application/json": { schema: reference(`Path~1Item~0${suffix}`) } } } },
				schemas: { [`Body${suffix}`]: {}, [`Filter${suffix}`]: {}, [`Path/Item~${suffix}`]: {} },
			},
			openapi: "3.0.0",
			paths: { "/items": { post: { parameters: [{ $ref: "#/components/parameters/Filter" }], requestBody: { $ref: "#/components/requestBodies/Body" }, responses: { "200": { $ref: "#/components/responses/Ok" } } } } },
		});
		const result: SpawnSyncReturns<string> = runOn(document("Old"), document("New"));

		expect(result.status).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({ BodyOld: "BodyNew", FilterOld: "FilterNew", "Path/Item~Old": "Path/Item~New" });
	});

	it("walks a very deep reference chain without a stack overflow", () => {
		const depth: number = 20_000;
		const chain = (prefix: string): Record<string, unknown> => Object.fromEntries(Array.from({ length: depth }, (_value: unknown, index: number): [string, unknown] => [`${prefix}${String(index)}`, index + 1 < depth ? { properties: { next: reference(`${prefix}${String(index + 1)}`) } } : {}]));
		const result: SpawnSyncReturns<string> = runOn(petsDocument(reference("Old0"), chain("Old")), petsDocument(reference("New0"), chain("New")));

		expect(result.status).toBe(0);
		expect(Object.keys(JSON.parse(result.stdout) as object)).toHaveLength(depth);
		expect(result.stderr).toBe("");
	});

	it.each([
		["parameters as an object", { paths: { "/a": { get: { parameters: {} } } } }, "Cannot map the OpenAPI documents: old GET /a parameters must be an array"],
		["a null parameter", { paths: { "/a": { get: { parameters: [null] } } } }, "Cannot map the OpenAPI documents: old GET /a parameter 0 must be an object"],
		["oneOf as an object", { paths: { "/a": { get: { responses: { "200": { content: { "application/json": { schema: { oneOf: { a: 1 } } } } } } } } } }, "Cannot map the OpenAPI documents: old schema in GET /a.oneOf must be an array"],
		["a $ref cycle", { components: { responses: { Loop: { $ref: "#/components/responses/Loop" } } }, paths: { "/a": { get: { responses: { "200": { $ref: "#/components/responses/Loop" } } } } } }, "Cannot map the OpenAPI documents: old GET /a response 200 has a $ref chain longer than 64 or a $ref cycle"],
	])("fails with a message and no stack trace for %s", (_label: string, document: object, message: string) => {
		const result: SpawnSyncReturns<string> = runOn(document, document);

		expect(result.status).toBe(1);
		expect(result.stdout).toBe("");
		expect(result.stderr).toBe(`${message}\n`);
	});

	it("prints the usage line when an argument is missing, and rejects YAML", () => {
		const yamlPath: string = path.join(directory, "openapi.yaml");

		writeFileSync(yamlPath, "openapi: 3.0.0\npaths: {}\n");

		const missing: SpawnSyncReturns<string> = spawnSync(process.execPath, [SCRIPT_PATH, yamlPath], { encoding: "utf8" });
		const yaml: SpawnSyncReturns<string> = spawnSync(process.execPath, [SCRIPT_PATH, yamlPath, yamlPath], { encoding: "utf8" });

		expect(missing.status).toBe(1);
		expect(missing.stderr).toBe("Usage: node openapi-rename-map.mjs <old-openapi.json> <new-openapi.json> > rename-map.json\n");
		expect(yaml.status).toBe(1);
		expect(yaml.stderr).toBe(`Cannot read OpenAPI document ${yamlPath}: YAML is not supported; pass JSON\n`);
	});
});

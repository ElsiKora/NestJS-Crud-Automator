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
			"  E2eRenameMapItemEntityGetListResponseItemsDTO -> E2eRenameMapAdminItemGetListResponseItemsDTO (GET /admin/rename-map-items), E2eRenameMapPublicItemGetListResponseItemsDTO (GET /public/rename-map-items)",
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

	it("fails only when a document cannot be read", () => {
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

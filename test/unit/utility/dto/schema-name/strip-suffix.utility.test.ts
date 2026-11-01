import { DtoSchemaNameStripSuffix } from "@utility/dto/schema-name";
import { describe, expect, it } from "vitest";

describe("DtoSchemaNameStripSuffix", () => {
	it.each([
		["DepositResponseDTO", "DepositResponse"],
		["DepositResponseDto", "DepositResponse"],
		["DepositResponsedto", "DepositResponse"],
		["DepositResponseDtoDTO", "DepositResponseDto"],
		["FooDtoDto", "FooDto"],
		["DtoDTO", "Dto"],
		["DepositResponse", "DepositResponse"],
		["DtoHost", "DtoHost"],
	])("turns %s into %s", (name: string, stripped: string) => {
		expect(DtoSchemaNameStripSuffix(name)).toBe(stripped);
	});

	it.each(["DTO", "Dto", "dto"])("keeps %s, which is only the suffix", (name: string) => {
		expect(DtoSchemaNameStripSuffix(name)).toBe(name);
	});
});

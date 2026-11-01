import { DtoSchemaNameGetSegment } from "@utility/dto/schema-name";
import { describe, expect, it } from "vitest";

describe("DtoSchemaNameGetSegment", () => {
	it.each([
		["owner", "Owner"],
		["v2Item", "V2Item"],
		["HTMLContent", "HTMLContent"],
		["userID", "UserID"],
		["ID", "ID"],
		["created_by", "CreatedBy"],
		["x-id", "XId"],
		["v2-beta", "V2Beta"],
		["meta.data", "MetaData"],
		["first name", "FirstName"],
		["_private__value", "PrivateValue"],
	])("turns %s into %s: the first letter and every letter after a separator are uppercased, the rest are kept", (value: string, segment: string) => {
		expect(DtoSchemaNameGetSegment(value, "HostDTO")).toBe(segment);
	});

	it.each([
		["fooDTO", "Foo"],
		["fooDto", "Foo"],
		["foodto", "Foo"],
		["foo_dto", "Foo"],
		["foo-DTO", "Foo"],
		["fooDtoDTO", "FooDto"],
		["dto_dto", "Dto"],
		["dtoDto", "Dto"],
		["dtoFoo", "DtoFoo"],
	])("does not repeat the DTO suffix: %s gives %s", (value: string, segment: string) => {
		expect(DtoSchemaNameGetSegment(value, "HostDTO")).toBe(segment);
	});

	it.each([
		["dto", "Dto"],
		["DTO", "DTO"],
		["Dto", "Dto"],
		["_dto", "Dto"],
		["dto_", "Dto"],
	])("keeps %s as %s, because a legal name that is only the suffix must not need a rename", (value: string, segment: string) => {
		expect(DtoSchemaNameGetSegment(value, "HostDTO")).toBe(segment);
	});

	it.each(["_", "__", "-", ".", " ", ""])("fails naming the host and the property when %j has no word in it", (value: string) => {
		expect(() => DtoSchemaNameGetSegment(value, "HostDTO")).toThrow(`Property or variant "${value}" of HostDTO leaves nothing`);
	});
});

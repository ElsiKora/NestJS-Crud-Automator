import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiControllerRejectCreateInverseSideKeys } from "@utility/api/controller/reject-create-inverse-side-keys.utility";
import { describe, expect, it } from "vitest";

import { InverseSideParentEntity, InverseSideSubclassEntity } from "../../database/typeorm/is/fixture/inverse-side-relation.entity";

function catchRejection(entity: unknown, body: unknown): unknown {
	try {
		ApiControllerRejectCreateInverseSideKeys(entity, body);
	} catch (error) {
		return error;
	}

	return undefined;
}

describe("ApiControllerRejectCreateInverseSideKeys", () => {
	it.each([
		["a OneToMany reference", { children: "child-1" }, "children"],
		["a OneToMany array of keys", { children: ["child-1"] }, "children"],
		["a OneToMany array of key-only objects", { children: [{ id: "child-1" }] }, "children"],
		["a OneToMany array with one key-only object among new rows", { children: [{ name: "new" }, { id: "child-1" }] }, "children"],
		["an inverse OneToOne key-only object", { profile: { id: "child-1" } }, "profile"],
		["an inverse OneToOne key", { profile: 1 }, "profile"],
	])("rejects %s like an undeclared property", (_name: string, body: object, property: string) => {
		const error: unknown = catchRejection(InverseSideParentEntity, body);

		expect(error).toBeInstanceOf(ApiRequestValidationException);
		expect((error as ApiRequestValidationException).getResponse()).toEqual({ error: "Bad Request", message: [`property ${property} should not exist`], statusCode: 400 });
		expect((error as ApiRequestValidationException).validationErrors.map(({ constraints, property: errorProperty }) => ({ constraints, property: errorProperty }))).toEqual([{ constraints: { whitelistValidation: `property ${property} should not exist` }, property }]);
	});

	it("lists every such key", () => {
		const error: unknown = catchRejection(InverseSideParentEntity, { children: "child-1", profile: "child-2" });

		expect((error as ApiRequestValidationException).getResponse()).toMatchObject({ message: ["property children should not exist", "property profile should not exist"] });
	});

	it("reads relations declared on a parent class", () => {
		expect(catchRejection(InverseSideSubclassEntity, { children: "child-1" })).toBeInstanceOf(ApiRequestValidationException);
	});

	it.each([
		["an owning OneToOne", { owned: "child-1" }],
		["a ManyToOne", { owner: "child-1" }],
		["a ManyToMany", { tags: ["child-1"] }],
		["an undefined OneToMany", { children: undefined }],
		["null for a OneToMany", { children: null }],
		["an empty OneToMany array", { children: [] }],
		["new OneToMany rows with their own values", { children: [{ id: "child-new", parent: null }, { profileOf: null }] }],
		["a new inverse OneToOne row", { profile: { id: "child-new", profileOf: null } }],
		["an empty object", { profile: {} }],
		["a column", { id: "parent-1" }],
		["no body", undefined],
		["a non-object body", "text"],
	])("accepts %s", (_name: string, body: unknown) => {
		expect(catchRejection(InverseSideParentEntity, body)).toBeUndefined();
	});
});

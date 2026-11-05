import type { IApiAuthorizationResourceDefinition } from "@interface/class/api/authorization";

import { AuthorizationPlaceholderResolveQueryPath } from "@utility/authorization/placeholder-resolve-query-path.utility";
import { describe, expect, it } from "vitest";

class PlaceholderRowEntity {
	public id!: string;

	public tenant!: string;

	public tenantCode!: string;
}

const definition = (fields: IApiAuthorizationResourceDefinition<PlaceholderRowEntity>["fields"]): IApiAuthorizationResourceDefinition<PlaceholderRowEntity> => ({ entity: PlaceholderRowEntity, fields, namespace: "app:row", resourcePath: "app:row/{tenant}/{id}", resourceType: "app:row" });

describe("AuthorizationPlaceholderResolveQueryPath", () => {
	it("reads the field that maps the placeholder first", () => {
		expect(AuthorizationPlaceholderResolveQueryPath(definition([{ isFilterable: false, path: "resource.tenant", queryPath: "tenantCode" }]), "tenant", { parameters: [{ field: "id", parameter: "tenant" }] })).toBe("tenantCode");
	});

	it("reads the path scope binding of the path parameter of that name without a field", () => {
		expect(AuthorizationPlaceholderResolveQueryPath(definition([{ isFilterable: true, path: "resource.id", queryPath: "id" }]), "tenant", { parameters: [{ field: "tenantCode", parameter: "tenant" }] })).toBe("tenantCode");
	});

	it("reads the entity property of the placeholder name without either", () => {
		expect(AuthorizationPlaceholderResolveQueryPath(definition([]), "tenant", { parameters: [{ field: "tenantCode", parameter: "other" }] })).toBe("tenant");
		expect(AuthorizationPlaceholderResolveQueryPath(definition([]), "tenant")).toBe("tenant");
	});
});

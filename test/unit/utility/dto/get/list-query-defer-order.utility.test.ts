import "reflect-metadata";

import type { IApiEntity } from "@interface/entity";

import { DtoGetListQueryDeferOrder } from "@utility/dto/get/list-query-defer-order.utility";
import { describe, expect, it, vi } from "vitest";

const ENTITY_METADATA: IApiEntity<object> = { name: "Item" } as unknown as IApiEntity<object>;

const readFactory = (resolveOrderBy: () => Record<string, string>): Record<string, unknown> => {
	class ListQueryDto {}

	DtoGetListQueryDeferOrder(ListQueryDto, ENTITY_METADATA, resolveOrderBy);

	return (Reflect.get(ListQueryDto, "_OPENAPI_METADATA_FACTORY") as () => Record<string, unknown>)();
};

describe("DtoGetListQueryDeferOrder", () => {
	it("answers the in operator as it answers hasOwn", () => {
		const metadata: Record<string, unknown> = readFactory(() => ({ LABEL: "label" }));

		expect("orderBy" in metadata).toBe(true);
		expect(Object.hasOwn(metadata, "orderBy")).toBe(true);
		expect("orderDirection" in metadata).toBe(true);
		expect(Object.hasOwn(metadata, "orderDirection")).toBe(true);
	});

	it("declares no order property when the route has no orderable field", () => {
		const metadata: Record<string, unknown> = readFactory(() => ({}));

		expect("orderBy" in metadata).toBe(false);
		expect(Object.hasOwn(metadata, "orderBy")).toBe(false);
	});

	it("does not read the response fields for another property", () => {
		const resolveOrderBy = vi.fn((): Record<string, string> => ({ LABEL: "label" }));
		const metadata: Record<string, unknown> = readFactory(resolveOrderBy);

		expect("limit" in metadata).toBe(false);
		expect(metadata.limit).toBeUndefined();
		expect(resolveOrderBy).not.toHaveBeenCalled();
	});
});

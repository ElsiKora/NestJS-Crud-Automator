import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";
import { describe, expect, it } from "vitest";

describe("ApiControllerGetListQueryEnumValues", () => {
	it("removes numeric reverse mappings while preserving heterogeneous values", () => {
		const values = ApiControllerGetListQueryEnumValues({
			0: "DISABLED",
			DISABLED: 0,
			ENABLED: "enabled",
		});

		expect(values).toEqual([0, "enabled"]);
		expect(Object.isFrozen(values)).toBe(true);
	});

	it("preserves numeric-looking keys that are not reverse mappings", () => {
		expect(
			ApiControllerGetListQueryEnumValues({
				200: "success",
			}),
		).toEqual(["success"]);
	});
});

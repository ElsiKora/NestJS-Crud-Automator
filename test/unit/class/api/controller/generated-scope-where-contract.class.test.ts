import { ApiControllerGeneratedScopeWhereContract } from "@class/api/controller/generated/scope-where-contract.class";
import { describe, expect, it } from "vitest";

const runWithPrototypeIndex = <T>(mode: "plain" | "polluted", callback: () => T): T => {
	if (mode === "plain") {
		return callback();
	}

	Object.defineProperty(Object.prototype, "1", { configurable: true, value: {}, writable: true });

	try {
		return callback();
	} finally {
		Reflect.deleteProperty(Object.prototype, "1");
	}
};

describe("ApiControllerGeneratedScopeWhereContract", () => {
	it.each(["plain", "polluted"] as const)("rejects a foreign branch past the end of the mandatory scope on a %s prototype", (mode) => {
		const candidate = [{ tenantId: "tenant-A" }, { tenantId: "tenant-VICTIM" }];
		const mandatory = [{ tenantId: "tenant-A" }];

		expect(runWithPrototypeIndex(mode, () => ApiControllerGeneratedScopeWhereContract.contains(candidate, mandatory))).toBe(false);
	});

	it.each(["plain", "polluted"] as const)("accepts narrowed branches past the end of the mandatory scope on a %s prototype", (mode) => {
		const candidate = [
			{ id: "id-1", tenantId: "tenant-A" },
			{ id: "id-2", tenantId: "tenant-A" },
		];
		const mandatory = [{ tenantId: "tenant-A" }];

		expect(runWithPrototypeIndex(mode, () => ApiControllerGeneratedScopeWhereContract.contains(candidate, mandatory))).toBe(true);
	});

	it.each([
		["reversed", ["tenant-C", "tenant-B", "tenant-A"]],
		["shifted", ["tenant-B", "tenant-C", "tenant-A"]],
	])("accepts %s branches of the mandatory scope", (_order, tenants) => {
		const candidate = tenants.map((tenantId: string) => ({ tenantId }));
		const mandatory = [{ tenantId: "tenant-A" }, { tenantId: "tenant-B" }, { tenantId: "tenant-C" }];

		expect(ApiControllerGeneratedScopeWhereContract.contains(candidate, mandatory)).toBe(true);
	});

	it("rejects a branch whose value is in no mandatory branch", () => {
		const candidate = [{ tenantId: "tenant-A" }, { tenantId: "tenant-C" }];
		const mandatory = [{ tenantId: "tenant-A" }, { tenantId: "tenant-B" }];

		expect(ApiControllerGeneratedScopeWhereContract.contains(candidate, mandatory)).toBe(false);
	});

	it("rejects a branch that omits a mandatory column", () => {
		const candidate = [{ tenantId: "tenant-A" }, { id: "id-1" }];
		const mandatory = [{ tenantId: "tenant-A" }, { tenantId: "tenant-B" }];

		expect(ApiControllerGeneratedScopeWhereContract.contains(candidate as never, mandatory as never)).toBe(false);
	});
});

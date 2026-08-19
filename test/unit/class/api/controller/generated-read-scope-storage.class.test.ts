import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated-read-scope-storage.class";
import { EApiFunctionType } from "@enum/decorator/api";
import { Equal } from "typeorm";
import { describe, expect, it } from "vitest";

class GeneratedReadScopeEntity {
	public id?: string;
	public tenantId?: string;
}

describe("ApiControllerGeneratedReadScopeStorage", () => {
	it("binds a detached mandatory scope to the exact input once and supports frozen subscriber options", async () => {
		const requiredOperator = Equal("tenant-required");
		const input = { where: { id: "item-required", tenantId: requiredOperator } };

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, input, input.where, async () => {
			expect(ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, { where: input.where })).toBeUndefined();

			const mandatoryWhere = ApiControllerGeneratedReadScopeStorage.claim<GeneratedReadScopeEntity>(EApiFunctionType.GET, input);

			expect(mandatoryWhere).toBeDefined();
			expect(ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, input)).toBeUndefined();

			(requiredOperator as unknown as { _value: string })._value = "tenant-mutated";

			const subscriberOptions = Object.freeze({ where: Object.freeze({ id: "item-foreign", tenantId: "tenant-foreign" }) });
			const protectedOptions = ApiControllerGeneratedReadScopeStorage.protect(subscriberOptions, mandatoryWhere!);
			const protectedWhere = protectedOptions.where as Record<string, unknown>;

			expect(protectedOptions).not.toBe(subscriberOptions);
			expect(subscriberOptions.where).toEqual({ id: "item-foreign", tenantId: "tenant-foreign" });
			expect(protectedWhere.id).toMatchObject({
				_type: "and",
				_value: [
					{ _type: "equal", _value: "item-foreign" },
					{ _type: "equal", _value: "item-required" },
				],
			});
			expect(protectedWhere.tenantId).toMatchObject({
				_type: "and",
				_value: [
					{ _type: "equal", _value: "tenant-foreign" },
					{ _type: "equal", _value: "tenant-required" },
				],
			});
		});
	});
});

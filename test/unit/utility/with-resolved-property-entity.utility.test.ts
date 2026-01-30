import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";
import { describe, expect, it, vi } from "vitest";

class TestEntity implements IApiBaseEntity {
	public name?: string;
}

describe("WithResolvedPropertyEntity", () => {
	it("invokes callback immediately when entity resolves", () => {
		const onResolved = vi.fn();

		WithResolvedPropertyEntity(TestEntity, "TestDecorator", onResolved);

		expect(onResolved).toHaveBeenCalledTimes(1);
		expect(onResolved).toHaveBeenCalledWith(TestEntity);
	});

	it("defers execution until entity resolves later", async () => {
		let resolved: typeof TestEntity | undefined;
		const factory = (): typeof TestEntity | undefined => resolved;
		const onResolved = vi.fn();

		WithResolvedPropertyEntity(factory, "TestDecorator", onResolved);
		expect(onResolved).not.toHaveBeenCalled();

		resolved = TestEntity;
		await Promise.resolve();

		expect(onResolved).toHaveBeenCalledTimes(1);
		expect(onResolved).toHaveBeenCalledWith(TestEntity);
	});
});

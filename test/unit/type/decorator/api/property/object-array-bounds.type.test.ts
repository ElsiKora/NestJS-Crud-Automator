import type { TApiPropertyObjectProperties } from "../../../../../../src";

import { describe, expect, it } from "vitest";

class ObjectArrayBoundsItemDto {}

class ObjectArrayBoundsEntity {}

describe("TApiPropertyObjectProperties array bounds", () => {
	it("lets a response array leave out its bounds", () => {
		const responseWithoutBounds: TApiPropertyObjectProperties = { description: "items", entity: ObjectArrayBoundsEntity, isArray: true, isResponse: true, type: ObjectArrayBoundsItemDto };

		expect(responseWithoutBounds.isArray).toBe(true);
	});

	it("keeps requiring bounds on a request array", () => {
		// @ts-expect-error A request array must declare isUniqueItems, maxItems and minItems.
		const requestWithoutBounds: TApiPropertyObjectProperties = { description: "items", entity: ObjectArrayBoundsEntity, isArray: true, shouldValidateNested: true, type: ObjectArrayBoundsItemDto };
		// @ts-expect-error A route that is not marked as a response is a request, so it must declare its bounds too.
		const unmarkedWithoutBounds: TApiPropertyObjectProperties = { description: "items", entity: ObjectArrayBoundsEntity, isArray: true, isResponse: false, shouldValidateNested: true, type: ObjectArrayBoundsItemDto };
		const requestWithBounds: TApiPropertyObjectProperties = { description: "items", entity: ObjectArrayBoundsEntity, isArray: true, isUniqueItems: false, maxItems: 10, minItems: 0, shouldValidateNested: true, type: ObjectArrayBoundsItemDto };

		expect([requestWithoutBounds, unmarkedWithoutBounds, requestWithBounds]).toHaveLength(3);
	});
});

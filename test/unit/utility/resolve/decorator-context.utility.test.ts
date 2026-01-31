import "reflect-metadata";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { ResolveDecoratorContext } from "@utility/resolve/decorator-context.utility";
import { describe, expect, it } from "vitest";

describe("ResolveDecoratorContext", () => {
	it("returns undefined without explicit or auto context", () => {
		const target = {};
		expect(ResolveDecoratorContext(target, undefined, undefined, false)).toBeUndefined();
	});

	it("resolves context from auto metadata when enabled", () => {
		const target = {};
		const stack = [{ method: EApiRouteType.GET_LIST, dtoType: EApiDtoType.QUERY }];
		Reflect.defineMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, stack, target);

		const result = ResolveDecoratorContext(target, undefined, undefined, true);
		expect(result).toEqual({ method: EApiRouteType.GET_LIST, dtoType: EApiDtoType.QUERY });
	});
});

import "reflect-metadata";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";
import { describe, expect, it } from "vitest";

describe("GetAutoDtoContext", () => {
	it("returns undefined when no context metadata is present", () => {
		const target = {};
		expect(GetAutoDtoContext(target)).toBeUndefined();
	});

	it("returns the last stored context entry", () => {
		const target = {};
		const stack = [
			{ method: "create", dtoType: "body" },
			{ method: "getList", dtoType: "query" },
		];
		Reflect.defineMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, stack, target);

		expect(GetAutoDtoContext(target)).toEqual(stack[1]);
	});
});

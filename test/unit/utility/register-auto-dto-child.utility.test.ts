import "reflect-metadata";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { QueueAutoDtoContextExecution } from "@utility/auto-dto-context-queue.utility";
import { GetRegisteredAutoDtoChildren, RegisterAutoDtoChild } from "@utility/register-auto-dto-child.utility";
import { describe, expect, it, vi } from "vitest";

class ParentDto {}
class ChildDto {}
class ChildDtoTwo {}

describe("RegisterAutoDtoChild", () => {
	it("registers children and copies existing context", () => {
		const parentPrototype = ParentDto.prototype as object;
		const childPrototype = ChildDto.prototype as object;

		Reflect.defineMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, [{ method: EApiRouteType.GET_LIST, dtoType: EApiDtoType.QUERY }], parentPrototype);

		const queuedHandler = vi.fn();
		QueueAutoDtoContextExecution(childPrototype, queuedHandler);

		RegisterAutoDtoChild(parentPrototype, ChildDto);

		const children = GetRegisteredAutoDtoChildren(parentPrototype);
		expect(children?.has(ChildDto)).toBe(true);
		expect(Reflect.getMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, childPrototype)).toEqual([{ method: EApiRouteType.GET_LIST, dtoType: EApiDtoType.QUERY }]);
		expect(queuedHandler).toHaveBeenCalledTimes(1);
	});

	it("accepts arrays of child constructors", () => {
		const parentPrototype = ParentDto.prototype as object;

		RegisterAutoDtoChild(parentPrototype, [ChildDto, ChildDtoTwo]);

		const children = GetRegisteredAutoDtoChildren(parentPrototype);
		expect(children?.has(ChildDto)).toBe(true);
		expect(children?.has(ChildDtoTwo)).toBe(true);
	});
});

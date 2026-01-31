import "reflect-metadata";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { RegisterAutoDtoChild } from "@utility/register-auto-dto-child.utility";
import { describe, expect, it } from "vitest";

class ParentDto {}
class ChildDto {}
class VisitedDto {}

describe("DtoAutoContextPush", () => {
	it("pushes context and propagates to children", () => {
		const parentPrototype = ParentDto.prototype as object;
		const childPrototype = ChildDto.prototype as object;

		RegisterAutoDtoChild(parentPrototype, ChildDto);

		DtoAutoContextPush(parentPrototype, EApiRouteType.CREATE, EApiDtoType.BODY);

		expect(Reflect.getMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, parentPrototype)).toEqual([{ dtoType: EApiDtoType.BODY, method: EApiRouteType.CREATE }]);
		expect(Reflect.getMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, childPrototype)).toEqual([{ dtoType: EApiDtoType.BODY, method: EApiRouteType.CREATE }]);
	});

	it("ignores invalid targets and already visited prototypes", () => {
		expect(() => DtoAutoContextPush(undefined as unknown as object, EApiRouteType.GET, EApiDtoType.RESPONSE)).not.toThrow();

		const visited = new WeakSet<object>();
		const prototype = VisitedDto.prototype as object;
		visited.add(prototype);

		DtoAutoContextPush(prototype, EApiRouteType.GET, EApiDtoType.RESPONSE, visited);
		expect(Reflect.getMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, prototype)).toEqual([{ dtoType: EApiDtoType.RESPONSE, method: EApiRouteType.GET }]);
	});
});

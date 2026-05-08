import "reflect-metadata";

import { AUTO_CONTEXT_DTO_CONSTANT } from "@constant/dto/auto-context.constant";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoAutoContextPop } from "@utility/dto/auto/context/pop.utility";
import { RegisterAutoDtoChild } from "@utility/register-auto-dto-child.utility";
import { describe, expect, it } from "vitest";

class PopParentDto {}
class PopChildDto {}

describe("DtoAutoContextPop", () => {
	it("pops context and clears metadata when empty", () => {
		const prototype = PopParentDto.prototype as object;
		Reflect.defineMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, [{ dtoType: EApiDtoType.BODY, method: EApiRouteType.CREATE }], prototype);

		DtoAutoContextPop(prototype);
		expect(Reflect.getMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, prototype)).toBeUndefined();
	});

	it("propagates pop to registered children", () => {
		const parentPrototype = PopParentDto.prototype as object;
		const childPrototype = PopChildDto.prototype as object;

		RegisterAutoDtoChild(parentPrototype, PopChildDto);
		Reflect.defineMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, [{ dtoType: EApiDtoType.QUERY, method: EApiRouteType.GET_LIST }], parentPrototype);
		Reflect.defineMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, [{ dtoType: EApiDtoType.QUERY, method: EApiRouteType.GET_LIST }], childPrototype);

		DtoAutoContextPop(parentPrototype);

		expect(Reflect.getMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, parentPrototype)).toBeUndefined();
		expect(Reflect.getMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, childPrototype)).toBeUndefined();
	});

	it("keeps metadata when more contexts remain", () => {
		const prototype = PopParentDto.prototype as object;
		Reflect.defineMetadata(
			AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY,
			[
				{ dtoType: EApiDtoType.BODY, method: EApiRouteType.CREATE },
				{ dtoType: EApiDtoType.RESPONSE, method: EApiRouteType.CREATE },
			],
			prototype,
		);

		DtoAutoContextPop(prototype);

		expect(Reflect.getMetadata(AUTO_CONTEXT_DTO_CONSTANT.METADATA_KEY, prototype)).toEqual([{ dtoType: EApiDtoType.BODY, method: EApiRouteType.CREATE }]);
	});

	it("ignores invalid targets and already visited prototypes", () => {
		expect(() => DtoAutoContextPop(undefined as unknown as object)).not.toThrow();

		const visited = new WeakSet<object>();
		const prototype = PopParentDto.prototype as object;
		visited.add(prototype);

		DtoAutoContextPop(prototype, visited);
	});
});

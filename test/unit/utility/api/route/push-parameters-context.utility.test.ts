import "reflect-metadata";

import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY } from "@utility/api/controller/parameters/dto/metadata-key.constant";
import { ApiRoutePushParametersContext } from "@utility/api/route/push-parameters-context.utility";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("push_parameters_context_items")
class PushParametersContextItemEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "code", type: EApiPropertyDescribeType.UUID })
	public code!: string;
}

/**
 * Declares a PARAMETERS DTO whose path value copies the UUID primary key with `shouldAutoResolveContext`.
 * @returns {new () => unknown} A new DTO class.
 */
function buildAutoCopyDto(): new () => unknown {
	class PushParametersContextAutoDto {
		@ApiPropertyCopy({ entity: () => PushParametersContextItemEntity, propertyName: "id", shouldAutoResolveContext: true })
		public id!: string;
	}

	return PushParametersContextAutoDto;
}

describe("ApiRoutePushParametersContext", () => {
	it("gives a DTO with a copy that follows the route context the route type and PARAMETERS, so the copy records its column", async () => {
		const dto: new () => unknown = buildAutoCopyDto();

		ApiRoutePushParametersContext(dto, EApiRouteType.GET);
		// A lazy entity factory resolves on a microtask.
		await Promise.resolve();

		expect(GetAutoDtoContext(dto.prototype as object)).toEqual({ dtoType: EApiDtoType.PARAMETERS, method: EApiRouteType.GET });
		expect(Reflect.hasMetadata(API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY, dto.prototype as object, "id")).toBe(true);
	});

	it("leaves a DTO without such a copy, and a route without a route type, as they are", () => {
		class PushParametersContextPlainDto {
			@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: () => PushParametersContextItemEntity, method: EApiRouteType.GET, propertyName: "code" })
			public code!: string;
		}

		const dto: new () => unknown = buildAutoCopyDto();

		ApiRoutePushParametersContext(PushParametersContextPlainDto, EApiRouteType.GET);
		ApiRoutePushParametersContext(dto, undefined);
		ApiRoutePushParametersContext({ discriminator: "kind" }, EApiRouteType.GET);

		expect(GetAutoDtoContext(PushParametersContextPlainDto.prototype)).toBeUndefined();
		expect(GetAutoDtoContext(dto.prototype as object)).toBeUndefined();
	});

	it("accepts a second route of the same route type and refuses one of another, whose copy the DTO cannot follow", () => {
		const dto: new () => unknown = buildAutoCopyDto();

		ApiRoutePushParametersContext(dto, EApiRouteType.GET);

		expect(() => ApiRoutePushParametersContext(dto, EApiRouteType.GET)).not.toThrow();
		expect(() => ApiRoutePushParametersContext(dto, EApiRouteType.DELETE)).toThrow('The PARAMETERS DTO "PushParametersContextAutoDto" copies an entity column with shouldAutoResolveContext and is served by custom routes of the route types "get" and "delete"');
	});
});

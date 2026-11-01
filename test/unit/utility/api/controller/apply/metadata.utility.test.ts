import "reflect-metadata";

import type { IApiControllerParametersRule } from "@interface/class/api/controller";
import type { IApiControllerProperties } from "@interface/decorator/api";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/internal";
import { ApiControllerApplyMetadata } from "@utility/api/controller/apply/metadata.utility";
import { ApiControllerParametersDtoGet } from "@utility/api/controller/parameters";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Entity, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

class MetadataDto {}

@Entity("metadata_entities")
class MetadataEntity {
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

describe("ApiControllerApplyMetadata", () => {
	it("writes parameter metadata for request/query/body/headers/ip/request", () => {
		const properties: IApiControllerProperties<MetadataEntity> = {
			entity: MetadataEntity,
			routes: {},
		};
		const routeConfig = {
			dto: {
				body: MetadataDto,
				parameters: MetadataDto,
				query: MetadataDto,
			},
		};

		class MetadataTestController {}

		const target: object = MetadataTestController;
		const targetPrototype = { update: (): void => undefined };

		ApiControllerApplyMetadata(target, targetPrototype, GenerateEntityInformation(MetadataEntity), properties, EApiRouteType.UPDATE, "update", routeConfig as never);

		const paramTypes = Reflect.getMetadata(PARAMTYPES_METADATA, targetPrototype, "update") as Array<unknown>;
		const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, "update") as Record<string, unknown>;
		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersDtoGet(targetPrototype.update);

		expect(paramTypes).toHaveLength(6);
		expect(paramTypes[0]).not.toBe(MetadataDto);
		expect(paramTypes.slice(1)).toEqual([MetadataDto, MetadataDto, Object, Object, Object]);
		expect(rule).toEqual({ configuredDto: MetadataDto, dto: paramTypes[0] });
		expect(Object.keys(routeArgs ?? {})).toHaveLength(6);
	});
});

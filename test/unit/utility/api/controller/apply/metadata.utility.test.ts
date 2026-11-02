import "reflect-metadata";

import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/internal";
import { ApiControllerApplyMetadata, ApiControllerApplyMetadataWithPathPlan } from "@utility/api/controller/apply/metadata.utility";
import { ApiControllerParametersDtoGet } from "@utility/api/controller/parameters";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, PrimaryColumn } from "typeorm";
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

@Entity("metadata_alias_entities")
class MetadataAliasEntity {
	@ApiPropertyDescribe({ description: "code", exampleValue: "16", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: String.raw`/^\d+$/`, type: EApiPropertyDescribeType.STRING })
	@Column({ type: "int" })
	public code!: string;

	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({ description: "tenant code", exampleValue: "7", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: String.raw`/^\d+$/`, type: EApiPropertyDescribeType.STRING })
	@Column({ type: "int" })
	public tenantCode!: string;
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
		expect(rule?.configuredDto).toBe(MetadataDto);
		expect(rule?.dto).toBe(paramTypes[0]);
		expect([...(rule?.columns?.keys() ?? [])]).toEqual(["id"]);
		expect(rule?.columns?.get("id")?.type).toBe("uuid");
		expect(Object.keys(routeArgs ?? {})).toHaveLength(6);
	});

	it("names the column an identity alias and a read scope parameter hold, not a column of the parameter's name", () => {
		const properties: IApiControllerProperties<MetadataAliasEntity> = {
			entity: MetadataAliasEntity,
			routes: {},
		};

		class MetadataAliasController {}

		const targetPrototype = { get: (): void => undefined };

		ApiControllerApplyMetadataWithPathPlan(
			MetadataAliasController,
			targetPrototype,
			GenerateEntityInformation(MetadataAliasEntity),
			properties,
			EApiRouteType.GET,
			"get",
			{} as never,
			undefined,
			{ controllerName: "MetadataAlias", isDefaultRowPath: true, isKeyCovered: true, isRowPathDeclared: false, primaryFields: ["id"], rowParameters: [{ field: "id", parameter: "id" }], scopeParameters: [{ field: "tenantCode", parameter: "tenant" }], signature: "path" },
			{ controllerName: "MetadataAlias", field: "code", parameter: "id", schemaName: "MetadataAliasIdentityParametersDTO", signature: "identity" },
		);

		const rule: IApiControllerParametersRule | undefined = ApiControllerParametersDtoGet(targetPrototype.get);

		expect(rule?.columns?.get("id")?.name).toBe("code");
		expect(rule?.columns?.get("id")?.type).toBe("int");
		expect(rule?.columns?.get("tenant")?.name).toBe("tenantCode");
	});
});

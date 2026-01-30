import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { EApiRouteType } from "@enum/decorator/api";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { ApiControllerApplyMetadata } from "@utility/api/controller/apply/metadata.utility";
import { describe, expect, it } from "vitest";

class MetadataDto {}

describe("ApiControllerApplyMetadata", () => {
	it("writes parameter metadata for request/query/body/headers/ip/request", () => {
		const entityMetadata: IApiEntity<{ name?: string }> = {
			columns: [],
			name: "MetadataEntity",
			primaryKey: undefined,
			tableName: "metadata_entities",
		};
		const properties: IApiControllerProperties<{ name?: string }> = {
			entity: { name: "MetadataEntity" },
			routes: {},
		};
		const routeConfig = {
			dto: {
				body: MetadataDto,
				query: MetadataDto,
				request: MetadataDto,
			},
		};

		const target = {};
		const targetPrototype = {};

		ApiControllerApplyMetadata(target, targetPrototype, entityMetadata, properties, EApiRouteType.CREATE, "create", routeConfig as never);

		const paramTypes = Reflect.getMetadata(PARAMTYPES_METADATA, targetPrototype, "create") as Array<unknown>;
		const routeArgs = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, "create") as Record<string, unknown>;

		expect(paramTypes).toEqual([MetadataDto, MetadataDto, MetadataDto, Object, Object, Object]);
		expect(Object.keys(routeArgs ?? {})).toHaveLength(6);
	});
});

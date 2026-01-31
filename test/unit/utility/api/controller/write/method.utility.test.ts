import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";
import { ApiControllerWriteMethod } from "@utility/api/controller/write/method.utility";
import { describe, expect, it } from "vitest";

class WriteMethodEntity {
	public id?: string;
}

const properties: IApiControllerProperties<WriteMethodEntity> = {
	entity: WriteMethodEntity,
	routes: {},
};
const entityMetadata: IApiEntity<WriteMethodEntity> = {
	columns: [],
	name: "WriteMethodEntity",
	primaryKey: undefined,
	tableName: "write_method_entities",
};

describe("ApiControllerWriteMethod", () => {
	it("throws when reserved method already exists", () => {
		const target: Record<string, unknown> = {
			[ApiControllerGetMethodName(EApiRouteType.GET)]: () => undefined,
		};

		expect(() => ApiControllerWriteMethod({} as never, target, EApiRouteType.GET, properties, entityMetadata)).toThrow("Reserved method get already defined");
	});

	it("throws when method implementation is missing", () => {
		const target: Record<string, unknown> = {};

		expect(() => ApiControllerWriteMethod({} as never, target, EApiRouteType.GET, properties, entityMetadata)).toThrow("Method get not implemented");
	});

	it("writes method implementation when available", () => {
		const target: Record<string, unknown> = {};
		const handler = () => "ok";
		const thisTarget: Record<string, unknown> = {
			[EApiRouteType.GET]: (_method: EApiRouteType, methodName: string, _properties: IApiControllerProperties<WriteMethodEntity>, _metadata: IApiEntity<WriteMethodEntity>) => {
				target[methodName] = handler;
			},
		};

		ApiControllerWriteMethod(thisTarget as never, target, EApiRouteType.GET, properties, entityMetadata);

		expect(target.get).toBe(handler);
	});
});

import "reflect-metadata";

import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiRouteCustom } from "@decorator/api/route-custom.decorator";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, Param, RequestMethod } from "@nestjs/common";
import { PARAMTYPES_METADATA } from "@nestjs/common/internal";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("rebind_items")
class RebindItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

class RebindBase {
	public service!: never;

	@ApiRouteCustom<RebindItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.mine", entity: RebindItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
	})
	public mine(@Param() _parameters: Record<string, string>): void {}
}

const DISABLED: { generation: { isEnabled: false } } = { generation: { isEnabled: false } };

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: DISABLED,
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
} as const;

const AUTHORIZATION = { defaultMode: EApiAuthorizationMode.HOOKS } as const;

/**
 * Reads the name of the parameters DTO of the inherited custom route on a controller.
 * @param {new () => unknown} controller - Decorated controller class.
 * @returns {string | undefined} The DTO class name.
 */
function parametersDtoName(controller: new () => unknown): string | undefined {
	return (Reflect.getMetadata(PARAMTYPES_METADATA, controller.prototype as object, "mine") as Array<{ name: string }> | undefined)?.[0]?.name;
}

describe("ApiRouteRebindInheritedCustom", () => {
	it("names the DTOs of an inherited route after a securable controller, with @ApiControllerSecurable below @ApiController", () => {
		@ApiController<RebindItemEntity>({ authorization: AUTHORIZATION, entity: RebindItemEntity, path: "securable-below", routes: NO_GENERATED_ROUTES })
		@ApiControllerSecurable()
		class RebindSecurableBelowController extends RebindBase {}

		expect(parametersDtoName(RebindSecurableBelowController)).toBe("RebindSecurableBelowMineParametersDTO");
	});

	it("names the DTOs of an inherited route after a securable controller, with @ApiControllerSecurable above @ApiController", () => {
		@ApiControllerSecurable()
		@ApiController<RebindItemEntity>({ authorization: AUTHORIZATION, entity: RebindItemEntity, path: "securable-above", routes: NO_GENERATED_ROUTES })
		class RebindSecurableAboveController extends RebindBase {}

		expect(parametersDtoName(RebindSecurableAboveController)).toBe("RebindSecurableAboveMineParametersDTO");
	});

	it("leaves the handler and the names of the base class and of a sibling controller alone", () => {
		@ApiController<RebindItemEntity>({ entity: RebindItemEntity, path: "sibling", routes: NO_GENERATED_ROUTES })
		class RebindSiblingController extends RebindBase {}

		expect(parametersDtoName(RebindBase)).toBe("RebindBaseMineParametersDTO");
		expect(parametersDtoName(RebindSiblingController)).toBe("RebindSiblingMineParametersDTO");
	});
});

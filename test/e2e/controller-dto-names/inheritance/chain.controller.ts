import type { Type } from "@nestjs/common";

import { HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiController, ApiRouteCustom, EApiDtoType, EApiRouteType } from "../../../../src/index";
import { E2eDtoNameItemEntity } from "../entity";
import { E2eDtoNameItemService } from "../service";
import { E2eDtoNameSharedMineBase } from "./custom.controller";

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

export class E2eDtoNameOverrideBase {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.source", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "source/:id", type: EApiRouteType.GET },
	})
	public source(@Param() _parameters: Record<string, string>): { source: string } {
		return { source: "base" };
	}
}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "override/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameOverrideController extends E2eDtoNameOverrideBase {
	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.source", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "source/:id", type: EApiRouteType.GET },
	})
	public override source(@Param() _parameters: Record<string, string>): { source: string } {
		return { source: "own" };
	}
}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "chain-parent/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameChainParentController extends E2eDtoNameSharedMineBase {}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "chain-child/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameChainChildController extends E2eDtoNameChainParentController {}

export class E2eDtoNameTwoLevelsMiddle extends E2eDtoNameSharedMineBase {}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "two-levels/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameTwoLevelsController extends E2eDtoNameTwoLevelsMiddle {}

/**
 * Declares a class without a name with one custom route. TypeScript has no decorators on a class expression, so the decorators are called directly, as a mixin factory has to.
 * @returns {Type<{ mine: (parameters: Record<string, string>) => void; service: E2eDtoNameItemService }>} The anonymous class.
 */
function WithAnonymousMine(): Type<{ mine: (parameters: Record<string, string>) => void; service: E2eDtoNameItemService }> {
	const anonymous: Type<{ mine: (parameters: Record<string, string>) => void; service: E2eDtoNameItemService }> = (() =>
		class {
			public readonly service!: E2eDtoNameItemService;

			public mine(_parameters: Record<string, string>): void {}
		})();
	const prototype: object = anonymous.prototype as object;

	Inject(E2eDtoNameItemService)(prototype, "service");
	Param()(prototype, "mine", 0);

	const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(prototype, "mine") as PropertyDescriptor;

	ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.mine", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
	})(prototype, "mine", descriptor);
	Object.defineProperty(prototype, "mine", descriptor);

	return anonymous;
}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "anonymous-mine/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameAnonymousMineController extends WithAnonymousMine() {}

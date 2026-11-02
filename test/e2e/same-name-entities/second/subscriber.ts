import { Injectable } from "@nestjs/common";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../../src/index";

import { SAME_NAME_ENTITY_EVENTS } from "../events";

import { SameNameItemEntity } from "./entity";

@Injectable()
@ApiRouteSubscriber({ entity: SameNameItemEntity })
export class SameNameSecondItemRouteSubscriber extends ApiRouteSubscriberBase<SameNameItemEntity> {
	public async onBeforeCreate(): Promise<undefined> {
		SAME_NAME_ENTITY_EVENTS.push("second:route:create");

		return undefined;
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: SameNameItemEntity })
export class SameNameSecondItemFunctionSubscriber extends ApiFunctionSubscriberBase<SameNameItemEntity> {
	public async onBeforeCreate(): Promise<undefined> {
		SAME_NAME_ENTITY_EVENTS.push("second:function:create");

		return undefined;
	}
}

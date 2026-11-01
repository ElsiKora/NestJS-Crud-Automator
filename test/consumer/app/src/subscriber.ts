import type { TApiSubscriberFunctionBeforeCreateContext } from "@elsikora/nestjs-crud-automator";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiRouteSubscriber, ApiRouteSubscriberBase } from "@elsikora/nestjs-crud-automator";
import { Injectable } from "@nestjs/common";

import { SmokeItemEntity } from "./entity.js";

export const SMOKE_EVENTS: Array<string> = [];

@Injectable()
@ApiFunctionSubscriber({ entity: SmokeItemEntity })
export class SmokeFunctionSubscriber extends ApiFunctionSubscriberBase<SmokeItemEntity> {
	public async onAfterDelete(context: { result: unknown }): Promise<unknown> {
		SMOKE_EVENTS.push("function:after:delete");

		return context.result;
	}

	public async onAfterGet(context: { result: SmokeItemEntity }): Promise<SmokeItemEntity> {
		SMOKE_EVENTS.push("function:after:get");

		return context.result;
	}

	public async onAfterUpdate(context: { result: SmokeItemEntity }): Promise<SmokeItemEntity> {
		SMOKE_EVENTS.push("function:after:update");

		return context.result;
	}

	public async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<SmokeItemEntity>): Promise<TApiSubscriberFunctionBeforeCreateContext<SmokeItemEntity>["result"]> {
		SMOKE_EVENTS.push("function:before:create");

		if (context.result.name) {
			context.result.name = `fn-${context.result.name}`;
		}

		return context.result;
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: SmokeItemEntity })
export class SmokeRouteSubscriber extends ApiRouteSubscriberBase<SmokeItemEntity> {
	public async onAfterCreate(context: { result: SmokeItemEntity }): Promise<SmokeItemEntity> {
		SMOKE_EVENTS.push("route:after:create");

		return context.result;
	}

	public async onAfterGetList(context: { result: unknown }): Promise<unknown> {
		SMOKE_EVENTS.push("route:after:getList");

		return context.result;
	}
}

import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../../dist/esm/index";

import { E2eEntity } from "../entity";
import { E2eRouteSubscriber } from "./route";

@Injectable()
@ApiRouteSubscriber({ entity: E2eEntity, priority: 50 })
export class E2eRouteOrderSubscriber extends ApiRouteSubscriberBase<E2eEntity> {
	public async onBeforeCreate(context: { result: { headers: Record<string, string> } }) {
		E2eRouteSubscriber.events.push("route:priority:before:create");
		return context.result;
	}

	public async onAfterCreate(context: { result: E2eEntity }) {
		E2eRouteSubscriber.events.push("route:priority:after:create");
		return context.result;
	}
}

import { Injectable } from "@nestjs/common";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase } from "../../../../dist/esm/index";

import { E2eEntity } from "../entity";
import { E2eFunctionSubscriber } from "./function";

@Injectable()
@ApiFunctionSubscriber({ entity: E2eEntity, priority: 50 })
export class E2eFunctionPrioritySubscriber extends ApiFunctionSubscriberBase<E2eEntity> {
	public async onBeforeCreate(context: { result: Partial<E2eEntity> }) {
		E2eFunctionSubscriber.events.push("function:priority:before:create");
		return context.result;
	}

	public async onAfterCreate(context: { result: E2eEntity }) {
		E2eFunctionSubscriber.events.push("function:priority:after:create");
		return context.result;
	}
}

import type { TApiSubscriberFunctionBeforeCreateContext } from "@type/class/api/subscriber/function";

import { ApiFunctionSubscriberBase } from "@class/api/subscriber/function-base.class";

import type { TSubscriberResultCreateInput } from "./input.type";

import { SubscriberResultEntity } from "../entity.class";

export class SubscriberResultCreateSubscriber extends ApiFunctionSubscriberBase<SubscriberResultEntity, TSubscriberResultCreateInput> {
	public async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, TSubscriberResultCreateInput>): Promise<TSubscriberResultCreateInput> {
		return context.result;
	}
}

import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../src/index";

import { E2ePathParameterIntItemEntity } from "./entity";

export const E2E_PATH_PARAMETER_SUBSCRIBER_TRACE: Array<string> = [];

@Injectable()
@ApiRouteSubscriber({ entity: E2ePathParameterIntItemEntity })
export class E2ePathParameterIntItemSubscriber extends ApiRouteSubscriberBase<E2ePathParameterIntItemEntity> {
	public async onBeforeErrorGet(context: { DATA: { parameters?: Record<string, unknown> } }): Promise<void> {
		E2E_PATH_PARAMETER_SUBSCRIBER_TRACE.push(`beforeError:${typeof context.DATA.parameters?.id}`);

		await Promise.resolve();
	}

	public async onBeforeGet(context: { result: { parameters?: Record<string, unknown> } }): Promise<never> {
		E2E_PATH_PARAMETER_SUBSCRIBER_TRACE.push(`before:${typeof context.result.parameters?.id}`);

		return (await Promise.resolve(context.result)) as never;
	}
}

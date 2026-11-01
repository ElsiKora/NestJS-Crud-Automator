import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../src/index";

import { IntegrationDetailEntity } from "./root.entity";

@ApiRouteSubscriber({ entity: IntegrationDetailEntity })
@Injectable()
export class IntegrationDetailRouteSubscriber extends ApiRouteSubscriberBase<IntegrationDetailEntity> {
	public static events: Array<string> = [];

	private static mark(detail: IntegrationDetailEntity): IntegrationDetailEntity {
		return Object.assign(detail, { label: `seen-${detail.label}` });
	}

	public async onAfterGet(context: { result: IntegrationDetailEntity }) {
		IntegrationDetailRouteSubscriber.events.push(`get:${context.result.kind}`);

		return IntegrationDetailRouteSubscriber.mark(context.result);
	}

	public async onAfterGetList(context: { result: { items: Array<IntegrationDetailEntity> } }) {
		IntegrationDetailRouteSubscriber.events.push(`getList:${context.result.items.map(({ kind }: IntegrationDetailEntity): string => kind).join(",")}`);

		for (const item of context.result.items) {
			IntegrationDetailRouteSubscriber.mark(item);
		}

		return context.result;
	}
}

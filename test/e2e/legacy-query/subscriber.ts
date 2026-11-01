import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../src/index";

import { E2eLegacyQueryItemEntity } from "./entity";

@Injectable()
@ApiRouteSubscriber({ entity: E2eLegacyQueryItemEntity })
export class E2eLegacyQueryItemSubscriber extends ApiRouteSubscriberBase<E2eLegacyQueryItemEntity> {
	public static beforeErrors: Array<string> = [];

	public async onBeforeErrorGetList(_context: unknown, error: Error): Promise<void> {
		E2eLegacyQueryItemSubscriber.beforeErrors.push(error.constructor.name);
	}

	public async onBeforeGetList(context: { result: { query?: Record<string, unknown> } }): Promise<void> {
		if (context.result.query?.subscriberOrderBy !== undefined) {
			context.result.query.orderBy = context.result.query.subscriberOrderBy;
			context.result.query.orderDirection = "asc";
			delete context.result.query.subscriberOrderBy;
		}
	}
}

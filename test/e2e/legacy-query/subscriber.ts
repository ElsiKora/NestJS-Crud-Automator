import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../src/index";

import { E2eLegacyQueryItemEntity } from "./entity";

@Injectable()
@ApiRouteSubscriber({ entity: E2eLegacyQueryItemEntity })
export class E2eLegacyQueryItemSubscriber extends ApiRouteSubscriberBase<E2eLegacyQueryItemEntity> {
	public static afterQueries: Array<Record<string, unknown> | undefined> = [];

	public static beforeErrors: Array<string> = [];

	public static beforeQueries: Array<Record<string, unknown> | undefined> = [];

	public async onAfterGetList(context: { DATA: { headers?: Record<string, string>; query?: Record<string, unknown> }; result: unknown }): Promise<undefined> {
		if (context.DATA.headers?.["x-trace-query"] !== undefined) {
			E2eLegacyQueryItemSubscriber.afterQueries.push(context.DATA.query);
		}

		return undefined;
	}

	public async onBeforeErrorGetList(_context: unknown, error: Error): Promise<void> {
		E2eLegacyQueryItemSubscriber.beforeErrors.push(error.constructor.name);
	}

	public async onBeforeGetList(context: { result: { headers?: Record<string, string>; query?: Record<string, unknown> } }): Promise<void> {
		if (context.result.headers?.["x-trace-query"] !== undefined) {
			E2eLegacyQueryItemSubscriber.beforeQueries.push(context.result.query);
		}

		if (context.result.query?.subscriberOrderBy !== undefined) {
			context.result.query.orderBy = context.result.query.subscriberOrderBy;
			context.result.query.orderDirection = "asc";
			delete context.result.query.subscriberOrderBy;
		}
	}
}

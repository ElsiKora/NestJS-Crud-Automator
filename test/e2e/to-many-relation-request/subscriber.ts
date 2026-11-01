import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../src/index";

import { E2eHydrationPostEntity } from "./entity";

const ADD_TAGS_TITLE_PREFIX: string = "subscriber adds tags ";
const DROP_TAGS_TITLE: string = "subscriber drops tags";

/** Rewrites PATCH bodies by title marker, so a test can show which body the to-many guard sees. */
@Injectable()
@ApiRouteSubscriber({ entity: E2eHydrationPostEntity, priority: 1 })
export class E2eHydrationPostRouteSubscriber extends ApiRouteSubscriberBase<E2eHydrationPostEntity> {
	public async onBeforePartialUpdate(context: { result: { body?: Record<string, unknown> } }): Promise<{ body?: Record<string, unknown> }> {
		const body: Record<string, unknown> | undefined = context.result.body;
		const title: unknown = body?.title;

		if (body && typeof title === "string" && title.startsWith(ADD_TAGS_TITLE_PREFIX)) {
			body.tags = title.slice(ADD_TAGS_TITLE_PREFIX.length);
		}

		if (body && title === DROP_TAGS_TITLE) {
			delete body.tags;
		}

		return context.result;
	}
}

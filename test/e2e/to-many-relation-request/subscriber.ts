import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../src/index";

import { E2eHydrationPostEntity } from "./entity";

const ADD_TAGS_TITLE_PREFIX: string = "subscriber adds tags ";
const DROP_TAGS_TITLE: string = "subscriber drops tags";
const REPLACE_BODY_TITLE: string = "subscriber replaces body";

/** Title the replacement body carries, so a test can tell the replaced body was written. */
export const HYDRATION_REPLACED_BODY_TITLE: string = "subscriber replaced body";

/**
 * Rewrites an update body by title marker, so a test can show which body the to-many guard sees.
 * @param {{ result: { body?: Record<string, unknown> } }} context - Route BEFORE subscriber context.
 * @returns {{ body?: Record<string, unknown> }} Route input after the rewrite.
 */
function rewriteBody(context: { result: { body?: Record<string, unknown> } }): { body?: Record<string, unknown> } {
	const body: Record<string, unknown> | undefined = context.result.body;
	const title: unknown = body?.title;

	if (body && typeof title === "string" && title.startsWith(ADD_TAGS_TITLE_PREFIX)) {
		body.tags = title.slice(ADD_TAGS_TITLE_PREFIX.length);
	}

	if (body && title === DROP_TAGS_TITLE) {
		delete body.tags;
	}

	if (title === REPLACE_BODY_TITLE) {
		return { ...context.result, body: { title: HYDRATION_REPLACED_BODY_TITLE } };
	}

	return context.result;
}

/** Rewrites PATCH and PUT bodies by title marker on observable controllers, generated or custom routes alike. */
@Injectable()
@ApiRouteSubscriber({ entity: E2eHydrationPostEntity, priority: 1 })
export class E2eHydrationPostRouteSubscriber extends ApiRouteSubscriberBase<E2eHydrationPostEntity> {
	public async onBeforePartialUpdate(context: { result: { body?: Record<string, unknown> } }): Promise<{ body?: Record<string, unknown> }> {
		return rewriteBody(context);
	}

	public async onBeforeUpdate(context: { result: { body?: Record<string, unknown> } }): Promise<{ body?: Record<string, unknown> }> {
		return rewriteBody(context);
	}
}

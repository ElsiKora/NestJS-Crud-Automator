import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../../src/index";

import { E2eEntity } from "../entity";

@Injectable()
@ApiRouteSubscriber({ actions: ["custom.echo"], entity: E2eEntity, priority: 20 })
export class E2eCustomRouteSubscriber extends ApiRouteSubscriberBase<E2eEntity> {
	public static events: Array<string> = [];

	public static reset(): void {
		E2eCustomRouteSubscriber.events = [];
	}

	private static record(stage: string, action?: string): void {
		E2eCustomRouteSubscriber.events.push(`custom-route:${stage}:${action ?? "unknown"}`);
	}

	public async onAfterCustom(context: { action?: string; result: E2eEntity }): Promise<E2eEntity> {
		E2eCustomRouteSubscriber.record("after", context.action);
		context.result.name = `custom-after-${context.result.name}`;

		return context.result;
	}

	public async onAfterErrorCustom(context: { action?: string }, _error: Error): Promise<void> {
		E2eCustomRouteSubscriber.record("after_error", context.action);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeCustom(context: { action?: string; result: { body?: Partial<E2eEntity> } }): Promise<{ body?: Partial<E2eEntity> }> {
		E2eCustomRouteSubscriber.record("before", context.action);

		if (context.result.body?.name) {
			context.result.body.name = `custom-before-${context.result.body.name}`;
		}

		return context.result;
	}

	public async onBeforeErrorCustom(context: { action?: string }, _error: Error): Promise<void> {
		E2eCustomRouteSubscriber.record("before_error", context.action);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}
}

import type { IApiSubscriberRouteErrorExecutionContext, IApiSubscriberRouteExecutionContextData } from "@interface/class/api/subscriber/route";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { TApiSubscriberRouteBeforeCreateContext } from "@type/class/api/subscriber/route/before";
import { Injectable } from "@nestjs/common";

import { ApiRouteSubscriber, ApiRouteSubscriberBase } from "../../../../dist/esm/index";

import { E2eEntity } from "../entity";

@Injectable()
@ApiRouteSubscriber({ entity: E2eEntity, priority: 5 })
export class E2eRouteSubscriber extends ApiRouteSubscriberBase<E2eEntity> {
	public static events: Array<string> = [];
	private static primaryKeySnapshot?: Array<IApiEntityColumn<E2eEntity>>;

	public static reset(): void {
		E2eRouteSubscriber.events = [];
		E2eRouteSubscriber.primaryKeySnapshot = undefined;
	}

	private static record(stage: string, action: string): void {
		E2eRouteSubscriber.events.push(`route:${stage}:${action}`);
	}

	private withRoutePrefix(entity: E2eEntity): E2eEntity {
		return {
			...entity,
			name: `route-${entity.name}`,
		};
	}

	public async onAfterCreate(context: { result: E2eEntity }) {
		E2eRouteSubscriber.record("after", "create");
		return this.withRoutePrefix(context.result);
	}

	public async onAfterDelete(context: { result: Partial<E2eEntity> }) {
		E2eRouteSubscriber.record("after", "delete");

		return context.result;
	}

	public async onAfterGet(context: { result: E2eEntity }) {
		E2eRouteSubscriber.record("after", "get");
		return this.withRoutePrefix(context.result);
	}

	public async onAfterGetList(context: { result: { items: Array<E2eEntity> } }) {
		E2eRouteSubscriber.record("after", "getList");

		return context.result;
	}

	public async onAfterUpdate(context: { result: E2eEntity }) {
		E2eRouteSubscriber.record("after", "update");
		return this.withRoutePrefix(context.result);
	}

	public async onAfterPartialUpdate(context: { result: E2eEntity }) {
		E2eRouteSubscriber.record("after", "partialUpdate");
		return this.withRoutePrefix(context.result);
	}

	public async onBeforeCreate(context: TApiSubscriberRouteBeforeCreateContext<E2eEntity>) {
		E2eRouteSubscriber.record("before", "create");
		E2eRouteSubscriber.maybeDropPrimaryKey(context.result.headers, context.DATA.entityMetadata);

		if (context.result.headers["x-drop-auth"] === "true") {
			return {
				...context.result,
				authenticationRequest: undefined,
			};
		}

		return context.result;
	}

	public async onBeforeDelete(context: { DATA: { entityMetadata: IApiEntity<E2eEntity> }; result: { headers: Record<string, string> } }) {
		E2eRouteSubscriber.record("before", "delete");
		E2eRouteSubscriber.maybeDropPrimaryKey(context.result.headers, context.DATA.entityMetadata);
	}

	public async onBeforeGet(context: { DATA: { entityMetadata: IApiEntity<E2eEntity> }; result: { headers: Record<string, string> } }) {
		E2eRouteSubscriber.record("before", "get");
		E2eRouteSubscriber.maybeDropPrimaryKey(context.result.headers, context.DATA.entityMetadata);
	}

	public async onBeforeGetList(_context: object) {
		E2eRouteSubscriber.record("before", "getList");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
	}

	public async onBeforePartialUpdate(context: { DATA: { entityMetadata: IApiEntity<E2eEntity> }; result: { headers: Record<string, string> } }) {
		E2eRouteSubscriber.record("before", "partialUpdate");
		E2eRouteSubscriber.maybeDropPrimaryKey(context.result.headers, context.DATA.entityMetadata);
	}

	public async onBeforeUpdate(context: { DATA: { entityMetadata: IApiEntity<E2eEntity> }; result: { headers: Record<string, string> } }) {
		E2eRouteSubscriber.record("before", "update");
		E2eRouteSubscriber.maybeDropPrimaryKey(context.result.headers, context.DATA.entityMetadata);
	}

	public async onBeforeErrorCreate(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("before_error", "create");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorDelete(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, undefined>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("before_error", "delete");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorGet(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("before_error", "get");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorGetList(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, { items: Array<E2eEntity> }>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("before_error", "getList");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorPartialUpdate(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("before_error", "partialUpdate");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorUpdate(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("before_error", "update");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorCreate(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("after_error", "create");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorDelete(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, undefined>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("after_error", "delete");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorGet(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("after_error", "get");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorGetList(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, { items: Array<E2eEntity> }>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("after_error", "getList");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorPartialUpdate(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("after_error", "partialUpdate");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorUpdate(context: IApiSubscriberRouteErrorExecutionContext<E2eEntity, IApiSubscriberRouteExecutionContextData<E2eEntity, E2eEntity>>, _error: Error): Promise<void> {
		E2eRouteSubscriber.record("after_error", "update");
		E2eRouteSubscriber.restorePrimaryKey(context.DATA.entityMetadata);
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	private static maybeDropPrimaryKey(headers: Record<string, string>, entityMetadata: IApiEntity<E2eEntity>): void {
		if (headers["x-drop-primary"] === "true") {
			E2eRouteSubscriber.dropPrimaryKey(entityMetadata);
		}
	}

	private static dropPrimaryKey(entityMetadata: IApiEntity<E2eEntity>): void {
		if (!E2eRouteSubscriber.primaryKeySnapshot) {
			E2eRouteSubscriber.primaryKeySnapshot = entityMetadata.columns.map((column) => ({ ...column }));
		}

		entityMetadata.columns = entityMetadata.columns.map((column) => ({
			...column,
			isPrimary: false,
		}));
	}

	private static restorePrimaryKey(entityMetadata: IApiEntity<E2eEntity>): void {
		if (!E2eRouteSubscriber.primaryKeySnapshot) {
			return;
		}

		entityMetadata.columns = E2eRouteSubscriber.primaryKeySnapshot.map((column) => ({ ...column }));
		E2eRouteSubscriber.primaryKeySnapshot = undefined;
	}
}

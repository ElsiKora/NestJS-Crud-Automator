import { Injectable } from "@nestjs/common";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, type IApiSubscriberFunctionTransactionContext, type TApiFunctionUpdateProperties, type TApiSubscriberFunctionBeforeCreateContext, type TApiSubscriberFunctionBeforeUpdateContext } from "../../../../src/index";

import { E2E_OWNER_ID_OTHER } from "../constants";
import { E2eEntity } from "../entity";

@Injectable()
@ApiFunctionSubscriber({ entity: E2eEntity, priority: 5 })
export class E2eFunctionSubscriber extends ApiFunctionSubscriberBase<E2eEntity> {
	public static shouldReplaceGetOptions: boolean = false;

	public static shouldReplaceGetListOptions: boolean = false;

	public static currentEntities: Array<Readonly<E2eEntity>> = [];

	public static events: Array<string> = [];

	public static transactionContexts: Array<IApiSubscriberFunctionTransactionContext> = [];

	public static updateProperties: Array<TApiFunctionUpdateProperties<E2eEntity>> = [];

	public static reset(): void {
		E2eFunctionSubscriber.currentEntities = [];
		E2eFunctionSubscriber.events = [];
		E2eFunctionSubscriber.shouldReplaceGetListOptions = false;
		E2eFunctionSubscriber.shouldReplaceGetOptions = false;
		E2eFunctionSubscriber.transactionContexts = [];
		E2eFunctionSubscriber.updateProperties = [];
	}

	private static record(stage: string, action: string): void {
		E2eFunctionSubscriber.events.push(`function:${stage}:${action}`);
	}

	public async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<E2eEntity>) {
		E2eFunctionSubscriber.record("before", "create");
		if (context.DATA.eventManager) {
			E2eFunctionSubscriber.record("before", "create:transaction");
		}
		if (context.result.name) {
			context.result.name = `fn-${context.result.name}`;
		}

		return context.result;
	}

	public async onBeforeCustom(context: { action?: string; DATA: { eventManager?: unknown }; result: Array<Partial<E2eEntity>> }) {
		E2eFunctionSubscriber.record("before", context.action ?? "custom");

		if (context.DATA.eventManager) {
			E2eFunctionSubscriber.record("before", `${context.action ?? "custom"}:transaction`);
		}

		const [body] = context.result;

		if (body?.id === "custom-before-error") {
			throw new Error("Forced before-custom error");
		}

		if (body?.name) {
			body.name = `custom-${body.name}`;
		}

		return context.result;
	}

	public async onAfterCommit(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		E2eFunctionSubscriber.record("after", "commit");
		E2eFunctionSubscriber.transactionContexts.push(context);
	}

	public async onAfterCreate(context: { result: E2eEntity }) {
		E2eFunctionSubscriber.record("after", "create");

		if (context.result.name === "fn-ThrowAfterCreate") {
			throw new Error("Forced after-create error");
		}

		return context.result;
	}

	public async onAfterCustom(context: { action?: string; result: E2eEntity }) {
		E2eFunctionSubscriber.record("after", context.action ?? "custom");

		if (context.result.name) {
			context.result.name = `custom-after-${context.result.name}`;
		}

		return context.result;
	}

	public async onBeforeDelete(_context: object) {
		E2eFunctionSubscriber.record("before", "delete");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
	}

	public async onAfterDelete(_context: object) {
		E2eFunctionSubscriber.record("after", "delete");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
	}

	public async onBeforeGet(_context: object) {
		E2eFunctionSubscriber.record("before", "get");

		if (E2eFunctionSubscriber.shouldReplaceGetOptions) {
			return Object.freeze({ where: Object.freeze({ id: "nested-foreign" }) });
		}

		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;

		return undefined;
	}

	public async onAfterGet(context: { result: E2eEntity }) {
		E2eFunctionSubscriber.record("after", "get");

		return context.result;
	}

	public async onBeforeGetList(_context: object) {
		E2eFunctionSubscriber.record("before", "getList");

		if (E2eFunctionSubscriber.shouldReplaceGetListOptions) {
			return Object.freeze({ where: Object.freeze({ ownerId: E2E_OWNER_ID_OTHER }) });
		}

		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;

		return undefined;
	}

	public async onAfterGetList(context: { result: { items: Array<E2eEntity> } }) {
		E2eFunctionSubscriber.record("after", "getList");

		return context.result;
	}

	public async onBeforeGetMany(_context: object) {
		E2eFunctionSubscriber.record("before", "getMany");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
	}

	public async onAfterGetMany(context: { result: Array<E2eEntity> }) {
		E2eFunctionSubscriber.record("after", "getMany");

		return context.result;
	}

	public async onAfterRollback(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		E2eFunctionSubscriber.record("after", "rollback");
		E2eFunctionSubscriber.transactionContexts.push(context);
	}

	public async onBeforeUpdate(context: TApiSubscriberFunctionBeforeUpdateContext<E2eEntity>) {
		E2eFunctionSubscriber.record("before", "update");
		E2eFunctionSubscriber.currentEntities.push(context.DATA.currentEntity);
		E2eFunctionSubscriber.updateProperties.push({ ...context.result });
		if (context.result.name) {
			context.result.name = `fn-${context.result.name}`;
		}

		return context.result;
	}

	public async onAfterUpdate(context: { result: E2eEntity }) {
		E2eFunctionSubscriber.record("after", "update");

		return context.result;
	}

	public async onBeforeErrorCreate(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", "create");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorCreate(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", "create");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorCustom(context: { action?: string }, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", context.action ?? "custom");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorCustom(context: { action?: string }, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", context.action ?? "custom");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorDelete(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", "delete");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorDelete(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", "delete");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorGet(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", "get");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorGet(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", "get");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorGetList(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", "getList");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorGetList(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", "getList");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorGetMany(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", "getMany");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorGetMany(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", "getMany");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onBeforeErrorUpdate(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("before_error", "update");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}

	public async onAfterErrorUpdate(_context: object, _error: Error): Promise<void> {
		E2eFunctionSubscriber.record("after_error", "update");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _error;
	}
}

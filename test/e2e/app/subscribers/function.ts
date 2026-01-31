import { Injectable } from "@nestjs/common";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, type TApiSubscriberFunctionBeforeCreateContext } from "../../../../dist/esm/index";

import { E2eEntity } from "../entity";

@Injectable()
@ApiFunctionSubscriber({ entity: E2eEntity, priority: 5 })
export class E2eFunctionSubscriber extends ApiFunctionSubscriberBase<E2eEntity> {
	public static events: Array<string> = [];

	public static reset(): void {
		E2eFunctionSubscriber.events = [];
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

	public async onAfterCreate(context: { result: E2eEntity }) {
		E2eFunctionSubscriber.record("after", "create");

		if (context.result.name === "fn-ThrowAfterCreate") {
			throw new Error("Forced after-create error");
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
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
	}

	public async onAfterGet(context: { result: E2eEntity }) {
		E2eFunctionSubscriber.record("after", "get");

		return context.result;
	}

	public async onBeforeGetList(_context: object) {
		E2eFunctionSubscriber.record("before", "getList");
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _context;
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

	public async onBeforeUpdate(context: { result: Partial<E2eEntity> }) {
		E2eFunctionSubscriber.record("before", "update");
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

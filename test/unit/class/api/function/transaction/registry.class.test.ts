import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { EApiFunctionTransactionEventStatus, EApiFunctionTransactionOwnerKind, EApiFunctionTransactionTraceType, EApiFunctionType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

describe("ApiFunctionTransactionRegistry", () => {
	it("records immutable ordered success and failure events without payload data", () => {
		const registry = new ApiFunctionTransactionRegistry("transaction-id", {
			entityName: "Account",
			functionType: EApiFunctionType.CREATE,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "create",
		});
		const firstSequence: number = registry.beginEvent({
			entityName: "Account",
			functionType: EApiFunctionType.CREATE,
			isSubscriberObservable: true,
			methodName: "create",
		});
		const secondSequence: number = registry.beginEvent({
			entityName: "Account",
			functionType: EApiFunctionType.UPDATE,
			isSubscriberObservable: true,
			methodName: "update",
		});
		const error = new Error("update failed");

		registry.succeedEvent(firstSequence);
		registry.failEvent(secondSequence, error);

		const events = registry.getEvents();

		expect(events).toEqual([
			{
				action: undefined,
				entityName: "Account",
				functionType: EApiFunctionType.CREATE,
				methodName: "create",
				sequence: 1,
				status: EApiFunctionTransactionEventStatus.SUCCEEDED,
			},
			{
				action: undefined,
				entityName: "Account",
				error,
				functionType: EApiFunctionType.UPDATE,
				methodName: "update",
				sequence: 2,
				status: EApiFunctionTransactionEventStatus.FAILED,
			},
		]);
		expect(Object.isFrozen(events)).toBe(true);
		expect(Object.isFrozen(events[0])).toBe(true);
		expect(events[0]).not.toHaveProperty("arguments");
		expect(events[0]).not.toHaveProperty("result");
	});

	it("retains STEP traces in full events but excludes them from subscriber-observable events", () => {
		const registry = new ApiFunctionTransactionRegistry("transaction-id", {
			entityName: "Account",
			functionType: EApiFunctionTransactionTraceType.STEP,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "validate",
		});
		const stepSequence: number = registry.beginEvent({
			entityName: "Account",
			functionType: EApiFunctionTransactionTraceType.STEP,
			isSubscriberObservable: true,
			methodName: "validate",
		});
		const createSequence: number = registry.beginEvent({
			entityName: "Account",
			functionType: EApiFunctionType.CREATE,
			isSubscriberObservable: true,
			methodName: "create",
		});

		registry.succeedEvent(stepSequence);
		registry.succeedEvent(createSequence);

		expect(registry.getEvents()).toHaveLength(2);
		expect(registry.getObservableEvents()).toEqual([
			expect.objectContaining({
				functionType: EApiFunctionType.CREATE,
				sequence: 2,
			}),
		]);
	});

	it("freezes owner and context snapshots and rejects late registration", () => {
		const registry = new ApiFunctionTransactionRegistry("transaction-id", {
			kind: EApiFunctionTransactionOwnerKind.SCOPE,
			name: "checkout",
		});
		const sequence: number = registry.beginEvent({
			entityName: "Account",
			functionType: EApiFunctionType.CREATE,
			isSubscriberObservable: true,
			methodName: "create",
		});

		registry.succeedEvent(sequence);

		const matchedEvents = registry.getObservableEvents();
		const context = registry.createContext(matchedEvents);

		expect(context.DATA.transaction).toEqual({
			id: "transaction-id",
			owner: {
				kind: EApiFunctionTransactionOwnerKind.SCOPE,
				name: "checkout",
			},
		});
		expect(Object.isFrozen(context)).toBe(true);
		expect(Object.isFrozen(context.DATA)).toBe(true);
		expect(Object.isFrozen(context.DATA.events)).toBe(true);
		expect(Object.isFrozen(context.DATA.matchedEvents)).toBe(true);
		expect(Object.isFrozen(context.DATA.transaction)).toBe(true);
		expect(Object.isFrozen(context.DATA.transaction.owner)).toBe(true);
		expect(() =>
			registry.beginEvent({
				entityName: "Account",
				functionType: EApiFunctionType.DELETE,
				isSubscriberObservable: true,
				methodName: "delete",
			}),
		).toThrow("Cannot register an event after transaction lifecycle dispatch has started");
	});
});

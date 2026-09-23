import type { IApiFunctionTransactionObservationSnapshot } from "@interface/class/api/function";

import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { EApiFunctionTransactionEventStatus, EApiFunctionTransactionOwnerKind, EApiFunctionTransactionOutcome, EApiFunctionTransactionTraceType, EApiFunctionType } from "@enum/decorator/api";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("ApiFunctionTransactionRegistry", () => {
	afterEach(() => vi.restoreAllMocks());
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
	it("keeps diagnostic timing separate from lifecycle events and excludes private data", () => {
		class SecretEntity {}
		let snapshot: Readonly<IApiFunctionTransactionObservationSnapshot> | undefined;
		const now = vi.spyOn(performance, "now").mockReturnValueOnce(10.125).mockReturnValueOnce(15.75);
		const registry = new ApiFunctionTransactionRegistry(
			"SECRET_TRANSACTION",
			{ kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "SECRET_OWNER" },
			{
				onSettled: (value) => {
					snapshot = value;
				},
				selectors: [{ entity: SecretEntity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "SECRET_METHOD" }],
			},
		);
		const event = registry.beginEvent({ entityName: SecretEntity.name, functionType: EApiFunctionTransactionTraceType.STEP, isSubscriberObservable: false, methodName: "SECRET_METHOD" });
		expect(now).not.toHaveBeenCalled();
		const interval = registry.beginObservation({ entity: SecretEntity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "SECRET_METHOD" });
		registry.completeObservation(interval, EApiFunctionTransactionEventStatus.FAILED);
		const error = new Error("SECRET_ERROR");
		registry.failEvent(event, error);
		expect(registry.getEvents()[0]).toEqual({ action: undefined, entityName: "SecretEntity", error, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "SECRET_METHOD", sequence: 1, status: EApiFunctionTransactionEventStatus.FAILED });
		registry.settleObservation(EApiFunctionTransactionOutcome.ROLLED_BACK);
		expect(snapshot).toEqual({ droppedCount: 0, measurements: [{ durationMs: 5.625, selectorIndex: 0, status: EApiFunctionTransactionEventStatus.FAILED }], outcome: EApiFunctionTransactionOutcome.ROLLED_BACK });
		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(Object.isFrozen(snapshot?.measurements)).toBe(true);
		expect(Object.isFrozen(snapshot?.measurements[0])).toBe(true);
		expect(JSON.stringify(snapshot)).not.toMatch(/SECRET|entity|method|error|transactionId/);
	});

	it("matches constructor identity and exact method spelling without clocking unselected work", () => {
		const firstEntity = class SameName {};
		const secondEntity = class SameName {};
		const now = vi.spyOn(performance, "now").mockReturnValue(1.25);
		const observe = vi.fn();
		const registry = new ApiFunctionTransactionRegistry(
			"id",
			{ kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "owner" },
			{
				onSettled: observe,
				selectors: [{ entity: firstEntity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: " exact " }],
			},
		);
		expect(registry.beginObservation({ entity: secondEntity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: " exact " })).toBeUndefined();
		expect(registry.beginObservation({ entity: firstEntity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "exact" })).toBeUndefined();
		expect(registry.beginObservation({ entity: firstEntity, functionType: EApiFunctionType.CUSTOM, methodName: " exact " })).toBeUndefined();
		expect(now).not.toHaveBeenCalled();
		const interval = registry.beginObservation({ entity: firstEntity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: " exact " });
		registry.completeObservation(interval, EApiFunctionTransactionEventStatus.SUCCEEDED);
		registry.settleObservation(EApiFunctionTransactionOutcome.COMMITTED);
		expect(observe).toHaveBeenCalledWith({ droppedCount: 0, measurements: [{ durationMs: 0, selectorIndex: 0, status: EApiFunctionTransactionEventStatus.SUCCEEDED }], outcome: EApiFunctionTransactionOutcome.COMMITTED });
	});

	it("reserves the cap at invocation start, counts abandonment and ignores late completions", () => {
		class Entity {}
		const selector = { entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" };
		const observe = vi.fn();
		const now = vi.spyOn(performance, "now").mockReturnValue(10);
		const registry = new ApiFunctionTransactionRegistry("id", { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "owner" }, { onSettled: observe, selectors: [selector] });
		const intervals = Array.from({ length: 257 }, () => registry.beginObservation(selector));
		expect(intervals.slice(0, 256)).toEqual(Array.from({ length: 256 }, (_, index) => index));
		expect(intervals[256]).toBeUndefined();
		expect(now).toHaveBeenCalledTimes(256);
		now.mockReturnValue(12.5);
		for (const index of intervals.slice(1).toReversed()) registry.completeObservation(index, EApiFunctionTransactionEventStatus.SUCCEEDED);
		registry.settleObservation(EApiFunctionTransactionOutcome.COMMITTED);
		const snapshot = observe.mock.calls[0]?.[0] as IApiFunctionTransactionObservationSnapshot;
		expect(snapshot.measurements).toHaveLength(255);
		expect(snapshot.droppedCount).toBe(2);
		expect(snapshot.measurements.every((measurement) => measurement.durationMs === 2.5)).toBe(true);
		now.mockClear();
		registry.completeObservation(intervals[0], EApiFunctionTransactionEventStatus.FAILED);
		registry.beginObservation(selector);
		registry.settleObservation(EApiFunctionTransactionOutcome.UNKNOWN);
		expect(now).not.toHaveBeenCalled();
		expect(observe).toHaveBeenCalledTimes(1);
	});

	it("does not read the clock when observation is disabled and drops unusable clock samples", () => {
		class Entity {}
		const selector = { entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" };
		const now = vi
			.spyOn(performance, "now")
			.mockImplementationOnce(() => {
				throw new Error("clock");
			})
			.mockReturnValueOnce(3)
			.mockReturnValueOnce(5)
			.mockReturnValueOnce(4)
			.mockReturnValueOnce(-Number.MAX_VALUE)
			.mockReturnValueOnce(Number.MAX_VALUE);
		const disabled = new ApiFunctionTransactionRegistry("id", { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "owner" });
		disabled.completeObservation(disabled.beginObservation(selector), EApiFunctionTransactionEventStatus.SUCCEEDED);
		disabled.settleObservation(EApiFunctionTransactionOutcome.COMMITTED);
		expect(now).not.toHaveBeenCalled();
		const observe = vi.fn();
		const enabled = new ApiFunctionTransactionRegistry("id", { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "owner" }, { onSettled: observe, selectors: [selector] });
		enabled.completeObservation(enabled.beginObservation(selector), EApiFunctionTransactionEventStatus.SUCCEEDED);
		enabled.completeObservation(enabled.beginObservation(selector), EApiFunctionTransactionEventStatus.FAILED);
		enabled.completeObservation(enabled.beginObservation(selector), EApiFunctionTransactionEventStatus.SUCCEEDED);
		enabled.settleObservation(EApiFunctionTransactionOutcome.UNKNOWN);
		expect(observe).toHaveBeenCalledWith({ droppedCount: 3, measurements: [], outcome: EApiFunctionTransactionOutcome.UNKNOWN });
	});
});

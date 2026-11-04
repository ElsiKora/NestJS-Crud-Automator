import type { EApiFunctionTransactionOutcome } from "@enum/decorator/api";
import type { IApiFunctionTransaction, IApiFunctionTransactionObservationMeasurement, IApiFunctionTransactionObservationOptions, IApiFunctionTransactionObservationSelector, IApiFunctionTransactionObservationSnapshot } from "@interface/class/api/function";
import type { IApiSubscriberFunctionTransactionContext } from "@interface/class/api/subscriber/function";
import type { TMetadataStorageTarget } from "@type/class";
import type { TApiFunctionTransactionEvent, TApiFunctionTransactionOwner, TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction";

import { API_FUNCTION_TRANSACTION_OBSERVATION_CONSTANT } from "@constant/api-function-transaction-observation.constant";
import { EApiFunctionTransactionEventStatus, EApiFunctionTransactionTraceType, EApiFunctionType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

export class ApiFunctionTransactionRegistry {
	private readonly EVENTS: Array<{
		action?: string;
		entity: TMetadataStorageTarget;
		entityName: string;
		error?: unknown;
		functionType: TApiFunctionTransactionTraceType;
		isSubscriberObservable: boolean;
		methodName: string;
		sequence: number;
		status?: EApiFunctionTransactionEventStatus;
	}> = [];

	private eventSnapshot?: ReadonlyArray<TApiFunctionTransactionEvent>;

	private isObservationClosed: boolean = false;

	private isValueStoreClosed: boolean = false;

	private readonly MEASUREMENTS: Array<{ durationMs?: number; selectorIndex: number; startedAtMs?: number; status?: EApiFunctionTransactionEventStatus }> = [];

	private readonly OBSERVATION?: Readonly<IApiFunctionTransactionObservationOptions>;

	private observationDroppedCount: number = 0;

	private readonly TRANSACTION: IApiFunctionTransaction;

	private readonly VALUES: Map<symbol, unknown> = new Map<symbol, unknown>();

	private readonly WORK_AFTER_SETTLEMENT: Array<() => Promise<void>> = [];

	constructor(id: string, owner: TApiFunctionTransactionOwner, observation?: Readonly<IApiFunctionTransactionObservationOptions>) {
		if (observation !== undefined) {
			const onSettled: IApiFunctionTransactionObservationOptions["onSettled"] | undefined = observation?.onSettled;
			const selectors: IApiFunctionTransactionObservationOptions["selectors"] | undefined = observation?.selectors;

			if (typeof onSettled !== "function" || !Array.isArray(selectors) || selectors.length > API_FUNCTION_TRANSACTION_OBSERVATION_CONSTANT.MAXIMUM_SELECTORS) {
				throw ErrorException("Invalid transaction observation options");
			}

			const copiedSelectors: Array<Readonly<IApiFunctionTransactionObservationSelector>> = [];

			for (const selector of selectors as ReadonlyArray<unknown>) {
				if (typeof selector !== "object" || selector === null || !("entity" in selector) || !("functionType" in selector) || !("methodName" in selector)) {
					throw ErrorException("Invalid transaction observation selector");
				}

				const entity: unknown = selector.entity;
				const functionType: unknown = selector.functionType;
				const methodName: unknown = selector.methodName;

				if (
					typeof entity !== "function" ||
					!([...Object.values(EApiFunctionType), EApiFunctionTransactionTraceType.STEP] as ReadonlyArray<unknown>).includes(functionType) ||
					typeof methodName !== "string" ||
					methodName.trim().length === 0 ||
					methodName.length > API_FUNCTION_TRANSACTION_OBSERVATION_CONSTANT.MAXIMUM_METHOD_NAME_LENGTH ||
					copiedSelectors.some((candidate: Readonly<IApiFunctionTransactionObservationSelector>): boolean => candidate.entity === entity && candidate.functionType === functionType && candidate.methodName === methodName)
				) {
					throw ErrorException("Invalid transaction observation selector");
				}

				copiedSelectors.push(Object.freeze({ entity: entity as IApiFunctionTransactionObservationSelector["entity"], functionType: functionType as TApiFunctionTransactionTraceType, methodName }));
			}

			this.OBSERVATION = Object.freeze({ onSettled, selectors: Object.freeze(copiedSelectors) });
		}

		this.TRANSACTION = Object.freeze({
			id,
			owner: Object.freeze({ ...owner }),
		});
	}

	/**
	 * Registers a pending function event of this transaction.
	 * @param {{ action?: string; entity: TMetadataStorageTarget; functionType: TApiFunctionTransactionTraceType; isSubscriberObservable: boolean; methodName: string }} options - Event details.
	 * @param {string} [options.action] - Custom action of the function.
	 * @param {TMetadataStorageTarget} options.entity - Entity class the function works on; function subscribers are looked up by it.
	 * @param {TApiFunctionTransactionTraceType} options.functionType - Function type of the event.
	 * @param {boolean} options.isSubscriberObservable - Whether function subscribers observe the event.
	 * @param {string} options.methodName - Name of the service method.
	 * @returns {number} Sequence number of the event.
	 */
	public beginEvent(options: { action?: string; entity: TMetadataStorageTarget; functionType: TApiFunctionTransactionTraceType; isSubscriberObservable: boolean; methodName: string }): number {
		if (this.eventSnapshot) {
			throw ErrorException("Cannot register an event after transaction lifecycle dispatch has started");
		}

		const sequence: number = this.EVENTS.length + 1;

		this.EVENTS.push({
			...options,
			entityName: options.entity.name,
			sequence,
		});

		return sequence;
	}

	/**
	 * Reserves one selected native callback interval without changing lifecycle events.
	 * @param {Readonly<IApiFunctionTransactionObservationSelector>} selector Reached native invocation.
	 * @returns {number | undefined} Reserved measurement index, or no admitted measurement.
	 */
	public beginObservation(selector: Readonly<IApiFunctionTransactionObservationSelector>): number | undefined {
		if (!this.OBSERVATION || this.isObservationClosed) return undefined;

		const selectorIndex: number = this.OBSERVATION.selectors.findIndex((candidate: Readonly<IApiFunctionTransactionObservationSelector>): boolean => candidate.entity === selector.entity && candidate.functionType === selector.functionType && candidate.methodName === selector.methodName);

		if (selectorIndex === -1) return undefined;

		if (this.MEASUREMENTS.length >= API_FUNCTION_TRANSACTION_OBSERVATION_CONSTANT.MAXIMUM_MEASUREMENTS) {
			this.observationDroppedCount = Math.min(Number.MAX_SAFE_INTEGER, this.observationDroppedCount + 1);

			return undefined;
		}

		const index: number = this.MEASUREMENTS.length;
		const measurement: (typeof this.MEASUREMENTS)[number] = { selectorIndex };
		this.MEASUREMENTS.push(measurement);

		try {
			const startedAtMs: number = performance.now();

			if (Number.isFinite(startedAtMs)) measurement.startedAtMs = startedAtMs;
		} catch {
			// A missing clock sample drops only this diagnostic interval.
		}

		return index;
	}

	/**
	 * Releases the values bound to this transaction once it has ended, so code that still holds its async context reads none and binds none.
	 * @returns {void}
	 */
	public closeValues(): void {
		this.isValueStoreClosed = true;
		this.VALUES.clear();
	}

	/**
	 * Samples completion before native event bookkeeping; late completion is ignored.
	 * @param {number | undefined} index Reserved measurement index.
	 * @param {EApiFunctionTransactionEventStatus} status Native callback status.
	 */
	public completeObservation(index: number | undefined, status: EApiFunctionTransactionEventStatus): void {
		if (index === undefined || this.isObservationClosed) return;
		const measurement: (typeof this.MEASUREMENTS)[number] | undefined = this.MEASUREMENTS[index];

		if (!measurement || measurement.status !== undefined) return;
		measurement.status = status;

		try {
			const completedAtMs: number = performance.now();

			if (measurement.startedAtMs !== undefined && Number.isFinite(completedAtMs)) {
				const durationMs: number = completedAtMs - measurement.startedAtMs;

				if (Number.isFinite(durationMs) && durationMs >= 0) measurement.durationMs = durationMs;
			}
		} catch {
			// Capture failures cannot alter a native result or error.
		}
	}

	public createContext(matchedEvents: ReadonlyArray<TApiFunctionTransactionEvent>): IApiSubscriberFunctionTransactionContext {
		const events: ReadonlyArray<TApiFunctionTransactionEvent> = this.getEvents();

		return Object.freeze({
			DATA: Object.freeze({
				events,
				matchedEvents: Object.freeze([...matchedEvents]),
				transaction: this.TRANSACTION,
			}),
		});
	}

	/**
	 * Keeps work for the moment the transaction has ended, when a statement that failed inside it can no longer stop a read.
	 * @param {() => Promise<void>} work - Work the owner of the transaction runs after it committed or rolled back.
	 * @returns {void}
	 */
	public deferUntilSettled(work: () => Promise<void>): void {
		this.WORK_AFTER_SETTLEMENT.push(work);
	}

	public failEvent(sequence: number, error: unknown): void {
		const event: (typeof this.EVENTS)[number] = this.getPendingEvent(sequence);

		event.error = error;
		event.status = EApiFunctionTransactionEventStatus.FAILED;
	}

	/**
	 * Returns the entity class of a registered event, which is what function subscribers are registered for.
	 * @param {number} sequence - Sequence number of the event.
	 * @returns {TMetadataStorageTarget} The entity class of the event.
	 * @throws {Error} When no event has that sequence number.
	 */
	public getEventEntity(sequence: number): TMetadataStorageTarget {
		const event: (typeof this.EVENTS)[number] | undefined = this.EVENTS.find((candidate: (typeof this.EVENTS)[number]) => candidate.sequence === sequence);

		if (!event) {
			throw ErrorException(`Transaction event ${String(sequence)} is not registered`);
		}

		return event.entity;
	}

	public getEvents(): ReadonlyArray<TApiFunctionTransactionEvent> {
		this.eventSnapshot ??= Object.freeze(
			this.EVENTS.map((event: (typeof this.EVENTS)[number]): TApiFunctionTransactionEvent => {
				if (event.status === EApiFunctionTransactionEventStatus.FAILED) {
					return Object.freeze({
						action: event.action,
						entityName: event.entityName,
						error: event.error,
						functionType: event.functionType,
						methodName: event.methodName,
						sequence: event.sequence,
						status: event.status,
					});
				}

				if (event.status === EApiFunctionTransactionEventStatus.SUCCEEDED) {
					return Object.freeze({
						action: event.action,
						entityName: event.entityName,
						functionType: event.functionType,
						methodName: event.methodName,
						sequence: event.sequence,
						status: event.status,
					});
				}

				throw ErrorException(`Transaction event ${event.sequence} has not completed`);
			}),
		);

		return this.eventSnapshot;
	}

	public getObservableEvents(): ReadonlyArray<TApiFunctionTransactionEvent> {
		const observableSequences: Set<number> = new Set<number>(this.EVENTS.filter((event: (typeof this.EVENTS)[number]) => event.isSubscriberObservable && event.functionType !== EApiFunctionTransactionTraceType.STEP).map((event: (typeof this.EVENTS)[number]) => event.sequence));

		return Object.freeze(this.getEvents().filter((event: TApiFunctionTransactionEvent) => observableSequences.has(event.sequence)));
	}

	public getTransaction(): Readonly<IApiFunctionTransaction> {
		return this.TRANSACTION;
	}

	/**
	 * Returns the value bound to this transaction under a key.
	 * @param {symbol} key - Key the value is bound under.
	 * @returns {unknown} The bound value, or undefined when none is bound or the transaction has ended.
	 */
	public getValue(key: symbol): unknown {
		return this.VALUES.get(key);
	}

	/**
	 * Tells whether a value is bound to this transaction under a key.
	 * @param {symbol} key - Key the value is bound under.
	 * @returns {boolean} Whether a value is bound under the key.
	 */
	public hasValue(key: symbol): boolean {
		return this.VALUES.has(key);
	}

	/**
	 * Puts back what a key held before, or removes the key when it held nothing; after the transaction has ended there is nothing to put back.
	 * @param {symbol} key - Key the value is bound under.
	 * @param {{ value: unknown } | undefined} previous - The value the key held before, or undefined when it held none.
	 * @returns {void}
	 */
	public restoreValue(key: symbol, previous: { value: unknown } | undefined): void {
		if (this.isValueStoreClosed) return;

		if (previous) {
			this.VALUES.set(key, previous.value);
		} else {
			this.VALUES.delete(key);
		}
	}

	/**
	 * Publishes the bounded projection once after the owning transaction lifecycle settles.
	 * @param {EApiFunctionTransactionOutcome} outcome Settled database outcome.
	 */
	public settleObservation(outcome: EApiFunctionTransactionOutcome): void {
		if (!this.OBSERVATION || this.isObservationClosed) return;
		this.isObservationClosed = true;

		try {
			const measurements: Array<Readonly<IApiFunctionTransactionObservationMeasurement>> = [];

			for (const measurement of this.MEASUREMENTS) {
				if (measurement.durationMs === undefined || measurement.status === undefined) {
					this.observationDroppedCount = Math.min(Number.MAX_SAFE_INTEGER, this.observationDroppedCount + 1);
					continue;
				}
				measurements.push(Object.freeze({ durationMs: measurement.durationMs, selectorIndex: measurement.selectorIndex, status: measurement.status }));
			}
			this.MEASUREMENTS.length = 0;

			const onSettled: (snapshot: Readonly<IApiFunctionTransactionObservationSnapshot>) => unknown = this.OBSERVATION.onSettled;
			const delivery: unknown = onSettled(Object.freeze({ droppedCount: this.observationDroppedCount, measurements: Object.freeze(measurements), outcome }));

			if (delivery !== undefined)
				void Promise.resolve(delivery).catch(() => {
					// An accidental asynchronous observer rejection remains diagnostic-only.
				});
		} catch {
			// Diagnostic callbacks never participate in transaction error handling.
		}
	}

	/**
	 * Binds a value to this transaction under a key.
	 * @param {symbol} key - Key the value is bound under.
	 * @param {unknown} value - Value to bind.
	 * @returns {void}
	 * @throws {Error} When the transaction has ended.
	 */
	public setValue(key: symbol, value: unknown): void {
		if (this.isValueStoreClosed) {
			throw ErrorException("Cannot bind a value to an Automator transaction that has ended");
		}

		this.VALUES.set(key, value);
	}

	public succeedEvent(sequence: number): void {
		const event: (typeof this.EVENTS)[number] = this.getPendingEvent(sequence);

		event.status = EApiFunctionTransactionEventStatus.SUCCEEDED;
	}

	public takeWorkAfterSettlement(): ReadonlyArray<() => Promise<void>> {
		return this.WORK_AFTER_SETTLEMENT.splice(0);
	}

	private getPendingEvent(sequence: number): (typeof this.EVENTS)[number] {
		const event: (typeof this.EVENTS)[number] | undefined = this.EVENTS[sequence - 1];

		if (event?.sequence !== sequence) {
			throw ErrorException(`Transaction event ${sequence} is not registered`);
		}

		if (event.status) {
			throw ErrorException(`Transaction event ${sequence} has already completed`);
		}

		return event;
	}
}

import type { IApiFunctionTransaction } from "@interface/class/api/function";
import type { IApiSubscriberFunctionTransactionContext } from "@interface/class/api/subscriber/function";
import type { TApiFunctionTransactionEvent, TApiFunctionTransactionOwner, TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction";

import { EApiFunctionTransactionEventStatus, EApiFunctionTransactionTraceType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

export class ApiFunctionTransactionRegistry {
	private readonly EVENTS: Array<{
		action?: string;
		entityName: string;
		error?: unknown;
		functionType: TApiFunctionTransactionTraceType;
		isSubscriberObservable: boolean;
		methodName: string;
		sequence: number;
		status?: EApiFunctionTransactionEventStatus;
	}> = [];

	private eventSnapshot?: ReadonlyArray<TApiFunctionTransactionEvent>;

	private readonly TRANSACTION: IApiFunctionTransaction;

	constructor(id: string, owner: TApiFunctionTransactionOwner) {
		this.TRANSACTION = Object.freeze({
			id,
			owner: Object.freeze({ ...owner }),
		});
	}

	public beginEvent(options: { action?: string; entityName: string; functionType: TApiFunctionTransactionTraceType; isSubscriberObservable: boolean; methodName: string }): number {
		if (this.eventSnapshot) {
			throw ErrorException("Cannot register an event after transaction lifecycle dispatch has started");
		}

		const sequence: number = this.EVENTS.length + 1;

		this.EVENTS.push({
			...options,
			sequence,
		});

		return sequence;
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

	public failEvent(sequence: number, error: unknown): void {
		const event: (typeof this.EVENTS)[number] = this.getPendingEvent(sequence);

		event.error = error;
		event.status = EApiFunctionTransactionEventStatus.FAILED;
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

	public succeedEvent(sequence: number): void {
		const event: (typeof this.EVENTS)[number] = this.getPendingEvent(sequence);

		event.status = EApiFunctionTransactionEventStatus.SUCCEEDED;
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

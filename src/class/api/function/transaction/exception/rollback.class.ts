import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { TApiFunctionTransactionOwner } from "@type/class/api/function";

import { EApiFunctionTransactionOutcome } from "@enum/decorator/api";

export class ApiFunctionTransactionRollbackException extends Error {
	public get errorLifecycleFailures(): ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> {
		return this.ERROR_LIFECYCLE_FAILURES;
	}

	public get hookFailures(): ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> {
		return this.HOOK_FAILURES;
	}

	public get operationError(): unknown {
		return this.OPERATION_ERROR;
	}

	public get outcome(): EApiFunctionTransactionOutcome {
		return this.ROLLBACK_FAILURE ? EApiFunctionTransactionOutcome.UNKNOWN : EApiFunctionTransactionOutcome.ROLLED_BACK;
	}

	public get owner(): TApiFunctionTransactionOwner {
		return this.OWNER;
	}

	public get rollbackFailure(): Readonly<IApiFunctionTransactionFailure> | undefined {
		return this.ROLLBACK_FAILURE;
	}

	public get transactionId(): string {
		return this.TRANSACTION_ID;
	}

	private readonly ERROR_LIFECYCLE_FAILURES: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>;

	private readonly HOOK_FAILURES: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>;

	private readonly OPERATION_ERROR: unknown;

	private readonly OWNER: TApiFunctionTransactionOwner;

	private readonly ROLLBACK_FAILURE: Readonly<IApiFunctionTransactionFailure> | undefined;

	private readonly TRANSACTION_ID: string;

	constructor(options: { errorLifecycleFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>; hookFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>; operationError: unknown; owner: TApiFunctionTransactionOwner; rollbackFailure?: Readonly<IApiFunctionTransactionFailure>; transactionId: string }) {
		super(`Transaction ${options.transactionId} operation failed and rollback handling also failed`, {
			cause: options.operationError,
		});
		this.name = ApiFunctionTransactionRollbackException.name;
		this.ERROR_LIFECYCLE_FAILURES = Object.freeze([...options.errorLifecycleFailures]);
		this.HOOK_FAILURES = Object.freeze([...options.hookFailures]);
		this.OPERATION_ERROR = options.operationError;
		this.OWNER = options.owner;
		this.ROLLBACK_FAILURE = options.rollbackFailure;
		this.TRANSACTION_ID = options.transactionId;
	}
}

import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { TApiFunctionTransactionOwner } from "@type/class/api/function";

import { EApiFunctionTransactionOutcome } from "@enum/decorator/api";

export class ApiFunctionTransactionCommitUnknownOutcomeException extends Error {
	public get cleanupFailure(): Readonly<IApiFunctionTransactionFailure> | undefined {
		return this.CLEANUP_FAILURE;
	}

	public get commitFailure(): Readonly<IApiFunctionTransactionFailure> {
		return this.COMMIT_FAILURE;
	}

	public get errorLifecycleFailures(): ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> {
		return this.ERROR_LIFECYCLE_FAILURES;
	}

	public get outcome(): EApiFunctionTransactionOutcome.UNKNOWN {
		return EApiFunctionTransactionOutcome.UNKNOWN;
	}

	public get owner(): TApiFunctionTransactionOwner {
		return this.OWNER;
	}

	public get transactionId(): string {
		return this.TRANSACTION_ID;
	}

	private readonly CLEANUP_FAILURE: Readonly<IApiFunctionTransactionFailure> | undefined;

	private readonly COMMIT_FAILURE: Readonly<IApiFunctionTransactionFailure>;

	private readonly ERROR_LIFECYCLE_FAILURES: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>;

	private readonly OWNER: TApiFunctionTransactionOwner;

	private readonly TRANSACTION_ID: string;

	constructor(options: { cleanupFailure?: Readonly<IApiFunctionTransactionFailure>; commitFailure: Readonly<IApiFunctionTransactionFailure>; errorLifecycleFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>; owner: TApiFunctionTransactionOwner; transactionId: string }) {
		super(`Transaction ${options.transactionId} commit outcome is unknown`, {
			cause: options.commitFailure.error,
		});
		this.name = ApiFunctionTransactionCommitUnknownOutcomeException.name;
		this.CLEANUP_FAILURE = options.cleanupFailure;
		this.COMMIT_FAILURE = options.commitFailure;
		this.ERROR_LIFECYCLE_FAILURES = Object.freeze([...options.errorLifecycleFailures]);
		this.OWNER = options.owner;
		this.TRANSACTION_ID = options.transactionId;
	}
}

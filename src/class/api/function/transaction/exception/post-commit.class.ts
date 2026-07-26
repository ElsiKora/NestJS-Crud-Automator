import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { TApiFunctionTransactionOwner } from "@type/class/api/function";

import { EApiFunctionTransactionOutcome } from "@enum/decorator/api";

export class ApiFunctionTransactionPostCommitException extends Error {
	public get errorLifecycleFailures(): ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> {
		return this.ERROR_LIFECYCLE_FAILURES;
	}

	public get hookFailures(): ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> {
		return this.HOOK_FAILURES;
	}

	public get outcome(): EApiFunctionTransactionOutcome.COMMITTED {
		return EApiFunctionTransactionOutcome.COMMITTED;
	}

	public get owner(): TApiFunctionTransactionOwner {
		return this.OWNER;
	}

	public get transactionId(): string {
		return this.TRANSACTION_ID;
	}

	private readonly ERROR_LIFECYCLE_FAILURES: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>;

	private readonly HOOK_FAILURES: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>;

	private readonly OWNER: TApiFunctionTransactionOwner;

	private readonly TRANSACTION_ID: string;

	constructor(options: { errorLifecycleFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>; hookFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>; owner: TApiFunctionTransactionOwner; transactionId: string }) {
		super(`Transaction ${options.transactionId} committed, but one or more post-commit hooks failed`, {
			cause: options.hookFailures[0]?.error,
		});
		this.name = ApiFunctionTransactionPostCommitException.name;
		this.ERROR_LIFECYCLE_FAILURES = Object.freeze([...options.errorLifecycleFailures]);
		this.HOOK_FAILURES = Object.freeze([...options.hookFailures]);
		this.OWNER = options.owner;
		this.TRANSACTION_ID = options.transactionId;
	}
}

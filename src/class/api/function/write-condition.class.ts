import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { FindOptionsWhere } from "typeorm";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { DatabaseTypeOrmAssertRequiredWhere } from "@utility/database/typeorm/assert/required-where.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Collects the conditions the BEFORE subscribers of one update or delete add to its write scope.
 * Internal: subscribers reach it through `context.DATA.addCondition`. The list only grows, and every condition is ANDed into the scope, so it can only narrow the write.
 * @template E Entity type.
 */
export class ApiFunctionWriteCondition<E extends IApiBaseEntity> {
	/**
	 * Whether a subscriber added a condition.
	 * @returns {boolean} Whether the write carries conditions.
	 */
	public get hasConditions(): boolean {
		return this.CONDITIONS.length > 0;
	}

	private readonly CONDITIONS: Array<Array<FindOptionsWhere<E>> | FindOptionsWhere<E>> = [];

	private readonly HAS_TRANSACTION: boolean;

	private isOpen: boolean = true;

	private readonly OWNER: string;

	/**
	 * @param {string} owner - Service and method of the function, named in a refusal.
	 * @param {boolean} hasTransaction - Whether the function runs in a transaction, which holds the lock the conditions are checked under.
	 */
	public constructor(owner: string, hasTransaction: boolean) {
		this.OWNER = owner;
		this.HAS_TRANSACTION = hasTransaction;
	}

	/**
	 * Adds a condition while the BEFORE subscribers run.
	 * @param {Array<FindOptionsWhere<E>> | FindOptionsWhere<E>} where - Condition on the written row.
	 * @throws {Error} When the BEFORE subscribers have finished, the function runs without a transaction, or the condition is empty or holds a value TypeORM would drop.
	 */
	public add(where: Array<FindOptionsWhere<E>> | FindOptionsWhere<E>): void {
		if (!this.isOpen) {
			throw ErrorException(`Function "${this.OWNER}" accepts write conditions only while its BEFORE subscribers run`);
		}

		if (!this.HAS_TRANSACTION) {
			throw ErrorException(`Function "${this.OWNER}" needs a transaction to add a write condition: configure its transaction mode as REQUIRED`);
		}

		DatabaseTypeOrmAssertRequiredWhere(where);
		this.CONDITIONS.push(ApiControllerGeneratedSecuritySnapshot.detach(where));
	}

	/**
	 * ANDs every condition into a WHERE.
	 * @param {TApiAuthorizationScopeWhere<E>} where - Write scope.
	 * @returns {TApiAuthorizationScopeWhere<E>} The narrowed scope, or the given one without conditions.
	 */
	public apply(where: TApiAuthorizationScopeWhere<E>): TApiAuthorizationScopeWhere<E> {
		let narrowed: TApiAuthorizationScopeWhere<E> = where;

		for (const condition of this.CONDITIONS) {
			narrowed = AuthorizationScopeMergeWhere(narrowed, ApiControllerGeneratedSecuritySnapshot.detach(condition));
		}

		return narrowed;
	}

	/**
	 * Ends the BEFORE stage: later calls of `addCondition` throw.
	 */
	public close(): void {
		this.isOpen = false;
	}
}

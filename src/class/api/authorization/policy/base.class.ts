import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";
import type { FindOptionsWhere } from "typeorm";

import { ApiSubscriberBase } from "@class/api/subscriber/base.class";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";

/**
 * Base class for all authorization policies. It mirrors ApiFunctionSubscriberBase
 * and provides helper methods to create allow/deny rules that are later executed by the policy executor.
 * @template E - Entity type extending IApiBaseEntity
 */
export abstract class ApiAuthorizationPolicyBase<E extends IApiBaseEntity> extends ApiSubscriberBase implements IApiAuthorizationPolicySubscriber<E> {
	declare getCustomActionRule?: IApiAuthorizationPolicySubscriber<E>["getCustomActionRule"];

	declare onBeforeCreate?: IApiAuthorizationPolicySubscriber<E>["onBeforeCreate"];

	declare onBeforeDelete?: IApiAuthorizationPolicySubscriber<E>["onBeforeDelete"];

	declare onBeforeGet?: IApiAuthorizationPolicySubscriber<E>["onBeforeGet"];

	declare onBeforeGetList?: IApiAuthorizationPolicySubscriber<E>["onBeforeGetList"];

	declare onBeforePartialUpdate?: IApiAuthorizationPolicySubscriber<E>["onBeforePartialUpdate"];

	declare onBeforeUpdate?: IApiAuthorizationPolicySubscriber<E>["onBeforeUpdate"];

	/**
	 * Creates an ALLOW rule with optional overrides.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Rule fields to merge.
	 * @returns {IApiAuthorizationPolicySubscriberRule<E>} Allow rule.
	 */
	protected allow<R>(rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): IApiAuthorizationPolicySubscriberRule<E, R> {
		return {
			effect: EAuthorizationEffect.ALLOW,
			...rule,
		};
	}

	/**
	 * Helper that creates an allow rule conditioned on the subject having at least one of the provided roles.
	 * @param {Array<string>} roles - Roles that grant access.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Optional overrides.
	 * @returns {IApiAuthorizationPolicySubscriberRule<E>} Allow rule targeting the given roles.
	 */
	protected allowForRoles<R>(roles: Array<string>, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): IApiAuthorizationPolicySubscriberRule<E, R> {
		return this.allow({
			condition: ({ subject }: IApiAuthorizationRuleContext<E>) => roles.some((role: string) => subject.roles.includes(role)),
			...rule,
		});
	}

	/**
	 * Creates a DENY rule with optional overrides.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Rule fields to merge.
	 * @returns {IApiAuthorizationPolicySubscriberRule<E>} Deny rule.
	 */
	protected deny<R>(rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): IApiAuthorizationPolicySubscriberRule<E, R> {
		return {
			effect: EAuthorizationEffect.DENY,
			...rule,
		};
	}

	/**
	 * Helper that scopes data access to the owner identified by a field.
	 * Automatically resolves relation vs scalar fields by default.
	 * @param {keyof E} [ownerField] - Entity field used to match the subject id, defaults to ownerId.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Optional overrides.
	 * @param {{ isRelation?: boolean }} [options] - Override relation handling; defaults to auto.
	 * @param {boolean} [options.isRelation] - Whether the field is a relation (defaults to auto).
	 * @returns {IApiAuthorizationPolicySubscriberRule<E>} Allow rule with owner scope.
	 */
	protected scopeToOwner<R>(ownerField: keyof E = "ownerId" as keyof E, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">, options: { isRelation?: boolean } = {}): IApiAuthorizationPolicySubscriberRule<E, R> {
		const ownerFieldName: string = String(ownerField);
		const isRelation: boolean = options.isRelation ?? !ownerFieldName.endsWith("Id");

		return this.allow({
			scope: ({ subject }: IApiAuthorizationRuleContext<E>) => {
				const ownerCondition: unknown = isRelation ? { id: subject.id } : subject.id;

				return {
					where: {
						[ownerFieldName]: ownerCondition,
					} as FindOptionsWhere<E>,
				};
			},
			...rule,
		});
	}
}

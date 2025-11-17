import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRule } from "@interface/authorization/policy/subscriber";
import type { IApiAuthorizationRuleContext } from "@interface/authorization/rule/context.interface";
import type { TApiAuthorizationPolicyHook, TApiAuthorizationPolicyHookName, TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";
import type { TApiAuthorizationPolicySubscriberRuleResult } from "@type/class/api/authorization/policy/policy-subscriber-rule-result.type";
import type { FindOptionsWhere } from "typeorm";

import { ApiSubscriberBase } from "@class/api/subscriber/base.class";
import { EAuthorizationEffect } from "@enum/authorization/effect.enum";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";

/**
 * Base class for all authorization policies. It mirrors ApiFunctionSubscriberBase,
 * providing helper methods to create allow/deny rules and a dispatcher that maps actions to hooks.
 * @template E - Entity type extending IApiBaseEntity
 */
export abstract class ApiAuthorizationPolicyBase<E extends IApiBaseEntity> extends ApiSubscriberBase implements IApiAuthorizationPolicySubscriber<E> {
	private static readonly STANDARD_ACTION_METHOD_MAP: Partial<Record<EApiRouteType, TApiAuthorizationPolicyHookName>> = {
		[EApiRouteType.CREATE]: "onBeforeCreate",
		[EApiRouteType.DELETE]: "onBeforeDelete",
		[EApiRouteType.GET]: "onBeforeGet",
		[EApiRouteType.GET_LIST]: "onBeforeGetList",
		[EApiRouteType.PARTIAL_UPDATE]: "onBeforePartialUpdate",
		[EApiRouteType.UPDATE]: "onBeforeUpdate",
	};

	/**
	 * Resolves and executes the correct hook for an action, normalizing results to an array of rules.
	 * @param {string} action - Action resolved from the controller method.
	 * @param {IApiAuthorizationPolicySubscriberContext<E>} context - Execution context passed to hooks.
	 * @template TAction - Action type.
	 * @returns {Promise<Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>>>} Normalized rules to be evaluated.
	 */
	public async getRulesForAction<TAction extends string>(action: TAction, context: IApiAuthorizationPolicySubscriberContext<E>): Promise<Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>>> {
		const { handler, isStandardAction }: { handler?: TApiAuthorizationPolicyHook<E, TAction>; isStandardAction: boolean } = this.resolveHook<TAction>(action);

		if (handler) {
			const standardResult: Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>> = handler(context);

			return this.normalizeRuleResult(await standardResult);
		}

		if (isStandardAction) {
			return [];
		}

		const customActionHook: ((action: string, customContext: IApiAuthorizationPolicySubscriberContext<E>) => Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<string, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<string, E>>) | undefined = (this as IApiAuthorizationPolicySubscriber<E>).getCustomActionRule;

		if (typeof customActionHook !== "function") {
			return [];
		}

		const customResult: Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>> = customActionHook.call(this, action, context) as Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>;

		return this.normalizeRuleResult(await customResult);
	}

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
	 * Automatically handles relations by using nested id structure.
	 * @param {keyof E} [ownerField] - Entity field used to match the subject id, defaults to ownerId.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Optional overrides.
	 * @returns {IApiAuthorizationPolicySubscriberRule<E>} Allow rule with owner scope.
	 */
	protected scopeToOwner<R>(ownerField: keyof E = "ownerId" as keyof E, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): IApiAuthorizationPolicySubscriberRule<E, R> {
		return this.allow({
			scope: ({ subject }: IApiAuthorizationRuleContext<E>) => {
				return {
					where: {
						[ownerField as string]: { id: subject.id },
					} as FindOptionsWhere<E>,
				};
			},
			...rule,
		});
	}

	private normalizeRuleResult<R>(result: TApiAuthorizationPolicySubscriberRuleResult<E, R>): Array<IApiAuthorizationPolicySubscriberRule<E, R>> {
		if (Array.isArray(result)) {
			const normalizedResult: Array<IApiAuthorizationPolicySubscriberRule<E, R> | null | undefined> = result as Array<IApiAuthorizationPolicySubscriberRule<E, R> | null | undefined>;

			return normalizedResult.filter((rule: IApiAuthorizationPolicySubscriberRule<E, R> | null | undefined): rule is IApiAuthorizationPolicySubscriberRule<E, R> => rule != null);
		}

		return result ? [result] : [];
	}

	private resolveHook<TAction extends string>(action: TAction): { handler?: TApiAuthorizationPolicyHook<E, TAction>; isStandardAction: boolean } {
		const standardHookName: TApiAuthorizationPolicyHookName | undefined = ApiAuthorizationPolicyBase.STANDARD_ACTION_METHOD_MAP[action as EApiRouteType];

		if (!standardHookName) {
			return { handler: undefined, isStandardAction: false };
		}

		const policyMethod: TApiAuthorizationPolicyHook<E, TAction> | undefined = (this as IApiAuthorizationPolicySubscriber<E>)[standardHookName as keyof IApiAuthorizationPolicySubscriber<E>] as TApiAuthorizationPolicyHook<E, TAction> | undefined;

		return {
			handler: policyMethod ? policyMethod.bind(this) : undefined,
			isStandardAction: true,
		};
	}
}

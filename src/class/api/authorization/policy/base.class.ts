import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberPermissionRuleOptions, IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";
import type { TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform, TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform, TApiAuthorizationPolicySubscriberRuleWithoutTransform } from "@type/class/api/authorization/policy/subscriber";
import type { FindOptionsWhere } from "typeorm";

import { ApiSubscriberBase } from "@class/api/subscriber/base.class";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { EAuthorizationPermissionMatch } from "@enum/class/authorization/permission-match.enum";
import { AuthorizationPermissionSetMatches } from "@utility/authorization";

/**
 * Base class for all authorization policies. It mirrors ApiFunctionSubscriberBase
 * and provides helper methods to create allow/deny rules that are later executed by the policy executor.
 * @template E - Entity type extending IApiBaseEntity
 */
export abstract class ApiAuthorizationPolicyBase<E extends IApiBaseEntity> extends ApiSubscriberBase {
	/**
	 * Creates an ALLOW rule with optional overrides.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Rule fields to merge.
	 * @returns {Array<IApiAuthorizationPolicySubscriberRule<E>>} Allow rule array.
	 */
	protected allow(rule?: TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E>): Array<TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>>;
	protected allow<R>(rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	protected allow<R>(rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> | TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E> = {}): Array<IApiAuthorizationPolicySubscriberRule<E, R> | TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>> {
		return [
			{
				effect: EAuthorizationEffect.ALLOW,
				...rule,
			},
		];
	}

	/**
	 * Helper that creates an allow rule conditioned on the subject having the required permissions.
	 * Granted permissions may use `*` or `<prefix>.*` wildcards.
	 * @template R - Rule result type.
	 * @param {Array<string>} requiredPermissions - Permissions that grant access.
	 * @param {IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R>} [options] - Optional rule overrides.
	 * @returns {Array<IApiAuthorizationPolicySubscriberRule<E>>} Allow rule array targeting the given permissions.
	 */
	protected allowForPermissions(requiredPermissions: Array<string>, options?: TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E>): Array<TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>>;
	protected allowForPermissions<R>(requiredPermissions: Array<string>, options: IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R>): Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	protected allowForPermissions<R>(requiredPermissions: Array<string>, options: IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R> | TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E> = {}): Array<IApiAuthorizationPolicySubscriberRule<E, R> | TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>> {
		const permissionOptions: IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R> | TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E> = options;
		const matchMode: EAuthorizationPermissionMatch = permissionOptions.match ?? EAuthorizationPermissionMatch.ANY;

		return [
			{
				condition: async (context: IApiAuthorizationRuleContext<E>): Promise<boolean> => {
					if (!AuthorizationPermissionSetMatches(context.subject.permissions, requiredPermissions, { match: matchMode })) {
						return false;
					}

					if (!permissionOptions.condition) {
						return true;
					}

					const result: unknown = await permissionOptions.condition(context);

					return result === true;
				},
				description: permissionOptions.description,
				effect: EAuthorizationEffect.ALLOW,
				priority: permissionOptions.priority,
				resultTransform: permissionOptions.resultTransform,
				scope: permissionOptions.scope,
			},
		];
	}

	/**
	 * Helper that creates an allow rule conditioned on the subject having at least one of the provided roles.
	 * @param {Array<string>} roles - Roles that grant access.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Optional overrides.
	 * @returns {Array<IApiAuthorizationPolicySubscriberRule<E>>} Allow rule array targeting the given roles.
	 */
	protected allowForRoles(roles: Array<string>, rule?: TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E>): Array<TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>>;
	protected allowForRoles<R>(roles: Array<string>, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	protected allowForRoles<R>(roles: Array<string>, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> | TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E> = {}): Array<IApiAuthorizationPolicySubscriberRule<E, R> | TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>> {
		return [
			{
				condition: ({ subject }: IApiAuthorizationRuleContext<E>) => roles.some((role: string) => subject.roles.includes(role)),
				effect: EAuthorizationEffect.ALLOW,
				...rule,
			},
		];
	}

	/**
	 * Creates a DENY rule with optional overrides.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Rule fields to merge.
	 * @returns {Array<IApiAuthorizationPolicySubscriberRule<E>>} Deny rule array.
	 */
	protected deny(rule?: TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E>): Array<TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>>;
	protected deny<R>(rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">): Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	protected deny<R>(rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> | TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E> = {}): Array<IApiAuthorizationPolicySubscriberRule<E, R> | TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>> {
		return [
			{
				effect: EAuthorizationEffect.DENY,
				...rule,
			},
		];
	}

	/**
	 * Helper that creates a deny rule conditioned on the subject having the required permissions.
	 * Granted permissions may use `*` or `<prefix>.*` wildcards.
	 * @template R - Rule result type.
	 * @param {Array<string>} requiredPermissions - Permissions that trigger access denial.
	 * @param {IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R>} [options] - Optional rule overrides.
	 * @returns {Array<IApiAuthorizationPolicySubscriberRule<E>>} Deny rule array targeting the given permissions.
	 */
	protected denyForPermissions(requiredPermissions: Array<string>, options?: TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E>): Array<TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>>;
	protected denyForPermissions<R>(requiredPermissions: Array<string>, options: IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R>): Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	protected denyForPermissions<R>(requiredPermissions: Array<string>, options: IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R> | TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E> = {}): Array<IApiAuthorizationPolicySubscriberRule<E, R> | TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>> {
		const permissionOptions: IApiAuthorizationPolicySubscriberPermissionRuleOptions<E, R> | TApiAuthorizationPolicySubscriberPermissionRuleOptionsWithoutTransform<E> = options;
		const matchMode: EAuthorizationPermissionMatch = permissionOptions.match ?? EAuthorizationPermissionMatch.ANY;

		return [
			{
				condition: async (context: IApiAuthorizationRuleContext<E>): Promise<boolean> => {
					if (!AuthorizationPermissionSetMatches(context.subject.permissions, requiredPermissions, { match: matchMode })) {
						return false;
					}

					if (!permissionOptions.condition) {
						return true;
					}

					const result: unknown = await permissionOptions.condition(context);

					return result === true;
				},
				description: permissionOptions.description,
				effect: EAuthorizationEffect.DENY,
				priority: permissionOptions.priority,
				resultTransform: permissionOptions.resultTransform,
				scope: permissionOptions.scope,
			},
		];
	}

	/**
	 * Helper that scopes data access to the owner identified by a field.
	 * Automatically resolves relation vs scalar fields by default.
	 * @param {keyof E} [ownerField] - Entity field used to match the subject id, defaults to ownerId.
	 * @param {Omit<IApiAuthorizationPolicySubscriberRule<E>, "effect">} [rule] - Optional overrides.
	 * @param {{ isRelation?: boolean }} [options] - Override relation handling; defaults to auto.
	 * @param {boolean} [options.isRelation] - Whether the field is a relation (defaults to auto).
	 * @returns {Array<IApiAuthorizationPolicySubscriberRule<E>>} Allow rule array with owner scope.
	 */
	protected scopeToOwner(ownerField?: keyof E, rule?: TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E>, options?: { isRelation?: boolean }): Array<TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>>;
	protected scopeToOwner<R>(ownerField: keyof E | undefined, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect">, options?: { isRelation?: boolean }): Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	protected scopeToOwner<R>(ownerField: keyof E = "ownerId" as keyof E, rule: Omit<IApiAuthorizationPolicySubscriberRule<E, R>, "effect"> | TApiAuthorizationPolicySubscriberRuleWithoutEffectWithoutTransform<E> = {}, options: { isRelation?: boolean } = {}): Array<IApiAuthorizationPolicySubscriberRule<E, R> | TApiAuthorizationPolicySubscriberRuleWithoutTransform<E>> {
		const ownerFieldName: string = String(ownerField);
		const isRelation: boolean = options.isRelation ?? !ownerFieldName.endsWith("Id");

		return [
			{
				effect: EAuthorizationEffect.ALLOW,
				scope: ({ subject }: IApiAuthorizationRuleContext<E>): { where: FindOptionsWhere<E> } => {
					const ownerCondition: unknown = isRelation ? { id: subject.id } : subject.id;

					return {
						where: {
							[ownerFieldName]: ownerCondition,
						} as FindOptionsWhere<E>,
					};
				},
				...rule,
			},
		];
	}
}

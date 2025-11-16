import type { IApiAuthorizationRuleContext } from "@interface/authorization/rule/context.interface";
import type { IApiAuthorizationRule } from "@interface/authorization/rule/interface";
import type { IApiAuthorizationScope } from "@interface/authorization/scope.interface";

import { EAuthorizationEffect } from "@enum/authorization/effect.enum";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiAuthorizationDecision, IApiAuthorizationEngine, IApiAuthorizationEngineEvaluateOptions } from "@interface/authorization";
import { Injectable } from "@nestjs/common";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope/merge/where.utility";

@Injectable()
export class ApiAuthorizationEngine implements IApiAuthorizationEngine<IApiBaseEntity> {
	public async evaluate<E extends IApiBaseEntity>(options: IApiAuthorizationEngineEvaluateOptions<E>): Promise<IApiAuthorizationDecision<E>> {
		const context: IApiAuthorizationRuleContext<E> = {
			resource: options.resource,
			subject: options.subject,
		};

		const matchedRules: Array<IApiAuthorizationRule<E>> = [];
		let scope: IApiAuthorizationScope<E> | undefined;
		const transforms: Array<NonNullable<IApiAuthorizationRule<E>["resultTransform"]>> = [];

		for (const rule of options.policy.rules) {
			const isConditionPassed: boolean = await this.evaluateCondition(rule, context);

			if (!isConditionPassed) {
				continue;
			}

			if (rule.effect === EAuthorizationEffect.DENY) {
				return this.buildDecision(options, {
					appliedRules: [rule],
					effect: EAuthorizationEffect.DENY,
					scope: undefined,
					transforms: [],
				});
			}

			matchedRules.push(rule);
			scope = await this.mergeScope(scope, rule, context);

			if (rule.resultTransform) {
				transforms.push(rule.resultTransform);
			}
		}

		if (matchedRules.length === 0) {
			return this.buildDecision(options, {
				appliedRules: [],
				effect: EAuthorizationEffect.DENY,
				scope: undefined,
				transforms: [],
			});
		}

		return this.buildDecision(options, {
			appliedRules: matchedRules,
			effect: EAuthorizationEffect.ALLOW,
			scope,
			transforms,
		});
	}

	private buildDecision<E extends IApiBaseEntity>(
		options: IApiAuthorizationEngineEvaluateOptions<E>,
		payload: {
			appliedRules: Array<IApiAuthorizationRule<E>>;
			effect: EAuthorizationEffect;
			scope: IApiAuthorizationScope<E> | undefined;
			transforms: Array<NonNullable<IApiAuthorizationRule<E>["resultTransform"]>>;
		},
	): IApiAuthorizationDecision<E> {
		return {
			action: options.action,
			appliedRules: payload.appliedRules,
			effect: payload.effect,
			policyId: options.policy.policyId,
			resource: options.resource,
			resourceType: options.policy.entity.name ?? "UnknownResource",
			scope: payload.scope,
			subject: options.subject,
			transforms: payload.transforms,
		};
	}

	private async evaluateCondition<E extends IApiBaseEntity>(rule: IApiAuthorizationRule<E>, context: IApiAuthorizationRuleContext<E>): Promise<boolean> {
		if (!rule.condition) {
			return true;
		}

		const result: unknown = await rule.condition(context);

		return result === true;
	}

	private async mergeScope<E extends IApiBaseEntity>(currentScope: IApiAuthorizationScope<E> | undefined, rule: IApiAuthorizationRule<E>, context: IApiAuthorizationRuleContext<E>): Promise<IApiAuthorizationScope<E> | undefined> {
		if (!rule.scope) {
			return currentScope;
		}

		const scopePatch: IApiAuthorizationScope<E> | undefined = await rule.scope(context);

		if (!scopePatch) {
			return currentScope;
		}

		if (!currentScope) {
			return scopePatch;
		}

		return {
			...currentScope,
			...scopePatch,
			where: AuthorizationScopeMergeWhere(currentScope.where, scopePatch.where),
		};
	}
}

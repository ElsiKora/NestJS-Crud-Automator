import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy } from "@interface/authorization/policy/interface";
import type { IApiAuthorizationPolicyRegistry } from "@interface/authorization/policy/registry.interface";
import type { IApiAuthorizationSubject } from "@interface/authorization/subject.interface";

import { ApiAuthorizationEngine } from "@class/api/authorization/engine.class";
import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/authorization/metadata/decision.constant";
import { AUTHORIZATION_POLICY_REGISTRY_TOKEN } from "@constant/authorization/token/registry.constant";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EAuthorizationEffect } from "@enum/authorization/effect.enum";
import { IApiAuthorizationDecision } from "@interface/authorization";
import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { TApiAuthorizationGuardRequest } from "@type/class/api/authorization";
import { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";
import { AuthorizationResolveDefaultSubject } from "@utility/authorization/subject/resolve-default-subject.utility";
import { LoggerUtility } from "@utility/logger.utility";

const authorizationGuardLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationGuard");

@Injectable()
export class ApiAuthorizationGuard implements CanActivate {
	constructor(
		@Inject(AUTHORIZATION_POLICY_REGISTRY_TOKEN) private readonly policyRegistry: IApiAuthorizationPolicyRegistry,
		private readonly authorizationEngine: ApiAuthorizationEngine,
	) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		if (!this.isControllerSecurable(context)) {
			authorizationGuardLogger.debug("Controller is not marked as @ApiControllerSecurable, skipping authorization");

			return true;
		}

		const entityConstructor: (new () => IApiBaseEntity) | undefined = this.resolveEntityConstructor(context);

		if (!entityConstructor) {
			authorizationGuardLogger.debug("No entity constructor found in controller metadata, skipping authorization");

			return true;
		}

		const action: string = this.resolveAction(context);
		authorizationGuardLogger.verbose(`Evaluating authorization for entity "${entityConstructor.name}" action "${action}"`);

		const policy: IApiAuthorizationPolicy<IApiBaseEntity, TApiAuthorizationRuleTransformPayload<IApiBaseEntity>> | undefined = await this.policyRegistry.buildAggregatedPolicy(entityConstructor, action);

		if (!policy) {
			authorizationGuardLogger.debug(`No policy found for entity "${entityConstructor.name}" action "${action}", allowing access`);

			return true;
		}

		authorizationGuardLogger.verbose(`Found policy "${policy.policyId}" with ${policy.rules.length} rules for entity "${entityConstructor.name}" action "${action}"`);

		const request: TApiAuthorizationGuardRequest = context.switchToHttp().getRequest<TApiAuthorizationGuardRequest>();
		const subject: IApiAuthorizationSubject = AuthorizationResolveDefaultSubject(request.user);

		const decision: IApiAuthorizationDecision<IApiBaseEntity, TApiAuthorizationRuleTransformPayload<IApiBaseEntity>> = await this.authorizationEngine.evaluate({
			action,
			policy,
			resource: undefined,
			subject,
		});

		this.attachDecisionToRequest(request, decision);

		if (decision.effect === EAuthorizationEffect.DENY) {
			authorizationGuardLogger.warn(`Access denied for entity "${entityConstructor.name}" action "${action}" subject "${subject.id}"`);

			throw new ForbiddenException("Access denied");
		}

		authorizationGuardLogger.verbose(`Access granted for entity "${entityConstructor.name}" action "${action}" subject "${subject.id}"`);

		return true;
	}

	private attachDecisionToRequest(request: TApiAuthorizationGuardRequest, decision: IApiAuthorizationDecision<IApiBaseEntity, TApiAuthorizationRuleTransformPayload<IApiBaseEntity>>): void {
		request.authorizationDecision = decision;
		request[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY] = decision;
	}

	private isControllerSecurable(context: ExecutionContext): boolean {
		return Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, context.getClass()));
	}

	private resolveAction(context: ExecutionContext): string {
		const handlerName: string = context.getHandler().name;
		const prefix: string = CONTROLLER_API_DECORATOR_CONSTANT.RESERVED_METHOD_PREFIX ?? "";

		if (handlerName.startsWith(prefix)) {
			return handlerName.slice(prefix.length);
		}

		return handlerName;
	}

	private resolveEntityConstructor(context: ExecutionContext): (new () => IApiBaseEntity) | undefined {
		return Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, context.getClass()) as (new () => IApiBaseEntity) | undefined;
	}
}

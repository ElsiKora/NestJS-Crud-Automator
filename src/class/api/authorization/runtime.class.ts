import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthenticationRequest } from "@interface/api/authentication-request.interface";
import type { IApiAuthorizationAuditSink, IApiAuthorizationDecision, IApiAuthorizationPolicy, IApiAuthorizationPolicyRegistry, IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver, IApiAuthorizationRequestMetadata, IApiPolicyAttachment, IApiPolicyDocumentRecord, IApiResolvedPolicyAttachments } from "@interface/class/api/authorization";
import type { IApiControllerAuthorizationProperties, IApiControllerRouteAuthorizationProperties } from "@interface/decorator/api/controller/properties";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { AUTHORIZATION_AUDIT_SINK_TOKEN, AUTHORIZATION_POLICY_REGISTRY_TOKEN, AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN } from "@constant/class/authorization";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { AuthorizationResolveDefaultPrincipal } from "@utility/authorization";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationEngine } from "./engine.class";
import { ApiAuthorizationHookPermissionResolver } from "./hook-permission-resolver.class";
import { ApiAuthorizationIamAttachmentResolver, ApiAuthorizationIamDocumentResolver, ApiAuthorizationIamEngine } from "./iam";

const authorizationRuntimeLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationRuntime");

@Injectable()
export class ApiAuthorizationRuntime {
	public constructor(
		@Inject(AUTHORIZATION_POLICY_REGISTRY_TOKEN)
		private readonly policyRegistry: IApiAuthorizationPolicyRegistry,
		private readonly authorizationEngine: ApiAuthorizationEngine,
		private readonly hookPermissionResolver: ApiAuthorizationHookPermissionResolver,
		private readonly iamAttachmentResolver: ApiAuthorizationIamAttachmentResolver,
		private readonly iamDocumentResolver: ApiAuthorizationIamDocumentResolver,
		private readonly iamEngine: ApiAuthorizationIamEngine,
		@Optional()
		@Inject(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)
		private readonly principalResolver?: IApiAuthorizationPrincipalResolver,
		@Optional()
		@Inject(AUTHORIZATION_AUDIT_SINK_TOKEN)
		private readonly auditSink?: IApiAuthorizationAuditSink,
	) {}

	public async evaluate<E extends IApiBaseEntity>(options: {
		action: string;
		authenticationRequest?: IApiAuthenticationRequest;
		authorization: IApiControllerAuthorizationProperties<E>;
		entity: new () => E;
		principal?: IApiAuthorizationPrincipal;
		requestMetadata: IApiAuthorizationRequestMetadata<E>;
		resource?: E;
		routeAuthorization?: IApiControllerRouteAuthorizationProperties;
		routeType?: EApiRouteType;
	}): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		const principal: IApiAuthorizationPrincipal = await this.resolvePrincipal(options.principal, options.authenticationRequest);
		const mode: EApiAuthorizationMode = this.resolveMode(options.authorization, options.routeAuthorization);

		authorizationRuntimeLogger.verbose(`Dispatching authorization evaluation for entity "${options.entity.name}" action "${options.action}" principal "${principal.id}" using mode "${mode}".`);

		const decision: IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>> = mode === EApiAuthorizationMode.HOOKS
			? await this.evaluateHooks({
					action: options.action,
					authenticationRequest: options.authenticationRequest,
					entity: options.entity,
					principal,
					requestMetadata: options.requestMetadata,
					resource: options.resource,
					routeType: options.routeType,
				})
			: await this.evaluateIam({
					action: options.action,
					authorization: options.authorization,
					principal,
					requestMetadata: options.requestMetadata,
					resource: options.resource,
				});

		if (this.auditSink) {
			authorizationRuntimeLogger.verbose(`Recording authorization audit event for principal "${principal.id}" action "${options.action}".`);
			await this.auditSink.record(decision);
		}

		authorizationRuntimeLogger.verbose(`Completed authorization evaluation for entity "${options.entity.name}" action "${options.action}" with effect "${decision.effect}".`);

		return decision;
	}

	private createImplicitDenyHookPolicy<E extends IApiBaseEntity>(entity: new () => E, action: string): IApiAuthorizationPolicy<E, TApiAuthorizationRuleTransformPayload<E>> {
		return {
			action,
			entity,
			policyId: `${entity.name?.toLowerCase() ?? "unknown"}-hooks-policy`,
			policyIds: [],
			rules: [],
		};
	}

	private async evaluateHooks<E extends IApiBaseEntity>(options: { action: string; authenticationRequest?: IApiAuthenticationRequest; entity: new () => E; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E>; resource?: E; routeType?: EApiRouteType }): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		const permissions: ReadonlyArray<string> = await this.hookPermissionResolver.resolve(options.principal);

		authorizationRuntimeLogger.verbose(`Resolved ${permissions.length} hook permissions for principal "${options.principal.id}" on entity "${options.entity.name}".`);

		const policy: IApiAuthorizationPolicy<E, TApiAuthorizationRuleTransformPayload<E>> = (await this.policyRegistry.buildAggregatedPolicy(options.entity, options.action, {
			authenticationRequest: options.authenticationRequest,
			permissions,
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			routeType: options.routeType,
		})) ?? this.createImplicitDenyHookPolicy(options.entity, options.action);

		return await this.authorizationEngine.evaluate({
			action: options.action,
			mode: EApiAuthorizationMode.HOOKS,
			permissions,
			policy,
			principal: options.principal,
			resource: options.resource,
			resourceType: options.entity.name ?? "UnknownResource",
		});
	}

	private async evaluateIam<E extends IApiBaseEntity>(options: { action: string; authorization: IApiControllerAuthorizationProperties<E>; principal: IApiAuthorizationPrincipal; requestMetadata: IApiAuthorizationRequestMetadata<E>; resource?: E }): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		if (!options.authorization.policyNamespace) {
			authorizationRuntimeLogger.error("IAM authorization requires policyNamespace");

			throw ErrorException("IAM authorization requires policyNamespace");
		}

		if (!options.authorization.resourceDefinition) {
			authorizationRuntimeLogger.error("IAM authorization requires resourceDefinition");

			throw ErrorException("IAM authorization requires resourceDefinition");
		}

		const attachments: IApiResolvedPolicyAttachments = await this.iamAttachmentResolver.resolve(options.principal);
		authorizationRuntimeLogger.verbose(`Resolved ${attachments.attachments.length} IAM attachments and ${attachments.boundaries.length} boundaries for principal "${options.principal.id}".`);

		const policyIds: Array<string> = [...attachments.attachments.map((attachment: IApiPolicyAttachment): string => attachment.policyId), ...attachments.boundaries.map((attachment: IApiPolicyAttachment): string => attachment.policyId)];
		const documents: ReadonlyArray<IApiPolicyDocumentRecord> = await this.iamDocumentResolver.resolve(policyIds);

		authorizationRuntimeLogger.verbose(`Resolved ${documents.length} IAM policy documents for namespace "${options.authorization.policyNamespace}" and principal "${options.principal.id}".`);

		return await this.iamEngine.evaluate({
			action: this.resolveIamAction(options.authorization.policyNamespace, options.action),
			attachments,
			documents,
			policyNamespace: options.authorization.policyNamespace,
			principal: options.principal,
			requestMetadata: options.requestMetadata,
			resource: options.resource,
			resourceDefinition: options.authorization.resourceDefinition,
		});
	}

	private resolveIamAction(policyNamespace: string, action: string): string {
		const iamActionByRouteType: Record<EApiRouteType, string> = {
			[EApiRouteType.CREATE]: "create",
			[EApiRouteType.DELETE]: "delete",
			[EApiRouteType.GET]: "read",
			[EApiRouteType.GET_LIST]: "list",
			[EApiRouteType.PARTIAL_UPDATE]: "update",
			[EApiRouteType.UPDATE]: "update",
		};
		const iamAction: string | undefined = iamActionByRouteType[action as EApiRouteType];

		return iamAction ? `${policyNamespace}:${iamAction}` : `${policyNamespace}:${action}`;
	}

	private resolveMode<E extends IApiBaseEntity>(authorization: IApiControllerAuthorizationProperties<E>, routeAuthorization?: IApiControllerRouteAuthorizationProperties): EApiAuthorizationMode {
		const mode: EApiAuthorizationMode = routeAuthorization?.mode ?? authorization.defaultMode;

		if (mode !== EApiAuthorizationMode.HOOKS && mode !== EApiAuthorizationMode.IAM) {
			authorizationRuntimeLogger.error(`Unknown authorization mode "${String(mode)}"`);

			throw ErrorException(`Unknown authorization mode "${String(mode)}"`);
		}

		return mode;
	}

	private async resolvePrincipal(principal: IApiAuthorizationPrincipal | undefined, authenticationRequest?: IApiAuthenticationRequest): Promise<IApiAuthorizationPrincipal> {
		if (principal) {
			authorizationRuntimeLogger.verbose(`Using explicit authorization principal "${principal.id}".`);

			return principal;
		}

		if (this.principalResolver) {
			authorizationRuntimeLogger.verbose("Resolving authorization principal via configured principalResolver.");

			return await this.principalResolver.resolve(authenticationRequest?.user, authenticationRequest);
		}

		authorizationRuntimeLogger.verbose("Resolving authorization principal via default principal resolver.");

		return AuthorizationResolveDefaultPrincipal(authenticationRequest?.user);
	}
}

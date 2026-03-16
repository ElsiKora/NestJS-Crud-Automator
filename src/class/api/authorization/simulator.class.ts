import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization";
import type { IApiControllerAuthorizationProperties, IApiControllerRouteAuthorizationProperties } from "@interface/decorator/api/controller/properties";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

import { Injectable } from "@nestjs/common";

import { ApiAuthorizationRuntime } from "./runtime.class";

@Injectable()
export class ApiAuthorizationSimulator {
	public constructor(private readonly runtime: ApiAuthorizationRuntime) {}

	public async evaluate<E extends IApiBaseEntity>(options: { action: string; authorization: IApiControllerAuthorizationProperties<E>; entity: new () => E; principal: IApiAuthorizationPrincipal; requestMetadata?: IApiAuthorizationRequestMetadata<E>; resource?: E; routeAuthorization?: IApiControllerRouteAuthorizationProperties }): Promise<IApiAuthorizationDecision<E, TApiAuthorizationRuleTransformPayload<E>>> {
		return await this.runtime.evaluate({
			action: options.action,
			authorization: options.authorization,
			entity: options.entity,
			principal: options.principal,
			requestMetadata: options.requestMetadata ?? {},
			resource: options.resource,
			routeAuthorization: options.routeAuthorization,
		});
	}
}

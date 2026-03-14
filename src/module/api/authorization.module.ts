import type { IApiAuthorizationModuleOptions } from "@interface/class/api/authorization";
import type { DynamicModule, Provider } from "@nestjs/common";

import { ApiAuthorizationEngine } from "@class/api/authorization/engine.class";
import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { ApiAuthorizationPolicyDiscoveryService } from "@class/api/authorization/policy/discovery-service.class";
import { ApiAuthorizationPolicyRegistry, apiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { AUTHORIZATION_SUBJECT_RESOLVER_TOKEN } from "@constant/class/authorization/subject-resolver-token.constant";
import { AUTHORIZATION_POLICY_REGISTRY_TOKEN } from "@constant/class/authorization/token-registry.constant";
import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

/**
 * Module responsible for discovering and registering authorization policies.
 * Import this module to enable zero-configuration RBAC.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/authorization | Authorization}
 */
@Global()
@Module({
	exports: [AUTHORIZATION_POLICY_REGISTRY_TOKEN, ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService],
	imports: [DiscoveryModule],
	providers: [
		ApiAuthorizationEngine,
		ApiAuthorizationGuard,
		ApiAuthorizationPolicyDiscoveryService,
		{
			provide: AUTHORIZATION_POLICY_REGISTRY_TOKEN,
			useValue: apiAuthorizationPolicyRegistry,
		},
		{
			provide: ApiAuthorizationPolicyRegistry,
			useValue: apiAuthorizationPolicyRegistry,
		},
	],
})
export class ApiAuthorizationModule {
	public static forRoot(options: IApiAuthorizationModuleOptions = {}): DynamicModule {
		const providers: Array<Provider> = [];
		const exportTokens: Array<string> = [];

		if (options.subjectResolver) {
			providers.push({
				provide: AUTHORIZATION_SUBJECT_RESOLVER_TOKEN,
				useValue: options.subjectResolver,
			});
			exportTokens.push(AUTHORIZATION_SUBJECT_RESOLVER_TOKEN);
		}

		const dynamicModule: DynamicModule = {
			exports: exportTokens,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			global: true,
			module: ApiAuthorizationModule,
			providers,
		};

		return dynamicModule;
	}
}

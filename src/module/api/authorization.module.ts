import type { IApiAuthorizationModuleAsyncOptions, IApiAuthorizationModuleOptions, IApiAuthorizationModuleOptionsFactory } from "@interface/class/api/authorization";
import type { DynamicModule, Provider } from "@nestjs/common";

import {
	ApiAuthorizationBootstrapValidationService,
	ApiAuthorizationEngine,
	ApiAuthorizationGuard,
	ApiAuthorizationHookPermissionResolver,
	ApiAuthorizationIamAttachmentResolver,
	ApiAuthorizationIamDocumentResolver,
	ApiAuthorizationIamDocumentValidator,
	ApiAuthorizationIamEngine,
	ApiAuthorizationIamQueryPlanner,
	ApiAuthorizationPolicyDiscoveryService,
	ApiAuthorizationPolicyRegistry,
	apiAuthorizationPolicyRegistry,
	ApiAuthorizationRuntime,
	ApiAuthorizationSimulator,
} from "@class/api/authorization";
import { AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN, AUTHORIZATION_MODULE_OPTIONS_TOKEN, AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN, AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN, AUTHORIZATION_POLICY_REGISTRY_TOKEN, AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN } from "@constant/class/authorization";
import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Module responsible for discovering and registering authorization policies.
 * Import this module to enable zero-configuration RBAC.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/authorization | Authorization}
 */
@Global()
@Module({
	exports: [AUTHORIZATION_POLICY_REGISTRY_TOKEN, ApiAuthorizationBootstrapValidationService, ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationHookPermissionResolver, ApiAuthorizationIamAttachmentResolver, ApiAuthorizationIamDocumentResolver, ApiAuthorizationIamDocumentValidator, ApiAuthorizationIamEngine, ApiAuthorizationIamQueryPlanner, ApiAuthorizationPolicyDiscoveryService, ApiAuthorizationRuntime, ApiAuthorizationSimulator],
	imports: [DiscoveryModule],
	providers: [
		ApiAuthorizationBootstrapValidationService,
		ApiAuthorizationEngine,
		ApiAuthorizationGuard,
		ApiAuthorizationHookPermissionResolver,
		ApiAuthorizationIamAttachmentResolver,
		ApiAuthorizationIamDocumentResolver,
		ApiAuthorizationIamDocumentValidator,
		ApiAuthorizationIamEngine,
		ApiAuthorizationIamQueryPlanner,
		ApiAuthorizationPolicyDiscoveryService,
		ApiAuthorizationRuntime,
		ApiAuthorizationSimulator,
		{
			provide: AUTHORIZATION_POLICY_REGISTRY_TOKEN,
			useValue: apiAuthorizationPolicyRegistry,
		},
		{
			provide: ApiAuthorizationPolicyRegistry,
			useValue: apiAuthorizationPolicyRegistry,
		},
		{
			provide: AUTHORIZATION_MODULE_OPTIONS_TOKEN,
			useValue: {},
		},
	],
})
export class ApiAuthorizationModule {
	public static forRoot(options: IApiAuthorizationModuleOptions = {}): DynamicModule {
		const providers: Array<Provider> = [
			{
				provide: AUTHORIZATION_MODULE_OPTIONS_TOKEN,
				useValue: options,
			},
		];
		const exportTokens: Array<string> = [];

		if (options.principalResolver) {
			providers.push({
				provide: AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN,
				useValue: options.principalResolver,
			});
			exportTokens.push(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN);
		}

		if (options.hookPermissionSources) {
			providers.push({
				provide: AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN,
				useValue: options.hookPermissionSources,
			});
			exportTokens.push(AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN);
		}

		if (options.iam?.attachmentSources) {
			providers.push({
				provide: AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN,
				useValue: options.iam.attachmentSources,
			});
			exportTokens.push(AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN);
		}

		if (options.iam?.documentSources) {
			providers.push({
				provide: AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN,
				useValue: options.iam.documentSources,
			});
			exportTokens.push(AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN);
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

	public static forRootAsync(options: IApiAuthorizationModuleAsyncOptions): DynamicModule {
		const dynamicModule: DynamicModule = {
			exports: [AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN, AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN, AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN, AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN],
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			global: true,
			imports: options.imports ?? [],
			module: ApiAuthorizationModule,
			providers: [...ApiAuthorizationModule.createAsyncOptionsProviders(options), ...ApiAuthorizationModule.createDerivedOptionProviders()],
		};

		return dynamicModule;
	}

	private static createAsyncOptionsProvider(options: IApiAuthorizationModuleAsyncOptions): Provider {
		const optionsFactoryToken: IApiAuthorizationModuleAsyncOptions["useClass"] = options.useExisting ?? options.useClass;

		if (!optionsFactoryToken) {
			throw ErrorException("ApiAuthorizationModule.forRootAsync requires useFactory, useClass, or useExisting");
		}

		return {
			inject: [optionsFactoryToken],
			provide: AUTHORIZATION_MODULE_OPTIONS_TOKEN,
			useFactory: async (optionsFactory: IApiAuthorizationModuleOptionsFactory): Promise<IApiAuthorizationModuleOptions> => await optionsFactory.createApiAuthorizationModuleOptions(),
		};
	}

	private static createAsyncOptionsProviders(options: IApiAuthorizationModuleAsyncOptions): Array<Provider> {
		const strategyCount: number = [options.useFactory, options.useClass, options.useExisting].filter(Boolean).length;

		if (strategyCount !== 1) {
			throw ErrorException("ApiAuthorizationModule.forRootAsync requires exactly one async configuration strategy");
		}

		if (options.useFactory) {
			return [
				{
					inject: options.inject ?? [],
					provide: AUTHORIZATION_MODULE_OPTIONS_TOKEN,
					useFactory: options.useFactory,
				},
			];
		}

		const providers: Array<Provider> = [ApiAuthorizationModule.createAsyncOptionsProvider(options)];

		if (options.useClass) {
			providers.push({
				provide: options.useClass,
				useClass: options.useClass,
			});
		}

		return providers;
	}

	private static createDerivedOptionProviders(): Array<Provider> {
		return [
			{
				inject: [AUTHORIZATION_MODULE_OPTIONS_TOKEN],
				provide: AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN,
				useFactory: (options: IApiAuthorizationModuleOptions) => options.principalResolver,
			},
			{
				inject: [AUTHORIZATION_MODULE_OPTIONS_TOKEN],
				provide: AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN,
				useFactory: (options: IApiAuthorizationModuleOptions) => options.hookPermissionSources ?? [],
			},
			{
				inject: [AUTHORIZATION_MODULE_OPTIONS_TOKEN],
				provide: AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN,
				useFactory: (options: IApiAuthorizationModuleOptions) => options.iam?.attachmentSources ?? [],
			},
			{
				inject: [AUTHORIZATION_MODULE_OPTIONS_TOKEN],
				provide: AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN,
				useFactory: (options: IApiAuthorizationModuleOptions) => options.iam?.documentSources ?? [],
			},
		];
	}
}

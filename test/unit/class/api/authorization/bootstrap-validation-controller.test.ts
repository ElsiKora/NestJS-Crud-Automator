import "reflect-metadata";

import type { IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization";

import { ApiAuthorizationPolicyBase } from "@class/api/authorization/policy/base.class";
import { ApiAuthorizationPolicy } from "@decorator/api/authorization-policy.decorator";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiControllerSecurable } from "@decorator/api/controller/securable.decorator";
import { ApiMethod } from "@decorator/api/method.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiRouteCustom } from "@decorator/api/route-custom.decorator";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { DataSource, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../../../src/module/api";

@Entity("validation_boot_items")
class ValidationBootItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@Entity("validation_boot_foreign_items")
class ValidationBootForeignEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@Entity("validation_boot_policy_free_items")
class ValidationBootPolicyFreeEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@ApiAuthorizationPolicy<ValidationBootItemEntity>({ entity: ValidationBootItemEntity })
class ValidationBootItemPolicy extends ApiAuthorizationPolicyBase<ValidationBootItemEntity> {
	public getCustomActionRule(action: string): Array<IApiAuthorizationPolicySubscriberRule<ValidationBootItemEntity, unknown>> {
		return action === "custom.allow" ? this.allow() : [];
	}
}

const DISABLED: { generation: { isEnabled: false } } = { generation: { isEnabled: false } };

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: DISABLED,
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
} as const;

const HOOKS_DEFAULT = { defaultMode: EApiAuthorizationMode.HOOKS } as const;

const HOOKS_ROUTE = { authorization: { mode: EApiAuthorizationMode.HOOKS } } as const;

/**
 * Builds the metadata of a custom route on the item entity, with overrides for what a test makes wrong.
 * @param {Record<string, unknown>} [overrides] - Metadata fields to replace.
 * @returns {never} The metadata for `@ApiMethod`.
 */
function routeMetadata(overrides: Record<string, unknown> = {}): never {
	return {
		metadata: {
			resource: { action: "custom.publish", entity: ValidationBootItemEntity },
			response: { status: HttpStatus.NO_CONTENT, type: undefined },
			route: { method: RequestMethod.POST, path: "publish" },
			security: HOOKS_ROUTE,
			...overrides,
		},
	} as never;
}

/**
 * Starts an application with the library modules and one controller, running the bootstrap hooks.
 * @param {new (...arguments_: Array<never>) => unknown} controller - Controller class, as `@ApiController` returned it.
 * @returns {Promise<void>} Resolves when the application started and closed.
 */
async function boot(controller: new (...arguments_: Array<never>) => unknown): Promise<void> {
	const application = await Test.createTestingModule({ controllers: [controller], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule], providers: [ValidationBootItemPolicy] }).compile();

	await application.init();
	await application.close();
}

describe("authorization bootstrap validation of a decorated controller", () => {
	describe("methods declared on the controller class", () => {
		it("starts with a valid custom route and generated routes", async () => {
			const dataSource: DataSource = new DataSource({ entities: [ValidationBootItemEntity], type: "postgres" });

			// Metadata is enough for the repository check at bootstrap; the test never connects.
			await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "valid", routes: { ...NO_GENERATED_ROUTES, [EApiRouteType.GET]: {} } })
			class ValidationBootValidController {
				public service: never = { repository: dataSource.getRepository(ValidationBootItemEntity) } as never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata())
				public publish(): void {}
			}

			await expect(boot(ValidationBootValidController)).resolves.toBeUndefined();
		});

		it("rejects a route of another entity, with @ApiControllerSecurable above @ApiController", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "foreign-above", routes: NO_GENERATED_ROUTES })
			class ValidationBootForeignAboveController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "custom.publish", entity: ValidationBootForeignEntity } }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootForeignAboveController)).rejects.toThrow('Controller "ValidationBootForeignAboveController" method "publish" route resource.entity must match controller entity');
		});

		it("rejects a route of another entity, with @ApiControllerSecurable below @ApiController", async () => {
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "foreign-below", routes: NO_GENERATED_ROUTES })
			@ApiControllerSecurable()
			class ValidationBootForeignBelowController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "custom.publish", entity: ValidationBootForeignEntity } }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootForeignBelowController)).rejects.toThrow('Controller "ValidationBootForeignBelowController" method "publish" route resource.entity must match controller entity');
		});

		it("starts a route without an authorization mode, which resolves to the controller default", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "no-mode", routes: NO_GENERATED_ROUTES })
			class ValidationBootNoModeController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ security: undefined }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootNoModeController)).resolves.toBeUndefined();
		});

		it("runs a route without an authorization mode through the hooks policy of the default", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "default-mode", routes: NO_GENERATED_ROUTES })
			class ValidationBootDefaultModeController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "custom.allow", entity: ValidationBootItemEntity }, route: { method: RequestMethod.POST, path: "allowed" }, security: undefined }))
				public allowed(): void {}

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "custom.deny", entity: ValidationBootItemEntity }, route: { method: RequestMethod.POST, path: "denied" }, security: undefined }))
				public denied(): void {}
			}

			const application = (await Test.createTestingModule({ controllers: [ValidationBootDefaultModeController], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule], providers: [ValidationBootItemPolicy] }).compile()).createNestApplication<NestFastifyApplication>(new FastifyAdapter());

			await application.init();
			await application.getHttpAdapter().getInstance().ready();

			const allowed = await application.inject({ method: "POST", url: "/default-mode/allowed" });
			const denied = await application.inject({ method: "POST", url: "/default-mode/denied" });

			await application.close();

			expect(allowed.statusCode).toBe(HttpStatus.NO_CONTENT);
			expect(denied.statusCode).toBe(HttpStatus.FORBIDDEN);
		});

		it("rejects a route with an unknown authorization mode", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "unknown-mode", routes: NO_GENERATED_ROUTES })
			class ValidationBootUnknownModeController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ security: { authorization: { mode: "open" } } }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootUnknownModeController)).rejects.toThrow('Controller "ValidationBootUnknownModeController" route "publish" uses unknown authorization mode "open"');
		});

		it("rejects a generated route with an unknown authorization mode, naming the route", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "unknown-generated-mode", routes: { ...NO_GENERATED_ROUTES, [EApiRouteType.GET]: { security: { authorization: { mode: "open" } } } } } as never)
			class ValidationBootUnknownGeneratedModeController {
				public service!: never;
			}

			await expect(boot(ValidationBootUnknownGeneratedModeController)).rejects.toThrow(`Controller "ValidationBootUnknownGeneratedModeController" route "${EApiRouteType.GET}" uses unknown authorization mode "open"`);
		});

		it("does not check a method without route metadata", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "helper", routes: NO_GENERATED_ROUTES })
			class ValidationBootHelperController {
				public service!: never;

				public helper(): void {}

				@ApiMethod<ValidationBootItemEntity>(routeMetadata())
				public publish(): void {}
			}

			await expect(boot(ValidationBootHelperController)).resolves.toBeUndefined();
		});

		it("does not check the routes of a controller that is not securable", async () => {
			@ApiController<ValidationBootItemEntity>({ entity: ValidationBootItemEntity, path: "not-securable", routes: NO_GENERATED_ROUTES })
			class ValidationBootNotSecurableController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "custom.publish", entity: ValidationBootForeignEntity }, security: undefined }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootNotSecurableController)).resolves.toBeUndefined();
		});

		it("rejects a route without an action", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "no-action", routes: NO_GENERATED_ROUTES })
			class ValidationBootNoActionController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "", entity: ValidationBootItemEntity } }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootNoActionController)).rejects.toThrow('Controller "ValidationBootNoActionController" method "publish" must declare route resource.action');
		});

		it("does not run an accessor of the controller class", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "accessor", routes: NO_GENERATED_ROUTES })
			class ValidationBootAccessorController {
				public service!: never;

				public get unavailable(): string {
					throw new Error("the accessor ran at bootstrap");
				}
			}

			await expect(boot(ValidationBootAccessorController)).resolves.toBeUndefined();
		});
	});

	describe("inherited methods", () => {
		class ValidationBootForeignBase {
			public service!: never;

			@ApiMethod<ValidationBootItemEntity>(routeMetadata({ resource: { action: "custom.publish", entity: ValidationBootForeignEntity } }))
			public publish(): void {}
		}

		it("rejects a route of another entity that a base class declares", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "inherited", routes: NO_GENERATED_ROUTES })
			class ValidationBootInheritedController extends ValidationBootForeignBase {}

			await expect(boot(ValidationBootInheritedController)).rejects.toThrow('Controller "ValidationBootInheritedController" method "publish" route resource.entity must match controller entity');
		});

		it("rejects a route of another entity two classes up", async () => {
			class ValidationBootMiddle extends ValidationBootForeignBase {}

			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "two-levels", routes: NO_GENERATED_ROUTES })
			class ValidationBootTwoLevelsController extends ValidationBootMiddle {}

			await expect(boot(ValidationBootTwoLevelsController)).rejects.toThrow('Controller "ValidationBootTwoLevelsController" method "publish" route resource.entity must match controller entity');
		});

		it("starts an @ApiRouteCustom route without an authorization mode that a base class declares", async () => {
			class ValidationBootCustomBase {
				public service!: never;

				@ApiRouteCustom<ValidationBootItemEntity>({
					resource: { action: "custom.mine", entity: ValidationBootItemEntity },
					response: { status: HttpStatus.NO_CONTENT, type: undefined },
					route: { method: RequestMethod.GET, path: "mine" },
				} as never)
				public mine(): void {}
			}

			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "inherited-custom", routes: NO_GENERATED_ROUTES })
			class ValidationBootInheritedCustomController extends ValidationBootCustomBase {}

			await expect(boot(ValidationBootInheritedCustomController)).resolves.toBeUndefined();
		});

		it("rejects the route of a decorated controller that a plain subclass serves", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "decorated-parent", routes: NO_GENERATED_ROUTES })
			class ValidationBootDecoratedParentController extends ValidationBootForeignBase {}

			class ValidationBootPlainSubclassController extends ValidationBootDecoratedParentController {}

			await expect(boot(ValidationBootPlainSubclassController)).rejects.toThrow('Controller "ValidationBootPlainSubclassController" method "publish" route resource.entity must match controller entity');
		});

		it("does not fire the IAM checks for an IAM route of a base class that a hooks route hides", async () => {
			class ValidationBootIamBase {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ security: { authorization: { mode: EApiAuthorizationMode.IAM } } }))
				public publish(): void {}
			}

			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "shadowed-iam", routes: NO_GENERATED_ROUTES })
			class ValidationBootShadowedIamController extends ValidationBootIamBase {
				@ApiMethod<ValidationBootItemEntity>(routeMetadata())
				public override publish(): void {}
			}

			await expect(boot(ValidationBootShadowedIamController)).resolves.toBeUndefined();
		});

		it("does not fire the IAM checks for an IAM route of a base class that a plain override hides", async () => {
			class ValidationBootPlainIamBase {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ security: { authorization: { mode: EApiAuthorizationMode.IAM } } }))
				public publish(): void {}
			}

			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "plain-iam", routes: NO_GENERATED_ROUTES })
			class ValidationBootPlainIamController extends ValidationBootPlainIamBase {
				public override publish(): void {}
			}

			await expect(boot(ValidationBootPlainIamController)).resolves.toBeUndefined();
		});

		it("validates the closest definition, so a valid override hides a wrong route of a base class", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "override", routes: NO_GENERATED_ROUTES })
			class ValidationBootOverrideController extends ValidationBootForeignBase {
				@ApiMethod<ValidationBootItemEntity>(routeMetadata())
				public override publish(): void {}
			}

			await expect(boot(ValidationBootOverrideController)).resolves.toBeUndefined();
		});

		it("validates the closest definition, so an override without route metadata is not a route", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "plain-override", routes: NO_GENERATED_ROUTES })
			class ValidationBootPlainOverrideController extends ValidationBootForeignBase {
				public override publish(): void {}
			}

			await expect(boot(ValidationBootPlainOverrideController)).resolves.toBeUndefined();
		});
	});

	describe("prerequisites of the mode that a route resolves to", () => {
		it("requires the IAM configuration when a route without a mode resolves to an IAM default", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: { defaultMode: EApiAuthorizationMode.IAM }, entity: ValidationBootItemEntity, path: "default-iam", routes: NO_GENERATED_ROUTES } as never)
			class ValidationBootDefaultIamController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ security: undefined }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootDefaultIamController)).rejects.toThrow('Controller "ValidationBootDefaultIamController" uses IAM authorization but does not declare policyNamespace');
		});

		it("requires a policy when a route without a mode resolves to a hooks default", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootPolicyFreeEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootPolicyFreeEntity, path: "default-hooks", routes: NO_GENERATED_ROUTES })
			class ValidationBootDefaultHooksController {
				public service!: never;

				@ApiMethod<ValidationBootPolicyFreeEntity>(routeMetadata({ resource: { action: "custom.publish", entity: ValidationBootPolicyFreeEntity }, security: undefined }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootDefaultHooksController)).rejects.toThrow('Controller "ValidationBootDefaultHooksController" uses hooks authorization but no @ApiAuthorizationPolicy(...) is registered for entity');
		});

		it("requires the IAM configuration when one route selects IAM on a hooks controller", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootItemEntity>({ authorization: HOOKS_DEFAULT, entity: ValidationBootItemEntity, path: "route-iam", routes: NO_GENERATED_ROUTES })
			class ValidationBootRouteIamController {
				public service!: never;

				@ApiMethod<ValidationBootItemEntity>(routeMetadata({ security: { authorization: { mode: EApiAuthorizationMode.IAM } } }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootRouteIamController)).rejects.toThrow('Controller "ValidationBootRouteIamController" uses IAM authorization but does not declare policyNamespace');
		});

		it("requires a policy when one route selects hooks on an IAM controller", async () => {
			@ApiControllerSecurable()
			@ApiController<ValidationBootPolicyFreeEntity>({ authorization: { defaultMode: EApiAuthorizationMode.IAM }, entity: ValidationBootPolicyFreeEntity, path: "route-hooks", routes: NO_GENERATED_ROUTES } as never)
			class ValidationBootRouteHooksController {
				public service!: never;

				@ApiMethod<ValidationBootPolicyFreeEntity>(routeMetadata({ resource: { action: "custom.publish", entity: ValidationBootPolicyFreeEntity } }))
				public publish(): void {}
			}

			await expect(boot(ValidationBootRouteHooksController)).rejects.toThrow('Controller "ValidationBootRouteHooksController" uses hooks authorization but no @ApiAuthorizationPolicy(...) is registered for entity');
		});
	});
});

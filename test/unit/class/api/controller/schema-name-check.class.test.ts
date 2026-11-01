import "reflect-metadata";

import type { TestingModule } from "@nestjs/testing";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiRouteCustom } from "@decorator/api/route-custom.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";

import { Body, Controller, Get, HttpStatus, Module, Param, Post, Query, RequestMethod, Scope } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { Transport } from "@nestjs/microservices";
import { ApiExtraModels, ApiOkResponse, ApiProperty, ApiQuery } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../../../src/module/api";

const checkRuns: { count: number } = vi.hoisted(() => ({ count: 0 }));

vi.mock("@utility/api/controller/assert-schema-names.utility", async (importOriginal: () => Promise<typeof import("@utility/api/controller/assert-schema-names.utility")>) => {
	const original: typeof import("@utility/api/controller/assert-schema-names.utility") = await importOriginal();

	return {
		ApiControllerAssertSchemaNames: (...arguments_: Parameters<typeof original.ApiControllerAssertSchemaNames>): void => {
			checkRuns.count++;
			original.ApiControllerAssertSchemaNames(...arguments_);
		},
	};
});

@Entity("schema_boot_items")
class SchemaBootItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "name", exampleValue: "Name", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Entity("schema_boot_owners")
class SchemaBootOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@Entity("schema_boot_owned_items")
class SchemaBootOwnedItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => SchemaBootOwnerEntity)
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: SchemaBootOwnerEntity;
}

const DISABLED: { generation: { isEnabled: false } } = { generation: { isEnabled: false } };

const GET_ONLY_ROUTES = {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
} as const;

const NO_GENERATED_ROUTES = { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: DISABLED } as const;

/**
 * Starts a testing application with the library modules and the given controllers or modules, running the bootstrap hooks.
 * @param {{ controllers?: Array<new (...arguments_: Array<never>) => unknown>; imports?: Array<unknown> }} metadata - Controllers and modules of the application.
 * @returns {Promise<TestingModule>} The started application.
 */
async function start(metadata: { controllers?: Array<new (...arguments_: Array<never>) => unknown>; imports?: Array<unknown> }): Promise<TestingModule> {
	const application: TestingModule = await Test.createTestingModule({ controllers: metadata.controllers ?? [], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule, ...((metadata.imports ?? []) as Array<never>)] }).compile();

	return application.init();
}

/**
 * Declares a controller class named SchemaBootDupController on path "items", the way two modules or one re-evaluated module would.
 * @returns {new () => { service: never }} The decorated controller class.
 */
function createDuplicateController(): new () => { service: never } {
	@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "items", routes: GET_ONLY_ROUTES })
	class SchemaBootDupController {
		public service!: never;
	}

	return SchemaBootDupController;
}

describe("schema name check at bootstrap", () => {
	beforeEach(() => {
		checkRuns.count = 0;
	});

	describe("schema prefixes", () => {
		it("fails startup for two controller classes with one prefix under two router module paths, naming both modules", async () => {
			const AdminController: new () => { service: never } = createDuplicateController();
			const PublicController: new () => { service: never } = createDuplicateController();

			@Module({ controllers: [AdminController] })
			class SchemaBootAdminModule {}

			@Module({ controllers: [PublicController] })
			class SchemaBootPublicModule {}

			await expect(
				start({
					imports: [
						SchemaBootAdminModule,
						SchemaBootPublicModule,
						RouterModule.register([
							{ module: SchemaBootAdminModule, path: "admin" },
							{ module: SchemaBootPublicModule, path: "public" },
						]),
					],
				}),
			).rejects.toThrow('Controllers SchemaBootDupController in module SchemaBootAdminModule (path "items") and SchemaBootDupController in module SchemaBootPublicModule (path "items") have the same schema prefix "SchemaBootDup" in one application');
		});

		it("fails startup for two controller classes whose names give one prefix", async () => {
			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "same-prefix", routes: GET_ONLY_ROUTES })
			class SchemaBootSamePrefixController {
				public service!: never;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "same-prefix-other", routes: GET_ONLY_ROUTES })
			class SchemaBootSamePrefix {
				public service!: never;
			}

			await expect(start({ controllers: [SchemaBootSamePrefixController, SchemaBootSamePrefix] })).rejects.toThrow('have the same schema prefix "SchemaBootSamePrefix" in one application');
		});

		it("starts with the classes of a controller module evaluated again, since the old classes are not in the application", async () => {
			createDuplicateController();
			const ReevaluatedController: new () => { service: never } = createDuplicateController();
			const application: TestingModule = await start({ controllers: [ReevaluatedController] });

			await application.close();
		});

		it("starts two applications in one process whose controllers have one prefix", async () => {
			const first: TestingModule = await start({ controllers: [createDuplicateController()] });
			const second: TestingModule = await start({ controllers: [createDuplicateController()] });

			await first.close();
			await second.close();
		});

		it("fails startup for a duplicate prefix when the authorization guard is overridden and the authorization module is not imported", async () => {
			const testingModule: TestingModule = await Test.createTestingModule({ controllers: [createDuplicateController(), createDuplicateController()], imports: [ApiSubscriberModule] })
				.overrideGuard(ApiAuthorizationGuard)
				.useValue({ canActivate: (): boolean => true })
				.compile();

			await expect(testingModule.init()).rejects.toThrow('have the same schema prefix "SchemaBootDup" in one application');
		});

		it("fails startup for two REQUEST-scoped controller classes with one prefix", async () => {
			const first: new () => { service: never } = createDuplicateController();
			const second: new () => { service: never } = createDuplicateController();

			Controller({ path: "scoped-first", scope: Scope.REQUEST })(first);
			Controller({ path: "scoped-second", scope: Scope.REQUEST })(second);

			await expect(start({ controllers: [first, second] })).rejects.toThrow('have the same schema prefix "SchemaBootDup" in one application');
		});
	});

	describe("runs", () => {
		it("runs once for an application that registers the authorization module twice", async () => {
			const application: TestingModule = await Test.createTestingModule({ controllers: [createDuplicateController()], imports: [ApiAuthorizationModule.forRoot(), ApiAuthorizationModule, ApiSubscriberModule] }).compile();

			await application.init();
			await application.close();

			expect(checkRuns.count).toBe(1);
		});

		it("runs once for an application whose controllers are in two modules", async () => {
			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "runs-first", routes: GET_ONLY_ROUTES })
			class SchemaBootRunsFirstController {
				public service!: never;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "runs-second", routes: GET_ONLY_ROUTES })
			class SchemaBootRunsSecondController {
				public service!: never;
			}

			@Module({ controllers: [SchemaBootRunsFirstController] })
			class SchemaBootRunsFirstModule {}

			@Module({ controllers: [SchemaBootRunsSecondController] })
			class SchemaBootRunsSecondModule {}

			const application: TestingModule = await start({ imports: [SchemaBootRunsFirstModule, SchemaBootRunsSecondModule] });

			await application.close();

			expect(checkRuns.count).toBe(1);
		});

		it("runs once for a microservice", async () => {
			const testingModule: TestingModule = await Test.createTestingModule({ controllers: [createDuplicateController()], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule] }).compile();
			const microservice = testingModule.createNestMicroservice({ options: { port: 0 }, transport: Transport.TCP });

			await microservice.init();
			await microservice.close();

			expect(checkRuns.count).toBe(1);
		});
	});

	describe("component names", () => {
		it("fails startup for a hand-written custom route response named like a generated DTO, naming both origins", async () => {
			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "w1", routes: GET_ONLY_ROUTES })
			class SchemaBootW1Controller {
				public service!: never;
			}

			class SchemaBootW1GetResponseDTO {
				@ApiProperty({ type: String })
				public bogus!: string;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "w3", routes: NO_GENERATED_ROUTES })
			class SchemaBootW3Controller {
				public service!: never;

				@ApiRouteCustom<SchemaBootItemEntity>({
					resource: { action: "custom.mine", entity: SchemaBootItemEntity },
					response: { status: HttpStatus.OK, type: SchemaBootW1GetResponseDTO },
					route: { method: RequestMethod.GET, path: "mine", type: EApiRouteType.GET },
				})
				public mine(): void {}
			}

			await expect(start({ controllers: [SchemaBootW1Controller, SchemaBootW3Controller] })).rejects.toThrow('OpenAPI component name "SchemaBootW1GetResponseDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaBootW1", and the 200 response of route mine in controller SchemaBootW3Controller');
		});

		it("fails startup for a plain Nest controller response named like a generated DTO, naming both origins", async () => {
			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "p1", routes: GET_ONLY_ROUTES })
			class SchemaBootP1Controller {
				public service!: never;
			}

			class SchemaBootP1GetResponseDTO {
				@ApiProperty({ type: String })
				public bogus!: string;
			}

			@Controller("plain")
			class SchemaBootPlainController {
				@ApiOkResponse({ type: SchemaBootP1GetResponseDTO })
				@Get()
				public get(): void {}
			}

			await expect(start({ controllers: [SchemaBootP1Controller, SchemaBootPlainController] })).rejects.toThrow('OpenAPI component name "SchemaBootP1GetResponseDTO" belongs to two different classes: the get response DTO of controller prefix "SchemaBootP1", and the 200 response of route get in controller SchemaBootPlainController');
		});

		it.each([
			["body", Body],
			["query", Query],
			["parameters", Param],
		] as const)("fails startup for the %s type of a plain Nest route named like another class next to a library controller", async (argumentName: string, decorator: () => ParameterDecorator) => {
			const OtherRequest: new () => object = (() => {
				class SchemaBootPlainRequestDTO {
					@ApiProperty({ type: Number })
					public zip!: number;
				}

				return SchemaBootPlainRequestDTO;
			})();

			class SchemaBootPlainRequestDTO {
				@ApiProperty({ type: String })
				public street!: string;
			}

			@Controller("plain-request")
			class SchemaBootPlainRequestController {
				@Post()
				public create(_request: SchemaBootPlainRequestDTO): void {}

				@ApiOkResponse({ type: OtherRequest })
				@Get()
				public get(): void {}
			}

			decorator()(SchemaBootPlainRequestController.prototype, "create", 0);
			Reflect.defineMetadata("design:paramtypes", [SchemaBootPlainRequestDTO], SchemaBootPlainRequestController.prototype, "create");

			await expect(start({ controllers: [createDuplicateController(), SchemaBootPlainRequestController] })).rejects.toThrow(`OpenAPI component name "SchemaBootPlainRequestDTO" belongs to two different classes: the ${argumentName} of route create in controller SchemaBootPlainRequestController, and the 200 response of route get in controller SchemaBootPlainRequestController`);
		});

		it("fails startup for the type of a Swagger query parameter named like another class", async () => {
			const OtherFilter: new () => object = (() => {
				class SchemaBootPlainFilterDTO {
					@ApiProperty({ type: Number })
					public zip!: number;
				}

				return SchemaBootPlainFilterDTO;
			})();

			class SchemaBootPlainFilterDTO {
				@ApiProperty({ type: String })
				public street!: string;
			}

			@Controller("plain-filter")
			class SchemaBootPlainFilterController {
				@ApiOkResponse({ type: OtherFilter })
				@ApiQuery({ name: "filter", type: SchemaBootPlainFilterDTO })
				@Get()
				public list(): void {}
			}

			await expect(start({ controllers: [createDuplicateController(), SchemaBootPlainFilterController] })).rejects.toThrow('OpenAPI component name "SchemaBootPlainFilterDTO" belongs to two different classes: the 200 response of route list in controller SchemaBootPlainFilterController, and the query parameter filter of route list in controller SchemaBootPlainFilterController');
		});

		it("fails startup for a controller-level extra model named like another class", async () => {
			const OtherModel: new () => object = (() => {
				class SchemaBootPlainModelDTO {
					@ApiProperty({ type: Number })
					public zip!: number;
				}

				return SchemaBootPlainModelDTO;
			})();

			class SchemaBootPlainModelDTO {
				@ApiProperty({ type: String })
				public street!: string;
			}

			@ApiExtraModels(OtherModel)
			@Controller("plain-model")
			class SchemaBootPlainModelController {
				@ApiOkResponse({ type: SchemaBootPlainModelDTO })
				@Get()
				public get(): void {}
			}

			await expect(start({ controllers: [createDuplicateController(), SchemaBootPlainModelController] })).rejects.toThrow('OpenAPI component name "SchemaBootPlainModelDTO" belongs to two different classes: the 200 response of route get in controller SchemaBootPlainModelController, and an extra model of controller SchemaBootPlainModelController');
		});

		it("starts with two hand-written DTOs on two custom routes that copy one relation", async () => {
			class SchemaBootCopyOneDTO {
				@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: SchemaBootOwnedItemEntity, method: EApiRouteType.GET, propertyName: "owner" })
				public owner!: SchemaBootOwnerEntity;
			}

			class SchemaBootCopyTwoDTO {
				@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: SchemaBootOwnedItemEntity, method: EApiRouteType.GET, propertyName: "owner" })
				public owner!: SchemaBootOwnerEntity;
			}

			@ApiController<SchemaBootOwnedItemEntity>({ entity: SchemaBootOwnedItemEntity, path: "copy", routes: NO_GENERATED_ROUTES })
			class SchemaBootCopyController {
				public service!: never;

				@ApiRouteCustom<SchemaBootOwnedItemEntity>({
					resource: { action: "custom.one", entity: SchemaBootOwnedItemEntity },
					response: { status: HttpStatus.OK, type: SchemaBootCopyOneDTO },
					route: { method: RequestMethod.GET, path: "one", type: EApiRouteType.GET },
				})
				public one(): void {}

				@ApiRouteCustom<SchemaBootOwnedItemEntity>({
					resource: { action: "custom.two", entity: SchemaBootOwnedItemEntity },
					response: { status: HttpStatus.OK, type: SchemaBootCopyTwoDTO },
					route: { method: RequestMethod.GET, path: "two", type: EApiRouteType.GET },
				})
				public two(): void {}
			}

			const application: TestingModule = await start({ controllers: [SchemaBootCopyController] });

			await application.close();
		});

		it("starts with one hand-written DTO class on routes of two controllers", async () => {
			class SchemaBootSharedResponseDTO {
				@ApiProperty({ type: String })
				public id!: string;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "shared-1", routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: SchemaBootSharedResponseDTO } } } })
			class SchemaBootShared1Controller {
				public service!: never;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "shared-2", routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: SchemaBootSharedResponseDTO } } } })
			class SchemaBootShared2Controller {
				public service!: never;
			}

			const application: TestingModule = await start({ controllers: [SchemaBootShared1Controller, SchemaBootShared2Controller] });

			await application.close();
		});

		it.each([EApiDtoType.BODY, EApiDtoType.QUERY, EApiDtoType.PARAMETERS])("walks a hand-written %s DTO of a route and fails for a nested class named like another one", async (dtoType: EApiDtoType) => {
			class SchemaBootRequestAddressDTO {
				@ApiProperty({ type: String })
				public street!: string;
			}

			class SchemaBootRequestDTO {
				@ApiProperty({ type: SchemaBootRequestAddressDTO })
				public address!: SchemaBootRequestAddressDTO;
			}

			const OtherAddress: new () => object = (() => {
				class SchemaBootRequestAddressDTO {
					@ApiProperty({ type: Number })
					public zip!: number;
				}

				return SchemaBootRequestAddressDTO;
			})();

			class SchemaBootOtherResponseDTO {
				@ApiProperty({ type: OtherAddress })
				public address!: object;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: `request-${dtoType}`, routes: NO_GENERATED_ROUTES })
			class SchemaBootRequestController {
				public service!: never;

				@ApiRouteCustom<SchemaBootItemEntity>({
					dto: { [dtoType]: SchemaBootRequestDTO },
					resource: { action: "custom.submit", entity: SchemaBootItemEntity },
					response: { status: HttpStatus.OK, type: SchemaBootOtherResponseDTO },
					route: { method: RequestMethod.POST, path: "submit/:id", type: EApiRouteType.CREATE },
				})
				public submit(@Param() _parameters: Record<string, string>, @Query() _query: Record<string, string>): void {}
			}

			await expect(start({ controllers: [SchemaBootRequestController] })).rejects.toThrow('OpenAPI component name "SchemaBootRequestAddressDTO" belongs to two different classes');
		});
	});
});

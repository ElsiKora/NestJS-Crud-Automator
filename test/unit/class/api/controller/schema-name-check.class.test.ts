import "reflect-metadata";

import type { ExceptionFilter } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiRouteCustom } from "@decorator/api/route-custom.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api/controller/get-list/query";
import { EApiControllerRequestTarget } from "@enum/decorator/api/controller/request";
import { EFilterOrderDirection } from "@enum/filter";

import { Body, Catch, Controller, Get, HttpStatus, Injectable, Module, Param, Post, Query, RequestMethod, Scope, UseFilters } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { Transport } from "@nestjs/microservices";
import { ApiExtraModels, ApiOkResponse, ApiProperty, ApiQuery } from "@nestjs/swagger";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { Column, DataSource, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGeneratedServiceDouble } from "@test/unit/fixture";

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

@Entity("schema_boot_risky_targets")
class SchemaBootRiskyTargetEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

// Relations named like the fixed parts of generated DTO names, so a nested name would hit a wrapper or a request DTO name if one could.
@Entity("schema_boot_risky_rows")
class SchemaBootRiskyRowEntity {
	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "body", type: EApiPropertyDescribeType.RELATION })
	public body!: SchemaBootRiskyTargetEntity;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "cursor", type: EApiPropertyDescribeType.RELATION })
	public cursor!: SchemaBootRiskyTargetEntity;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@OneToMany(() => SchemaBootRiskyLineEntity, (line: SchemaBootRiskyLineEntity): SchemaBootRiskyRowEntity => line.row)
	@ApiPropertyDescribe({ description: "items", type: EApiPropertyDescribeType.RELATION })
	public items!: Array<SchemaBootRiskyLineEntity>;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "page", type: EApiPropertyDescribeType.RELATION })
	public page!: SchemaBootRiskyTargetEntity;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "parameters", type: EApiPropertyDescribeType.RELATION })
	public parameters!: SchemaBootRiskyTargetEntity;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "query", type: EApiPropertyDescribeType.RELATION })
	public query!: SchemaBootRiskyTargetEntity;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "response", type: EApiPropertyDescribeType.RELATION })
	public response!: SchemaBootRiskyTargetEntity;
}

@Entity("schema_boot_risky_lines")
class SchemaBootRiskyLineEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => SchemaBootRiskyRowEntity)
	@ApiPropertyDescribe({ description: "row", type: EApiPropertyDescribeType.RELATION })
	public row!: SchemaBootRiskyRowEntity;
}

class SchemaBootManualInnerDto {
	@ApiPropertyString({ description: "version", entity: SchemaBootManualInnerDto, exampleValue: "1", format: EApiPropertyStringType.STRING, maxLength: 16, minLength: 1, pattern: "/^.+$/" } as never)
	public version!: string;
}

class SchemaBootManualOtherDto {
	@ApiPropertyString({ description: "other", entity: SchemaBootManualOtherDto, exampleValue: "1", format: EApiPropertyStringType.STRING, maxLength: 16, minLength: 1, pattern: "/^.+$/" } as never)
	public other!: string;
}

class SchemaBootManualDocumentDto {
	@ApiPropertyObject({ description: "inner", entity: SchemaBootManualDocumentDto, type: SchemaBootManualInnerDto } as never)
	public inner!: SchemaBootManualInnerDto;
}

// A property named dto holds a manual object with a property of the same name as a sibling of dto.
@Entity("schema_boot_manual_dto_rows")
class SchemaBootManualDtoRowEntity {
	@Column({ nullable: true, type: "simple-json" })
	@ApiPropertyDescribe({ dataType: SchemaBootManualDocumentDto, description: "dto", isNullable: true, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT } as never)
	public dto?: unknown;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ nullable: true, type: "simple-json" })
	@ApiPropertyDescribe({ dataType: SchemaBootManualOtherDto, description: "inner", isNullable: true, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT } as never)
	public inner?: unknown;
}

// Relations whose names are only the DTO suffix, which stay legal names.
@Entity("schema_boot_dto_named_rows")
class SchemaBootDtoNamedRowEntity {
	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "dto", type: EApiPropertyDescribeType.RELATION })
	public dto!: SchemaBootRiskyTargetEntity;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "DTO", type: EApiPropertyDescribeType.RELATION })
	public DTO!: SchemaBootRiskyTargetEntity;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

// Two relations that normalize to one name segment.
@Entity("schema_boot_dto_clash_rows")
class SchemaBootDtoClashRowEntity {
	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "dto", type: EApiPropertyDescribeType.RELATION })
	public _dto!: SchemaBootRiskyTargetEntity;

	@ManyToOne(() => SchemaBootRiskyTargetEntity)
	@ApiPropertyDescribe({ description: "dto", type: EApiPropertyDescribeType.RELATION })
	public dto!: SchemaBootRiskyTargetEntity;

	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
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

const DATA_SOURCE: DataSource = new DataSource({ entities: [SchemaBootItemEntity, SchemaBootOwnerEntity, SchemaBootOwnedItemEntity, SchemaBootRiskyTargetEntity, SchemaBootRiskyRowEntity, SchemaBootRiskyLineEntity, SchemaBootManualDtoRowEntity, SchemaBootDtoNamedRowEntity, SchemaBootDtoClashRowEntity], type: "postgres" });

// Metadata is enough for the repository check at bootstrap; the test never connects.
await (DATA_SOURCE as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

/**
 * Creates a service whose repository passes the repository check at bootstrap.
 * @param {Function} entity - Entity of the controller.
 * @returns {never} The service.
 */
function createService(entity: Function): never {
	return createGeneratedServiceDouble(entity, DATA_SOURCE.getRepository(entity)) as never;
}

/**
 * Starts a testing application with the library modules and the given controllers or modules, running the bootstrap hooks.
 * @param {{ controllers?: Array<new (...arguments_: Array<never>) => unknown>; imports?: Array<unknown> }} metadata - Controllers and modules of the application.
 * @returns {Promise<TestingModule>} The started application.
 */
async function start(metadata: { controllers?: Array<new (...arguments_: Array<never>) => unknown>; imports?: Array<unknown>; providers?: Array<new (...arguments_: Array<never>) => unknown> }): Promise<TestingModule> {
	const application: TestingModule = await Test.createTestingModule({ controllers: metadata.controllers ?? [], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule, ...((metadata.imports ?? []) as Array<never>)], providers: metadata.providers ?? [] }).compile();

	return application.init();
}

/**
 * Declares a controller class named SchemaBootDupController on path "items", the way two modules or one re-evaluated module would.
 * @returns {new () => { service: never }} The decorated controller class.
 */
function createDuplicateController(): new () => { service: never } {
	@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "items", routes: GET_ONLY_ROUTES })
	class SchemaBootDupController {
		public service: never = createService(SchemaBootItemEntity);
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
				public service: never = createService(SchemaBootItemEntity);
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "same-prefix-other", routes: GET_ONLY_ROUTES })
			class SchemaBootSamePrefix {
				public service: never = createService(SchemaBootItemEntity);
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

	describe("custom routes of a class without a name", () => {
		/**
		 * Declares a class without a name with one custom route. TypeScript has no decorators on a class expression, so the decorators are called directly.
		 * @returns {new () => { mine: (parameters: Record<string, string>) => void }} The class.
		 */
		const createAnonymousClass = (): new () => { mine: (parameters: Record<string, string>) => void } => {
			const anonymous: new () => { mine: (parameters: Record<string, string>) => void } = (() =>
				class {
					public mine(_parameters: Record<string, string>): void {}
				})();
			const prototype: object = anonymous.prototype as object;

			Param()(prototype, "mine", 0);

			const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(prototype, "mine") as PropertyDescriptor;

			ApiRouteCustom<SchemaBootItemEntity>({
				autoDto: { [EApiDtoType.PARAMETERS]: {} },
				resource: { action: "custom.mine", entity: SchemaBootItemEntity },
				response: { status: HttpStatus.NO_CONTENT, type: undefined },
				route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
			})(prototype, "mine", descriptor);
			Object.defineProperty(prototype, "mine", descriptor);

			return anonymous;
		};

		it("fails startup when such a class is served with a plain @Controller", async () => {
			const anonymous: new () => unknown = createAnonymousClass();

			Controller("anonymous-plain")(anonymous);

			expect(anonymous.name).toBe("");
			await expect(start({ controllers: [anonymous] })).rejects.toThrow('Custom route "mine" with path "mine/:id" is declared on a class without a name and served without @ApiController');
		});

		it("fails startup when a named plain @Controller inherits the route", async () => {
			@Controller("anonymous-named-plain")
			class SchemaBootAnonymousPlainController extends createAnonymousClass() {}

			await expect(start({ controllers: [SchemaBootAnonymousPlainController] })).rejects.toThrow('Custom route "mine" with path "mine/:id" is declared on a class without a name and served without @ApiController');
		});

		it("starts when only a provider inherits the route, because nothing serves it", async () => {
			@Injectable()
			class SchemaBootAnonymousProvider extends createAnonymousClass() {}

			await expect(start({ providers: [SchemaBootAnonymousProvider] })).resolves.toBeDefined();
		});

		it("starts when a provider and a decorated controller inherit one class, because the controller serves its own copy", async () => {
			const anonymous: new () => { mine: (parameters: Record<string, string>) => void } = createAnonymousClass();

			@Injectable()
			class SchemaBootAnonymousSharedProvider extends anonymous {}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "anonymous-shared", routes: NO_GENERATED_ROUTES })
			class SchemaBootAnonymousSharedController extends anonymous {
				public service: never = createService(SchemaBootItemEntity);
			}

			await expect(start({ controllers: [SchemaBootAnonymousSharedController], providers: [SchemaBootAnonymousSharedProvider] })).resolves.toBeDefined();
		});

		it("fails startup when a plain @Controller serves the route next to a provider that inherits it", async () => {
			const anonymous: new () => { mine: (parameters: Record<string, string>) => void } = createAnonymousClass();

			@Injectable()
			class SchemaBootAnonymousPlainProvider extends anonymous {}

			@Controller("anonymous-plain-provider")
			class SchemaBootAnonymousProviderPlainController extends anonymous {}

			await expect(start({ controllers: [SchemaBootAnonymousProviderPlainController], providers: [SchemaBootAnonymousPlainProvider] })).rejects.toThrow('Custom route "mine" with path "mine/:id" is declared on a class without a name and served without @ApiController');
		});

		it("fails startup when a plain @Controller in an imported module serves the route", async () => {
			@Controller("anonymous-imported")
			class SchemaBootAnonymousImportedController extends createAnonymousClass() {}

			@Module({ controllers: [SchemaBootAnonymousImportedController] })
			class SchemaBootAnonymousImportedModule {}

			await expect(start({ imports: [SchemaBootAnonymousImportedModule] })).rejects.toThrow('Custom route "mine" with path "mine/:id" is declared on a class without a name and served without @ApiController');
		});

		it("starts when a plain @Controller replaces the route with a method of its own", async () => {
			@Controller("anonymous-replaced")
			class SchemaBootAnonymousReplacedController extends (createAnonymousClass() as new () => object) {
				@Get("mine/:id")
				public mine(@Param() _parameters: Record<string, string>): void {}
			}

			await expect(start({ controllers: [SchemaBootAnonymousReplacedController] })).resolves.toBeDefined();
		});

		it("starts when a plain @Controller replaces the route with a method of its own next to a provider that inherits the route", async () => {
			const anonymous: new () => object = createAnonymousClass();

			@Injectable()
			class SchemaBootAnonymousReplacedPlainProvider extends anonymous {}

			@Controller("anonymous-replaced-plain")
			class SchemaBootAnonymousReplacedPlainController extends anonymous {
				@Get("mine/:id")
				public mine(@Param() _parameters: Record<string, string>): void {}
			}

			await expect(start({ controllers: [SchemaBootAnonymousReplacedPlainController], providers: [SchemaBootAnonymousReplacedPlainProvider] })).resolves.toBeDefined();
		});

		it("starts when a plain @Controller replaces the route with a filtered method of its own next to a provider that inherits the route", async () => {
			const anonymous: new () => object = createAnonymousClass();

			@Catch()
			class SchemaBootAnonymousOwnFilter implements ExceptionFilter {
				public catch(): void {}
			}

			@Injectable()
			class SchemaBootAnonymousReplacedProvider extends anonymous {}

			@Controller("anonymous-replaced-filtered")
			class SchemaBootAnonymousReplacedFilteredController extends anonymous {
				@Get("mine/:id")
				@UseFilters(SchemaBootAnonymousOwnFilter)
				public mine(@Param() _parameters: Record<string, string>): void {}
			}

			await expect(start({ controllers: [SchemaBootAnonymousReplacedFilteredController], providers: [SchemaBootAnonymousReplacedProvider] })).resolves.toBeDefined();
		});

		it("fails decoration naming the controller when an inherited handler leaves nothing for generated DTO names", () => {
			const anonymous: new () => object = (() =>
				class {
					public _(_parameters: Record<string, string>): void {}
				})();
			const prototype: object = anonymous.prototype as object;

			Param()(prototype, "_", 0);

			const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(prototype, "_") as PropertyDescriptor;

			ApiRouteCustom<SchemaBootItemEntity>({
				autoDto: { [EApiDtoType.PARAMETERS]: {} },
				resource: { action: "custom.mine", entity: SchemaBootItemEntity },
				response: { status: HttpStatus.NO_CONTENT, type: undefined },
				route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
			})(prototype, "_", descriptor);
			Object.defineProperty(prototype, "_", descriptor);

			expect(() => {
				@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "anonymous-empty-handler", routes: NO_GENERATED_ROUTES })
				class SchemaBootAnonymousEmptyHandlerController extends anonymous {
					public service: never = createService(SchemaBootItemEntity);
				}

				return SchemaBootAnonymousEmptyHandlerController;
			}).toThrow('Handler "_" of SchemaBootAnonymousEmptyHandlerController leaves nothing');
		});

		it("drops the check when a decorated controller inherits the route, also when it extends a plain class in between", async () => {
			class SchemaBootAnonymousMiddle extends createAnonymousClass() {}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "anonymous-decorated", routes: NO_GENERATED_ROUTES })
			class SchemaBootAnonymousDecoratedController extends SchemaBootAnonymousMiddle {
				public service: never = createService(SchemaBootItemEntity);
			}

			await expect(start({ controllers: [SchemaBootAnonymousDecoratedController] })).resolves.toBeDefined();
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
				public service: never = createService(SchemaBootItemEntity);
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "runs-second", routes: GET_ONLY_ROUTES })
			class SchemaBootRunsSecondController {
				public service: never = createService(SchemaBootItemEntity);
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
				public service: never = createService(SchemaBootItemEntity);
			}

			class SchemaBootW1GetResponseDTO {
				@ApiProperty({ type: String })
				public bogus!: string;
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "w3", routes: NO_GENERATED_ROUTES })
			class SchemaBootW3Controller {
				public service: never = createService(SchemaBootItemEntity);

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
				public service: never = createService(SchemaBootItemEntity);
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
				public service: never = createService(SchemaBootOwnedItemEntity);

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
				public service: never = createService(SchemaBootItemEntity);
			}

			@ApiController<SchemaBootItemEntity>({ entity: SchemaBootItemEntity, path: "shared-2", routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: SchemaBootSharedResponseDTO } } } })
			class SchemaBootShared2Controller {
				public service: never = createService(SchemaBootItemEntity);
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
				public service: never = createService(SchemaBootItemEntity);

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

	describe("relations whose names are only the DTO suffix", () => {
		it("starts with relations named dto and DTO, each under its own component name", async () => {
			@ApiController<SchemaBootDtoNamedRowEntity>({ entity: SchemaBootDtoNamedRowEntity, path: "dto-named-rows", routes: GET_ONLY_ROUTES })
			class SchemaBootDtoNamedController {
				public service: never = createService(SchemaBootDtoNamedRowEntity);
			}

			const application = (await Test.createTestingModule({ controllers: [SchemaBootDtoNamedController], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule] }).compile()).createNestApplication(new FastifyAdapter());

			await application.init();

			const schemaNames: Array<string> = Object.keys(SwaggerModule.createDocument(application, new DocumentBuilder().build()).components?.schemas ?? {});

			await application.close();

			expect(schemaNames).toEqual(expect.arrayContaining(["SchemaBootDtoNamedGetResponseDtoDTO", "SchemaBootDtoNamedGetResponseDTODTO"]));
		});

		it("keeps the Dto segment in the path of a manual object under a property named dto", async () => {
			@ApiController<SchemaBootManualDtoRowEntity>({ entity: SchemaBootManualDtoRowEntity, path: "manual-dto-rows", routes: GET_ONLY_ROUTES })
			class SchemaBootManualDtoController {
				public service: never = createService(SchemaBootManualDtoRowEntity);
			}

			const application = (await Test.createTestingModule({ controllers: [SchemaBootManualDtoController], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule] }).compile()).createNestApplication(new FastifyAdapter());

			await application.init();

			const schemaNames: Array<string> = Object.keys(SwaggerModule.createDocument(application, new DocumentBuilder().build()).components?.schemas ?? {});

			await application.close();

			expect(schemaNames).toEqual(expect.arrayContaining(["SchemaBootManualDtoGetResponseDtoDTO", "SchemaBootManualDtoGetResponseDtoInnerDTO", "SchemaBootManualDtoGetResponseInnerDTO"]));
		});

		it("fails startup naming the component when a sibling normalizes to the same segment as dto", async () => {
			@ApiController<SchemaBootDtoClashRowEntity>({ entity: SchemaBootDtoClashRowEntity, path: "dto-clash-rows", routes: GET_ONLY_ROUTES })
			class SchemaBootDtoClashController {
				public service: never = createService(SchemaBootDtoClashRowEntity);
			}

			await expect(start({ controllers: [SchemaBootDtoClashController] })).rejects.toThrow('OpenAPI component name "SchemaBootDtoClashGetResponseDtoDTO" belongs to two different classes');
		});
	});

	describe("relations named like fixed name parts", () => {
		it("starts GET, page GET_LIST, cursor GET_LIST, CREATE and UPDATE routes with one component name per class", async () => {
			@ApiController<SchemaBootRiskyRowEntity>({ entity: SchemaBootRiskyRowEntity, path: "risky-page-rows", routes: { [EApiRouteType.DELETE]: DISABLED } })
			class SchemaBootRiskyPageController {
				public service: never = createService(SchemaBootRiskyRowEntity);
			}

			@ApiController<SchemaBootRiskyRowEntity>({
				entity: SchemaBootRiskyRowEntity,
				path: "risky-cursor-rows",
				routes: {
					...NO_GENERATED_ROUTES,
					[EApiRouteType.GET_LIST]: {
						request: {
							[EApiControllerRequestTarget.QUERY]: {
								order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
								pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
							},
						},
					},
				},
			} as never)
			class SchemaBootRiskyCursorController {
				public service: never = createService(SchemaBootRiskyRowEntity);
			}

			const application = (await Test.createTestingModule({ controllers: [SchemaBootRiskyPageController, SchemaBootRiskyCursorController], imports: [ApiAuthorizationModule.forRoot(), ApiSubscriberModule] }).compile()).createNestApplication(new FastifyAdapter());

			await application.init();

			const schemaNames: Array<string> = Object.keys(SwaggerModule.createDocument(application, new DocumentBuilder().build()).components?.schemas ?? {});

			await application.close();

			expect(checkRuns.count).toBe(1);
			expect(schemaNames).toEqual(
				expect.arrayContaining([
					"SchemaBootRiskyPageGetListPageDTO",
					"SchemaBootRiskyPageGetListResponseItemsDTO",
					"SchemaBootRiskyPageGetListResponsePageDTO",
					"SchemaBootRiskyCursorGetListCursorPageDTO",
					"SchemaBootRiskyCursorGetListResponseCursorDTO",
					"SchemaBootRiskyCursorGetListResponseItemsDTO",
					"SchemaBootRiskyPageGetResponseBodyDTO",
					"SchemaBootRiskyPageGetResponseParametersDTO",
					"SchemaBootRiskyPageGetResponseQueryDTO",
					"SchemaBootRiskyPageGetResponseResponseDTO",
					"SchemaBootRiskyPageCreateResponseItemsDTO",
					"SchemaBootRiskyPageUpdateResponsePageDTO",
				]),
			);
		});
	});
});

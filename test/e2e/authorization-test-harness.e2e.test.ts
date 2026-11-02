import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";

import type { IApiAuthorizationDecision } from "../../src/index";

import { Get, HttpStatus, Inject, Injectable, RequestMethod } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { ApiAuthorizationBootstrapValidationService, ApiAuthorizationModule, ApiAuthorizationRuntime, ApiController, ApiControllerSecurable, ApiMethod, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

@Entity("authorization_test_harness_items")
class HarnessItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "harnessItemId", exampleValue: "row-1", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "harnessItemName", exampleValue: "Name", format: EApiPropertyStringType.STRING, maxLength: 100, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;
}

@Injectable()
@ApiService({ entity: HarnessItemEntity })
class HarnessItemService extends ApiServiceBase<HarnessItemEntity> {
	@InjectRepository(HarnessItemEntity)
	public readonly repository!: Repository<HarnessItemEntity>;
}

const DISABLED = { generation: { isEnabled: false } } as const;

@ApiControllerSecurable()
@ApiController<HarnessItemEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: HarnessItemEntity,
	path: "harness-items",
	routes: {
		[EApiRouteType.CREATE]: DISABLED,
		[EApiRouteType.DELETE]: DISABLED,
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
		[EApiRouteType.UPDATE]: DISABLED,
	},
})
class HarnessItemController {
	@Inject(HarnessItemService)
	public readonly service!: HarnessItemService;

	@ApiRouteCustom<HarnessItemEntity>({ resource: { action: "custom.summary", entity: HarnessItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path: "summary" } } as never)
	public summary(): { isReached: boolean } {
		return { isReached: true };
	}

	@ApiMethod<HarnessItemEntity>({ metadata: { resource: { action: "custom.publish", entity: HarnessItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path: "publish" } } } as never)
	public publish(): { isReached: boolean } {
		return { isReached: true };
	}

	@Get("report")
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

const DATABASE = TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [HarnessItemEntity], logging: false, synchronize: true, type: "better-sqlite3" });

/**
 * Builds the decision the documented test harness returns from `ApiAuthorizationRuntime.evaluate`.
 * @param {EApiPolicyEffect} effect - Effect of the decision.
 * @returns {IApiAuthorizationDecision<HarnessItemEntity>} A complete decision.
 */
function harnessDecision(effect: EApiPolicyEffect): IApiAuthorizationDecision<HarnessItemEntity> {
	return {
		action: "test",
		appliedRules: [],
		effect,
		mode: EApiAuthorizationMode.HOOKS,
		permissions: [],
		policyId: "test",
		policyIds: [],
		principal: { attributes: {}, id: "test", roles: [], type: EApiAuthorizationPrincipalType.USER },
		resourceType: "HarnessItemEntity",
		trace: { decisionType: effect === EApiPolicyEffect.ALLOW ? EApiAuthorizationDecisionType.EXPLICIT_ALLOW : EApiAuthorizationDecisionType.EXPLICIT_DENY, mode: EApiAuthorizationMode.HOOKS },
		transforms: [],
	};
}

const MODULE_MESSAGE: string = `Controller "HarnessItemController" is marked with @ApiControllerSecurable() but the application does not import ApiAuthorizationModule`;

describe("the documented authorization test harness", () => {
	const applications: Array<INestApplication> = [];

	afterEach(async () => {
		for (const application of applications.splice(0)) {
			await application.close();
		}
	});

	/**
	 * Boots the controller the way the migration guide documents it: the module imported, the validation service and the runtime replaced.
	 * @param {EApiPolicyEffect} effect - Effect the replaced runtime answers with.
	 * @returns {Promise<INestApplication>} The listening application, with one row stored.
	 */
	async function bootRecipe(effect: EApiPolicyEffect): Promise<INestApplication> {
		const moduleReference: TestingModule = await Test.createTestingModule({
			controllers: [HarnessItemController],
			imports: [DATABASE, TypeOrmModule.forFeature([HarnessItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [HarnessItemService],
		})
			.overrideProvider(ApiAuthorizationBootstrapValidationService)
			.useValue({})
			.overrideProvider(ApiAuthorizationRuntime)
			.useValue({ evaluate: async (): Promise<IApiAuthorizationDecision<HarnessItemEntity>> => harnessDecision(effect) })
			.compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);
		await application.init();
		await application.listen(0, "127.0.0.1");
		await application.get<Repository<HarnessItemEntity>>(getRepositoryToken(HarnessItemEntity)).save({ id: "row-1", name: "First" });

		return application;
	}

	/**
	 * Sends one request over the socket of a listening application.
	 * @param {INestApplication} application - Listening application.
	 * @param {string} method - HTTP method.
	 * @param {string} path - Request path.
	 * @returns {Promise<Response>} The response.
	 */
	async function request(application: INestApplication, method: string, path: string): Promise<Response> {
		return await fetch(`${await application.getUrl()}${path}`, { method });
	}

	it("starts, and the module check passes with the module imported", async () => {
		await expect(bootRecipe(EApiPolicyEffect.ALLOW)).resolves.toBeDefined();
	});

	it("answers 200 on every declared route with an allow decision", async () => {
		const application: INestApplication = await bootRecipe(EApiPolicyEffect.ALLOW);
		const getResponse: Response = await request(application, "GET", "/harness-items/row-1");
		const listResponse: Response = await request(application, "GET", "/harness-items?limit=10&page=1");

		expect(getResponse.status).toBe(HttpStatus.OK);
		await expect(getResponse.json()).resolves.toMatchObject({ id: "row-1", name: "First" });
		expect(listResponse.status).toBe(HttpStatus.OK);
		await expect(listResponse.json()).resolves.toMatchObject({ items: [{ id: "row-1", name: "First" }] });
		expect((await request(application, "POST", "/harness-items/publish")).status).toBe(HttpStatus.OK);
		expect((await request(application, "POST", "/harness-items/summary")).status).toBe(HttpStatus.OK);
	});

	it("answers 403 on every declared route with a deny decision", async () => {
		const application: INestApplication = await bootRecipe(EApiPolicyEffect.DENY);

		expect((await request(application, "GET", "/harness-items/row-1")).status).toBe(HttpStatus.FORBIDDEN);
		expect((await request(application, "GET", "/harness-items?limit=10&page=1")).status).toBe(HttpStatus.FORBIDDEN);
		expect((await request(application, "POST", "/harness-items/publish")).status).toBe(HttpStatus.FORBIDDEN);
		expect((await request(application, "POST", "/harness-items/summary")).status).toBe(HttpStatus.FORBIDDEN);
	});

	it("answers 403 on a plain route of the securable controller, also with an allow decision", async () => {
		const application: INestApplication = await bootRecipe(EApiPolicyEffect.ALLOW);

		expect((await request(application, "GET", "/harness-items/report")).status).toBe(HttpStatus.FORBIDDEN);
	});

	it("fails startup with the module message when the runtime is stubbed without ApiAuthorizationModule", async () => {
		const moduleReference: TestingModule = await Test.createTestingModule({
			controllers: [HarnessItemController],
			imports: [DATABASE, TypeOrmModule.forFeature([HarnessItemEntity]), ApiSubscriberModule],
			providers: [HarnessItemService, { provide: ApiAuthorizationRuntime, useValue: { evaluate: async (): Promise<IApiAuthorizationDecision<HarnessItemEntity>> => harnessDecision(EApiPolicyEffect.ALLOW) } }],
		}).compile();
		const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

		applications.push(application);

		await expect(application.init()).rejects.toThrow(MODULE_MESSAGE);
	});

	it("fails on compile when the module import is left out of the recipe", async () => {
		await expect(
			Test.createTestingModule({
				controllers: [HarnessItemController],
				imports: [DATABASE, TypeOrmModule.forFeature([HarnessItemEntity]), ApiSubscriberModule],
				providers: [HarnessItemService],
			})
				.overrideProvider(ApiAuthorizationBootstrapValidationService)
				.useValue({})
				.overrideProvider(ApiAuthorizationRuntime)
				.useValue({ evaluate: async (): Promise<IApiAuthorizationDecision<HarnessItemEntity>> => harnessDecision(EApiPolicyEffect.ALLOW) })
				.compile(),
		).rejects.toThrow("ApiAuthorizationGuard");
	});
});

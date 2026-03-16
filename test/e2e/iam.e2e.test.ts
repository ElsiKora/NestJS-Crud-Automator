import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type {
	IApiAuthorizationPrincipal,
	IApiControllerAuthorizationProperties,
	IApiPolicyAttachmentSource,
	IApiPolicyDocumentRecord,
	IApiPolicyDocumentSource,
} from "../../dist/esm/index";

import { Controller, Get, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationIamEngine,
	ApiAuthorizationIamQueryPlanner,
	ApiAuthorizationModule,
	ApiAuthorizationSimulator,
	ApiControllerSecurable,
	CONTROLLER_API_DECORATOR_CONSTANT,
	EApiAuthorizationDecisionType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiRouteType,
	METHOD_API_DECORATOR_CONSTANT,
} from "../../dist/esm/index";

@Entity("iam_entities")
class IamEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public operatorId!: string;

	@Column({ type: "varchar" })
	public status!: string;
}

const iamAuthorization: IApiControllerAuthorizationProperties<IamEntity> = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "admin:item",
	resourceDefinition: {
		entity: IamEntity,
		fields: [
			{
				isFilterable: true,
				path: "resource.operatorId",
				queryPath: "operatorId",
			},
			{
				isFilterable: true,
				path: "resource.status",
				queryPath: "status",
			},
		],
		namespace: "admin:item",
		resourcePath: "gameport:admin:item/{id}",
		resourceType: "gameport:admin:item",
	},
};

const basePrincipal: IApiAuthorizationPrincipal = {
	attributes: {
		operatorId: "operator-1",
	},
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

@ApiControllerSecurable()
@Controller("iam-validation")
class IamValidationController {
	@Get()
	public get(): { ok: boolean } {
		return { ok: true };
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.AUTHORIZATION_METADATA_KEY, { action: "get" }, IamValidationController.prototype.get);

Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, IamEntity, IamValidationController);
Reflect.defineMetadata(
	CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
	{
		authorization: iamAuthorization,
		entity: IamEntity,
		routes: {
			create: { isEnabled: false },
			delete: { isEnabled: false },
			get: { isEnabled: false },
			getList: {},
			partialUpdate: { isEnabled: false },
			update: { isEnabled: false },
		},
	},
	IamValidationController,
);

@Module({
	controllers: [IamValidationController],
})
class IamValidationModule {}

describe("IAM authorization (E2E)", () => {
	let app: INestApplication | undefined;

	afterEach(async () => {
		if (app) {
			await app.close();
			app = undefined;
		}
	});

	it("evaluates managed-code IAM policies with planned scope and trace", async () => {
		const attachmentSource: IApiPolicyAttachmentSource = {
			async getAttachments() {
				return {
					attachments: [
						{
							policyId: "allow-managed",
							principalId: "user-1",
							principalType: EApiAuthorizationPrincipalType.USER,
						},
					],
					boundaries: [],
				};
			},
		};
		const managedDocumentSource: IApiPolicyDocumentSource = {
			async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
				return ids.includes("allow-managed")
					? [
							{
								document: {
									Statement: [
										{
											Action: ["admin:item:list"],
											Condition: {
												StringEquals: {
													"resource.operatorId": "${principal.attributes.operatorId}",
												},
											},
											Effect: EApiPolicyEffect.ALLOW,
											Resource: ["gameport:admin:item/*"],
											Sid: "AllowOperatorItems",
										},
									],
									Version: "2026-03-14",
								},
								id: "allow-managed",
								namespace: "admin:item",
								sourceType: EApiPolicySourceType.MANAGED,
								version: "1",
							},
					  ]
					: [];
			},
		};

		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [managedDocumentSource],
					},
				}),
			],
		}).compile();
		const simulator = moduleRef.get(ApiAuthorizationSimulator);
		const decision = await simulator.evaluate({
			action: EApiRouteType.GET_LIST,
			authorization: iamAuthorization,
			entity: IamEntity,
			principal: basePrincipal,
			requestMetadata: {
				query: {
					limit: 10,
					page: 1,
				},
			},
		});

		expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(decision.scope?.where).toEqual({
			operatorId: "operator-1",
		});
		expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
		expect(decision.trace.attachments).toHaveLength(1);
		expect(decision.trace.documents?.map((document) => document.id)).toEqual(["allow-managed"]);
		expect(decision.trace.statements?.[0]).toMatchObject({
			isMatched: true,
			policyId: "allow-managed",
			sid: "AllowOperatorItems",
			sourceType: EApiPolicySourceType.MANAGED,
		});

		await moduleRef.close();
	});

	it("passes custom authorization actions through to IAM without operation metadata", async () => {
		const attachmentSource: IApiPolicyAttachmentSource = {
			async getAttachments() {
				return {
					attachments: [
						{
							policyId: "allow-custom-action",
							principalId: "user-1",
							principalType: EApiAuthorizationPrincipalType.USER,
						},
					],
					boundaries: [],
				};
			},
		};
		const managedDocumentSource: IApiPolicyDocumentSource = {
			async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
				return ids.includes("allow-custom-action")
					? [
							{
								document: {
									Statement: [
										{
											Action: ["admin:item:update.promote"],
											Effect: EApiPolicyEffect.ALLOW,
											Resource: ["gameport:admin:item/*"],
											Sid: "AllowPromote",
										},
									],
									Version: "2026-03-14",
								},
								id: "allow-custom-action",
								namespace: "admin:item",
								sourceType: EApiPolicySourceType.MANAGED,
								version: "1",
							},
					  ]
					: [];
			},
		};

		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [managedDocumentSource],
					},
				}),
			],
		}).compile();
		const simulator = moduleRef.get(ApiAuthorizationSimulator);
		const decision = await simulator.evaluate({
			action: "update.promote",
			authorization: iamAuthorization,
			entity: IamEntity,
			principal: basePrincipal,
			requestMetadata: {},
		});

		expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(decision.action).toBe("admin:item:update.promote");
		expect(decision.trace.statements?.[0]).toMatchObject({
			isMatched: true,
			policyId: "allow-custom-action",
			sid: "AllowPromote",
		});

		await moduleRef.close();
	});

	it("supports hybrid document sourcing and boundary intersection", async () => {
		const attachmentSource: IApiPolicyAttachmentSource = {
			async getAttachments() {
				return {
					attachments: [
						{
							policyId: "allow-managed",
							principalId: "user-1",
							principalType: EApiAuthorizationPrincipalType.USER,
						},
					],
					boundaries: [
						{
							policyId: "boundary-db",
							principalId: "user-1",
							principalType: EApiAuthorizationPrincipalType.USER,
						},
					],
				};
			},
		};
		const managedDocumentSource: IApiPolicyDocumentSource = {
			async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
				return ids.includes("allow-managed")
					? [
							{
								document: {
									Statement: [
										{
											Action: ["admin:item:list"],
											Condition: {
												StringEquals: {
													"resource.operatorId": "${principal.attributes.operatorId}",
												},
											},
											Effect: EApiPolicyEffect.ALLOW,
											Resource: ["gameport:admin:item/*"],
										},
									],
									Version: "2026-03-14",
								},
								id: "allow-managed",
								namespace: "admin:item",
								sourceType: EApiPolicySourceType.MANAGED,
								version: "1",
							},
					  ]
					: [];
			},
		};
		const databaseDocumentSource: IApiPolicyDocumentSource = {
			async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
				return ids.includes("boundary-db")
					? [
							{
								document: {
									Statement: [
										{
											Action: ["admin:item:list"],
											Condition: {
												StringEquals: {
													"resource.status": "active",
												},
											},
											Effect: EApiPolicyEffect.ALLOW,
											Resource: ["gameport:admin:item/*"],
										},
									],
									Version: "2026-03-14",
								},
								id: "boundary-db",
								namespace: "admin:item",
								sourceType: EApiPolicySourceType.DATABASE,
								version: "7",
							},
					  ]
					: [];
			},
		};

		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [managedDocumentSource, databaseDocumentSource],
					},
				}),
			],
		}).compile();
		const simulator = moduleRef.get(ApiAuthorizationSimulator);
		const decision = await simulator.evaluate({
			action: EApiRouteType.GET_LIST,
			authorization: iamAuthorization,
			entity: IamEntity,
			principal: basePrincipal,
			requestMetadata: {
				query: {
					limit: 10,
					page: 1,
				},
			},
		});

		expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(decision.scope?.where).toEqual({
			operatorId: "operator-1",
			status: "active",
		});
		expect(decision.trace.boundaries).toHaveLength(1);
		expect(decision.trace.documents?.map((document) => document.id)).toEqual(["allow-managed", "boundary-db"]);

		await moduleRef.close();
	});

	it("supports database-only sourcing and explicit deny precedence", async () => {
		const attachmentSource: IApiPolicyAttachmentSource = {
			async getAttachments() {
				return {
					attachments: [
						{
							policyId: "allow-db",
							principalId: "user-1",
							principalType: EApiAuthorizationPrincipalType.USER,
						},
						{
							policyId: "deny-db",
							principalId: "user-1",
							principalType: EApiAuthorizationPrincipalType.USER,
						},
					],
					boundaries: [],
				};
			},
		};
		const databaseDocumentSource: IApiPolicyDocumentSource = {
			async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
				return ids
					.filter((id) => id === "allow-db" || id === "deny-db")
					.map((id) => ({
						document: {
							Statement: [
								{
									Action: ["admin:item:list"],
									Effect: id === "deny-db" ? EApiPolicyEffect.DENY : EApiPolicyEffect.ALLOW,
									Resource: ["gameport:admin:item/*"],
								},
							],
							Version: "2026-03-14",
						},
						id,
						namespace: "admin:item",
						sourceType: EApiPolicySourceType.DATABASE,
						version: id === "deny-db" ? "9" : "4",
					}));
			},
		};

		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [databaseDocumentSource],
					},
				}),
			],
		}).compile();
		const simulator = moduleRef.get(ApiAuthorizationSimulator);
		const decision = await simulator.evaluate({
			action: EApiRouteType.GET_LIST,
			authorization: iamAuthorization,
			entity: IamEntity,
			principal: basePrincipal,
			requestMetadata: {
				query: {
					limit: 10,
					page: 1,
				},
			},
		});

		expect(decision.effect).toBe(EApiPolicyEffect.DENY);
		expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		expect(decision.trace.documents?.map((document) => document.id)).toEqual(["allow-db", "deny-db"]);

		await moduleRef.close();
	});

	it("plans resource.id and nested query paths for IAM read scopes", () => {
		const planner = new ApiAuthorizationIamQueryPlanner();
		const plan = planner.plan({
			principal: basePrincipal,
			requestMetadata: {
				parameters: {
					id: "entity-1",
				},
			},
			resourceDefinition: {
				entity: IamEntity,
				fields: [
					{
						isFilterable: true,
						path: "resource.id",
						queryPath: "id",
					},
					{
						isFilterable: true,
						path: "resource.operatorId",
						queryPath: "operator.id",
					},
				],
				namespace: "admin:item",
				resourcePath: "gameport:admin:item/{id}",
				resourceType: "gameport:admin:item",
			},
			statements: [
				{
					Action: ["admin:item:read"],
					Condition: {
						StringEquals: {
							"resource.id": "${request.parameters.id}",
							"resource.operatorId": "${principal.attributes.operatorId}",
						},
					},
					Effect: EApiPolicyEffect.ALLOW,
					Resource: ["gameport:admin:item/*"],
				},
			],
		});

		expect(plan).toEqual({
			isFullyCompilable: true,
			scope: {
				where: {
					id: "entity-1",
					operator: {
						id: "operator-1",
					},
				},
			},
		});
	});

	it("evaluates principal and request metadata IAM paths for create actions", async () => {
		const engine = new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner());
		const resourceDefinition = iamAuthorization.resourceDefinition;

		expect(resourceDefinition).toBeDefined();

		if (!resourceDefinition) {
			return;
		}

		const decision = await engine.evaluate({
			action: "admin:item:create",
			attachments: {
				attachments: [
					{
						policyId: "allow-create",
						principalId: "user-1",
						principalType: EApiAuthorizationPrincipalType.USER,
					},
				],
				boundaries: [],
			},
			documents: [
				{
					document: {
						Statement: [
							{
								Action: ["admin:item:create"],
								Condition: {
									StringEquals: {
										"principal.attributes.operatorId": "operator-1",
										"request.body.operatorId": "operator-1",
										"request.headers.x-role": "admin",
										"request.ip": "127.0.0.1",
										"request.parameters.id": "entity-1",
										"request.query.page": "1",
									},
								},
								Effect: EApiPolicyEffect.ALLOW,
								Resource: ["gameport:admin:item/*"],
							},
						],
						Version: "2026-03-14",
					},
					id: "allow-create",
					namespace: "admin:item",
					sourceType: EApiPolicySourceType.DATABASE,
					version: "1",
				},
			],
			policyNamespace: "admin:item",
			principal: basePrincipal,
			requestMetadata: {
				body: {
					operatorId: "operator-1",
				},
				headers: {
					"x-role": "admin",
				},
				ip: "127.0.0.1",
				parameters: {
					id: "entity-1",
				},
				query: {
					limit: 10,
					page: 1,
				},
			},
			resourceDefinition,
		});

		expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
	});

	it("fails bootstrap when an IAM controller has no document sources", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [
							{
								async getAttachments() {
									return {
										attachments: [],
										boundaries: [],
									};
								},
							},
						],
					},
				}),
				IamValidationModule,
			],
		}).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());

		await expect(app.init()).rejects.toThrow("no documentSources are registered");
	});
});

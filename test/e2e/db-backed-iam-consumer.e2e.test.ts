import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "../../dist/esm/index";
import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Column, Entity, In, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";

import {
	ApiAuthorizationModule,
	ApiAuthorizationSimulator,
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiPropertyDescribe,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	AuthorizationResolveDefaultPrincipal,
	AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN,
	AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN,
	AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiControllerLoadRelationsStrategy,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../dist/esm/index";

function describeRelationProperty(entity: new () => unknown, description: string): PropertyDecorator {
	return ApiPropertyDescribe({
		description,
		relationMetadata: {
			entity,
			isEager: false,
			relationType: "many-to-one",
		},
		type: EApiPropertyDescribeType.RELATION,
	} as unknown as {
		description: string;
		type: EApiPropertyDescribeType.RELATION;
	});
}

function describeStringProperty(description: string, exampleValue: string): PropertyDecorator {
	return ApiPropertyDescribe({
		description,
		exampleValue,
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});
}

function resolveHeaderValue(value: Array<string> | string | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

@Entity("iam_consumer_operators")
class IamConsumerOperatorEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeStringProperty("id", "operator-1")
	public id!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("name", "Operator 1")
	public name!: string;
}

@Entity("iam_consumer_items")
class IamConsumerItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeStringProperty("id", "iam-item-own")
	public id!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("name", "Owned Item")
	public name!: string;

	@Column({ type: "varchar" })
	@describeStringProperty("operatorId", "operator-1")
	public operatorId!: string;

	@ManyToOne(() => IamConsumerOperatorEntity)
	@JoinColumn({ name: "operatorId" })
	@describeRelationProperty(IamConsumerOperatorEntity, "operator")
	public operator!: IamConsumerOperatorEntity;
}

@Entity("iam_consumer_policy_attachments")
class IamConsumerPolicyAttachmentEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "boolean", default: false })
	public isBoundary!: boolean;

	@Column({ type: "varchar" })
	public policyId!: string;

	@Column({ type: "varchar" })
	public principalId!: string;

	@Column({ type: "varchar" })
	public principalType!: string;
}

@Entity("iam_consumer_policy_documents")
class IamConsumerPolicyDocumentEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "simple-json" })
	public document!: {
		Statement: Array<{
			Action: Array<string>;
			Condition?: Record<string, Record<string, unknown>>;
			Effect: EApiPolicyEffect;
			Resource: Array<string>;
		}>;
		Version: string;
	};

	@Column({ type: "varchar" })
	public namespace!: string;

	@Column({ type: "varchar" })
	public sourceType!: EApiPolicySourceType;

	@Column({ type: "varchar" })
	public version!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: IamConsumerItemEntity })
class IamConsumerItemService extends ApiServiceBase<IamConsumerItemEntity> {
	@InjectRepository(IamConsumerItemEntity)
	public readonly repository!: Repository<IamConsumerItemEntity>;

	public async reset(): Promise<void> {
		await this.repository.clear();
	}
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: IamConsumerOperatorEntity })
class IamConsumerOperatorService extends ApiServiceBase<IamConsumerOperatorEntity> {
	@InjectRepository(IamConsumerOperatorEntity)
	public readonly repository!: Repository<IamConsumerOperatorEntity>;

	public async reset(): Promise<void> {
		await this.repository.clear();
	}
}

@Injectable()
class IamConsumerAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		const request = this.getRequest<{
			headers?: Record<string, Array<string> | string | undefined>;
			user?: unknown;
		}>(context);

		request.user = {
			id: resolveHeaderValue(request.headers?.["x-user-id"]) ?? "user-1",
			operatorId: resolveHeaderValue(request.headers?.["x-user-operator-id"]) ?? "operator-1",
			scopedItemId: resolveHeaderValue(request.headers?.["x-user-scoped-item-id"]) ?? "iam-item-own",
		};

		return true;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public async logIn<TRequest extends { logIn: Function } = any>(_request: TRequest): Promise<void> {
		return Promise.resolve();
	}

	public handleRequest<TUser = any>(_err: any, user: any, _info: any, _context: ExecutionContext, _status?: any): TUser {
		return user;
	}

	public getAuthenticateOptions(_context: ExecutionContext): undefined {
		return undefined;
	}
}

@Injectable()
class IamConsumerPrincipalResolver implements IApiAuthorizationPrincipalResolver {
	public resolve(user: unknown): IApiAuthorizationPrincipal {
		return AuthorizationResolveDefaultPrincipal(user);
	}
}

@Injectable()
class IamConsumerPolicyAttachmentSource implements IApiPolicyAttachmentSource {
	public constructor(
		@InjectRepository(IamConsumerPolicyAttachmentEntity)
		private readonly repository: Repository<IamConsumerPolicyAttachmentEntity>,
	) {}

	public async getAttachments(principal: IApiAuthorizationPrincipal) {
		const records: Array<IamConsumerPolicyAttachmentEntity> = await this.repository.find({
			where: {
				principalId: principal.id,
				principalType: principal.type,
			},
		});

		return {
			attachments: records
				.filter((record: IamConsumerPolicyAttachmentEntity): boolean => !record.isBoundary)
				.map((record: IamConsumerPolicyAttachmentEntity) => ({
					policyId: record.policyId,
					principalId: record.principalId,
					principalType: record.principalType as EApiAuthorizationPrincipalType,
				})),
			boundaries: records
				.filter((record: IamConsumerPolicyAttachmentEntity): boolean => record.isBoundary)
				.map((record: IamConsumerPolicyAttachmentEntity) => ({
					policyId: record.policyId,
					principalId: record.principalId,
					principalType: record.principalType as EApiAuthorizationPrincipalType,
				})),
		};
	}
}

@Injectable()
class IamConsumerPolicyDocumentSource implements IApiPolicyDocumentSource {
	public constructor(
		@InjectRepository(IamConsumerPolicyDocumentEntity)
		private readonly repository: Repository<IamConsumerPolicyDocumentEntity>,
	) {}

	public async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		if (ids.length === 0) {
			return [];
		}

		const records: Array<IamConsumerPolicyDocumentEntity> = await this.repository.find({
			where: {
				id: In([...ids]),
			},
		});

		return records.map((record: IamConsumerPolicyDocumentEntity): IApiPolicyDocumentRecord => ({
			document: record.document,
			id: record.id,
			namespace: record.namespace,
			sourceType: record.sourceType,
			version: record.version,
		}));
	}
}

@Module({
	exports: [IamConsumerPolicyAttachmentSource, IamConsumerPolicyDocumentSource, IamConsumerPrincipalResolver],
	imports: [TypeOrmModule.forFeature([IamConsumerPolicyAttachmentEntity, IamConsumerPolicyDocumentEntity])],
	providers: [IamConsumerPolicyAttachmentSource, IamConsumerPolicyDocumentSource, IamConsumerPrincipalResolver],
})
class IamConsumerAuthorizationSupportModule {}

const iamConsumerAuthentication = {
	guard: IamConsumerAuthGuard,
	type: EApiAuthenticationType.USER,
};

const iamConsumerAuthorization = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "admin:item",
	resourceDefinition: {
		entity: IamConsumerItemEntity,
		fields: [
			{
				isFilterable: true,
				path: "resource.id",
				queryPath: "id",
			},
			{
				isFilterable: true,
				path: "resource.operatorId",
				queryPath: "operatorId",
			},
		],
		namespace: "admin:item",
		resourcePath: "gameport:admin:item/{id}",
		resourceType: "gameport:admin:item",
	},
};

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<IamConsumerItemEntity>({
	authorization: iamConsumerAuthorization,
	entity: IamConsumerItemEntity,
	name: "IamConsumerItems",
	path: "iam-consumer-items",
	routes: {
		[EApiRouteType.CREATE]: {
			authentication: iamConsumerAuthentication,
			request: {
				relations: {
					relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					shouldLoadRelations: true,
				},
			},
		},
		[EApiRouteType.DELETE]: {
			isEnabled: false,
		},
		[EApiRouteType.GET]: {
			authentication: iamConsumerAuthentication,
			response: {
				relations: {
					operator: true,
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			authentication: iamConsumerAuthentication,
		},
		[EApiRouteType.PARTIAL_UPDATE]: {
			authentication: iamConsumerAuthentication,
			request: {
				relations: {
					relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					shouldLoadRelations: true,
				},
			},
		},
		[EApiRouteType.UPDATE]: {
			authentication: iamConsumerAuthentication,
			request: {
				relations: {
					relationsLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					servicesLoadStrategy: EApiControllerLoadRelationsStrategy.AUTO,
					shouldLoadRelations: true,
				},
			},
		},
	},
})
class IamConsumerItemController {
	@Inject(IamConsumerOperatorService)
	public readonly operatorService!: IamConsumerOperatorService;

	@Inject(IamConsumerItemService)
	public readonly service!: IamConsumerItemService;
}

@Module({
	controllers: [IamConsumerItemController],
	imports: [
		TypeOrmModule.forRoot({
			database: ":memory:",
			dropSchema: true,
			entities: [IamConsumerItemEntity, IamConsumerOperatorEntity, IamConsumerPolicyAttachmentEntity, IamConsumerPolicyDocumentEntity],
			logging: false,
			synchronize: true,
			type: "sqlite",
		}),
		TypeOrmModule.forFeature([IamConsumerItemEntity, IamConsumerOperatorEntity, IamConsumerPolicyAttachmentEntity, IamConsumerPolicyDocumentEntity]),
		ApiAuthorizationModule.forRootAsync({
			imports: [IamConsumerAuthorizationSupportModule],
			inject: [IamConsumerPolicyAttachmentSource, IamConsumerPolicyDocumentSource, IamConsumerPrincipalResolver],
			useFactory: (
				attachmentSource: IamConsumerPolicyAttachmentSource,
				documentSource: IamConsumerPolicyDocumentSource,
				principalResolver: IamConsumerPrincipalResolver,
			) => ({
				iam: {
					attachmentSources: [attachmentSource],
					documentSources: [documentSource],
				},
				principalResolver,
			}),
		}),
		IamConsumerAuthorizationSupportModule,
	],
	providers: [IamConsumerAuthGuard, IamConsumerItemService, IamConsumerOperatorService],
})
class IamConsumerAppModule {}

describe("DB-backed IAM consumer flow (E2E)", () => {
	let app: INestApplication;
	let attachmentRepository: Repository<IamConsumerPolicyAttachmentEntity>;
	let documentRepository: Repository<IamConsumerPolicyDocumentEntity>;
	let itemService: IamConsumerItemService;
	let operatorService: IamConsumerOperatorService;
	let simulator: ApiAuthorizationSimulator;
	let fastify: {
		inject: (options: {
			headers?: Record<string, string>;
			method: string;
			payload?: unknown;
			url: string;
		}) => Promise<{
			json: () => any;
			statusCode: number;
		}>;
	};

	const principalHeaders = (overrides: Record<string, string> = {}): Record<string, string> => ({
		"x-user-id": "user-1",
		"x-user-operator-id": "operator-1",
		"x-user-scoped-item-id": "iam-item-own",
		...overrides,
	});

	async function seedAuthorizationData(): Promise<void> {
		await attachmentRepository.save({
			id: "attachment-user-1",
			isBoundary: false,
			policyId: "policy-operator-scope",
			principalId: "user-1",
			principalType: EApiAuthorizationPrincipalType.USER,
		});

		await documentRepository.save({
			document: {
				Statement: [
					{
						Action: ["admin:item:create"],
						Condition: {
							StringEquals: {
								"request.body.operator": "${principal.attributes.operatorId}",
							},
						},
						Effect: EApiPolicyEffect.ALLOW,
						Resource: ["gameport:admin:item/*"],
					},
					{
						Action: ["admin:item:update"],
						Condition: {
							StringEquals: {
								"request.body.operator": "${principal.attributes.operatorId}",
							},
						},
						Effect: EApiPolicyEffect.ALLOW,
						Resource: ["gameport:admin:item/*"],
					},
					{
						Action: ["admin:item:read"],
						Condition: {
							StringEquals: {
								"resource.id": "${principal.attributes.scopedItemId}",
							},
						},
						Effect: EApiPolicyEffect.ALLOW,
						Resource: ["gameport:admin:item/*"],
					},
					{
						Action: ["admin:item:read", "admin:item:list"],
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
			id: "policy-operator-scope",
			namespace: "admin:item",
			sourceType: EApiPolicySourceType.DATABASE,
			version: "1",
		});
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [IamConsumerAppModule],
		}).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();

		attachmentRepository = app.get(getRepositoryToken(IamConsumerPolicyAttachmentEntity));
		documentRepository = app.get(getRepositoryToken(IamConsumerPolicyDocumentEntity));
		itemService = app.get(IamConsumerItemService);
		operatorService = app.get(IamConsumerOperatorService);
		simulator = app.get(ApiAuthorizationSimulator);
		fastify = app.getHttpAdapter().getInstance();
	});

	beforeEach(async () => {
		await itemService.reset();
		await operatorService.reset();
		await attachmentRepository.clear();
		await documentRepository.clear();

		await operatorService.repository.save([
			{ id: "operator-1", name: "Operator 1" },
			{ id: "operator-2", name: "Operator 2" },
		]);
		await seedAuthorizationData();
	});

	afterAll(async () => {
		await app.close();
	});

	it("registers DB-backed IAM providers through forRootAsync", () => {
		expect(app.get(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBeInstanceOf(IamConsumerPrincipalResolver);
		expect(app.get(AUTHORIZATION_POLICY_ATTACHMENT_SOURCES_TOKEN)).toEqual([app.get(IamConsumerPolicyAttachmentSource)]);
		expect(app.get(AUTHORIZATION_POLICY_DOCUMENT_SOURCES_TOKEN)).toEqual([app.get(IamConsumerPolicyDocumentSource)]);
	});

	it("lists and reads only operator-scoped resources", async () => {
		await itemService.repository.save([
			{ id: "iam-item-own", name: "Own Item", operatorId: "operator-1" },
			{ id: "iam-item-own-2", name: "Own Item 2", operatorId: "operator-1" },
			{ id: "iam-item-foreign", name: "Foreign Item", operatorId: "operator-2" },
		]);

		const listResponse = await fastify.inject({
			headers: principalHeaders(),
			method: "GET",
			url: "/iam-consumer-items?limit=10&page=1",
		});

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json().items.map((item: { id: string }) => item.id).sort()).toEqual(["iam-item-own", "iam-item-own-2"]);

		const ownGetResponse = await fastify.inject({
			headers: principalHeaders(),
			method: "GET",
			url: "/iam-consumer-items/iam-item-own",
		});

		expect(ownGetResponse.statusCode).toBe(200);
		expect(ownGetResponse.json()).toMatchObject({
			id: "iam-item-own",
			operatorId: "operator-1",
		});
	});

	it("does not substitute an own entity when a foreign read conflicts on resource.id", async () => {
		await itemService.repository.save([
			{ id: "iam-item-own", name: "Own Item", operatorId: "operator-1" },
			{ id: "iam-item-foreign", name: "Foreign Item", operatorId: "operator-2" },
		]);

		const foreignGetResponse = await fastify.inject({
			headers: principalHeaders({
				"x-user-scoped-item-id": "iam-item-own",
			}),
			method: "GET",
			url: "/iam-consumer-items/iam-item-foreign",
		});

		expect(foreignGetResponse.statusCode).toBe(404);
	});

	it("allows create and evaluates update conditions when request.body.operator matches the principal operator id", async () => {
		const createResponse = await fastify.inject({
			headers: principalHeaders(),
			method: "POST",
			payload: {
				id: "iam-item-created",
				name: "Created Item",
				operator: "operator-1",
			},
			url: "/iam-consumer-items",
		});

		expect(createResponse.statusCode).toBe(201);
		expect((await itemService.repository.findOne({ where: { id: "iam-item-created" } }))?.operatorId).toBe("operator-1");

		const updateDecision = await simulator.evaluate({
			action: EApiRouteType.UPDATE,
			authorization: iamConsumerAuthorization,
			entity: IamConsumerItemEntity,
			principal: {
				attributes: {
					operatorId: "operator-1",
					scopedItemId: "iam-item-own",
				},
				id: "user-1",
				roles: [],
				type: EApiAuthorizationPrincipalType.USER,
			},
			requestMetadata: {
				body: {
					operator: "operator-1",
				} as unknown as Partial<IamConsumerItemEntity>,
				parameters: {
					id: "iam-item-created",
				},
			},
			resource: {
				id: "iam-item-created",
				name: "Created Item",
				operatorId: "operator-1",
			} as IamConsumerItemEntity,
		});

		expect(updateDecision.effect).toBe(EApiPolicyEffect.ALLOW);
	});

	it("denies create and update when request.body.operator targets a foreign operator", async () => {
		await itemService.repository.save({
			id: "iam-item-own",
			name: "Own Item",
			operatorId: "operator-1",
		});

		const deniedCreateResponse = await fastify.inject({
			headers: principalHeaders(),
			method: "POST",
			payload: {
				id: "iam-item-denied-create",
				name: "Denied Create",
				operator: "operator-2",
			},
			url: "/iam-consumer-items",
		});

		expect(deniedCreateResponse.statusCode).toBe(403);

		const deniedUpdateResponse = await fastify.inject({
			headers: principalHeaders(),
			method: "PUT",
			payload: {
				name: "Denied Update",
				operator: "operator-2",
			},
			url: "/iam-consumer-items/iam-item-own",
		});

		expect(deniedUpdateResponse.statusCode).toBe(403);
		expect((await itemService.repository.findOne({ where: { id: "iam-item-own" } }))?.operatorId).toBe("operator-1");
	});
});

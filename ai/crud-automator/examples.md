# Crud Automator Examples

## Semantic Timestamp Ownership

```ts
@ApiPropertyDescribe({
	type: EApiPropertyDescribeType.DATE,
	identifier: EApiPropertyDateIdentifier.CREATED_AT,
	format: EApiPropertyDateType.DATE_TIME,
})
insertedOn!: Date; // response-visible, omitted from generated write bodies

@ApiPropertyDescribe({
	type: EApiPropertyDescribeType.DATE,
	identifier: EApiPropertyDateIdentifier.DATE,
	format: EApiPropertyDateType.DATE_TIME,
})
createdAt!: Date; // writable business date despite the property name
```

## Standard CRUD

```ts
@Injectable()
@ApiService({ entity: UserEntity })
@ApiServiceObservable()
export class UserService extends ApiServiceBase<UserEntity> {
	constructor(@InjectRepository(UserEntity) public readonly repository: Repository<UserEntity>) {
		super();
	}
}

@ApiController<UserEntity>({
	entity: UserEntity,
	path: "users",
	routes: {},
})
@ApiControllerObservable()
export class UserController {
	constructor(public service: UserService) {}
}
```

## GET_LIST Item DTO

```ts
class PublicUserResponseDto {
	@Expose()
	id!: string;

	@Expose()
	email!: string;
}

@ApiController<UserEntity>({
	entity: UserEntity,
	routes: {
		[EApiRouteType.GET_LIST]: {
			dto: {
				[EApiDtoType.RESPONSE]: {
					itemType: PublicUserResponseDto,
					name: "PublicUserListResponseDto",
				},
			},
		},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

## Typed GET_LIST Query Plan

```ts
@ApiController<UserEntity>({
	entity: UserEntity,
	routes: {
		[EApiRouteType.GET_LIST]: {
			dto: {
				[EApiDtoType.RESPONSE]: {
					itemType: PublicUserResponseDto,
				},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							email: { isEnabled: false },
							status: {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
								missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.REJECT,
							},
							"team.name": {
								allowedOperations: [EFilterOperation.EQ, EFilterOperation.CONT],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT,
					},
					order: {
						fields: {
							createdAt: { isEnabled: true },
							email: { isEnabled: false },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
	},
})
export class PublicUserController {
	constructor(public service: UserService) {}
}
```

The entity metadata still supplies scalar types, constraints, relation targets, and the dynamic query DTO baseline. This route plan narrows that baseline, requires `status` with EQ only, omits `email`, permits a one-hop `team.name` filter, and limits ordering to `createdAt`. The manual response item DTO is compatible; a manual QUERY DTO would not be.

For `missingBehavior: USE_DEFAULT`, also provide `defaultCondition`. Automator inserts that condition only when the client omits the field group; a client group for the same field replaces the default, and the resulting predicates are AND-merged with authorization scope. `BETWEEN` requires exactly two repeated `[values]`; membership accepts 1–100. Typed failures use `FILTER_REQUIRED`, `INVALID_FILTER`, or `INVALID_ORDER`. Route-before subscribers can rewrite the raw query before Automator performs its strict typed parse.

## Nested Generated Read With Stable Pagination

```ts
@ApiController<GameEntity>({
	entity: GameEntity,
	path: "providers/:providerKey/games",
	routes: {
		[EApiRouteType.GET]: {
			read: {
				scope: {
					parameters: [{ parameter: "providerKey", field: "providerId" }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ parameter: "providerKey", field: "providerId" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [
							{ direction: EFilterOrderDirection.DESC, field: "priority" },
							{ direction: EFilterOrderDirection.ASC, field: "id" },
						],
						fields: {
							priority: { isEnabled: true },
						},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
	},
})
export class ProviderGameController {
	constructor(public service: GameService) {}
}
```

The controller path declares one inherited parameter, so both read routes map it exactly once. `providerKey` is the external path name; `providerId` is the described direct scalar entity field. Automator generates its PARAMETERS DTO and Swagger metadata. GET also includes the normal primary identity parameter. Do not add a manual PARAMETERS DTO to either read route.

A GET uses `id AND providerId AND IAM scope`. A GET_LIST uses query predicates `AND providerId AND IAM scope`; incompatible values match nothing instead of overwriting a prior condition. With no client order, the list uses `priority DESC, id ASC` after duplicate removal. A client order replaces the defaults and keeps `id ASC` as a final tie-breaker, making explicit page/limit requests deterministic for an unchanged dataset. `id` remains server-only because it is absent from `fields`.

## Generated Cursor Pagination

```ts
@ApiController<GameEntity>({
	entity: GameEntity,
	path: "brands/:brandId/games",
	routes: {
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ parameter: "brandId", field: "brandId" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.DESC, field: "position" }],
						fields: {
							isFeatured: { isEnabled: true },
							position: { isEnabled: true },
						},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: {
						mode: EApiControllerGetListQueryPaginationMode.CURSOR,
					},
				},
			},
		},
	},
})
export class BrandGameController {
	constructor(public service: GameService) {}
}
```

The first request is `GET /brands/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/games?limit=1`. Its response is always flat:

```json
{
	"items": [
		{
			"id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			"name": "Example Game",
			"position": 42
		}
	],
	"nextCursor": "eyJ2IjoxLCJjIjoiMDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZiIsInZhbHVlcyI6WzQyLCJhYWFhYWFhYS1hYWFhLTRhYWEtOGFhYS1hYWFhYWFhYWFhYWEiXX0",
	"previousCursor": null
}
```

Use `after=<nextCursor>` to continue and `before=<previousCursor>` to go back. Do not send `page`, and do not send both cursor directions. The generated route uses `GameService.getMany`; it stores nothing in the database. Each token is valid only for the same controller route, UUID `brandId`, normalized filters, and effective order. Current HOOKS/IAM scope is recalculated for every request. The response keeps `position` because it participates in the protected raw order tuple.

CURSOR v1 is PostgreSQL-only. Its TypeORM order declarations may be `boolean`; signed `smallint` or `integer`, including increment-generated columns whose PostgreSQL DDL uses `SMALLSERIAL`/`SERIAL`; numeric enums stored as `smallint`/`integer`; signed `bigint`, including increment-generated `BIGSERIAL` DDL, exposed as canonical decimal `BIGINT_STRING`; or native `uuid`. The SERIAL-family names are DDL forms, not TypeORM column type literals. CURSOR requires standard PostgreSQL text parsers. Every other storage type or driver fails closed for CURSOR, while PAGE behavior is unchanged.

## Route Controls And Validators

```ts
const requireEmailValidator: IApiRequestValidator<UserEntity> = {
	errorType: EErrorStringAction.BAD_REQUEST,
	exception: BadRequestException,
	validationFunction: (payload) => typeof (payload as Partial<UserEntity>).email === "string",
};

@ApiController<UserEntity>({
	entity: UserEntity,
	routes: {
		[EApiRouteType.CREATE]: {
			generation: {
				decorators: [SetMetadata("feature", "user-create")],
			},
			request: {
				[EApiControllerRequestTarget.BODY]: {
					validators: [requireEmailValidator],
				},
			},
		},
		[EApiRouteType.DELETE]: {
			generation: { isEnabled: false },
		},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

## Relations

```ts
@ApiController<PostEntity>({
	entity: PostEntity,
	routes: {
		[EApiRouteType.CREATE]: {
			transaction: {
				mode: EApiFunctionTransactionMode.REQUIRED,
			},
			relations: {
				request: {
					reference: { shape: EApiControllerRelationReferenceShape.SCALAR },
					load: {
						include: { author: true },
						locks: {
							author: { mode: "pessimistic_read" },
						},
					},
				},
				response: {
					reference: { shape: EApiControllerRelationReferenceShape.OBJECT, key: "id" },
					load: {
						include: { author: true },
						relationLoadStrategy: "query",
					},
				},
			},
		},
	},
})
export class PostController {
	constructor(
		public service: PostService,
		public authorService: UserService,
	) {}
}
```

The route-owned transaction keeps author hydration, create, and response reload on one manager. Relation locks require an active transaction and never fall back to an unlocked read.

## Custom Service Command

```ts
@Injectable()
@ApiService({ entity: OrderEntity })
@ApiServiceObservable()
export class OrderService extends ApiServiceBase<OrderEntity> {
	@ApiFunctionCustom<OrderEntity>({
		action: "close-expired",
		entity: OrderEntity,
		transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
	})
	async closeExpired(): Promise<Array<OrderEntity>> {
		const context = this.getApiFunctionContext<OrderEntity>();
		const expired = await context.operations.getMany({
			where: { status: "expired" } as FindOptionsWhere<OrderEntity>,
		});

		for (const order of expired) {
			await context.operations.update({ id: order.id } as FindOptionsWhere<OrderEntity>, { status: "closed" } as DeepPartial<OrderEntity>);
		}

		return expired;
	}
}
```

## Named Transaction Scope and Post-Commit Hook

```ts
await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "close-expired-orders" }, async (entityManager) => {
	await orderService.closeExpired();
	await entityManager.getRepository(OrderSweepEntity).save(sweep);
});

@Injectable()
@ApiFunctionSubscriber<OrderEntity>({ entity: OrderEntity })
export class OrderMetricsSubscriber extends ApiFunctionSubscriberBase<OrderEntity> {
	async onAfterCommit(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		await this.metrics.recordCommittedOperations(context.DATA.matchedEvents.length);
	}
}
```

`runWithEntityManager` is join-only in the current 3.x contract. Post-commit hooks run after the outer owner confirms COMMIT and cannot replace results. Transaction events are payload-free metadata; keep outbox bodies in application-owned state.

## Function Subscriber With Transaction Expectation

```ts
@Injectable()
@ApiFunctionSubscriber<OrderEntity>({
	entity: OrderEntity,
	transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED },
})
export class OrderAuditSubscriber extends ApiFunctionSubscriberBase<OrderEntity, DeepPartial<OrderEntity>, EApiFunctionSubscriberTransactionExpectation.REQUIRED> {
	async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<OrderEntity, DeepPartial<OrderEntity>, EApiFunctionSubscriberTransactionExpectation.REQUIRED>): Promise<DeepPartial<OrderEntity>> {
		await context.DATA.eventManager.save(OrderAuditEntity, {
			action: "create",
		});

		return context.result;
	}
}
```

## UPDATE `currentEntity`

```ts
@Injectable()
@ApiFunctionSubscriber<UserEntity>({ entity: UserEntity })
export class UserUpdateSubscriber extends ApiFunctionSubscriberBase<UserEntity> {
	async onBeforeUpdate(context: TApiSubscriberFunctionBeforeUpdateContext<UserEntity>): Promise<TApiFunctionUpdateProperties<UserEntity>> {
		const currentUser = context.DATA.currentEntity;
		const repository = context.DATA.repository;

		if (currentUser.status === UserStatus.LOCKED) {
			throw new ConflictException("USER_LOCKED");
		}

		await repository.exists({ where: { id: currentUser.id } });
		return context.result;
	}
}
```

Automator runs one ordinary decorated GET before this hook. `repository` is manager-bound when a transaction exists and otherwise uses the service base repository. `currentEntity` is detached and frozen only at the top level; do not mutate nested values. A missing row skips `onBeforeUpdate` and runs GET then UPDATE error lifecycle.

## Route Subscriber With Authorization Expectation

```ts
@Injectable()
@ApiRouteSubscriber<OrderEntity>({
	entity: OrderEntity,
	authorization: { expectation: EApiRouteSubscriberAuthorizationExpectation.REQUIRED },
	routes: [EApiRouteType.CREATE],
})
export class OrderRouteAuditSubscriber extends ApiRouteSubscriberBase<OrderEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED> {
	async onBeforeCreate(context: TApiSubscriberRouteBeforeCreateContext<OrderEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>): Promise<TApiSubscriberRouteBeforeCreateContext<OrderEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]> {
		const principal = context.result.authenticationRequest.authorizationDecision.principal;

		await this.auditService.record({
			action: "route-create",
			principalId: principal.id,
		});

		return context.result;
	}
}
```

## Custom Route With Runtime

```ts
@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<PostEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: PostEntity,
	routes: {},
})
export class PostController {
	constructor(public service: PostService) {}

	@ApiRouteCustom<PostEntity>({
		resource: {
			action: "publish",
			entity: PostEntity,
		},
		route: {
			method: RequestMethod.POST,
			path: ":id/publish",
		},
		security: {
			authorization: { mode: EApiAuthorizationMode.HOOKS },
		},
		response: {
			status: HttpStatus.OK,
			type: PostEntity,
		},
	})
	async publish(@Param("id") id: string): Promise<PostEntity> {
		return await this.service.update({ id } as FindOptionsWhere<PostEntity>, { status: "published" } as DeepPartial<PostEntity>);
	}
}
```

## Function Subscriber

```ts
@Injectable()
@ApiFunctionSubscriber({ entity: PostEntity })
export class PostSlugSubscriber extends ApiFunctionSubscriberBase<PostEntity> {
	async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<PostEntity>): Promise<TApiFunctionCreateProperties<PostEntity>> {
		if (context.result.title) {
			context.result.slug = slugify(context.result.title, { lower: true, strict: true });
		}

		return context.result;
	}
}
```

For a generated create flow with a stricter application-defined service payload, pass it as the second generic to both the base class and before-context helper. Define the payload type yourself; the generic only narrows TypeScript's `context.result` type and does not change validation, transformation, or runtime behavior.

```ts
type PostCreateInput = {
	title: string;
	author: { id: string };
};

export class PostCreateSubscriber extends ApiFunctionSubscriberBase<PostEntity, PostCreateInput> {
	async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<PostEntity, PostCreateInput>): Promise<PostCreateInput> {
		return context.result;
	}
}
```

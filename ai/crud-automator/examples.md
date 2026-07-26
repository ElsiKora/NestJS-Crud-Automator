# Crud Automator Examples

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
			relations: {
				request: {
					reference: { shape: EApiControllerRelationReferenceShape.SCALAR },
					load: {
						include: { author: true },
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

## Custom Service Command

```ts
@Injectable()
@ApiService({ entity: OrderEntity })
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

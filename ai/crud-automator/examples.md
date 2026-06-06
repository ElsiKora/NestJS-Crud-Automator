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

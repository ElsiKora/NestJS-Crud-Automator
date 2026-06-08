# Crud Automator Reference

## Native Primitive Map

| Need                                            | Use first                                               |
| ----------------------------------------------- | ------------------------------------------------------- |
| Standard CRUD                                   | `@ApiService()` + `ApiServiceBase` + `@ApiController()` |
| Custom service command                          | `@ApiFunctionCustom()`                                  |
| Internal transaction-aware service step         | `@ApiFunctionStep()`                                    |
| Custom controller command with runtime pipeline | `@ApiRouteCustom()`                                     |
| Low-level custom method metadata                | `@ApiMethod({ metadata })`                              |
| Generated DTO field controls                    | `ApiPropertyDescribe({ properties })`                   |
| Route-local generated DTO validators            | `autoDto`                                               |
| Manual route DTOs                               | `dto: { [EApiDtoType.*]: DTO }`                         |
| GET_LIST custom item shape                      | `dto: { [EApiDtoType.RESPONSE]: { itemType, name? } }`  |
| Relation hydration                              | `relations.request`                                     |
| Relation response loading                       | `relations.response.load.include`                       |
| HTTP-aware lifecycle logic                      | `ApiRouteSubscriberBase`                                |
| Persistence-aware lifecycle logic               | `ApiFunctionSubscriberBase`                             |
| Code-first auth rules                           | `ApiAuthorizationPolicyBase` in HOOKS mode              |
| Policy-document auth                            | IAM mode with sources/resolvers                         |
| External transaction scope                      | `ApiFunctionTransactionScope`                           |

## Route Config Shape

Generated route config is nested by responsibility:

```ts
routes: {
	[EApiRouteType.CREATE]: {
		generation: {
			isEnabled: true,
			shouldWriteToController: true,
			decorators: [],
		},
		security: {
			authentication: {
				type: EApiAuthenticationType.USER,
				guard: JwtAuthGuard,
				bearerStrategies: ["jwt"],
			},
			authorization: {
				mode: EApiAuthorizationMode.HOOKS,
			},
		},
		request: {
			[EApiControllerRequestTarget.BODY]: {
				transformers: [],
				validators: [],
			},
		},
		response: {
			[EApiControllerResponseTarget.RESPONSE]: {
				transformers: [],
			},
		},
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
}
```

Do not use old flat fields such as route-level `isEnabled`, `authentication`, `authorization`, `request.transformers`, `response.transformers`, `request.relations`, or `response.relations`.

## DTO Rules

- `EApiDtoType.BODY`, `QUERY`, `PARAMETERS`, and `RESPONSE` are the only DTO keys.
- `autoDto` supports `validators` only.
- Use entity `ApiPropertyDescribe.properties` for field enablement, requiredness, response exposure, filters, guards, and route/DTO-specific behavior.
- `isExpose` is response-only and requires `isResponse: true`.
- Guard-scoped DTO generation depends on the route's configured guard class; it is not a per-request role check.
- `isUniqueItems` is OpenAPI schema metadata unless source adds explicit runtime uniqueness validation.

## Service And Function Signatures

```ts
create(properties: DeepPartial<E>): Promise<E>;
update(criteria: FindOptionsWhere<E> | Array<FindOptionsWhere<E>>, properties: DeepPartial<E>): Promise<E>;
delete(criteria: FindOptionsWhere<E> | Array<FindOptionsWhere<E>>): Promise<void>;
get(properties: FindOneOptions<E>): Promise<E>;
getList(properties: FindManyOptions<E>): Promise<IApiGetListResponseResult<E>>;
getMany(properties: FindManyOptions<E>): Promise<Array<E>>;
```

Controller GET_LIST query parameters (`limit`, `page`, `orderBy`, `orderDirection`, bracketed filters) are converted to TypeORM `take`, `skip`, `order`, and `where` before the service is called.

`@ApiFunctionDelete` internally removes an entity snapshot, but generated service/controller delete APIs intentionally expose `Promise<void>`. Do not design public delete flows around receiving the removed entity unless the source contract is changed first.

Use `@ApiFunctionStep({ entity, transaction })` for private/protected/public helper methods inside service use-cases when they need the current transaction context. Direct calls are valid when the selected transaction mode permits. In a step, call `this.getApiFunctionStepContext()` for `eventManager`, `repository`, and `getRepository()`. Steps are not custom actions and do not dispatch function subscribers, route metadata, Swagger metadata, or authorization action identities.

## Custom Route Boundary

Use `@ApiRouteCustom` when a custom route should participate in route runtime behavior. Use `@ApiMethod` only when metadata composition is enough.

Custom route caveats:

- Request relation hydration currently targets the body argument.
- Response relation reload uses `controller.service.get({ where: { id } })`.
- Response relation reload requires `controller.service instanceof ApiServiceBase`.
- If `response` is provided, include the required `type` and `status`.

Generated request relation caveats:

- `relations.request.load.include` selects the direct request body relations to hydrate.
- `relations.request.load.services` is only an override map; omitted keys use `<relationName>Service` properties on the controller.
- `relations.request.load.relationLoadStrategy` is passed to the direct relation service get call alongside nested TypeORM `relations` when configured.
- Request relation hydration mutates direct relation references into loaded entity objects. Nested include objects are passed to the direct relation service as TypeORM `relations`; nested request references are not recursively hydrated.
- For generated routes, request relation hydration reads relation fields from the request body for CREATE, UPDATE, and PARTIAL_UPDATE. It does not hydrate GET/DELETE route parameters.
- CREATE reloads the created entity with configured response relations. UPDATE/PARTIAL_UPDATE reload only when response relation loading is configured. DELETE returns no body. GET_LIST maps `limit`/`page` to `take`/`skip` and applies `orderBy` only when present.

## Subscriber Contexts

Route before create result shape:

```ts
{
	authenticationRequest?: IApiAuthenticationRequest;
	body: DeepPartial<E>;
	headers: Record<string, string>;
	ip: string;
}
```

When a route subscriber only observes routes that guarantee authorization, use `EApiRouteSubscriberAuthorizationExpectation.REQUIRED` in both `@ApiRouteSubscriber({ authorization: { expectation } })` and the `ApiRouteSubscriberBase`/before-context generics. That narrows `context.result.authenticationRequest.authorizationDecision`; it does not add runtime guards.

Function before create result shape:

```ts
DeepPartial<E>;
```

Use `context.DATA.criteria`, `context.DATA.properties`, repository lookups, or TypeORM options when an existing entity or criteria is needed.

Function subscriber transaction expectations are subscriber-declared:

- Use `@ApiFunctionSubscriber({ transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED } })` or `MANDATORY` only when the hook cannot run without `context.DATA.eventManager`.
- Pass the same expectation to `ApiFunctionSubscriberBase` and helper context generics to narrow `eventManager` to `EntityManager`.
- Do not infer subscriber transaction requirements from `@ApiService`, `@ApiFunctionCustom`, or `@ApiFunctionStep`; subscribers without metadata keep optional `eventManager`.

For generated CRUD before hooks, `context.result` includes request targets plus `authenticationRequest`, `headers`, and `ip`. For `@ApiRouteCustom`, `context.result` is only `{ body?, parameters?, query? }`; read `authenticationRequest`, `headers`, `ip`, route metadata, and runtime properties from `context.DATA`.

## Authorization Notes

- Generated CRUD route actions map to the authorization runtime automatically.
- Custom route action identity is `metadata.resource.action` for `@ApiMethod` and `resource.action` for `@ApiRouteCustom`.
- Custom `@ApiMethod(...)` and `@ApiRouteCustom(...)` routes without `metadata.route.type` do not dispatch to CRUD policy hooks; handle them in `getCustomActionRule(action, context)` and branch on the declared `resource.action`.
- Securable custom methods require authorization mode metadata.
- `resourceDefinition.resourcePath` may contain placeholders like `{id}`.
- Policy statement `Resource` values should be concrete strings or wildcard strings such as `gameport:admin:item/*`.
- `ApiAuthorizationCacheInvalidationService.clearAll()` clears policy, IAM attachment/document, and hook permission caches.

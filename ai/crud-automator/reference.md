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
| Typed GET_LIST filter/order overlay             | `request[EApiControllerRequestTarget.QUERY]`            |
| Relation hydration                              | `relations.request`                                     |
| Generated route transaction                     | `routes[route].transaction`                             |
| Direct request relation lock                    | `relations.request.load.locks`                          |
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
			transaction: {
				mode: EApiFunctionTransactionMode.REQUIRED,
			},
		generation: {
			isEnabled: true,
			shouldWriteToController: true,
			decorators: [],
		},
		security: {
			authentication: {
				type: EApiAuthenticationType.USER,
				guard: JwtAuthGuard,
				securityRequirements: [
					{
						bearerStrategies: ["jwt"],
					},
				],
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
			headers: {
				"X-Request-Id": {
					description: "Request correlation id.",
					schema: { type: "string" },
				},
			},
			[EApiControllerResponseTarget.RESPONSE]: {
				transformers: [],
			},
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
}
```

Do not use old flat fields such as route-level `isEnabled`, `authentication`, `authorization`, `request.transformers`, `response.transformers`, `request.relations`, or `response.relations`. Do not use removed top-level `authentication.bearerStrategies` or `authentication.securityStrategies`; use `authentication.securityRequirements` groups instead.

Generated route transaction rules:

- Omitted `transaction` and `SUPPORTS` open no route transaction and preserve the legacy route boundary.
- `REQUIRED` opens a `ROUTE` owner when none exists; `MANDATORY` requires an active owner; `NONE` rejects one.
- Request transformation and validation stay outside a route-owned transaction.
- Request relation hydration, generated service execution, and response relation reload share the active manager.
- Commit lifecycle finishes before response transformation, route-after, authorization result handling, and serialization.
- Custom routes do not inherit generated route transaction config.

## DTO Rules

- `EApiDtoType.BODY`, `QUERY`, `PARAMETERS`, and `RESPONSE` are the only DTO keys.
- `autoDto` supports `validators` only.
- Use entity `ApiPropertyDescribe.properties` for field enablement, requiredness, response exposure, filters, guards, and route/DTO-specific behavior.
- Generated GET_LIST `request[QUERY].filter` and `order` compile with entity/TypeORM metadata into one immutable plan. `INHERIT` overlays metadata; `REJECT` creates an allowlist; route config cannot re-enable a metadata-disabled field.
- Filter fields use exact disabled `{ isEnabled: false }` or enabled non-empty `allowedOperations` plus optional `OMIT`, `REJECT`, or `USE_DEFAULT` missing behavior. Order fields are direct-scalar enabled/disabled overlays and have no filter-only settings.
- Manual GET_LIST QUERY DTOs cannot be combined with generated filter/order config. Manual RESPONSE DTOs remain compatible.
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

Controller GET_LIST query parameters (`limit`, `page`, `orderBy`, `orderDirection`, bracketed filters) are converted to TypeORM `take`, `skip`, `order`, and `where` before the service is called. With a typed plan, after route-before subscribers and request QUERY transforms/validators, the authoritative parser validates exact paths, operations, cardinality, and scalar values independently of host `ValidationPipe` and applies `USE_DEFAULT` when a field group is absent. The optional route transaction then compiles the AST, AND-merges client/default predicates with authorization scope once, and runs the service query. Omitted filter/order sections retain the corresponding legacy metadata-driven path.

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
- `relations.request.load.locks` forwards native TypeORM `pessimistic_read` or `pessimistic_write` to enabled direct relation `get()` calls and requires an active Automator transaction.
- Direct relation locks follow `include` declaration order and disable implicit eager-relation loading. Locked direct relations with explicit nested includes require `relationLoadStrategy: "query"` so nested reads share the manager without receiving an automatic lock.
- Request relation hydration mutates direct relation references into loaded entity objects. Nested include objects are passed to the direct relation service as TypeORM `relations`; nested request references are not recursively hydrated.
- Scalar relation values are an HTTP/controller contract; generated service inputs remain entity-based.
- For generated routes, request relation hydration reads relation fields from the request body for CREATE, UPDATE, and PARTIAL_UPDATE. It does not hydrate GET/DELETE route parameters.
- CREATE reloads the created entity with configured response relations. UPDATE/PARTIAL_UPDATE reload only when response relation loading is configured. DELETE returns no body. GET_LIST maps `limit`/`page` to `take`/`skip`, applies `orderBy` only when present, and uses a configured normalized query plan for strict filter/order contracts.

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

For `onBeforeUpdate`, use `context.DATA.currentEntity: Readonly<E>` for the existing entity and keep `context.result` as the update patch. Automator resolves the transaction, runs one ordinary decorated GET through the active manager repository when a transaction exists or the service base repository otherwise, creates a top-level detached and frozen shallow snapshot, invokes UPDATE before-hooks, and merges their returned patch into the internal loaded entity without another explicit GET. Nested snapshot values retain aliases to that internal entity and can affect persistence if mutated; no row lock is added. A missing row keeps GET error lifecycle, skips UPDATE before-hooks, and then enters UPDATE error lifecycle.

For other function before-hooks, use `context.DATA.criteria`, `context.DATA.properties`, repository lookups, or TypeORM options when an existing entity or criteria is needed.

Function subscriber transaction expectations are subscriber-declared:

- Use `@ApiFunctionSubscriber({ transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED } })` or `MANDATORY` only when the hook cannot run without `context.DATA.eventManager`.
- Pass the same expectation to `ApiFunctionSubscriberBase` and helper context generics to narrow `eventManager` to `EntityManager`.
- Do not infer subscriber transaction requirements from `@ApiService`, `@ApiFunctionCustom`, or `@ApiFunctionStep`; subscribers without metadata keep optional `eventManager`.

Post-transaction function subscriber lifecycle:

- `onAfterCommit` and `onAfterRollback` run once per matching subscriber after the outer owner has completed the database transaction.
- `context.DATA.transaction` contains the UUID and immutable `FUNCTION`, `ROUTE`, or `SCOPE` owner.
- `context.DATA.events` contains the full ordered trace; `matchedEvents` contains only events that selected that subscriber.
- STEP events remain trace-only and never select subscribers.
- `onBeforeErrorCommit`/`onBeforeErrorRollback` receive raw failures; `onAfterErrorCommit`/`onAfterErrorRollback` receive normalized transaction exceptions.
- `ApiFunctionTransactionScope.runWithDataSource(dataSource, { name }, callback)` owns a named transaction; `runWithEntityManager` only joins an existing Automator owner.

For generated CRUD before hooks, `context.result` includes request targets plus `authenticationRequest`, `headers`, and `ip`. For `@ApiRouteCustom`, `context.result` is only `{ body?, parameters?, query? }`; read `authenticationRequest`, `headers`, `ip`, route metadata, and runtime properties from `context.DATA`.

## Authorization Notes

- Generated CRUD route actions map to the authorization runtime automatically.
- Custom route action identity is `metadata.resource.action` for `@ApiMethod` and `resource.action` for `@ApiRouteCustom`.
- Custom `@ApiMethod(...)` and `@ApiRouteCustom(...)` routes without `metadata.route.type` do not dispatch to CRUD policy hooks; handle them in `getCustomActionRule(action, context)` and branch on the declared `resource.action`.
- Securable custom methods require authorization mode metadata.
- `resourceDefinition.resourcePath` may contain placeholders like `{id}`.
- Policy statement `Resource` values should be concrete strings or wildcard strings such as `gameport:admin:item/*`.
- Omitted authorization cache configuration means `EApiAuthorizationCacheMode.SOURCE_FIRST`: each evaluation re-reads hooks permissions, IAM attachments, and requested IAM documents, and does not read or populate cross-request resolver maps.
- Source-first errors propagate; the resolver never falls back to a previously successful value. Duplicate permissions, attachments, and document IDs are still collapsed inside one resolution.
- `MEMORY` requires explicit positive safe-integer `ttlMs` and `maxEntries`, is bounded independently per resolver cache, and is local to one process.
- `ApiAuthorizationCacheInvalidationService.clearAll()` clears policy, IAM attachment/document, and hook permission caches. Resolver entries exist only in memory mode; policy-rule caching is a separate default-disabled option and requires invalidation whenever enabled rules change.

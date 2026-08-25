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
| Property-wide generated DTO opt-out             | `ApiPropertyDescribe({ isAutoDtoEnabled: false })`      |
| Route-local generated DTO validators            | `autoDto`                                               |
| Manual route DTOs                               | `dto: { [EApiDtoType.*]: DTO }`                         |
| GET_LIST custom item shape                      | `dto: { [EApiDtoType.RESPONSE]: { itemType, name? } }`  |
| Typed GET_LIST filter/order overlay             | `request[EApiControllerRequestTarget.QUERY]`            |
| Generated GET_LIST pagination mode              | `request[QUERY].pagination.mode`                        |
| External GET primary path name                  | `routes[GET].identity`                                  |
| Inherited owner path scope for GET/GET_LIST     | `read.scope.parameters`                                 |
| Stable server list order                        | `order.defaultOrder` + `order.tieBreakers`              |
| Relation hydration                              | `relations.request`                                     |
| Generated route transaction                     | `routes[route].transaction`                             |
| Direct request relation lock                    | `relations.request.load.locks`                          |
| Relation response loading                       | `relations.response.load.include`                       |
| HTTP-aware lifecycle logic                      | `ApiRouteSubscriberBase`                                |
| Persistence-aware lifecycle logic               | `ApiFunctionSubscriberBase`                             |
| Code-first auth rules                           | `ApiAuthorizationPolicyBase` in HOOKS mode              |
| Policy-document auth                            | IAM mode with sources/resolvers                         |
| External transaction scope                      | `ApiFunctionTransactionScope`                           |

Generated controller routes accept GET, GET_LIST, GET_MANY, UPDATE, and DELETE only from the exact same-entity matching built-in capability installed by `@ApiService` or `@ApiFunction*`. Generated CREATE also preflights its protected post-create GET, and UPDATE preflights a protected reload GET when configured. An undecorated same-named override remains directly callable but is not a generated-route implementation. Use subscribers or custom functions/routes for domain-specific behavior; see the 4.0 migration guide.

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

Omitted route keys are generated with default configuration. There is no custom-only/default-disabled mode; explicitly disable CREATE, GET, GET_LIST, UPDATE, PARTIAL_UPDATE, and DELETE when only custom routes should be exposed.

Generated route transaction rules:

- Omitted `transaction` and `SUPPORTS` open no route transaction and preserve the legacy route boundary.
- `REQUIRED` opens a `ROUTE` owner when none exists; `MANDATORY` requires an active owner; `NONE` rejects one.
- Request transformation and validation stay outside a route-owned transaction.
- Request relation hydration, generated service execution, and response relation reload share the active manager.
- When the route opens and owns the transaction, commit lifecycle finishes before response transformation, route-after, authorization result handling, and serialization. A joined outer owner commits later.
- Custom routes do not inherit generated route transaction config.

## DTO Rules

- `EApiDtoType.BODY`, `QUERY`, `PARAMETERS`, and `RESPONSE` are the only DTO keys.
- `autoDto` supports `validators` only.
- Use entity `ApiPropertyDescribe.properties` for field enablement, requiredness, response exposure, filters, guards, and route/DTO-specific behavior.
- `ApiPropertyDescribe.isAutoDtoEnabled` defaults to enabled. `false` preserves metadata, TypeORM behavior, and manual DTO use while omitting the property from every generated DTO, generated Swagger relation component, and metadata-driven or typed client filter/order surface.
- DTO `isEnabled: true`, generated GET identity, `read.scope.parameters`, and client filter/order config cannot reopen a globally hidden property. Explicit `ApiPropertyCopy` bypasses only that global boundary and still applies all remaining source metadata rules.
- PAGE server-only `defaultOrder` and `tieBreakers` may target a described scalar with `isAutoDtoEnabled: false`. CURSOR order fields must be exposed in the generated response, so the same property is rejected for CURSOR ordering.
- Generated CREATE, UPDATE, and PARTIAL_UPDATE bodies omit date fields identified as `CREATED_AT`, `RECEIVED_AT`, or `UPDATED_AT`; responses retain them. Property names do not imply ownership, and `DATE` remains writable.
- Generated GET_LIST `request[QUERY].filter`, `order`, and `pagination` compile with entity/TypeORM metadata into one immutable plan. `INHERIT` overlays metadata; `REJECT` creates an allowlist; route config cannot re-enable a metadata-disabled field.
- Filter fields use exact disabled `{ isEnabled: false }` or enabled non-empty `allowedOperations` plus optional `OMIT`, `REJECT`, or `USE_DEFAULT` missing behavior. Client order fields are direct-scalar enabled/disabled overlays and have no filter-only settings.
- `order.defaultOrder` and `order.tieBreakers` are ordered server-only `{ field, direction }` arrays. They may target any described direct scalar field, including UUID fields excluded from the client order enum. A client order pair replaces defaults, tie-breakers are appended, and duplicate fields retain the earlier entry.
- `pagination.mode` is optional and defaults to `PAGE`. `PAGE` requires `limit` and `page` and returns `IApiGetListResponseResult<E>`. `CURSOR` requires `limit`, accepts zero or one of `after`/`before`, and returns `IApiGetListCursorResponseResult<E>` with exactly `items`, `nextCursor`, and `previousCursor`.
- `CURSOR` requires one primary column and an explicit order whose final tie-breaker is that primary field. The primary field cannot appear earlier or in the client order allowlist; every possible order field must be a selected, persisted, described non-null direct scalar with no TypeORM transformer/accessor and must be unconditionally raw-exposed.
- CURSOR v1 supports only PostgreSQL standard text results and only these TypeORM order declarations: `boolean`; signed `smallint` and `integer`, including increment-generated columns whose DDL uses `SMALLSERIAL`/`SERIAL`; numeric enums backed by `smallint` or `integer`; signed `bigint`, including increment-generated `BIGSERIAL` DDL, exposed as canonical decimal `BIGINT_STRING`; and native `uuid`. SERIAL-family names are PostgreSQL DDL forms, not TypeORM column type literals. Binary mode, custom `extra.types`, all other PostgreSQL types, and all other drivers fail before CURSOR query I/O; PAGE is unchanged. CURSOR rejects entity `@AfterLoad` listeners at bootstrap and applicable active TypeORM `afterLoad` subscribers before query I/O. Subscriber `listenTo()` and active PostgreSQL parser configuration are trusted TypeORM extension code and must be deterministic. Request-only `ApiPropertyDescribe` bounds, lengths, patterns, and `multipleOf` rules do not define the opaque cursor boundary, and `BIGINT_STRING` values never pass through `Number`.
- Manual GET_LIST QUERY DTOs cannot be combined with generated filter/order/pagination config. Manual RESPONSE DTOs remain compatible; CURSOR `{ itemType }` and full wrappers must prove same-name protected item fields and the exact flat envelope through Automator response metadata.
- Generated GET/GET_LIST `read.scope.parameters` creates the PARAMETERS DTO from inherited controller-path mappings and cannot be combined with a manual PARAMETERS DTO.
- The package does not include a consumer-side typed URL/bracket-filter builder in the current 3.x contract.
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

In PAGE mode, controller query parameters (`limit`, `page`, `orderBy`, `orderDirection`, bracketed filters) become TypeORM `take`, `skip`, `order`, and `where` before `service.getList(...)`. With a typed plan, the authoritative parser validates exact paths, operations, cardinality, and scalar values independently of host `ValidationPipe`. It applies `USE_DEFAULT`, then the route transaction AND-merges query, path, and current authorization scope and applies the effective order.

In CURSOR mode, the generated route uses the existing decorated `service.getMany(...)`: the first window is one `limit + 1` query; an `after` or `before` window is that query plus exactly one opposite-direction `take: 1` probe. The GET_MANY BEFORE chain runs once per HTTP request against detached base options, and its candidate `where`/`withDeleted` is reused identically for the main query and probe. Both calls retain that candidate plus query, path, recalculated HOOKS/IAM, and cursor-window predicates. The route authorization action remains GET_LIST; GET_MANY AFTER runs for each actual query. Generated calls own `order`/`take`, force `cache: false`, shadow `select`/`skip`, reject `join`/`lock`, and fail closed on protected result/envelope changes; direct calls retain their ordinary per-call behavior. The strict canonical Base64URL token is stateless and unsigned; it stores version, context hash, and typed order values, so no cursor rows or keys are required. Context binds route, path values, plan signature, normalized actual filter AST, and effective order, but excludes `limit` and IAM scope.

## Generated Read Scope

Generated GET may expose its actual primary column under a different wire parameter with top-level route configuration:

```ts
routes: {
	[EApiRouteType.GET]: {
		identity: { parameter: "gameId" },
	},
}
```

This changes the generated path and PARAMETERS DTO to `:gameId`; it does not select another lookup field or rename response properties. Runtime service criteria still target the actual primary column. Before HOOKS/IAM evaluation, authorization receives both the external alias and the canonical primary-field key, so primary placeholders such as `{id}` and canonical conditions keep their normal meaning. `identity` is GET-only and cannot be combined with a manual PARAMETERS DTO.

An identity-only GET is valid only when the controller path has no inherited dynamic parameters. If the controller path contains any `:parameter`, the same GET must also configure `read.scope.parameters` and map every inherited parameter exactly once.

Generated GET and GET_LIST routes accept:

```ts
read: {
	scope: {
		parameters: [
			{ parameter: "providerKey", field: "providerId" },
		],
	},
}
```

This contract is intentionally closed:

- It is valid only on GET and GET_LIST.
- `parameters` must be a non-empty array and every entry has exactly `parameter` and `field`.
- Every required scalar `:parameter` in the inherited controller `path` must be mapped exactly once; parameters and fields cannot repeat. Wildcards and optional/grouped dynamic parameters fail at bootstrap.
- `field` must be a described direct scalar column. Relations and objects are rejected.
- A GET controller path cannot reuse the effective generated identity parameter or, when an alias differs, inherit the actual primary-field name. Read scope does not rename or replace GET identity.
- A manual `dto[EApiDtoType.PARAMETERS]` is mutually exclusive. `autoDto[PARAMETERS]` validators remain available.

The generated route-local PARAMETERS DTO applies selected entity field metadata under each external path name and drives Nest parameter metadata plus Swagger. GET includes its configured identity alias (or the ordinary primary-field parameter when no alias is configured) and the mappings; GET_LIST includes the mappings. Runtime criteria are merged as identity/query → path → HOOKS/IAM with logical AND. Field conflicts become match-nothing criteria, never last-write-wins replacement. Scalar leaves are normalized to explicit TypeORM `Equal(...)` predicates during an additional-scope merge; object-valued scalar columns must already be wrapped in `Equal(value)` because raw objects denote relation or embedded criteria.

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
- Response reference projection supports destructive `OBJECT` and `SCALAR` shapes only; there is no `FULL` or `PRESERVE` mode.
- Mandatory generated reads force an own `cache: false`. If requested relations use effective TypeORM `relationLoadStrategy: "query"` while the data-source query cache has `alwaysEnabled: true`, the call fails before repository I/O because relation subqueries cannot inherit that root cache bypass. Use join loading or disable the global always-on cache.
- For generated routes, request relation hydration reads relation fields from the request body for CREATE, UPDATE, and PARTIAL_UPDATE. It does not hydrate GET/DELETE route parameters.
- CREATE always reloads the created entity through `service.get(...)`, including configured response relations when present. UPDATE/PARTIAL_UPDATE reload only when response relation loading is configured. DELETE returns no body. PAGE GET_LIST maps required `limit`/`page` to `take`/`skip` and calls `getList`; CURSOR GET_LIST maps required `limit` plus optional `after`/`before` to `getMany` window/probe queries. Both modes use the configured normalized filter/order plan. Without client order they apply `defaultOrder` plus tie-breakers; with client order they replace defaults and append de-duplicated tie-breakers.

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
- Transaction events contain metadata only, never arguments, bodies, entities, or results.
- STEP events remain trace-only and never select subscribers.
- `onBeforeErrorCommit`/`onBeforeErrorRollback` receive raw failures; `onAfterErrorCommit`/`onAfterErrorRollback` receive normalized transaction exceptions.
- `ApiFunctionTransactionScope.runWithDataSource(dataSource, { name }, callback)` owns a named transaction and passes its `EntityManager` to the callback; `runWithEntityManager` only joins an existing Automator owner.
- `ApiFunctionTransactionPostCommitException` means `COMMITTED`. `ApiFunctionTransactionCommitUnknownOutcomeException` means `UNKNOWN`, still invokes commit-error lifecycle, and invokes neither post-commit nor post-rollback. A clean confirmed rollback rethrows the original operation error; `ApiFunctionTransactionRollbackException` is reserved for additional rollback, hook, or rollback-error lifecycle failures and preserves that operation error.

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
- There is no arbitrary immutable controller `baseWhere`. `read.scope.parameters` is limited to request-bound inherited path values; fixed and principal-dependent restrictions belong in HOOKS/IAM scope.
- Array-form authorization `where` values are OR branches and must be non-empty arrays of non-empty plain objects. `AuthorizationScopeMergeWhere` rejects `[]` and empty branches before TypeORM instead of treating them as an unconstrained query. It normalizes scalar leaves to exact `Equal(...)` predicates whenever another scope is merged; use an explicit `Equal(value)` for JSON/JSONB, geometry, or another object-valued scalar.

## 3.0 Export Migration

- Replace `TApiGetDefaultStringFormatPropertiesBigIntStringSign` with `EApiGetDefaultStringFormatPropertiesBigIntStringSign`.
- `EHasPairedCustomSuffixesFieldsArgumentType`, `THasPairedCustomSuffixesFieldsOperationConfig`, and `VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT` were removed.
- `HasPairedCustomSuffixesFieldsValidator` remains public.
- Import public symbols from `@elsikora/nestjs-crud-automator`; internal file paths are not an export contract.

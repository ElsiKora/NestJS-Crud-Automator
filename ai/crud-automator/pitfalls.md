# Crud Automator Pitfalls

## Hand-Written CRUD Too Early

Check whether `@ApiController`, `@ApiService`, entity metadata, route DTO overrides, transformers, relation loading, subscribers, or authorization policies already express the behavior.

Nested owner reads are also native generated CRUD. Prefer GET/GET_LIST `read.scope.parameters` over a hand-written controller that parses a parent id and reconstructs the standard list envelope. Map every inherited controller-path parameter exactly once to a distinct described direct scalar field.

Do not treat read scope as an arbitrary callback or fixed `baseWhere`. It is only a closed mapping from request path values. Fixed or principal-dependent restrictions still belong in HOOKS/IAM scope.

Never return `where: []` or an empty object branch from an authorization scope. Array-form `where` represents OR branches and must contain non-empty plain objects; Automator rejects empty arrays and empty branches before TypeORM so an invalid policy cannot become an unconstrained read.

Do not pass a raw object when the intended scope value is an object-valued scalar column such as JSON/JSONB or geometry. Raw objects mean relation or embedded criteria. Use TypeORM `Equal(value)` explicitly for that scalar value; Automator already normalizes primitive, date, byte-view, and scalar-array leaves during an additional-scope merge.

## Undecorated Generated-Service Overrides

Do not expect a generated route to invoke an arbitrary `get`, `getList`, `getMany`, `update`, or `delete` override. The 4.0 capability boundary accepts only the exact same-entity/type function installed by `@ApiService` or the matching built-in `@ApiFunction*` decorator, and rejects other functions before the Automator-managed route transaction or repository I/O. Such an override may still be called directly. Generated CREATE also preflights its protected post-create GET, and UPDATE preflights a protected reload GET when configured. For generated-route customization, use subscribers; for distinct business behavior, use `@ApiFunctionCustom` or a custom route. A matching built-in decorator owns the resulting CRUD implementation, so the original override body is not an extension hook.

## Old Route Config Shape

Avoid stale flat fields:

- `isEnabled`, `shouldWriteToController`, `decorators`
- route-level `authentication` or `authorization`
- raw `request.transformers` or `request.validators`
- raw `response.transformers`
- `request.relations` or `response.relations`
- `dto.response`

Use current nested config: `generation`, `security`, target-keyed `request`/`response`, `relations.request`/`relations.response`, and `dto[EApiDtoType.RESPONSE]`.

There is no custom-only/default-disabled controller mode. Omitting route keys still generates them; explicitly set `generation.isEnabled: false` on all six generated routes when needed.

## Timestamp Ownership by Property Name

Do not infer write-body ownership from names such as `createdAt`, `receivedAt`, or `updatedAt`. Generated CREATE, UPDATE, and PARTIAL_UPDATE bodies exclude only date fields identified as `CREATED_AT`, `RECEIVED_AT`, or `UPDATED_AT`. Use `DATE` for writable business dates, even when a legacy property name resembles an infrastructure timestamp.

## Function Payload Body Wrapper

Function subscribers receive direct service payloads:

```ts
context.result.slug = "hello";
```

Do not use:

```ts
context.result.body.slug = "hello";
```

Route before hooks can use `context.result.body`.

## Treating `currentEntity` as Deeply Immutable

UPDATE exposes a detached, top-level frozen shallow `context.DATA.currentEntity`. Nested relations, arrays, JSON values, dates, buffers, and lazy values can still alias the internal loaded entity and affect persistence; do not mutate them. A missing decorated GET skips `onBeforeUpdate` and flows through GET then UPDATE error lifecycle.

## Route Authorization Expectation As Guard

`EApiRouteSubscriberAuthorizationExpectation.REQUIRED` narrows before-route subscriber helper types only. It does not authenticate the request or run authorization by itself; the observed route must already guarantee auth through route security/runtime configuration.

## Function Step Overreach

Use `@ApiFunctionStep` only for internal transaction-aware service helpers, including direct helper calls when the selected transaction mode permits. Do not use it as a replacement for `@ApiFunctionCustom` when the operation needs an action name, function subscribers, route metadata, Swagger metadata, or authorization action identity.

Inside a step, prefer `this.getApiFunctionStepContext()` for `eventManager`, `repository`, and `getRepository()`. It intentionally does not expose `operations`; standalone domain actions should remain `@ApiFunctionCustom`.

## Auto DTO Overreach

`autoDto` is for validators only. It does not control exposure, guard visibility, response serialization, requiredness, or pagination mode. Put the global capability baseline in `ApiPropertyDescribe({ properties })`; use generated GET_LIST `request[QUERY].filter`, `order`, and `pagination` for the generated query contract. Use manual `dto` when generation is not appropriate.

When `read.scope.parameters` is present, Automator owns the generated PARAMETERS DTO and Swagger path contract. Do not combine it with `dto[EApiDtoType.PARAMETERS]`. Use `autoDto[PARAMETERS]` only for validators that belong on the generated DTO.

## Reopening A Globally Hidden Property

`ApiPropertyDescribe({ isAutoDtoEnabled: false })` is a property-wide auto-generation boundary, not a default that route configuration can override. Do not try to reopen it with DTO `isEnabled: true`, generated GET identity, `read.scope.parameters`, or a typed client filter/order allowlist; those configurations fail closed. The property remains described and persisted, so PAGE-only server `defaultOrder` and `tieBreakers` may use it without client exposure.

Use explicit `ApiPropertyCopy` when a manual DTO intentionally needs the hidden source property. Copy bypasses only the global auto-DTO boundary; the source metadata's remaining route/DTO, guard, and validation rules still apply. CURSOR cannot order by the property because protected cursor fields must be exposed in the generated response.

## Relation Metadata Arrays

`ApiPropertyDescribe({ type: EApiPropertyDescribeType.RELATION })` does not currently accept `isArray`, `minItems`, `maxItems`, or `isUniqueItems`. Relation arrays are TypeORM relation shape, not describe-array validator metadata.

## Relation Load Config Drift

Use `relations.request.load.include` to select direct request relations to hydrate. Do not use the old request `relations` array or AUTO/MANUAL strategy flags.

Request relation hydration mutates direct relation references into loaded entities. Nested include objects preload relations on the direct loaded entity; they do not implement recursive nested request reference hydration.

## Relation Locks Without a Route Transaction

`relations.request.load.locks` never opens a transaction and never falls back to an unlocked read. Use `pessimistic_read` or `pessimistic_write` only when hydration runs under an active Automator manager, normally through generated route `transaction.mode: REQUIRED`.

Lock keys must be enabled direct `include` keys. Lock acquisition follows `include` declaration order, and locked loads disable implicit eager relations to prevent hidden joins from widening the lock. If a locked direct relation has explicit nested includes, use `relationLoadStrategy: "query"`; do not treat nested includes as a recursive lock DSL.

HTTP scalar references are hydrated by the controller. Do not widen service methods to accept `string | Entity`; direct service callers must load and lock the entity through their own active transaction manager.

Response reference projection supports `OBJECT` and `SCALAR`. Do not assume a `FULL` or `PRESERVE` mode exists.

## Route Transaction Boundary Drift

When generated route `REQUIRED` opens and owns the transaction, keep request transformation and validation before `BEGIN`, then keep request hydration, generated operation, and response reload inside it. That route owner commits and finishes post-commit lifecycle before response transformation and route-after subscribers. If `REQUIRED` joins an outer owner, the outer owner commits later.

Omitted route config and `SUPPORTS` must not add a new `BEGIN`. `MANDATORY` requires an outer Automator owner, `NONE` rejects one, and custom routes remain function/step/scope-owned. A route-after failure for a route-owned transaction occurs after commit and must not be described as rollback.

`ApiFunctionTransactionScope.runWithDataSource` requires `(dataSource, { name }, callback)`, and the callback receives the exact owning `EntityManager`. Do not use the old two-argument signature or treat `runWithEntityManager` as a context-establishing scope; it only joins an existing Automator owner.

## Custom Route Runtime Assumptions

`@ApiRouteCustom` provides runtime behavior, but response relation reload is constrained: the controller needs an `ApiServiceBase` service and response items need `id`.

`@ApiMethod` does not run transformers, validators, relation handling, subscribers, authorization result transforms, or serialization by itself.

`@ApiRouteCustom` request relation hydration only reads the method `@Body()` argument. Custom route subscribers receive auth, headers, IP, metadata, and runtime properties through `context.DATA`, not `context.result`.

## Delete Return Shape Assumptions

Generated service/controller `delete` returns `Promise<void>`. The low-level decorator currently has an internal removed-entity return shape, but app-facing code should not depend on it.

## IAM Resource Placeholders

`resourceDefinition.resourcePath` can contain `{id}` placeholders. IAM statement `Resource` values should be concrete strings or wildcard strings, not template placeholders.

## Resolver Cache Invalidation

Authorization resolver caches are source-first by default, so permission, attachment, and document values are re-read without cross-request map state or stale fallback. Do not add an implicit in-memory fallback for source failures.

If the application explicitly selects `EApiAuthorizationCacheMode.MEMORY`, configure positive `ttlMs` and `maxEntries` and treat the cache as local to one process. Use `ApiAuthorizationCacheInvalidationService` to clear permission, attachment, and document entries when immediate visibility is required; do not inject resolver internals or assume one process invalidates another. Policy-rule caching is separate, and an enabled policy-rule cache still requires `clearPolicyCache()` when its rules change, regardless of resolver cache mode.

## Guard-Based Field Exposure

DTO guard visibility is based on the route's configured guard class during DTO generation. It is not a per-request role/RBAC decision. Use response transformers, subscribers, manual serialization, or authorization result transforms for user-specific masking.

## Generated GET_LIST Boundaries

Generated GET_LIST supports one client `orderBy`, one `orderDirection`, bracketed filters, and two route-owned pagination modes. PAGE (the default) requires `limit`/`page` and returns counts. CURSOR requires `limit`, accepts at most one of `after`/`before`, and returns only `items`, `nextCursor`, and `previousCursor`. Route-owned `defaultOrder` and `tieBreakers` provide the server compound order. Relation filters use one-level to-one scalar paths such as `author.id[...]` and `author.username[...]`; use a custom method for client-selected multi-sort, relation sorting, to-many filters, or deeper relation/object filters.

Do not expose a UUID `id` to client ordering merely to stabilize pages. Server order entries validate against all described direct scalar fields independently of the client allowlist. Use a unique final tie-breaker. A client order replaces defaults; tie-breakers are appended; duplicate fields keep the earlier entry. Duplicate server fields, invalid directions, non-scalar fields, and conflicting default/tie-breaker directions fail at bootstrap.

A configured typed query plan is strict: unknown, disabled, malformed, or incompatible input returns `400` instead of being silently ignored. Do not rely on a host `ValidationPipe` whitelist, infer query exposure from response visibility, re-enable metadata-disabled fields, or combine generated filter/order/pagination config with a manual QUERY DTO. Omit a filter/order section when legacy metadata-driven PAGE behavior is intentional.

Do not use CURSOR mode without an explicit deterministic order. It rejects composite primary keys, nullable/array/missing/`select:false` order metadata, TypeORM value transformers, accessors, entity `@AfterLoad` listeners, conditionally hidden response fields, unsafe object-key names, a primary key exposed to client ordering, or a primary key placed anywhere except the final explicit tie-breaker. Applicable active TypeORM `afterLoad` subscribers fail before query I/O. CURSOR v1 is PostgreSQL-only: use standard text results and only `boolean`, signed int2/int4 (including increment-generated columns whose PostgreSQL DDL uses the SERIAL family), numeric enums backed by int2/int4, signed int8 exposed as canonical decimal `BIGINT_STRING`, or native UUID order columns. Declare the TypeORM types as `smallint`, `integer`, or `bigint`; SERIAL-family names are DDL forms, not TypeORM column type literals. Binary mode, custom `extra.types`, all other types, and all other drivers fail before CURSOR query I/O; PAGE is unchanged. Do not substitute request-only DTO bounds for the physical cursor domain or convert `BIGINT_STRING` through `Number`. Do not add cursor storage, a signing-key option, `pageInfo`, totals, or a read-model/provider/service layer: cursors are unsigned canonical stateless tokens and the generated route uses the existing decorated `getMany` path.

Do not treat a cursor as authorization. Automator recalculates path and HOOKS/IAM predicates on every request and AND-merges them with filters and window predicates. A cursor is bound to route/path/filter/order context, but deliberately not to `limit` or IAM so a client may change window size and current policy remains authoritative.

Do not let CURSOR-specific function/route/auth/DTO transforms change window cardinality, row order, primary/order tuples, or cursor fields. Generated calls fail closed and return the exact asserted plain projection. The GET_MANY BEFORE chain is deliberately one-shot: Automator captures only its detached candidate `where`/`withDeleted` and reuses it for the main window and opposite probe while owning window predicates, `order`, `take`, and `cache: false`. A custom item/full response DTO must prove protected same-name fields and the flat envelope through Automator metadata; aliases, accessors, or wire-time transforms on protected fields are unsafe. Direct GET_MANY subscriber behavior remains unchanged and remains per call.

Do not combine requested relations, effective TypeORM `relationLoadStrategy: "query"`, and a data-source query cache with `alwaysEnabled: true` on a generated mandatory read. Relation subqueries cannot inherit the required root `cache: false`, so Automator fails before repository I/O. Use join relation loading or disable the global always-on query cache.

`missingBehavior: USE_DEFAULT` accepts only static typed defaults. Principal- or tenant-dependent restrictions belong in HOOKS/IAM scope, which is AND-merged once with client/default predicates.

The package does not ship a consumer-side typed URL/bracket-filter builder in the current 3.x contract. Keep that helper in the consumer when needed instead of mistaking the server-owned typed query plan for a client API.

## Removed 3.0 Exports

Use `EApiGetDefaultStringFormatPropertiesBigIntStringSign` instead of the removed `TApiGetDefaultStringFormatPropertiesBigIntStringSign` type. Do not import the removed `EHasPairedCustomSuffixesFieldsArgumentType`, `THasPairedCustomSuffixesFieldsOperationConfig`, or `VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT`; `HasPairedCustomSuffixesFieldsValidator` remains public. Import supported symbols from the package root.

## Docs Drift

If docs conflict with source, source wins. Check `src/interface/**`, `src/type/**`, tests, and public barrels before treating a docs snippet as current API.

---
name: crud-automator
description: Design, audit, document, refactor, and implement NestJS CRUD Automator resources using @elsikora/nestjs-crud-automator. Use when working with ApiController, ApiService, ApiFunction, ApiFunctionCustom, ApiRouteCustom, ApiMethod, ApiPropertyDescribe, ApiPropertyCopy, manual DTOs, autoDto, GET_LIST response item DTOs, transformers, validators, relation loading, subscribers, authorization policies, HOOKS/IAM, transaction scopes, Swagger contracts, or replacing hand-written NestJS CRUD patterns with native Crud Automator features.
---

# Crud Automator

## Source Priority

Use local source as the contract:

1. `src/interface/**`, `src/type/**`, and exported barrels define public API shape.
2. `test/unit/**` and `test/e2e/**` show supported behavior.
3. `docs/**` and `README.md` explain behavior, but may drift and must be checked against source.

## Default Workflow

1. Inspect the existing entity, service, controller, subscriber, policy, and DTO configuration.
2. Prefer native Crud Automator primitives before adding custom controllers, mappers, facades, or wrappers.
3. Verify route config against current interfaces before copying examples.
4. Validate Swagger, DTO shape, relation loading, subscriber firing, authorization decisions, and transaction behavior after meaningful changes.

## Current Contract Reminders

- `@ApiController()` applies Nest `@Controller()` internally; use `path`.
- `routes: {}` is valid and still generates default CRUD routes; omitted route entries do not disable routes.
- Generated controller routes are `CREATE`, `GET`, `GET_LIST`, `UPDATE` (`PUT /:id`), `PARTIAL_UPDATE` (`PATCH /:id`), and `DELETE`.
- `GET_MANY` is service/function/subscriber-only, not a generated HTTP route.
- Route controls live under `generation`: `generation.isEnabled`, `generation.shouldWriteToController`, and `generation.decorators`.
- Route security lives under `security.authentication` and `security.authorization`.
- `authentication.type` is the principal category (`USER`, `ADMIN`, `ACCOUNT`, `MERCHANT`, or project string), not the bearer/security scheme.
- Route-level Swagger security schemes use `authentication.securityRequirements`; one object is an AND group and multiple objects are OR alternatives.
- Request config is target keyed with `EApiControllerRequestTarget.BODY`, `PARAMETERS`, and `QUERY`.
- Response config is target keyed with `EApiControllerResponseTarget.RESPONSE`.
- OpenAPI response headers live directly under `response.headers`, not under `EApiControllerResponseTarget.RESPONSE`.
- `autoDto` is validators-only. Entity `ApiPropertyDescribe({ properties })` remains the capability baseline; generated GET_LIST `request[QUERY].filter`, `order`, and `pagination` own its generated query contract.
- `ApiPropertyDescribe({ isAutoDtoEnabled: false })` keeps entity metadata, TypeORM behavior, and manual DTO use but removes the property from every generated BODY, PARAMETERS, QUERY, and RESPONSE DTO, generated Swagger relation components, and metadata-driven or typed client filter/order input. Omitted or `true` preserves normal generation.
- Route/DTO `isEnabled: true`, generated GET identity, `read.scope.parameters`, and query plans cannot re-enable a globally hidden property. Explicit `ApiPropertyCopy` may deliberately copy it to a manual DTO, but all other route/DTO, guard, and validation rules still apply. PAGE server-only defaults/tie-breakers may use the described scalar; CURSOR ordering cannot because it requires generated response exposure.
- Manual `dto` and `autoDto` route branches are mutually exclusive.
- A manual GET_LIST QUERY DTO is mutually exclusive with generated filter/order/pagination configuration. Manual RESPONSE DTOs remain compatible; CURSOR additionally requires Automator metadata proving its exact flat wrapper and same-name raw protected item fields.
- Generated GET accepts top-level `identity: { parameter: "gameId" }` to rename only its primary-key wire parameter. The service predicate and HOOKS/IAM canonical identity still use the actual primary field, while the response shape is unchanged. Identity-only GET is valid only when the controller path has no inherited dynamic parameters; otherwise the same route needs a complete `read.scope.parameters` mapping.
- Generated GET/GET_LIST `read.scope.parameters` is a non-empty array of `{ parameter, field }` mappings. It must exactly cover every required scalar inherited controller-path parameter once, maps only to distinct described direct scalar fields, and is mutually exclusive with a manual PARAMETERS DTO. Wildcard and optional/grouped dynamic path parameters fail at bootstrap.
- Generated read scope creates a route-scoped PARAMETERS DTO and Swagger contract. GET includes its primary identity under the configured alias or the ordinary primary-field name; GET_LIST adds only inherited scope parameters. Identity/query predicates are AND-merged with path scope and then HOOKS/IAM scope without overwrite semantics.
- GET_LIST order config may declare server-only ordered `defaultOrder` and `tieBreakers` entries. These validate against all described direct scalar fields, including UUID columns that are not client-sortable. A client order pair replaces defaults, tie-breakers are appended, and duplicate fields keep the earlier entry.
- GET_LIST pagination defaults to `PAGE`. Explicit `PAGE` keeps required `limit`/`page` and the count envelope. `CURSOR` keeps required `limit`, accepts at most one of `after`/`before`, omits `page`, and returns only `{ items, nextCursor, previousCursor }`.
- `CURSOR` is a generated-route mode over the existing service: the first window uses one `getMany` query with `take = limit + 1`; a cursor window adds exactly one opposite-direction `take = 1` probe. It does not add a provider, read model, service, cursor table, or signing-key configuration.
- A `CURSOR` order must be explicit. Every possible order field must be a selected, persisted, described, non-null direct scalar with no TypeORM value transformer or accessor and must be unconditionally raw-exposed in the generated response; the entity must have one primary column, and that column must occur only as the final explicit tie-breaker and remain absent from the client order allowlist.
- CURSOR v1 is PostgreSQL-only and requires the standard text result parsers. Its exact TypeORM order-declaration matrix is: `boolean`; signed `smallint` and `integer`, including increment-generated columns physically emitted through `SMALLSERIAL`/`SERIAL` DDL; numeric enums backed by `smallint` or `integer`; signed `bigint`, including increment-generated `BIGSERIAL` DDL, exposed as canonical decimal `BIGINT_STRING`; and native `uuid`. Do not use `smallserial`, `serial`, or `bigserial` as TypeORM column type literals. Binary mode, custom `extra.types`, every other PostgreSQL storage type, and every other driver fail before CURSOR query I/O; PAGE is unchanged. `ApiPropertyDescribe` establishes the primitive wire category and raw exposure, but request-only bounds, lengths, patterns, and `multipleOf` do not constrain the opaque seek boundary. `BIGINT_STRING` never converts through `Number`. Entity `@AfterLoad` listeners are rejected at bootstrap; applicable active TypeORM `afterLoad` subscribers fail before query I/O. Active subscriber `listenTo()` targets and PostgreSQL parser configuration are trusted TypeORM extension code and must be deterministic.
- `ApiPropertyDescribe` object metadata uses `dataType`; manual `ApiPropertyObject` uses `type`.
- `ApiPropertyDescribe` relation metadata does not currently accept array options.
- `GetDefaultStringFormatProperties(format)` provides canonical defaults for supported string formats.
- BigInt string sign options use `EApiGetDefaultStringFormatPropertiesBigIntStringSign`; the old type alias and paired-suffix validator configuration internals were removed. Import supported symbols from the package root.
- Generated CREATE, UPDATE, and PARTIAL_UPDATE bodies omit date fields identified as `CREATED_AT`, `RECEIVED_AT`, or `UPDATED_AT`; responses retain them. Exclusion follows the semantic identifier rather than property names, and `DATE` remains writable.
- There is no custom-only/default-disabled controller mode. Disable all six generated routes explicitly when a controller should expose only custom routes.

## Function And Transaction Model

- Service/function `create` and `update` receive `DeepPartial<E>` directly, not `{ body }`.
- Service/function `get`, `getList`, and `getMany` receive TypeORM options.
- Generated service/context `delete` is `Promise<void>`; direct decorator internals have a known return-shape inconsistency, so document and test the intended surface before changing it.
- `@ApiFunctionCustom({ action, entity, transaction })` is for custom service commands that need function lifecycle, subscribers, and transaction context.
- `@ApiFunctionStep({ entity, transaction })` is for internal service helper methods that need transaction context but are not standalone actions; direct calls are valid when the selected transaction mode permits.
- Function steps do not create subscriber hooks, route metadata, Swagger metadata, or authorization action identities; do not model them as custom actions.
- `@ApiService({ entity, functions })` can configure transaction modes for generated CRUD functions keyed by `EApiFunctionType.CREATE`, `UPDATE`, `DELETE`, `GET`, `GET_LIST`, and `GET_MANY`; omitted entries default to `SUPPORTS`, and `CUSTOM` belongs to `@ApiFunctionCustom`.
- Generated routes preflight the exact bound GET, GET_LIST, GET_MANY, UPDATE, and DELETE function before the Automator-managed route transaction or repository I/O. It must be produced for the same entity/type by `@ApiService` or the matching built-in `@ApiFunction*`; undecorated overrides, accessors, and instance shadows fail closed at that boundary. Direct service calls are outside this route check. Generated CREATE preflights its protected post-create GET, and UPDATE preflights a protected response-reload GET when required. This is the intentional 4.0 breaking boundary.
- Function execution transaction modes use `EApiFunctionTransactionMode` with `transaction.mode`; subscriber requirements use `EApiFunctionSubscriberTransactionExpectation` with `transaction.expectation`.
- Inside decorated service execution, use `this.getApiFunctionContext()` for `operations`, `repository`, `eventManager`, and `getRepository`.
- Inside `@ApiFunctionStep`, use `this.getApiFunctionStepContext()` for `repository`, `eventManager`, and `getRepository`; it intentionally omits `operations`.
- `ApiFunctionTransactionScope.runWithDataSource(dataSource, { name }, callback)` owns a named external transaction and passes its `EntityManager` to the callback; `runWithEntityManager()` is join-only and fails without an active Automator owner registry.
- `onAfterCommit` and `onAfterRollback` run once after the outer transaction ends. Their readonly context exposes the `FUNCTION`, `ROUTE`, or `SCOPE` owner/id, all ordered events, and subscriber-matched events; events contain operation metadata only, never arguments, bodies, entities, or results, and STEP is trace-only.
- Commit/rollback error lifecycle uses `onBeforeErrorCommit`, `onAfterErrorCommit`, `onBeforeErrorRollback`, and `onAfterErrorRollback`. Post-commit failures must remain distinguishable from database rollback.
- `ApiFunctionUpdate` performs one ordinary decorated GET before `onBeforeUpdate`. Read the patch from `context.result`, the active manager repository when a transaction exists (otherwise the service base repository) from `context.DATA.repository`, and the top-level detached and frozen shallow snapshot from `context.DATA.currentEntity`.
- UPDATE does not deep-clone or deep-freeze `currentEntity`: nested values alias the internal loaded entity and can affect persistence if mutated. It does not reload after before-subscribers, add a row lock, or auto-load entities for custom functions. A missing decorated GET skips update-before hooks and flows through GET then UPDATE error lifecycle.

## Route Runtime Model

- Generated route base config accepts `transaction: { mode: EApiFunctionTransactionMode }`. Omitted config and `SUPPORTS` open no route transaction; `REQUIRED` opens or joins, `MANDATORY` requires an active owner, and `NONE` rejects an active transaction.
- When a generated route opens and owns `REQUIRED`, request transformation/validation run first; request relation hydration, the generated service operation, and response relation reload share the route manager; commit lifecycle completes before response transformation, route-after, authorization result handling, and serialization. If `REQUIRED` joins an outer owner, that owner commits later.
- Hydration, operation, and reload failures roll back a route-owned transaction. For a route that opened the transaction, route-after failures happen after commit and must not be reported as rollback.
- Use `@ApiRouteCustom` for custom controller routes that need runtime behavior: transformers, validators, relation handling, subscribers, authorization result transforms, or serialization.
- Generated-route `transaction` config does not apply to `@ApiRouteCustom`; custom functions, steps, or named scopes continue to own transactions.
- Use `@ApiFunctionCustom<Entity>(...)` and `@ApiRouteCustom<Entity>(...)`; response types belong on method return types and response metadata, not decorator generic parameters.
- Use `@ApiMethod` as the low-level metadata/Nest/Swagger/security/throttling composer.
- `@ApiMethod` metadata lives under `metadata.resource`, `metadata.route`, `metadata.response`, `metadata.security`, and `metadata.throttling`.
- Securable custom methods need method-level authorization mode metadata.
- Custom route response relation reload requires `controller.service` to extend `ApiServiceBase` and response items to have an `id`.
- For `@ApiRouteCustom`, request relation loading hydrates only the method `@Body()` argument; custom route before-hook auth, headers, IP, metadata, and runtime properties live in `context.DATA`, not `context.result`.
- Generated GET_LIST `request[EApiControllerRequestTarget.QUERY]` accepts optional sibling `filter`, `order`, and `pagination` sections. Omitted pagination means `PAGE`; omitted filter/order sections preserve legacy metadata-driven behavior in PAGE mode. Configured sections compile into one immutable plan used by dynamic DTO generation, OpenAPI, strict runtime parsing, and TypeORM compilation. `order.defaultOrder` and `order.tieBreakers` provide deterministic server compound ordering while client input remains one `orderBy`/`orderDirection` pair.
- Typed query plans support direct and one-hop to-one scalar filter paths, direct-scalar order paths, `INHERIT` overlays or `REJECT` allowlists, exact disabled fields, narrowed operations, and `OMIT`/`REJECT`/`USE_DEFAULT` missing behavior.
- The authoritative typed parser runs after route-before and request path/query transforms/validators, applies `USE_DEFAULT` when a field group is absent, and rejects malformed or disallowed input independently of host `ValidationPipe`. The optional route transaction then compiles predicates, AND-merges query filters with path scope and then authorization scope, applies the effective order, and runs the service query. CURSOR tokens bind the route, path values, query-plan signature, normalized filter AST, and effective order; `limit` and recalculated HOOKS/IAM scope are intentionally not token context.
- CURSOR remains a GET_LIST authorization action (`onBeforeGetList`) but uses the GET_MANY function lifecycle. Its BEFORE chain runs exactly once per HTTP request against detached base options; only the candidate `where` and `withDeleted` are captured and reused for the main window and opposite probe, while AFTER runs for each actual query. Generated calls re-AND mandatory scope/window `where`, restore route-owned `order`/`take`, force an own `cache: false`, shadow `select`/`skip`, reject subscriber `join`/`lock`, and reject later changes to protected row cardinality, sequence, raw order/primary tuples, cursors, or flat envelope. Direct GET_MANY calls keep their ordinary per-call subscriber contract.
- Every generated mandatory read forces `cache: false`, including against inherited and global TypeORM query caching. Requested relations plus effective `relationLoadStrategy: "query"` plus data-source cache `alwaysEnabled: true` fail closed before repository I/O because relation-loader subqueries cannot inherit the root cache bypass; use join loading or disable the global always-on cache.
- CURSOR custom `{ itemType }` DTOs must use compatible Automator `ApiProperty*` response metadata for every potential order/primary field under the same name; full wrappers must prove exactly `items`, `nextCursor`, and `previousCursor`. The final plain projection is asserted, so `@Expose` aliases, `toPlainOnly` transforms, accessors, and route/authorization transforms cannot mask or rewrite protected values.
- The package does not provide a consumer-side typed URL/bracket-filter builder in the current 3.x contract; that deferral does not change the server-owned typed query contract.

## Relation Model

- Request relation config: `relations.request.reference` and `relations.request.load`.
- Request load config uses `relations.request.load.include`, optional `relations.request.load.relationLoadStrategy`, optional `relations.request.load.services` overrides, and optional direct-relation `relations.request.load.locks`.
- `relations.request.load.include` is the single source of truth for direct request relations to hydrate. Omitted service keys use `${relationName}Service`.
- Request locks accept native TypeORM `pessimistic_read` or `pessimistic_write`, require an active Automator transaction, follow direct `include` declaration order, and disable implicit eager-relation loading. A locked direct relation with explicit nested includes requires `relationLoadStrategy: "query"`; nested loads share the manager without automatic locks.
- HTTP scalar references are controller hydration input. Service `create`/`update` contracts remain entity-based; direct callers load entities through their active manager.
- Response relation config: `relations.response.reference` and `relations.response.load.include` with optional `relationLoadStrategy`.
- `OBJECT` and `SCALAR` are the supported destructive response reference projections. Do not assume `FULL` or `PRESERVE` modes exist.
- HTTP generated relation filters use explicit one-level paths such as `author.id[...]` and `author.username[...]`; top-level `author[...]` is not generated or transformed. A typed plan can narrow these paths but cannot enable deeper or to-many paths.
- Generated relation filters skip relation fields and object fields on the related entity.
- For nested request or response relations, use TypeORM relation object maps in `load.include`.
- Nested request include objects are only passed to the direct relation service as TypeORM `relations`; nested request references are not recursively hydrated.

## Subscriber Model

- Import `ApiSubscriberModule`, register subscriber classes as Nest providers, and mark observed controllers/services with `@ApiControllerObservable()` / `@ApiServiceObservable()`.
- Route subscribers receive route-shaped results such as `{ body, parameters, query, headers, ip, authenticationRequest }` in before hooks.
- Custom route subscribers receive `{ body?, parameters?, query? }` in `context.result`; read auth/header/IP data from `context.DATA`.
- Route subscriber authorization expectations are declared on `@ApiRouteSubscriber({ authorization: { expectation } })`; they are type-only. Use matching class/context generics with `EApiRouteSubscriberAuthorizationExpectation.REQUIRED` only when the route contract guarantees `authenticationRequest.authorizationDecision`.
- Function subscribers receive service payloads directly; do not use `context.result.body` in function subscribers.
- Function subscriber transaction expectations are declared on `@ApiFunctionSubscriber({ transaction: { expectation } })`; they are not inferred from service/function config. Use matching class/context generics for `REQUIRED` or `MANDATORY` so `context.DATA.eventManager` narrows to `EntityManager`.
- Custom hooks are `onBeforeCustom`, `onAfterCustom`, `onBeforeErrorCustom`, and `onAfterErrorCustom`.
- Higher `priority` runs earlier; returned non-`undefined` hook results flow to later subscribers.

## Authorization Model

- Use `EApiAuthorizationMode.HOOKS` plus `ApiAuthorizationPolicy` for code-first app rules.
- Use IAM mode for policy documents, principal resolution, document sources, attachment sources, and boundaries.
- Register `@ApiAuthorizationPolicy()` classes as Nest providers.
- IAM policy document `Resource` values match literally or with wildcards; `{id}` placeholders belong in `resourceDefinition.resourcePath`.
- Authorization resolver caches default to `EApiAuthorizationCacheMode.SOURCE_FIRST`: every evaluation reads hooks permission, IAM attachment, and IAM document sources without cross-request map reads, writes, or stale fallback.
- `MEMORY` is explicit process-local opt-in and requires positive safe-integer `ttlMs` and `maxEntries`; each resolver cache receives its own bound.
- In memory mode, use `ApiAuthorizationCacheInvalidationService` when resolver backing data must be visible before TTL expiry.
- Hooks policy-rule caching is separate, default-disabled, and can still be enabled per registry or policy; clear an enabled rule cache when its rules change regardless of resolver mode. `clearAll()` clears both cache families.

## Verification Checklist

- Generated Swagger matches request and response contracts.
- DTO fields are scoped correctly for body/query/parameters/response.
- GET_LIST uses the intended response mode: full wrapper DTO or `{ itemType, name? }`.
- Typed GET_LIST DTO/OpenAPI fields match the normalized plan, two controllers over one entity receive distinct plan-scoped schemas, and strict parsing remains effective with host query whitelist changes.
- Generated read PARAMETERS DTO/OpenAPI fields exactly match the configured GET identity alias and inherited path mappings, manual PARAMETERS DTO exclusion holds, authorization receives the canonical primary field, and identity/query → path → IAM criteria remain conjunctive on conflicts.
- GET_LIST defaults/tie-breakers accept described UUID scalars without exposing them to client sort, replace defaults on client order, de-duplicate predictably, and keep page/limit results deterministic for an unchanged dataset.
- CURSOR DTO/OpenAPI exposes `limit`, optional paired client order, filters, and optional exclusive `after`/`before`, never `page`; its response is the flat three-field envelope. Tokens reject cross-route/path/filter/order reuse before database I/O, while current path and HOOKS/IAM predicates plus the one-shot GET_MANY candidate remain mandatory on both window and probe queries.
- Route generation, transaction mode, security, request/response targets, relation locks, and DTO config type-check.
- Subscribers fire on the route/function path being exercised.
- Authorization metadata, policy documents, resource definitions, and cache invalidation match runtime behavior.
- No wrapper helper was added where a native primitive is already clear.

## Additional Resources

- For detailed source-aligned guidance, see [reference.md](reference.md).
- For copyable patterns, see [examples.md](examples.md).
- For common failure modes, see [pitfalls.md](pitfalls.md).
- Version 3.0.2 is the published baseline before the current source. The generated-route capability boundary requires a major release; see [Migrating to 4.0](../../docs/guides/migrating-to-4-0/page.mdx). Release automation owns the exact publishing version.

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

## Subscriber Registry Lifetime

`apiSubscriberRegistry` is process-wide. `ApiSubscriberModule` removes an application's subscribers in `onApplicationShutdown`, after the HTTP server closed, and `app.close()` runs that hook without `enableShutdownHooks()`. Do not add a reset, a manual unregister, or an `onModuleDestroy` removal for sequential applications; an application that is not closed keeps its subscribers registered.

The server close does not wait for handlers. A handler whose client disconnected, or one running under `FastifyAdapter({ forceCloseConnections: true })`, can finish after `app.close()` and silently skip its remaining subscribers, such as after-subscribers. Automator does not track running requests.

Two applications alive at the same time in one process still share the registry: until one closes, a matching operation in either runs the subscribers of both. Subscribers can also stay registered if another provider's hook throws during close or `TestingModule.init()` fails during bootstrap.

Do not call services that need subscribers from another provider's `onApplicationShutdown`, such as an audit write or outbox flush. Nest runs this hook by module depth, shallower first, and at the same depth a later import runs first, so whether subscribers are still registered depends on `imports` order. Use `beforeApplicationShutdown`.

## Principal-Dependent Guards Before Authentication

Plain `execution.guards` entries run before `security.authentication.guard`, so `request.user` is not set yet. Do not run the authentication guard twice or move it into `execution.guards`; declare the dependent guard as `{ guard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }` (or `AFTER_AUTHORIZATION` when it needs the authorization decision). Global guards registered with `APP_GUARD`, such as a globally registered `ThrottlerGuard`, always run before the whole staged route chain and never see the principal. The stock `ThrottlerGuard` tracks `request.ip`; override `getTracker` to key limits by the principal.

## Function Step Overreach

Use `@ApiFunctionStep` only for internal transaction-aware service helpers, including direct helper calls when the selected transaction mode permits. Do not use it as a replacement for `@ApiFunctionCustom` when the operation needs an action name, function subscribers, route metadata, Swagger metadata, or authorization action identity.

Inside a step, prefer `this.getApiFunctionStepContext()` for `eventManager`, `repository`, and `getRepository()`. It intentionally does not expose `operations`; standalone domain actions should remain `@ApiFunctionCustom`.

## Misinterpreting Execution Observation

Named-owner observation measures inclusive native callback execution, including context creation, subscribers and nested work. It is not isolated SQL or database-lock-wait time, and parent/child durations must not be summed. Match entity constructors, not their names; distinct constructors may share a name.

Keep execution status separate from owner outcome. A successful step can belong to a rolled-back or unknown transaction, and a later post-commit hook failure does not undo COMMIT. Preflight failures, failed startup and unreached selectors create no duration. Report `droppedCount` when capacity, incomplete work or invalid clocks omit selected intervals.

`onSettled` runs after the best-effort release attempt, context exit and terminal lifecycle. It isolates throws/rejections and never awaits returned work; this does not make expensive synchronous callbacks free or preemptible. Use only bounded capture, with transport elsewhere. Observation does not change STEP subscriber behavior, ordinary event payloads, native pending-event errors or transaction ownership.

## Auto DTO Overreach

`autoDto` is for validators only. It does not control exposure, guard visibility, response serialization, requiredness, or pagination mode. Put the global capability baseline in `ApiPropertyDescribe({ properties })`; use generated GET_LIST `request[QUERY].filter`, `order`, and `pagination` for the generated query contract. Use manual `dto` when generation is not appropriate.

When `read.scope.parameters` is present, Automator owns the generated PARAMETERS DTO and Swagger path contract. Do not combine it with `dto[EApiDtoType.PARAMETERS]`. Use `autoDto[PARAMETERS]` only for validators that belong on the generated DTO.

## Reopening A Globally Hidden Property

`ApiPropertyDescribe({ isAutoDtoEnabled: false })` is a property-wide auto-generation boundary, not a default that route configuration can override. Do not try to reopen it with DTO `isEnabled: true`, generated GET identity, `read.scope.parameters`, or a typed client filter/order allowlist; those configurations fail closed. The property remains described and persisted, so PAGE-only server `defaultOrder` and `tieBreakers` may use it without client exposure.

Use explicit `ApiPropertyCopy` when a manual DTO intentionally needs the hidden source property. Copy bypasses only the global auto-DTO boundary; the source metadata's remaining route/DTO, guard, and validation rules still apply. CURSOR cannot order by the property because protected cursor fields must be exposed in the generated response.

## Unnamed Mixin Classes

A mixin that returns `class extends Base {}` produces a class without a name. TypeORM stops its inheritance chain at the first unnamed class, so neither TypeORM nor Automator maps columns or relations declared on it or above it. Name the returned class, for example `abstract class ArchivableEntity extends Base {}`.

## Relation Metadata Arrays

`ApiPropertyDescribe({ type: EApiPropertyDescribeType.RELATION })` does not currently accept `isArray`, `minItems`, `maxItems`, or `isUniqueItems`. Relation arrays are TypeORM relation shape, not describe-array validator metadata.

## Cyclic Entity Imports Without `Relation<T>`

When two entity files import each other, type their relation properties as `Relation<T>` (`import type { Relation } from "typeorm"`) in examples, tests and consumer code; in a native ES module application it is required. With `emitDecoratorMetadata` (SWC `decoratorMetadata`), a plain `author: UserEntity` is read while the ES module loads and fails with `ReferenceError: Cannot access 'UserEntity' before initialization`, SWC's `typeof` guard included; CommonJS hides the cycle. The package reads `design:type` only in `filter-order-by-from-entity.utility.ts`, for columns without an explicit `type`. `test/consumer/cyclic` and the SWC consumer `test/consumer/swc` cover it in the consumer smoke.

## To-Many Request Relations

A `relations.request` reference to a `OneToMany` or `ManyToMany` relation is one value, as for to-one. CREATE hydrates it into a one-element array and binds that row; a `OneToMany` row that already belongs to another parent moves to the new entity, because TypeORM writes its foreign key, while a `ManyToMany` reference only adds a join row. UPDATE and PARTIAL_UPDATE reject any present to-many key, `null` included, with `400` `REFERENCE_NOT_VALID`, `details.type` `TO_MANY_UPDATE_KEY`, and `details.reason` "to-many reference is not allowed on update", before loading or locking any relation and before writing, because TypeORM would save the value as the whole set. The rule reads the entity's TypeORM relations: it holds without `relations.request`, for relations left out of `include` and for `include: false`, for relations inside embedded columns (dotted `propertyName` such as `meta.extras`), and on a table inheritance root for relations declared only on a child, with or without a generated read route. It runs after route BEFORE subscribers and before request transformers and validators. The generated update body schemas do not declare to-many relations. `@ApiRouteCustom` routes with `route.type` UPDATE or PARTIAL_UPDATE get the same check before hydration and the handler; custom routes of another type or without a type are not checked. The check reads the received body under the entity's property names, so it misses a custom body DTO that maps another wire name onto a to-many property (`@Expose({ name: "doc_tags" }) docTags`): after `ValidationPipe` `transform: true` the handler gets `docTags`, and forwarding it to `service.update` replaces the set. Do not map wire names onto to-many properties of an update DTO, or drop the property in the handler. The to-one `REFERENCE_NOT_VALID` body keeps `details: { expectedShape, propertyName, referenceKey }`. Do not send a to-many key on an update, not even `null` to clear it; an update body without the key leaves stored rows untouched. Change to-many sets in a custom route. In other `@ApiRouteCustom` handlers, read a hydrated to-many body property as an array: `body.tags` is `[tag]`, not `tag`.

## To-Many Response Relations

`relations.response` projects `OneToMany` and `ManyToMany` element by element: `OBJECT` gives `[{ id }]`, `SCALAR` gives `[id]`, and a relation with no rows gives `[]`. Null elements stay in place. Do not expect the fields of related rows: the projection is destructive for to-many exactly as for to-one. To return more than the reference, omit Automator response loading and use a manual response DTO or transformer.

The generated response DTO and Swagger describe each relation as the route sends it. An included relation is the configured reference: an object with only the configured key for `OBJECT`, the key value for `SCALAR`, and an array of it for a to-many relation, with `minItems: 0` and no `maxItems`. The key has the type it is described with on the related entity, so an integer `id` is not a UUID. A relation outside `include` keeps the relation DTO, `{ id }`. The reference key, `id` included, must be a non-nullable scalar described with `@ApiPropertyDescribe` on the related entity, or startup fails with an error that names the controller and route; so does `id` on a target with a composite primary key, `load` without `reference`, and a `lazy: true` relation in `include`. Do not reuse the item DTO of a relation property described as `OBJECT` with a `dataType`: once the relation is included, the schema is the reference.

A relation is required in the response schema only when the route always sends it: it is in `include` with a truthy value, or it is eager. An explicit `isRequired` on the relation does not change this. Read any other relation as optional. A to-one relation is nullable when TypeORM can return `null`: a target with a `@DeleteDateColumn`, even on `nullable: false`; the inverse side of a one-to-one relation; otherwise the owner side unless it is `nullable: false` or every join column is non-null or primary. `isNullable` in the describe metadata of a relation does not change its response schema. A to-many relation is `[]` when empty, never `null`. `ApiPropertyCopy` of a relation reads the entity, not a route: it stays `{ id }`, required and non-null.

A generated PUT or PATCH answers with the row as GET reads it on that route, by the key in the request path. Do not read a relation back from its response unless the route has it in `include` or it is eager: a relation key of the body is stored, not echoed. Neither the result of a function `onAfterUpdate` subscriber nor its change to `context.result` in place reaches this response, so do not mask a field there; mask it in a route `onAfterUpdate` or a function `onAfterGet` subscriber. `service.update()` still returns the saved object, with the raw value of the body under a relation key. A generated POST likewise answers with the row it inserted, read by the key TypeORM saved, so a function `onAfterCreate` result or in-place change does not reach its response either.

The response read of a generated POST, PUT or PATCH runs after the write. If it misses the row (a scope move, a `@DeleteDateColumn` set by the body, a GET `onBeforeGet` filter, a GET `onAfterGet` that throws), the route fails while a `SUPPORTS` write stays; under TypeORM `replication` a `SUPPORTS` route can read a stale replica. Use route `REQUIRED` when the client must not see a failure for a landed write or a stale response. Do not pair a `MANDATORY` service function with a `SUPPORTS` or `NONE` route that calls it, or a `NONE` function with a `REQUIRED` or `MANDATORY` route: startup refuses it. This covers the GET function of CREATE, GET, UPDATE and PARTIAL_UPDATE, and the route's own CREATE, UPDATE or DELETE function. Do not override `create` with a plain method on a service behind a generated POST: startup refuses it, because only the built-in CREATE function reports the key of the inserted row.

Do not rely on the order of to-many elements: it is not guaranteed. Do not expect nested `load.include` data in a response: projection reduces each direct relation to its reference.

TypeORM `lazy: true` relations are not supported in responses: one in `load.include` fails at startup, and any other serializes to `{}`. Use a non-lazy relation with `load.include`.

Do not expect a `{ items }` response to be recognized by shape alone. A GET_LIST route, generated or custom with `route: { type: EApiRouteType.GET_LIST }`, reads it as an envelope, and any other declared type reads `items` as a property of the entity. A custom route without a declared type reads it as an envelope unless its `resource.entity` owns an `items` property; such a route that returns an envelope must declare GET_LIST. Without it the whole envelope is read as one entity: the listed rows are not reloaded or projected, and when `load.include` names the entity's own `items` relation every listed row collapses into its reference, `{ items: [{ id }], totalCount }` or `items: [id]` with `SCALAR`.

## Relation Load Config Drift

Use `relations.request.load.include` to select direct request relations to hydrate. Do not use the old request `relations` array or AUTO/MANUAL strategy flags.

A `relations.request` block that passes startup must not fail at request time because of its configuration, on every entity and enabled route, GET, GET_LIST, DELETE and `@ApiRouteCustom` included. At decoration: include and lock keys must be relations on the route entity or a parent class, a lock needs a matching enabled include, a valid mode, and `relationLoadStrategy: "query"` when its include is nested, a lock cannot sit on a route with `transaction.mode: NONE`, and `reference`, `include`, `locks`, and service overrides must be well formed. At application bootstrap: nested include keys must be relations or embedded properties of the related entity, and each enabled include needs an `ApiServiceBase` on the controller. REQUEST-scoped controllers get no bootstrap hook. Do not list a relation declared only on a `@ChildEntity` in `relations.request` of a table-inheritance root controller: startup fails with `... relations.request key "<key>" is declared only on child entity <Child> of table inheritance root <Root>. Declare the relation on <Root> or use a controller for <Child>.` This is Automator's rule, not a TypeORM limit. `relations.response` on the root may still use child relations.

Request relation hydration mutates direct relation references into loaded entities. Nested include objects preload relations on the direct loaded entity; they do not implement recursive nested request reference hydration.

## Relation Locks Without a Route Transaction

`relations.request.load.locks` never opens a transaction and never falls back to an unlocked read. Use `pessimistic_read` or `pessimistic_write` only when hydration runs under an active Automator manager, normally through generated route `transaction.mode: REQUIRED`. A lock on a route with `transaction.mode: NONE` fails at decoration. With any other mode, no route transaction and no outer scope, the request fails with `Request relation locks require an active transaction`, because only the outer scope can tell.

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

## Discriminated Body Errors Through The Global Pipe

Root-level discriminated `@ApiRouteCustom` bodies are validated by Crud Automator, not by the host `ValidationPipe`, so a global `exceptionFactory`, `whitelist`, or `transformOptions` does not apply. Mirror them on the body config (`exceptionFactory`, `validatorOptions`, `transformOptions`); set `validatorOptions.validationError: { target: false, value: false }` when the factory must not see submitted values.

## Oversized Request Bodies

A body deeper than 64 levels or with an object of more than 1000 keys answers `400` on every `@ApiMethod`, generated and `@ApiRouteCustom` route. Do not add an option or a per-route override, and do not design a free-form request object that can pass 1000 keys; use an array of entries. No `exceptionFactory` or subscriber error hook sees this `400`. Global and controller interceptors run before the check, so they see the unchecked body. A host with its own `400` contract must translate this one in a filter with `ApiRequestValidationGetErrors`; reading only `instanceof ApiRequestValidationException` misses one the correlation interceptor wrapped. Do not send a failure's `property`, which holds client keys.

The same check refuses a key `__proto__`, `constructor`, `hasOwnProperty` or `prototype` at any depth and a NUL in any string or key. Do not design a free-form payload around those keys, and send binary data as base64, not as a string holding NUL.

A plain Nest route with a transforming `ValidationPipe` is not covered, and `class-transformer` is quadratic in the keys of one object: 1 MiB in one object held the event loop for about 11 s on Fastify's default `bodyLimit`. Set `new FastifyAdapter({ bodyLimit })` where plain routes take JSON. Express defaults to 100 KiB.

## Path Values As Strings Or Wider Than The Column

Generated routes validate and convert path values once per request, before `ApiAuthorizationGuard`. `read.scope`, subscribers, and the service call get typed values (a `NUMBER` path value is a number); IAM `request.parameters`, `resourcePath`, and `${request.parameters.*}` get canonical text (`"16"`, lower-case UUID, `"true"`, ISO 8601 UTC with ms). Do not compare typed values as strings in subscribers or IAM values as numbers, do not authorize on `request.params` in a guard that runs before `ApiAuthorizationGuard` (it is still raw text there), do not rely on a configured `dto[PARAMETERS]` to widen or change the conversion (it only narrows), do not send `1`/`0` for a boolean, and do not leave a securable `@ApiRouteCustom` resourcePath path parameter undescribed (startup error), including on a route inherited from a base controller. Do not assume bodies, custom route query DTOs, or a GET_LIST query without `filter`/`order`/`pagination` are validated without a host `ValidationPipe`: only path values, typed query plans, and root-level discriminated `@ApiRouteCustom` bodies are. Do not expect a custom route path parameter with no rule in its PARAMETERS DTO to be checked before IAM: it reaches conditions as sent; any rule in that DTO, under any `@Expose` name and through mapped types, decides the value IAM sees. Do not put side effects in a `@Transform` of such a DTO: it runs several times per request and on samples at startup. Do not write a `@Transform` that changes its own output on such a DTO (`p-` on every call, base64 decode): it fails at startup or returns `400`, because the handler must read the value IAM saw; convert in the handler. Do not convert in the handler without declaring the DTO (`@Param("id") id: number`, `ParseIntPipe`) on an IAM route: it can read another value than IAM saw. Do not rely on a value both conversions read differently (`@IsDefined() id: number`, `/016`): it returns `400`; pin the type with `@Type`, or read the sent text from `obj[key]` in the `@Transform`. Do not limit a `@Transform` of a path value to `groups`, `since`, or `until`, an `@Expose` to `since` or `until`, or a validator to `groups`, or expose one parameter name from two properties: all fail at startup. Do not use a decimal column as a path value on a securable route, IAM or HOOKS: startup fails, because a HOOKS policy compares `context.parameters` as text too. Do not send an upper-case UUID in a path: it is a `400`, not lower-cased. Do not expect `/016` or `/-0` to find a row of an integer column described as a string: it returns `400`. Do not rely on a Deny under a case-insensitive collation: it compares text, so `/ABC` finds the row of `abc`. Do not use a bare `@IsBoolean()` on such a path value: implicit conversion makes `false` `true`, so startup fails; use `ApiPropertyBoolean`. Do not expect a bare `@IsUUID()` to canonicalize: a Deny on a lower-case UUID misses another spelling; use `ApiPropertyUUID` or a pure `@Transform`. Do not build `ApiAuthorizationGuard` with `new` without `ApiAuthorizationParametersRuleRegistry` as its second argument. Do not send `?counts=1,2` for a list: a comma is not a separator; repeat the key or send one value. Do not expect `016`, `1e3`, or `0x10` to name row `16`; they return `400`. Do not describe a `bigint` column as an integer `NUMBER`: a bound outside `Number.MAX_SAFE_INTEGER` fails at startup, so use `EApiPropertyStringType.BIGINT_STRING`. Do not expect a `DATE` path, query, or body value to be a `Date`; it stays the validated `YYYY-MM-DD` string. Do not expect `404` for a malformed id; it is a `400` with the `ValidationPipe` body (`message: ["id must be a UUID"]`) before any query, and on a securable route the guard returns it before interceptors run, so it has `correlationID` and `timestamp` only with `CorrelationIDResponseBodyExceptionFilter`. `BEFORE_ERROR` subscribers see the raw string only when that check fails.

`ApiAuthorizationGuard` refuses a malformed path value before any pipe, so a host `exceptionFactory` never sees it. Do not expect the pipe to answer it in the host's own contract: translate `ApiRequestValidationException` in a filter with `ApiRequestValidationGetErrors` and the same factory. class-validator failures arrive untouched; the others carry the parameter as `property` and the constraints `pathParameterNotCanonical`, `pathParameterNoText`, `pathParameterConversionMismatch`, `pathParameterUnstable`, or `isDefined`.

## Serializing The Interceptor Cause

`CorrelationIDResponseBodyInterceptor` rethrows a new `HttpException` with what it caught in `cause`: the `ThrottlerException` or `HttpException` itself, whose own cause stays at `exception.cause.cause`, otherwise the value as thrown, which may not be an `Error`. A filter must answer with `exception.getResponse()`, which is always an object with `correlationID`, `statusCode`, and `timestamp`, and with `error` and `message` unless the thrown object response left them out, and report only `FormatErrorEvidenceForLog(exception.cause)`.

Never send, log, or serialize `exception.cause`, its message, or the exception itself. `logger.error(exception)`, `util.inspect(exception)`, `JSON.stringify(exception)`, and `FormatUnknownForLog(exception)` all include it and can expose SQL text and parameters. Removing `cause` from a copy is not enough, because Nest keeps the same value in `exception.options.cause`. `JSON.stringify(exception)` can also throw on a cyclic object or a `BigInt`.

Guards run before interceptors, so their exceptions reach filters directly, without this `cause`, until `CorrelationIDNormalizeException` builds it.

## Guard Errors Without The Correlation Contract

The interceptor never runs for a guard or middleware rejection. Without `CorrelationIDResponseBodyExceptionFilter`, a `401`, `403`, or `429` from a guard or middleware, an unmatched route `404`, and a malformed body `400` have no `correlationID`, `timestamp`, or `x-correlation-id` header. Register `app.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(app.get(HttpAdapterHost)))` next to the interceptor. A malformed URL and Node.js HTTP parser errors are answered by Fastify before Nest and never get the contract.

Nest runs only one filter per exception: `useGlobalFilters` beats `APP_FILTER`, and the last registered wins. Register this filter before an app filter. An app filter that wins sees the raw exception, so it must start with `CorrelationIDNormalizeException(exception, host, httpAdapterHost)` and answer with the returned exception through `httpAdapterHost.httpAdapter.reply`. Never answer through `host.switchToHttp().getResponse().status()`: a middleware failure carries the native response, which has no `status`, `header`, or `sent`. An app filter registered before this filter never runs for a matching failure. Do not detect processed failures by a `correlationID` in the body; a consumer can throw that body. The filter acts only in HTTP: RPC failures keep the default handling, and global filters never reach gateways. NestJS 12 runs global interceptors on gateway calls; the interceptor passes them through. Never apply it to a gateway with `@UseFilters`: Nest then skips its default WebSocket handling, and the client gets neither an `exception` event nor an acknowledgement; outside HTTP each registered component only logs one warning, once per component instance (an instance flag), never once per call or message. Every error body has `correlationID`, `error`, `message`, `statusCode`, and `timestamp`, wherever it is thrown. A body field keeps its value only with the contract type (`statusCode` equal to the status, `message` a string or string array, `error` a string); otherwise `statusCode` becomes the status and `message` and `error` the status text (`"Error"` for a status Node.js does not name), and a string or array response becomes `message`. A thrown object is an http-errors value only with an integer `statusCode` from 400 to 599, and its message reaches the client only with `expose: true`; anything else is an unknown failure answering `500` with `error: "Internal Server Error"`, and so is an `HttpException` whose status is not an integer from 200 to 599. The exception DTOs declare the same five fields, with `message` and `error` as free text.

## Client Correlation IDs

`CorrelationIDResponseBodyInterceptor`, `CorrelationIDResponseBodyExceptionFilter` and `CorrelationIDNormalizeException` keep a client `x-correlation-id` only when it is one header of 1 to 128 characters of `[A-Za-z0-9._:-]`, after Node.js strips whitespace around the header value. Anything else, including a repeated header, gets a generated UUID. Do not expect a long or free-text client ID back; send a UUID. A bare CR, a bare LF, a NUL, or an obsolete line folding gets the `400` of Node.js, with no correlation ID. The response header and the body `correlationID` always match, and the OpenAPI schema declares a string of 1 to 128 characters with that pattern, not a UUID. Guards and middleware run before the ID is resolved, so `request.headers["x-correlation-id"]` is the raw client value there; `ApiAuthorizationGuard` passes it to authorization. Do not trust it before the interceptor or filter ran.

## Delete Return Shape Assumptions

Generated service/controller `delete` returns `Promise<void>`. The low-level decorator currently has an internal removed-entity return shape, but app-facing code should not depend on it.

## IAM Resource Placeholders

`resourceDefinition.resourcePath` can contain `{id}` placeholders. IAM statement `Resource` values should be concrete strings or wildcard strings, not template placeholders.

## IAM Deny Scope

Do not assume a resource-conditioned Deny blocks the whole request. Generated routes evaluate IAM before loading the row, so a Deny whose `resource.*` keys compile is a row exclusion: the list omits those rows and GET/UPDATE/DELETE answer `404`, not `403`. Only Deny statements without `resource.*` keys, non-compilable ones, and `resource.*` Deny on CREATE return `403`.

A row-specific Deny `Resource` such as `<type>/item-1` hides that row from `list` only when the Deny's `Action` matches `list`; a Deny on `read` does not widen to `list`. Its placeholder must map to an `isFilterable` field in `resourceDefinition.fields` (`{id}` → `resource.id`), and a prefix pattern such as `<type>/abc*` also needs a STRING-described direct property, otherwise the list is denied. On SQLite and case-insensitive MySQL collations the prefix match is case-insensitive and may hide extra rows.

Do not expect `StringNotEqualsIfExists` to spare NULL rows: a stored NULL is present and differs from any non-empty value, so the Deny applies to it. Condition values of `""`, or variables resolving to `null` or `""`, deny the whole request instead of compiling.

Custom routes that query on their own must apply `decision.scope.where`; ignoring it skips both Allow scopes and Deny exclusions.

Condition operators outside `EApiPolicyConditionOperator` are rejected when the document is loaded. Do not use AWS operators such as `StringLike` or `ArnEquals`.

## Resolver Cache Invalidation

Authorization resolver caches are source-first by default, so permission, attachment, and document values are re-read without cross-request map state or stale fallback. Do not add an implicit in-memory fallback for source failures.

If the application explicitly selects `EApiAuthorizationCacheMode.MEMORY`, configure positive `ttlMs` and `maxEntries` and treat the cache as local to one process. Use `ApiAuthorizationCacheInvalidationService` to clear permission, attachment, and document entries when immediate visibility is required; do not inject resolver internals or assume one process invalidates another. Policy-rule caching is separate, and an enabled policy-rule cache still requires `clearPolicyCache()` when its rules change, regardless of resolver cache mode.

## Guard-Based Field Exposure

DTO guard visibility is based on the route's configured guard class during DTO generation. It is not a per-request role/RBAC decision. Use response transformers, subscribers, manual serialization, or authorization result transforms for user-specific masking.

## Generated Component Names

Do not hard-code pre-5.0 component names such as `UserEntityGetResponseDTO` or `UserControllerUserEntityGetListQuery<signature>DTO` in `$ref` strings, tests, or client code: every generated name now starts with the controller's schema prefix and has no entity name, as in `UserGetResponseDTO` for `UserController`. Do not merge two controllers on one entity, or give them identical guards, to avoid a schema clash; each controller already gets its own components. Renaming a controller class renames its components, so regenerate API clients after such a rename.

Give every decorated controller class a unique name within an application. An anonymous class such as `ApiController({ ... })(class {})` fails at decoration. A custom route declared on a class without a name fails at bootstrap unless a class decorated with `@ApiController` inherits it, because it would have no DTOs and no validation; a provider that inherits such a class serves nothing and does not fail. A property or variant name made only of separators, such as `_`, fails startup, and so does the handler of a custom route that generates DTOs; `dto` is a legal name and gives `…DtoDTO`, and it clashes with a sibling that normalizes the same way, such as `_dto`. The bootstrap check of each application (`app.init()`, not `compile()`) fails for two classes with the same schema prefix (`UserController` in two modules mounted with `RouterModule`, or `User` and `UserController`), for two different classes with one component name anywhere in a route schema of a generated or custom route (for example a GET_LIST `dto.response.name` equal to another generated name, a hand-written DTO named like a generated one on another controller or a custom route, or two STI children nesting different classes named `AddressDTO`), and for a lazy `type: () => Class` that throws or returns `undefined`. Routes of plain `@Controller` classes in the same application are checked too, so a plain `@ApiOkResponse({ type: UserGetResponseDTO })` next to `UserController` fails. Decoration never raises these, so re-evaluating a module (HMR, `vi.resetModules`) and several test applications in one process are fine as long as each application contains one class per prefix. Tests that expect these errors must call `init()` on an application with at least one `@ApiController` class; overriding `ApiAuthorizationGuard` does not skip the check. Call `app.init()` before exporting the document with `SwaggerModule.createDocument`, because a document built without it is not checked.

## Generated GET_LIST Boundaries

Generated GET_LIST supports one client `orderBy`, one `orderDirection`, bracketed filters, and two route-owned pagination modes. PAGE (the default) requires `limit`/`page` and returns counts. CURSOR requires `limit`, accepts at most one of `after`/`before`, and returns only `items`, `nextCursor`, and `previousCursor`. Route-owned `defaultOrder` and `tieBreakers` provide the server compound order. Relation filters use one-level to-one scalar paths such as `author.id[...]` and `author.username[...]`; use a custom method for client-selected multi-sort, relation sorting, to-many filters, or deeper relation/object filters.

Do not expose a UUID `id` to client ordering merely to stabilize pages; UUID and `timestamptz` fields are client-sortable, but a unique tie-breaker belongs in `tieBreakers`. Server order entries validate against all described direct scalar fields independently of the client allowlist. Use a unique final tie-breaker. A client order replaces defaults; tie-breakers are appended; duplicate fields keep the earlier entry. Duplicate server fields, invalid directions, non-scalar fields, and conflicting default/tie-breaker directions fail at bootstrap.

A configured typed query plan is strict: unknown, disabled, malformed, or incompatible input returns `400` instead of being silently ignored. Do not rely on a host `ValidationPipe` whitelist, re-enable metadata-disabled fields, or combine generated filter/order/pagination config with a manual QUERY DTO. Omit a filter/order section when legacy metadata-driven PAGE behavior is intentional. Both paths apply one rule, the published OpenAPI schema: a typed route also validates its generated QUERY DTO after the parser, so entity number bounds and string length, format and pattern apply to filter values with or without a host pipe, and do not expect the typed parser to accept `ASC`. A calendar `date` field (`format: EApiPropertyDateType.DATE`) filters by `YYYY-MM-DD` text compared as written on both paths, in every time zone; do not send a time, an offset or an ISO instant there (`400`), and give a typed `defaultCondition` calendar text, not a `Date`. A date-time filter takes only the UTC instant `YYYY-MM-DDTHH:mm:ss.sssZ` (send `toISOString()` output) and a `time` field takes `HH:mm:ss`; other forms are `400`. Do not cast a typed filter config to list comparison operations on a `string` date, time or decimal property: the config type allows them and bootstrap checks the describe kind.

Do not expect to filter or order by a column the list response hides (`select: false`, `isExpose: false`, a disabled GET_LIST response side, a response guard the route guard does not match, or a field a manual list response DTO leaves out): it has no filter group or `orderBy` value, a request naming it returns `400` before any SQL on every route and pipe mode, a typed config enabling it or a manual QUERY DTO publishing its filter group fails at startup, and a PAGE route with a manual list response fails at startup until its generated filters match that response. `{ isEnabled: false }` on such a field stays valid, for filters and orders alike. A manual list response counts a field by the name its OpenAPI schema publishes, as for ordering. A nested `relation.field` filter is judged by the related entity's own list response, not by what the route embeds: it stays filterable when that entity publishes the field, so disable it per route (`filter.fields["relation.field"]: { isEnabled: false }`) to hide it. A value an authorization `resultTransform` removes at request time is not covered; disable that filter yourself.

A PAGE route without a typed filter validates its own QUERY DTO from 5.0.0, with or without a host pipe. `orderBy` from a client is held to the route's orderable fields even with a manual QUERY DTO (`400 ORDER_NOT_VALID` before any query, whatever the DTO allows, also when the DTO exposes it under another query name with `@Expose`), `orderDirection` is lowercase only (on every GET_LIST route, typed routes and manual QUERY DTOs included), `limit` and `page` are required and capped at 100, `in`/`notin` take 1 to 100 `[values]` and `between` exactly two, as on typed plans, and `isnull`/`notnull` take no value. A `<field>[operator]`, `<field>[value]` or `<field>[values]` key the DTO does not publish returns `400` with `property <key> should not exist`, instead of the unfiltered list: a misspelled field, the root primary key, a relation itself such as `author[...]`, a column hidden from the QUERY DTO, any filter a manual QUERY DTO does not declare, or a field on a to-many relation such as `tags.name[...]` (the generated DTO publishes one-hop to-one paths only, as typed plans do). Every other key the DTO does not publish, such as a cache-buster `_=…`, `utm_source` or `name[foo]`, returns the same `400`; a typed plan rejects them too, with `FILTER_NOT_VALID`. Do not tell clients to append cache-busters to GET_LIST. A filter never answers unfiltered: with a manual QUERY DTO, a half group (`label[value]` or `label[operator]=eq` alone), both `[value]` and `[values]`, a value next to `isnull`/`notnull`, or a value key its operator does not take (`eq` with `[values]`, `in` with `[value]`, `between` without exactly two `[values]`; `in`, `notin`, `excl` and their case-insensitive forms take `[values]`, every other operator one `[value]`, as on a generated DTO) returns `400 FILTER_NOT_VALID`, and a DTO that publishes a filter group the route cannot apply (unknown column, root primary key, hidden column, bare relation, deep or to-many path) fails at startup (at instantiation for a static controller, in `app.init()` for a REQUEST-scoped one). Filters need a flat query parser, which keeps a key such as `label[operator]` as sent: Fastify's default parser, or Express's `simple` parser, the Express 5 default. Express's `extended` parser runs `qs`, which rewrites `label[operator]=eq&label[value]=x` into a nested `label` object before the route reads the query, so the route never sees the filter group; do not set `app.set("query parser", "extended")` on an application with GET_LIST filters. A name a manual QUERY DTO exposes with `@Expose`, such as `sort`, is published instead of the property behind it, so `orderBy=x` next to it returns `400`. Do not put a name on `@Expose` of a filter property such as `label[value]`: the route reads filters from their own query keys, so that fails at startup too. Do not document or send `id[...]` for a route without a typed filter: its QUERY DTO does not publish the root primary key, while a typed filter takes it from metadata. On every GET_LIST route, a number or uuid filter value is parsed before any SQL: an empty, blank or malformed one answers `400 FILTER_NOT_VALID`, and a number binds as the number it names. Its DTO validation runs before the date-time calendar check, so a date value the DTO rejects answers the DTO body and an accepted one outside the calendar answers `FILTER_NOT_VALID`. The route validates the raw request query, so a custom host pipe that rewrites it (for example lowercasing `ASC`) no longer rescues a request; rewrite in a route-before subscriber instead. On typed routes a host `ValidationPipe` answers first with its enum-message `400` body, and without one the route answers `ORDER_NOT_VALID`. Do not expect a column hidden from the GET_LIST response (disabled or `isExpose: false`), or disabled as a GET_LIST query field, to be orderable: since 5.0.0 the orderBy enum of every GET_LIST route, legacy or typed, contains only columns whose values the list response exposes, the query side enables, and `useAsOrderByFilter` allows, for the route guard. With a manual list response DTO (wrapper or `{ itemType }`), only item properties in its published OpenAPI schema stay orderable, so document them with `@ApiProperty` or Automator property decorators. An `@ApiRouteCustom` GET_LIST route with `autoDto` QUERY narrows its `orderBy` enum to its `response.type` class the same way. When no column is orderable, the route documents neither `orderBy` nor `orderDirection` and answers `400` to either. A typed or CURSOR `order.fields` entry naming another column fails at startup, and the error names the controller, the route, the field and the reason it is not orderable.

Do not write a `date` column value transformer whose `to` handles only a `Date`: list filters bind `YYYY-MM-DD` text and request bodies keep it, so it answers `500`, and startup cannot detect it. Do not expect a partial operator to skip a field's `format` or full-value `pattern`: `mail[operator]=cont&mail[value]=exam` on an email field returns `400`. A numeric enum filter takes the published number as its exact text, so `1.0` or a member's name returns `400`. `multipleOf` is an exact decimal check under the `isDivisibleBy` constraint, in filter values and bodies alike.

Build server-side temporal values as Date. Strings must be UTC instants with Z. A Date built from zone-less text is read in the process TZ. This holds for date-time values a route-before subscriber writes into a GET_LIST query and for a typed `defaultCondition`, on typed and legacy routes alike: a `Date` binds as the instant it names, a subscriber string in another form answers `400`, and a `defaultCondition` string in another form fails at startup naming the controller, route and field. Do not hand-build zone-less date-time text on the server.

Do not use CURSOR mode without an explicit deterministic order. It rejects nullable/array/missing/`select:false` order metadata, TypeORM value transformers, accessors, entity `@AfterLoad` listeners, conditionally hidden response fields, unsafe object-key names, a primary key component exposed to client ordering, or a primary key that is incomplete or placed anywhere except the final explicit tie-breakers. Applicable active TypeORM `afterLoad` subscribers fail at bootstrap and again before query I/O. CURSOR v1 is PostgreSQL-only: use standard text results and only `boolean`, signed int2/int4 (including increment-generated columns whose PostgreSQL DDL uses the SERIAL family), numeric enums backed by int2/int4, signed int8 exposed as canonical decimal `BIGINT_STRING`, native UUID, or `DATE_TIME` `timestamptz` order columns with a declared integer `precision` from 0 to 3. Do not leave a temporal order column at the PostgreSQL default precision of 6 or declare a precision that differs from the physical column. Do not order CURSOR by `timestamp` or a `Date`-constructor column: neither identifies one instant and both fail at bootstrap. `@CreateDateColumn({ precision: 3 })` fails too, because the driver stores it as `timestamp`, so declare `type: "timestamptz"` explicitly. A stored temporal value outside years 0001 through 9999 is served while it stays inside a window, so the outcome depends on `limit`: the request fails closed only when that value must become a cursor boundary. `infinity` fails closed on every window that reads it. Declare the TypeORM types as `smallint`, `integer`, or `bigint`; SERIAL-family names are DDL forms, not TypeORM column type literals. Binary mode, custom `extra.types`, all other types, and all other drivers fail at application bootstrap, naming the route and the driver, and again before CURSOR query I/O; PAGE is unchanged. Do not substitute request-only DTO bounds for the physical cursor domain or convert `BIGINT_STRING` through `Number`. Do not add cursor storage, a signing-key option, `pageInfo`, totals, or a read-model/provider/service layer: cursors are unsigned canonical stateless tokens and the generated route uses the existing decorated `getMany` path.

Do not treat a cursor as authorization. Automator recalculates path and HOOKS/IAM predicates on every request and AND-merges them with filters and window predicates. A cursor is bound to route/path/filter/order context, but deliberately not to `limit` or IAM so a client may change window size and current policy remains authoritative.

Do not let CURSOR-specific function/route/auth/DTO transforms change window cardinality, row order, primary/order tuples, or cursor fields. Generated calls fail closed and return the exact asserted plain projection. The GET_MANY BEFORE chain is deliberately one-shot: Automator captures only its detached candidate `where`/`withDeleted` and reuses it for the main window and opposite probe while owning window predicates, `order`, `take`, and `cache: false`. A custom item/full response DTO must prove protected same-name fields and the flat envelope through Automator metadata; aliases, accessors, or wire-time transforms on protected fields are unsafe. Direct GET_MANY subscriber behavior remains unchanged and remains per call.

Do not combine requested relations, effective TypeORM `relationLoadStrategy: "query"`, and a data-source query cache with `alwaysEnabled: true` on a generated mandatory read. Relation subqueries cannot inherit the required root `cache: false`, so Automator fails before repository I/O. Use join relation loading or disable the global always-on query cache.

Do not load relations with `relationLoadStrategy: "query"` from an entity whose primary key includes a PostgreSQL `timestamptz`, `timestamp`, or `date` column, or when their join columns include one. Do not declare a to-many `@RelationId` or request to-many `loadRelationIds` on such an entity. The relation query would bind parsed `Date` values that pg serializes through a truncated whole-minute offset, so Automator fails at bootstrap or before query I/O; use `relationLoadStrategy: "join"` and load the relation itself. On MySQL, keep key and filter datetime columns at precision 0 to 3 and run the process in a zone without daylight-saving gaps. Do not order a paged read of an entity with a temporal primary key and joined relations by a relation path; it fails closed.

`missingBehavior: USE_DEFAULT` accepts only static typed defaults. Principal- or tenant-dependent restrictions belong in HOOKS/IAM scope, which is AND-merged once with client/default predicates.

The package does not ship a consumer-side typed URL/bracket-filter builder in the current 3.x contract. Keep that helper in the consumer when needed instead of mistaking the server-owned typed query plan for a client API.

## Generated Error Statuses

Do not add `401`, `403`, `404`, or `409` to generated routes with `generation.decorators`; the route declares them from its config. Do not expect `401` without a guard or `404` on GET_LIST. `security.authentication`, `execution.guards`, and `@UseGuards` on the class or the route declare `401` and `403`; a guard registered with `APP_GUARD` is out of reach, so document its statuses yourself. Custom routes also get `403` from a securable controller with `authorization`, `429` from `throttling.default`, `400`/`413`/`415`/`500` on every route, each validator exception status, and `404` from an enabled relation in `relations.request.load.include` and any key in `relations.response.load.include`, also one set to `false`; set only what a handler throws, `404`, `409`, and the guard flags, in `response.errors`, which has no `hasBadRequest` or `hasInternalServerError`. Declare statuses the package cannot see, such as a global `ThrottlerGuard` `429`, with `documentation.response.statuses` and `DtoGenerateException(status)`; a status declared there replaces the default response of that status. Do not declare the same status twice with `generation.decorators` or `@ApiResponse`: Swagger joins the descriptions instead of replacing them. Do not expect `error`, `correlationID`, or `timestamp` on any status: every DTO requires only `statusCode` and `message`. `throw new NotFoundException()` with no interceptor answers `{ "message": "Not Found", "statusCode": 404 }`, and the body parser and guards answer before the interceptor, so register `CorrelationIDResponseBodyExceptionFilter` for the full contract everywhere.

## Widening WHERE Criteria

Generated `get`, `getList`, `getMany`, `update` and `delete` refuse a `where` holding an `undefined` or `null` value, an empty relation object, an empty OR array or an empty OR branch; single-row `get`, `update` and `delete` also refuse a missing or empty `where`. Drop optional conditions instead of setting them to `undefined`, and use `IsNull()` for SQL `NULL`. The refusal is an `InternalServerErrorException`.

## Relying On The Package To Load `.env`

Crud Automator never loads `.env` (before 5.0.0 it ran `dotenv` on import). Load environment files in the application, for example with `node --env-file=.env` or `@nestjs/config`; the logger reads `NCD_LOG_LEVEL` from `process.env` only, once per logger at its first message (not at import), so `ConfigModule.forRoot()` loading `.env` during bootstrap works. Do not read environment values at module scope in package code; resolve them when first used.

## Imports Inside Dependencies

Import a dependency only through its root or an explicit key of its `exports` map, not even for types. Never use a path that resolves only through a wildcard key such as `./*.js`:

- `@nestjs/swagger/dist/*` is closed; Swagger 12 exports only the root and `./plugin`. Use the root or the `TSwagger*` OpenAPI types.
- Nest metadata constants and `RouteParamtypes` come from `@nestjs/common/internal`, and `InstanceWrapper` from `@nestjs/core/internal`, not from `@nestjs/common/constants.js` or `@nestjs/core/injector/*`.
- TypeORM metadata types come from the `typeorm` root or the derived `TTypeOrm*` types, not from `typeorm/metadata-args/*`, `typeorm/metadata/*` or `typeorm/query-builder/*`.
- A package without an `exports` map may be imported below its root only through the allowlist in `scripts/check-declaration-imports.cjs` (`lodash/<name>.js`). 5.x needs `@nestjs/swagger` 12 with NestJS 12; Swagger 11 belongs to 4.x.

## Table Inheritance Read Responses

Do not add DTOs, options, or a list of variants for a single-table-inheritance root: generated GET and GET_LIST already produce them from TypeORM metadata.

Import every child entity file before the controller. Variants compile at decoration, so a child reachable only through an `entities` glob misses that moment. The controller constructor then fails startup naming the classes, before Swagger. A child imported late and never registered in the data source fails the same way. A root with no child entity loaded at decoration fails startup too. A REQUEST-scoped controller, including one made request-scoped by its service, is constructed per request, so every request answers the generic `500` body until the import order is fixed; the message naming the classes appears only in the server log. A stub service that does not depend on the TypeORM repository, combined with `TypeOrmModule.forRootAsync` and an `entities` glob, can let the controller be constructed before the glob loads the child, so the check stays silent and rows of that child fail closed with `500`.

Do not place a plain class with `@Column` between the root and a child: `DataSource.initialize()` throws, because TypeORM takes child columns from the parent by property name and leaves such classes out of the parent tree. Use a `@ChildEntity() abstract class`. A plain class without columns is fine.

Do not expect filters, order, pagination, HOOKS/IAM scope, or read scope on child columns; they stay on the root. Generated writes stay parent-only, so their bodies and responses carry no child columns.

Do not promise the rows of a to-many child relation through `relations.response`: it delivers only their references, `[{ id }]` or `[id]`. Use a generated controller on the child table with `read.scope.parameters`, or an eager `OBJECT` array with `isArray`, `dataType`, and a manual item DTO. A child-only key in `relations.response.load.include` does not compile on `@ApiController<Root>`; type the controller as `@ApiController<Root & Partial<Child>>` and keep the side-effect import of the child file, because `import type` does not load it. Do not add `declare` keys to the root: under `useDefineForClassFields` and `noImplicitOverride` the child property then fails with TS2612 and TS4114.

The root must declare the discriminator as a property with `@Column` and `@ApiPropertyDescribe`; a column that exists only in `@TableInheritance({ column })` fails startup. These also fail startup: `select: false` or a numeric type on the discriminator, numeric discriminator values, hiding the discriminator from GET or GET_LIST responses, a leaf value outside the column enum, a value with a character other than letters, digits, `_` and `-` (`"my type"`, `"card.transfer"`), and a value whose DTO name suffix equals another generated name of the entity (`CARD_TRANSFER_ISSUER` next to `CARD_TRANSFER` with an `issuer` relation). Values are never normalized. Once the root declares the discriminator property, its column options decide and the options in `@TableInheritance({ column })` are ignored, as in TypeORM.

Rows with a value that has no variant fail with `500`, so adding a value to the column enum without a child entity breaks reads of those rows until the child exists. A subscriber or response transform that removes the discriminator from a loaded row fails the request the same way.

From 5.0.0, generated GET and GET_LIST over such a root no longer produce the 4.x `<Root>GetResponseDTO` and `<Root>GetListResponseDTO` Swagger components, and `GenerateEntityInformation(Child).tableName` returns the root table. A `relations.request` key declared only on a child entity fails startup. Regenerate OpenAPI clients, or keep a manual RESPONSE DTO on the route.

## Base Entity Type

From 5.0.0 `IApiBaseEntity` is `object`, a breaking change: it has no index signature and no `name`, and a `declare module` augmentation of it gives `TS2300`. Declare every key on the entity, or on your own interface that extends `IApiBaseEntity`. Do not read undeclared keys with `(entity as Record<string, unknown>)[key]`, which is `TS2352` on a non-generic entity; use `keyof E` or `Reflect.get`. An `entity` option, `ErrorString` and `GenerateEntityInformation` take a `TApiEntityReference`: it refuses `{ foo: 1 }` and an instance of a class without a `name`, but not `{}` or a function, so `@ApiController` catches those when the class is decorated. In code generic over `E`, write `{ limit, page } as TApiControllerGetListQuery<E>` for `getList` and `"ownerId" as keyof E` or no argument for `scopeToOwner`.

## Describe Metadata By Class Name

`MetadataStorage` keys `@ApiPropertyDescribe` metadata by class, not by class name. Pass the class to `setMetadata` and `getMetadata`; `getMetadata(Class)` and `getMetadata(Class, property)` already include the class's ancestors, so do not loop over ancestor names. `getAllEntitiesMetadata()` returns a `Map` keyed by class. For a `{ name }` reference such as a string relation target or an `EntitySchema`, call `ResolveMetadataTarget(reference)` first. It reads `@Entity` registrations (`getMetadataArgsStorage().tables`), not `DataSource` entity metadata, so a name known only through a `DataSource` fails or resolves to an unrelated same-named `@Entity` class, and an `EntitySchema` without a `target` class always fails; a name that matches no `@Entity` class or several fails startup with `Metadata target "<name>" ...`, so pass the class or give the classes distinct names. Passing a class name to `getMetadata` or `setMetadata` throws a `TypeError`. Before 5.0.0, classes that shared a name wrote into one entry property by property, so each class saw a mix of both classes' descriptions. Subscriber, policy and generated DTO registries, including the guard and validator classes in the DTO cache key, are keyed by class as well: `apiSubscriberRegistry.getFunctionSubscribers` and `getRouteSubscribers` take the class, a request runs the subscribers of the route entity or `repository.metadata.target` class (a string `repository.target` is never resolved), policy rules are cached per subscriber instance, two GET_LIST `{ itemType }` classes with one name on one entity fail startup until one gets a distinct `name`, one wrapper `name` cannot serve both PAGE and CURSOR routes of one entity in either order, and a string relation target in a GET_LIST filter that names several entity classes fails startup instead of being skipped, including on a route with a manual QUERY DTO. `GenerateEntityInformation` matches tables, columns and relations by class. The check runs when a controller is decorated and when it is instantiated, so import order does not matter; a class that arrives later, such as through `LazyModuleLoader`, fails requests that filter through that relation with the same error. Classes re-declared by HMR or inside test functions register new entries; the old ones stay, and a string relation target that names such a class then fails startup with `matches 2 entity classes`.

## Same-Named Entities In One Module

`TypeOrmModule.forFeature([DocA, DocB])` with two classes named `Doc` registers one repository token, `DocRepository`, and the last class wins. From 5.0.0 a controller with an enabled generated route fails startup when its service repository is for a class outside the lineage of its entity, and the error names both classes and tables. Declare each class in its own module or rename one. A controller with only custom routes must disable all six generated routes to use another entity's service. A REQUEST-scoped or lazy-loaded controller reports this on its first generated request as a 500 with the error logged, because Nest does not run its bootstrap hook.

## Removed 3.0 Exports

Use `EApiGetDefaultStringFormatPropertiesBigIntStringSign` instead of the removed `TApiGetDefaultStringFormatPropertiesBigIntStringSign` type. Do not import the removed `EHasPairedCustomSuffixesFieldsArgumentType`, `THasPairedCustomSuffixesFieldsOperationConfig`, or `VALIDATOR_HAS_PAIRED_CUSTOM_SUFFIXES_FIELDS_CONSTANT`; `HasPairedCustomSuffixesFieldsValidator` remains public. Import supported symbols from the package root.

## Free-Form Objects

Do not put a raw `class-validator` `@ValidateNested()` without `@Type` on a plain object: `whitelist: true` removes every key and `forbidNonWhitelisted: true` rejects them. For a free-form value use `@ApiPropertyObject({ type: Object })` without `shouldValidateNested`, which keeps its keys; a key `__proto__`, `constructor`, `hasOwnProperty` or `prototype` answers `400` on every `@ApiMethod` route before the pipe. Under a `ClassSerializerInterceptor` with `strategy: "excludeAll"` a free-form response value comes back as `{}`, at every level, so declare a class or leave the strategy off that route. Nothing inside it is validated beyond `isUniqueItems` comparing array items, so do not treat it as checked input.

## Discriminator Keep Option

Do not set `shouldKeepDiscriminatorProperty: false` on an `@ApiPropertyObject` request property: it fails at decoration, because a removed discriminator cannot be validated. Leave the option out to keep the property. For entity metadata that is only read, set `properties[route][BODY].isEnabled: false` on each write route; `isResponse: true` on a write body decorates and then rejects every write. At root level on `@ApiRouteCustom`, `false` removes the property before validation, so a variant that requires it fails at startup, unless `validatorOptions.skipMissingProperties` is set. A variant that requires it only through raw `class-validator` is not detected and rejects every body.

## Calendar Dates As `Date` Objects

Do not type a `DATE` or `TIME` request property as `Date` or call `Date` methods on it: `@ApiPropertyDate` keeps `YYYY-MM-DD` and `HH:mm:ss` as text, so the stored day does not move with the process time zone. Only a `DATE_TIME` value, which must be the UTC instant `YYYY-MM-DDTHH:mm:ss.sssZ`, becomes a `Date`; `enableImplicitConversion` does not change that. Do not describe a date with `ApiPropertyString` and `format: DATE`: it fails at decoration. Do not expect a generated route to check a body without a host `ValidationPipe`; list filters are the exception, the route checks them itself.

## Docs Drift

If docs conflict with source, source wins. Check `src/interface/**`, `src/type/**`, tests, and public barrels before treating a docs snippet as current API.

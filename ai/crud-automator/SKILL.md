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
- `autoDto` is validators-only. Field exposure, requiredness, filters, guards, and response visibility belong to `ApiPropertyDescribe({ properties })`.
- Manual `dto` and `autoDto` route branches are mutually exclusive.
- `ApiPropertyDescribe` object metadata uses `dataType`; manual `ApiPropertyObject` uses `type`.
- `ApiPropertyDescribe` relation metadata does not currently accept array options.
- `GetDefaultStringFormatProperties(format)` provides canonical defaults for supported string formats.

## Function And Transaction Model

- Service/function `create` and `update` receive `DeepPartial<E>` directly, not `{ body }`.
- Service/function `get`, `getList`, and `getMany` receive TypeORM options.
- Generated service/context `delete` is `Promise<void>`; direct decorator internals have a known return-shape inconsistency, so document and test the intended surface before changing it.
- `@ApiFunctionCustom({ action, entity, transaction })` is for custom service commands that need function lifecycle, subscribers, and transaction context.
- `@ApiFunctionStep({ entity, transaction })` is for internal service helper methods that need transaction context but are not standalone actions; direct calls are valid when the selected transaction mode permits.
- Function steps do not create subscriber hooks, route metadata, Swagger metadata, or authorization action identities; do not model them as custom actions.
- `@ApiService({ entity, functions })` can configure transaction modes for generated CRUD functions keyed by `EApiFunctionType.CREATE`, `UPDATE`, `DELETE`, `GET`, `GET_LIST`, and `GET_MANY`; omitted entries default to `SUPPORTS`, and `CUSTOM` belongs to `@ApiFunctionCustom`.
- Function execution transaction modes use `EApiFunctionTransactionMode` with `transaction.mode`; subscriber requirements use `EApiFunctionSubscriberTransactionExpectation` with `transaction.expectation`.
- Inside decorated service execution, use `this.getApiFunctionContext()` for `operations`, `repository`, `eventManager`, and `getRepository`.
- Inside `@ApiFunctionStep`, use `this.getApiFunctionStepContext()` for `repository`, `eventManager`, and `getRepository`; it intentionally omits `operations`.
- `ApiFunctionTransactionScope.runWithDataSource()` and `runWithEntityManager()` provide external transaction scope; CRUD `operations` reject without a decorated service context.

## Route Runtime Model

- Use `@ApiRouteCustom` for custom controller routes that need runtime behavior: transformers, validators, relation handling, subscribers, authorization result transforms, or serialization.
- Use `@ApiFunctionCustom<Entity>(...)` and `@ApiRouteCustom<Entity>(...)`; response types belong on method return types and response metadata, not decorator generic parameters.
- Use `@ApiMethod` as the low-level metadata/Nest/Swagger/security/throttling composer.
- `@ApiMethod` metadata lives under `metadata.resource`, `metadata.route`, `metadata.response`, `metadata.security`, and `metadata.throttling`.
- Securable custom methods need method-level authorization mode metadata.
- Custom route response relation reload requires `controller.service` to extend `ApiServiceBase` and response items to have an `id`.
- For `@ApiRouteCustom`, request relation loading hydrates only the method `@Body()` argument; custom route before-hook auth, headers, IP, metadata, and runtime properties live in `context.DATA`, not `context.result`.

## Relation Model

- Request relation config: `relations.request.reference` and `relations.request.load`.
- Request load config uses `relations.request.load.include`, optional `relations.request.load.relationLoadStrategy`, and optional `relations.request.load.services` overrides.
- `relations.request.load.include` is the single source of truth for direct request relations to hydrate. Omitted service keys use `${relationName}Service`.
- Response relation config: `relations.response.reference` and `relations.response.load.include` with optional `relationLoadStrategy`.
- HTTP generated relation filters use explicit one-level paths such as `author.id[...]` and `author.username[...]`; top-level `author[...]` is not generated or transformed.
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
- Use `ApiAuthorizationCacheInvalidationService` after backing authorization data changes; `clearAll()` clears policy, IAM attachment/document, and hook permission caches.

## Verification Checklist

- Generated Swagger matches request and response contracts.
- DTO fields are scoped correctly for body/query/parameters/response.
- GET_LIST uses the intended response mode: full wrapper DTO or `{ itemType, name? }`.
- Route generation, security, request/response targets, relations, and DTO config type-check.
- Subscribers fire on the route/function path being exercised.
- Authorization metadata, policy documents, resource definitions, and cache invalidation match runtime behavior.
- No wrapper helper was added where a native primitive is already clear.

## Additional Resources

- For detailed source-aligned guidance, see [reference.md](reference.md).
- For copyable patterns, see [examples.md](examples.md).
- For common failure modes, see [pitfalls.md](pitfalls.md).

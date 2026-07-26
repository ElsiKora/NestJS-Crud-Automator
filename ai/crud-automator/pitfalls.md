# Crud Automator Pitfalls

## Hand-Written CRUD Too Early

Check whether `@ApiController`, `@ApiService`, entity metadata, route DTO overrides, transformers, relation loading, subscribers, or authorization policies already express the behavior.

## Old Route Config Shape

Avoid stale flat fields:

- `isEnabled`, `shouldWriteToController`, `decorators`
- route-level `authentication` or `authorization`
- raw `request.transformers` or `request.validators`
- raw `response.transformers`
- `request.relations` or `response.relations`
- `dto.response`

Use current nested config: `generation`, `security`, target-keyed `request`/`response`, `relations.request`/`relations.response`, and `dto[EApiDtoType.RESPONSE]`.

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

## Route Authorization Expectation As Guard

`EApiRouteSubscriberAuthorizationExpectation.REQUIRED` narrows before-route subscriber helper types only. It does not authenticate the request or run authorization by itself; the observed route must already guarantee auth through route security/runtime configuration.

## Function Step Overreach

Use `@ApiFunctionStep` only for internal transaction-aware service helpers, including direct helper calls when the selected transaction mode permits. Do not use it as a replacement for `@ApiFunctionCustom` when the operation needs an action name, function subscribers, route metadata, Swagger metadata, or authorization action identity.

Inside a step, prefer `this.getApiFunctionStepContext()` for `eventManager`, `repository`, and `getRepository()`. It intentionally does not expose `operations`; standalone domain actions should remain `@ApiFunctionCustom`.

## Auto DTO Overreach

`autoDto` is for validators only. It does not control exposure, guard visibility, filters, response serialization, or requiredness. Put those in `ApiPropertyDescribe({ properties })` or use manual `dto`.

## Relation Metadata Arrays

`ApiPropertyDescribe({ type: EApiPropertyDescribeType.RELATION })` does not currently accept `isArray`, `minItems`, `maxItems`, or `isUniqueItems`. Relation arrays are TypeORM relation shape, not describe-array validator metadata.

## Relation Load Config Drift

Use `relations.request.load.include` to select direct request relations to hydrate. Do not use the old request `relations` array or AUTO/MANUAL strategy flags.

Request relation hydration mutates direct relation references into loaded entities. Nested include objects preload relations on the direct loaded entity; they do not implement recursive nested request reference hydration.

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

## Unsupported Generated GET_LIST Features

Generated GET_LIST supports one `orderBy`, one `orderDirection`, `limit`, `page`, and bracketed filters. Relation filters use one-level explicit paths such as `author.id[...]` and `author.username[...]`; use a custom method for multi-sort or deeper relation/object filters.

## Docs Drift

If docs conflict with source, source wins. Check `src/interface/**`, `src/type/**`, tests, and public barrels before treating a docs snippet as current API.

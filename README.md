<p align="center">
  <img src="https://6jft62zmy9nx2oea.public.blob.vercel-storage.com/nestjs-crud-automator-8vS2Gox6Qf3xgQazi0Uf8j4ML1surI.png" width="500" alt="project-logo">
</p>

<h1 align="center">NestJS-Crud-Automator 🚀</h1>
<p align="center"><em>A powerful library for automating CRUD operations in NestJS applications</em></p>

<p align="center">
    <a aria-label="ElsiKora logo" href="https://elsikora.com">
  <img src="https://img.shields.io/badge/MADE%20BY%20ElsiKora-333333.svg?style=for-the-badge" alt="ElsiKora">
</a> <img src="https://img.shields.io/badge/npm-blue.svg?style=for-the-badge&logo=npm&logoColor=white" alt="npm"> <img src="https://img.shields.io/badge/typescript-blue.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript"> <img src="https://img.shields.io/badge/nestjs-red.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs"> <img src="https://img.shields.io/badge/swagger-green.svg?style=for-the-badge&logo=swagger&logoColor=white" alt="swagger"> <img src="https://img.shields.io/badge/license-blue.svg?style=for-the-badge&logo=license&logoColor=white" alt="license"> <img src="https://img.shields.io/npm/v/@elsikora/nestjs-crud-automator.svg?style=for-the-badge&logo=npm&logoColor=white" alt="npm version">
</p>

## 📚 Table of Contents

- [Description](#-description)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
  - [Basic Usage](#basic-usage)
  - [Advanced Usage](#advanced-usage)
- [Subscriber System (Hooks)](#subscriber-system-hooks-intercepting-and-extending-logic)
- [Swagger Documentation](#swagger-documentation)
- [Migrating to 4.0](#-migrating-to-40)
- [Migrating to 3.0](#-migrating-to-30)
- [Current Status](#-current-status)
- [AI Agent Skill](#-ai-agent-skill)
- [FAQ](#-faq)
- [License](#-license)

## 📖 Description

NestJS-Crud-Automator is a comprehensive library designed to eliminate repetitive code when building RESTful APIs with NestJS. It provides a suite of decorators, utilities, and validation tools that automatically generate controllers, DTOs, and service methods for handling Create, Read, Update, and Delete operations. This library significantly reduces development time by providing a declarative approach to API development. By simply describing your entity properties once, the library auto-generates all the necessary boilerplate code including Swagger documentation, validation rules, and transformation logic. Perfect for developers working on data-heavy applications who want to focus on business logic rather than repetitive CRUD implementation.

The core philosophy of this library is built on four pillars: being **Declarative** (describe your API, don't code it), writing **Minimum Code** (drastically reduce boilerplate), ensuring **Flexibility** (override or extend any automated behavior), and guaranteeing **Type-Safety** (leverage TypeScript to prevent errors). It achieves this through real-time in-memory code generation, a heavy reliance on decorators for configuration, and smart conventions to reduce setup.

## 🚀 Features

- ✨ **🏗️ Automatic generation of controllers, DTOs, and service methods for CRUD operations**
- ✨ **📝 Comprehensive Swagger/OpenAPI documentation generation for all endpoints**
- ✨ **✅ Built-in validation rules with class-validator integration**
- ✨ **🔄 Data transformation with class-transformer for request/response handling**
- ✨ **🧩 Type-safe decorators for entity properties with rich metadata support**
- ✨ **🔒 Authentication and authorization guards integration**
- ✨ **🔍 Advanced filtering, sorting, and generated PAGE/CURSOR pagination for list operations**
- ✨ **🧩 Generated nested GET/GET_LIST reads with owner path scoping and stable server ordering**
- ✨ **📚 Support for object relations with include-driven loading**
- ✨ **⚡ Performance optimized with TypeORM integration for database operations**
- ✨ **🌐 Full support for TypeScript with strong typing throughout the library**
- ✨ **Hooks and Subscriber System:** Intercept and extend business logic at both the controller and service level.
- ✨ **Dynamic and Polymorphic DTOs:** Generate DTOs on-the-fly based on discriminator fields.
- ✨ **Polymorphic Reads For Table Inheritance:** Serve TypeORM single-table-inheritance roots through per-variant GET and GET_LIST responses with no DTOs.
- ✨ **Guard-Based Field Exposure:** Generate route-specific response DTOs based on configured guard classes.
- ✨ **🔐 Declarative Authorization Policies:** Subscriber-style policies with automatic guard wiring, scopes, and response transforms.
- ✨ **Request Tracing:** Built-in `CorrelationIDResponseBodyInterceptor` and `CorrelationIDResponseBodyExceptionFilter` to correlate requests and logs.
- ✨ **Convention over Configuration:** Smart defaults for service and DTO naming to reduce boilerplate.

## 🛠 Installation

Install NestJS-Crud-Automator using your preferred package manager:

```bash
# Using npm
npm install @elsikora/nestjs-crud-automator

# Using yarn
yarn add @elsikora/nestjs-crud-automator

# Using pnpm
pnpm add @elsikora/nestjs-crud-automator
```

Version `3.0.2` is the published baseline before the current generated-route work. The source now includes an intentional breaking capability boundary for generated service calls and must be released as a new major; package versions remain owned by release automation. Pin the exact released version your application has verified and review [Migrating to 4.0](https://elsikora.com/docs/nestjs-crud-automator/guides/migrating-to-4-0).

### Prerequisites

Crud Automator 5.x runs on Node.js `^22.13.0 || >=24.11.0` and ships as ES modules only; CommonJS applications load it with `require()` through Node.js `require(esm)`. Make sure you have the following dependencies installed in your NestJS project:

- NestJS `@nestjs/common` and `@nestjs/core` `>=12.3.2 <13`
- `@nestjs/swagger` `>=12.0.0 <13`
- `@nestjs/throttler` `>=6.7.1 <7`
- TypeORM `>=1.1.2 <2`
- `class-validator` `>=0.15.1 <0.16`
- `class-transformer` `>=0.5.1 <0.5.2`
- `lodash` `>=4.18.1 <5`

You might need to install these peer dependencies if they're not already in your project:

```bash
npm install @nestjs/common@^12.3.2 @nestjs/core@^12.3.2 @nestjs/swagger@^12.0.0 @nestjs/throttler@^6.7.1 typeorm@^1.1.2 class-transformer@^0.5.1 class-validator@^0.15.1 lodash@^4.18.1
```

Keep the version ranges in the command, so npm does not pick a future major outside the supported ranges. NestJS 11, `@nestjs/swagger` 11 and TypeORM 0.3 need Crud Automator 4.x. See [Migrating to 5.0](https://elsikora.com/docs/nestjs-crud-automator/guides/migrating-to-5-0).

## 💡 Usage

## Basic Usage

### 1. Define Your Entity

First, define your entity with the `ApiPropertyDescribe` decorators to provide metadata for CRUD generation:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { ApiPropertyDescribe, EApiPropertyDescribeType, EApiPropertyStringType, EApiPropertyDateIdentifier, EApiPropertyDateType, GetDefaultStringFormatProperties } from "@elsikora/nestjs-crud-automator";

@Entity("users")
export class UserEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.UUID,
		description: "User unique identifier",
	})
	id: string;

	@Column()
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "User name",
		format: EApiPropertyStringType.STRING,
		minLength: 3,
		maxLength: 50,
		pattern: "/^[a-zA-Z0-9_-]+$/",
		exampleValue: "john_doe",
	})
	username: string;

	@Column()
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "User email",
		format: EApiPropertyStringType.EMAIL,
		...GetDefaultStringFormatProperties(EApiPropertyStringType.EMAIL),
	})
	email: string;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.DATE,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		format: EApiPropertyDateType.DATE_TIME,
	})
	createdAt: Date;

	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.DATE,
		identifier: EApiPropertyDateIdentifier.UPDATED_AT,
		format: EApiPropertyDateType.DATE_TIME,
	})
	updatedAt: Date;
}
```

`CREATED_AT`, `UPDATED_AT`, and `RECEIVED_AT` identify server-owned infrastructure timestamps. Generated CREATE, UPDATE, and PARTIAL_UPDATE body DTOs omit them while response DTOs retain them. Exclusion follows the semantic identifier, not the property name; use `DATE` for a writable business date.

Columns and relations may also live on abstract base classes and mixins. Automator reads the same chain TypeORM maps: the entity class and every named parent class, stopping at the first class without a name. See [Inherited Entity Metadata](https://elsikora.com/docs/nestjs-crud-automator/core-concepts/entities#inherited-entity-metadata).

Set `isAutoDtoEnabled: false` on `ApiPropertyDescribe` when a described entity property must remain outside every Automator-generated BODY, PARAMETERS, QUERY, and RESPONSE DTO. The property keeps its metadata and TypeORM mapping and remains available to manual DTOs, but it is also omitted from generated Swagger relation components and generated filter/order input. Route- or DTO-level `isEnabled: true` cannot re-enable it. An explicit `ApiPropertyCopy` may deliberately copy it into a manual DTO while retaining the source metadata's other route, DTO, guard, and validation rules.

### 2. Create a Service

Create a service with the `ApiService` decorator to add CRUD operations:

```typescript
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ApiService, ApiServiceBase } from "@elsikora/nestjs-crud-automator";
import { UserEntity } from "./user.entity";

@Injectable()
@ApiService<UserEntity>({
	entity: UserEntity,
})
export class UserService extends ApiServiceBase<UserEntity> {
	constructor(
		@InjectRepository(UserEntity)
		public repository: Repository<UserEntity>,
	) {
		super();
	}

	// You can add custom methods here that go beyond basic CRUD
	async findByEmail(email: string): Promise<UserEntity | null> {
		return this.repository.findOne({ where: { email } });
	}
}
```

### 3. Create a Controller

Create a controller with the `ApiController` decorator to generate all CRUD endpoints:

```typescript
import { ApiController, EApiAuthenticationType, EApiRouteType } from "@elsikora/nestjs-crud-automator";
import { UserEntity } from "./user.entity";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiController<UserEntity>({
	entity: UserEntity,
	name: "Users",
	path: "users",
	routes: {
		[EApiRouteType.CREATE]: {
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
			},
			response: {
				headers: {
					"X-Request-Id": {
						description: "Request correlation id.",
						schema: { type: "string" },
					},
				},
			},
		},
		[EApiRouteType.UPDATE]: {
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
			},
		},
		[EApiRouteType.DELETE]: {
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
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: {},
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

Use `response.headers` for Swagger/OpenAPI response header documentation only. Authentication `securityRequirements` map to OpenAPI route requirements: one object means all listed schemes are required together, while multiple objects are alternatives. The scheme names must match the names registered in your app-owned `DocumentBuilder` configuration.

Top-level `authentication.bearerStrategies` and `authentication.securityStrategies` are not supported; put scheme names inside `authentication.securityRequirements`.

Route `execution.guards` run before `authentication.guard` unless they are staged. A staged guard `{ guard, stage }` with `EApiRouteGuardStage` places it in one chain shared by generated routes, `@ApiRouteCustom`, and `@ApiMethod`: `BEFORE_AUTHENTICATION` guards → `authentication.guard` → `AFTER_AUTHENTICATION` guards → `ApiAuthorizationGuard` → `AFTER_AUTHORIZATION` guards, with declaration order kept inside each stage. Global guards (`APP_GUARD`) always run before this whole route chain. Use `AFTER_AUTHENTICATION` for guards that need `request.user`. For example, the stock `ThrottlerGuard` tracks `request.ip`; a subclass that overrides `getTracker` can key the limit by the authenticated principal instead:

```typescript
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
	protected async getTracker(request: Record<string, any>): Promise<string> {
		return request.user?.id ?? request.ip;
	}
}
```

```typescript
[EApiRouteType.CREATE]: {
	execution: {
		guards: [{ guard: UserThrottlerGuard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }],
	},
	security: {
		authentication: {
			type: EApiAuthenticationType.USER,
			guard: JwtAuthGuard,
		},
	},
},
```

## Advanced Usage

### Custom Validation

Add custom validators to your DTOs:

```typescript
import { ApiController, EApiRouteType, EApiDtoType, AllOrNoneOfListedPropertiesValidator } from "@elsikora/nestjs-crud-automator";

@ApiController<UserEntity>({
	entity: UserEntity,
	name: "Users",
	routes: {
		[EApiRouteType.CREATE]: {
			autoDto: {
				[EApiDtoType.BODY]: {
					validators: [
						{
							constraintClass: AllOrNoneOfListedPropertiesValidator,
							options: ["firstName", "lastName"],
						},
					],
				},
			},
		},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

### Path Parameter Validation

Generated `GET`, `UPDATE`, `PARTIAL_UPDATE`, and `DELETE` routes, and `read.scope.parameters` on generated `GET` and `GET_LIST`, check each path value against the type its column has in `@ApiPropertyDescribe` before authorization and before any query runs. `/users/not-a-uuid` on a `UUID` key, `/orders/abc` or `/orders/016` on an integer `NUMBER` key, or `/days/2024-02-30` on a `DATE` scope returns `400` with the same body as any other validation error, for example `message: ["id must be a UUID"]`, and sends no SQL; it is an `ApiRequestValidationException`, so a host filter can translate it with the pipe's `exceptionFactory`. The check does not depend on a host `ValidationPipe`. Path values are converted once per request. `read.scope`, subscribers, and the service see the typed values: a `NUMBER` path value is a number, a UUID is lower-case, a `DATE` value stays a `YYYY-MM-DD` string. `ApiAuthorizationGuard`, IAM conditions, and `resourcePath` see the canonical text of the same values (`16`, a lower-case UUID, `true`, ISO 8601 UTC with milliseconds for date-time), and the guard writes that text back to `request.params`. A configured `dto[EApiDtoType.PARAMETERS]` only narrows the column rule, a boolean path value is `true` or `false`, and a securable `@ApiRouteCustom` must copy every path parameter its IAM `resourcePath` names with `ApiPropertyCopy`, checked for each controller that serves it, inherited routes included; the guard runs the route's PARAMETERS DTO in IAM and HOOKS mode, so IAM and a HOOKS policy see the value the DTO produces under any `@Expose` name, through mapped types, and after any `@Transform`, and `/016` cannot pass a Deny on `16`. The text of an integer column described as a string must be canonical, so `/016` and `/-0` return `400` on a generated route too, An upper-case UUID returns `400` (`id must be a lower-case UUID`) instead of being lower-cased, and a decimal column as a path value on a securable route fails at startup, in HOOKS mode as in IAM mode. The handler reads the value authorization saw, with no pipe, a validate-only `new ValidationPipe()`, or a transforming pipe, or the request is refused: the guard runs the DTO with and without implicit conversion, writes the canonical text to `request.params`, runs the DTO again on it, and returns `400` when an accepting conversion gives other text. A `@Transform` that changes its own output, such as a prefix on every call or a decoder, cannot serve a securable route: it fails at startup when a sample shows it, and returns `400` otherwise. A `@Transform` or `@Expose` limited to groups or versions, or a validator limited to groups, fails at startup on a path value. The path parameters of a securable route are those of the paths Nest serves it at: the global prefix, unless `setGlobalPrefix` excludes the route, the `RouterModule` path, the controller path, and the route path, and a wildcard (`*`, `*name`, `{*name}`) in any of them fails at startup. An IAM custom route that does not list fails at startup when its `resourcePath` names a placeholder its path does not carry, which would render as `*` and miss every Deny on a value. A securable `@ApiRouteCustom` or `@ApiMethod` route with a path parameter fails at startup when it declares no PARAMETERS DTO, when the DTO does not describe a path parameter, when a HOOKS DTO holds one without `ApiPropertyCopy` or an `ApiProperty*` decorator, when `@UsePipes` on the method or the controller holds a pipe other than `ValidationPipe` or a `ValidationPipe` with `expectedType`, `transformerPackage`, or `validatorPackage`, when a `@Param` has a pipe such as `ParseIntPipe`, when a `@Param("id")` has a type that compiles to neither `String` nor `Object`, or when a `@Param()` is typed as another class than the DTO; a generated route fails too when a `RouterModule` path or the global prefix adds a parameter its generated DTO does not describe. A request whose path parameters are not those startup checked for its route answers `500` before authorization, the handler, and any query. Root-level discriminated `@ApiRouteCustom` bodies are validated by Crud Automator itself. Other request bodies, custom route query DTOs, and a GET_LIST query without `filter`, `order`, or `pagination` configuration are validated only by a host `ValidationPipe`; boolean and number DTO properties check exactly the value the client sent, under any `@Expose` name and even under `enableImplicitConversion`; `DOUBLE` text is decimal text only (`0x10`, `" 16 "`, and `""` return `400`), a lone value of a list field of any type is a one-item list, while a comma list is one item, and an empty value is one empty item that the item rule checks. Integer text is accepted only in canonical form, and an integer `NUMBER` described beyond `Number.MAX_SAFE_INTEGER` fails at startup; describe `bigint` columns as `EApiPropertyStringType.BIGINT_STRING`. Before 5.0.0 such values reached the database: PostgreSQL answered `500`, SQLite `404`.

### Request Transformation

Automatically transform request data:

```typescript
import { ApiController, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiRouteType, TRANSFORMER_VALUE_DTO_CONSTANT } from "@elsikora/nestjs-crud-automator";

@ApiController<UserEntity>({
	entity: UserEntity,
	name: "Users",
	routes: {
		[EApiRouteType.CREATE]: {
			request: {
				[EApiControllerRequestTarget.BODY]: {
					transformers: [
						{
							key: "createdBy",
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY,
							shouldSetValueEvenIfMissing: true,
						},
					],
				},
			},
		},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

### Handling Relations

Configure include-driven relation loading:

```typescript
import { ApiController, EApiControllerRelationReferenceShape, EApiFunctionTransactionMode, EApiRouteType } from "@elsikora/nestjs-crud-automator";

@ApiController<PostEntity>({
	entity: PostEntity,
	name: "Posts",
	routes: {
		[EApiRouteType.CREATE]: {
			transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
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
						include: { author: true, comments: true },
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

Request relation `relations.request.load` enables hydration, and `relations.request.load.include` selects the direct request body relations to hydrate. Omitted service mappings use `${relationName}Service`; `relations.request.load.services` only overrides those controller property names. Nested request include objects are passed to the direct relation service as TypeORM `relations`; nested request references are not recursively hydrated. `load.relationLoadStrategy` can be used on request or response load configs to choose TypeORM `"join"` or `"query"` loading.

`relations.request.load.locks` applies native TypeORM `pessimistic_read` or `pessimistic_write` locks to configured direct relation service `get()` calls. Locks require an active Automator transaction, and a lock on a route with `transaction.mode: NONE` fails at decoration; on other routes a missing transaction fails at request time, because an outer scope can provide one. Locks are acquired in `load.include` declaration order. Locked loads disable implicit TypeORM eager-relation joins. A locked direct relation with explicit nested includes must use `relationLoadStrategy: "query"` so the nested loads share the manager without inheriting the row lock. Service inputs remain entity-based: scalar relation references are an HTTP/controller hydration contract, not a widened service method contract.

### Custom DTOs

Use custom DTOs instead of auto-generated ones:

```typescript
import { ApiController, EApiDtoType, EApiRouteType } from "@elsikora/nestjs-crud-automator";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserResponseDto } from "./dto/user-response.dto";

@ApiController<UserEntity>({
	entity: UserEntity,
	name: "Users",
	routes: {
		[EApiRouteType.CREATE]: {
			dto: {
				[EApiDtoType.BODY]: CreateUserDto,
				[EApiDtoType.RESPONSE]: UserResponseDto,
			},
		},
		[EApiRouteType.UPDATE]: {
			dto: {
				[EApiDtoType.BODY]: UpdateUserDto,
				[EApiDtoType.RESPONSE]: UserResponseDto,
			},
		},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

For `GET_LIST`, response DTOs support two explicit modes:

- `[EApiDtoType.RESPONSE]: PublicUserListResponseDto` when the app owns the whole list wrapper.
- `[EApiDtoType.RESPONSE]: { itemType: PublicUserResponseDto }` when the framework owns the list wrapper and the app owns each item shape.

In both modes, `orderBy` accepts only item properties the DTO publishes in its OpenAPI schema, so a client cannot order by a column the response leaves out. Document the item properties with `@ApiProperty` or the Automator property decorators; a list wrapper without a documented `items` element allows no ordering.

Use the item DTO mode when you only need to narrow each returned item:

```typescript
import { Expose } from "class-transformer";
import { ApiController, EApiDtoType, EApiRouteType } from "@elsikora/nestjs-crud-automator";

class PublicUserResponseDto {
	@Expose()
	id!: string;

	@Expose()
	username!: string;
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

The shown route omits pagination config, so it uses PAGE and keeps `count`, `currentPage`, `items`, `totalCount`, and `totalPages`, while `items` are serialized with `PublicUserResponseDto`. A route that opts into CURSOR instead uses the flat `{ items, nextCursor, previousCursor }` wrapper, provided its item DTO satisfies the CURSOR proof below.

For CURSOR, custom DTO metadata must keep every potential order field and every final primary key tie-breaker as a same-name, required, non-null, raw response scalar. A full custom wrapper must prove exactly `items`, `nextCursor`, and `previousCursor`. Wire-time aliases/transforms that change protected fields fail closed; PAGE custom DTO behavior is unchanged.

### Authorization

Authorization now has two first-class modes:

- `hooks`: auto-discovered `@ApiAuthorizationPolicy({ entity })` classes
- `iam`: attachment/document-based IAM evaluation with optional boundaries

`@ApiControllerSecurable()` turns on the authorization pipeline and takes no options: mode selection and all authorization configuration live in `@ApiController({ authorization: ... })`. Every handler Nest serves on such a controller goes through authorization, or the application does not start. Each route uses exactly one mode: route config can override the controller default with `routes[routeType].security.authorization.mode`, and a route without a mode falls back to `authorization.defaultMode`.

#### Runtime authorization actions

`@ApiMethod(...)` uses one route action identity: `metadata.resource.action`. Generated CRUD routes also carry `metadata.route.type` for built-in CRUD/IAM mapping.

Auto-generated CRUD routes receive built-in runtime actions automatically:

- `create`
- `delete`
- `get`
- `getList`
- `partialUpdate`
- `update`

Custom secured routes should declare their own domain-specific action strings:

```typescript
@ApiMethod<UserEntity>({
	metadata: {
		resource: {
			action: "update.promote",
			entity: UserEntity,
		},
		route: {
			method: RequestMethod.POST,
			path: ":id/promote",
		},
		security: {
			authorization: { mode: EApiAuthorizationMode.HOOKS },
		},
		response: {
			status: HttpStatus.OK,
			type: UserResponseDto,
		},
	},
})
public promote(@Param("id") id: string) {
	return this.service.promote(id);
}
```

The same `metadata.resource.action` value is what hooks receive as `context.action` and what IAM turns into a namespaced action such as `admin:user:update.promote`.

Use `@ApiRouteCustom(...)` when a custom controller route should also participate in the custom route runtime: request/response transformers, route subscribers, relation loading/projection, authorization result transforms, and response serialization. Custom route request relation hydration reads the method body payload; response relation reload requires a controller `service` extending `ApiServiceBase` and response values with an `id`. `@ApiMethod(...)` remains the low-level metadata/decorator composer.

```typescript
@ApiRouteCustom<UserEntity>({
	resource: { action: "update.promote", entity: UserEntity },
	route: { method: RequestMethod.POST, path: ":id/promote" },
	security: {
		authorization: { mode: EApiAuthorizationMode.HOOKS },
	},
	response: {
		status: HttpStatus.OK,
		type: UserResponseDto,
		serialization: { isEnabled: true },
	},
})
public promote(@Param("id") id: string) {
	return this.service.promote(id);
}
```

Custom routes also support flat root-level discriminated request bodies and responses. Use this when the entire body or response is a command/result union; keep using `ApiPropertyObject` when only a nested property is polymorphic.

```typescript
@ApiRouteCustom<UserEntity>({
	resource: { action: "registration.create", entity: UserEntity },
	route: { method: RequestMethod.POST, path: "registrations" },
	dto: {
		body: {
			type: [EmailRegistrationBodyDto, UsernameRegistrationBodyDto],
			validatorOptions: {
				skipMissingProperties: true,
			},
			discriminator: {
				propertyName: "channel",
				shouldKeepDiscriminatorProperty: true,
				mapping: {
					email: EmailRegistrationBodyDto,
					username: UsernameRegistrationBodyDto,
				},
			},
		},
	},
	response: {
		status: HttpStatus.CREATED,
		type: [VerificationResponseDto, SessionResponseDto],
		discriminator: {
			propertyName: "mode",
			shouldKeepDiscriminatorProperty: true,
			mapping: {
				verification: VerificationResponseDto,
				session: SessionResponseDto,
			},
		},
		serialization: { isEnabled: true },
	},
})
public register(@Body() body: EmailRegistrationBodyDto | UsernameRegistrationBodyDto) {
	return this.service.register(body);
}
```

Swagger emits `oneOf` plus OpenAPI discriminator metadata for both sides. Request bodies are transformed and validated as the selected DTO variant before the controller method runs. Serialized responses select the declared response DTO variant by discriminator and still strip fields that are not exposed. Existing single DTO configs (`dto.body: SomeDto`, `response.type: SomeDto`, and `response.type: undefined`) and generated CRUD routes keep their existing behavior.

Declare the discriminator field, such as `channel` or `mode`, on every variant DTO with the usual property decorators. Leaving `shouldKeepDiscriminatorProperty` out means keep. If it is `false`, the variant is selected first and the field is removed before transformation and validation, so make that DTO property optional: Swagger can still document the input contract while the transformed instance omits the field. A variant that requires it through an `@ApiProperty*` decorator fails at startup, unless `validatorOptions.skipMissingProperties` is set. On a nested `@ApiPropertyObject` request property, `false` fails at decoration, because a removed discriminator cannot be validated.

Root-level discriminator selection runs before Nest can infer a concrete DTO class, so global `ValidationPipe` options are not applied automatically to the selected variant. Add `validatorOptions`, `transformOptions`, or `exceptionFactory` to the discriminated body config when a route needs specific validation, transformation, or error-shaping settings.

`exceptionFactory(errors)` has the same semantics as the `ValidationPipe` option: it may be sync or async, and when it is present, Crud Automator throws its (awaited) return value instead of the default `BadRequestException` with a flattened message array. It receives the native `class-validator` `ValidationError[]` of the selected variant, so `value` and `target` follow `validatorOptions.validationError` exactly as in `ValidationPipe`. When the body is not an object or its discriminator is missing or unknown, it receives one synthetic `{ property, constraints: { mustMatchDiscriminatorMapping }, children: [] }` error that has no `value` key. Discriminator failure messages never echo the rejected value, for example `channel has invalid discriminator value. must be one of: 'email', 'username'`. `exceptionFactory` applies to the request body only. Errors thrown while transforming the selected variant, including an `HttpException` or any other error from your own `@Transform`, are not passed to `exceptionFactory` and propagate unchanged, exactly as with Nest `ValidationPipe`.

```typescript
dto: {
	body: {
		type: [EmailRegistrationBodyDto, UsernameRegistrationBodyDto],
		discriminator: {
			propertyName: "channel",
			shouldKeepDiscriminatorProperty: true,
			mapping: {
				email: EmailRegistrationBodyDto,
				username: UsernameRegistrationBodyDto,
			},
		},
		validatorOptions: {
			validationError: { target: false, value: false },
		},
		exceptionFactory: (errors: Array<ValidationError>) =>
			new BadRequestException({
				code: "VALIDATION_FAILED",
				errors: errors.flatMap((error) => Object.keys(error.constraints ?? {}).map((rule) => ({ path: error.property, rule }))),
			}),
	},
},
```

Generated routes can opt into a route-owned transaction by reusing `EApiFunctionTransactionMode`:

```typescript
import { ApiController, EApiFunctionTransactionMode, EApiRouteType } from "@elsikora/nestjs-crud-automator";

@ApiController<UserEntity>({
	entity: UserEntity,
	routes: {
		[EApiRouteType.CREATE]: {
			transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
		},
	},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

Omitted route transaction config and explicit `SUPPORTS` preserve generated-route behavior without opening a route transaction. The exception is every generated `CREATE`, scoped or not: it opens a `ROUTE` transaction under those modes or joins an active Automator owner, and it fails at startup under `NONE`. A securable `CREATE` also fails at startup on a date and time primary key finer than a millisecond: declare `precision: 3`. Inside the transaction, after the insert and before the commit, it reloads the row by its key and any authorization scope; a row outside the scope rolls back and answers `403`. The reload key holds the primary columns present in the stored row and must match exactly one row. On a single-connection driver such as better-sqlite3 the Automator runs the transactions it opens one at a time per DataSource; reads and writes outside them on that connection can still land inside an open transaction. `REQUIRED` opens a root transaction through the controller service repository when no Automator transaction is active; `MANDATORY` requires an active owner; `NONE` rejects an active transaction. Request transformation and validation run before a route-owned transaction. Request relation hydration, the generated service operation, and response relation reload then share one manager. When the route opens and owns the transaction, commit and post-commit lifecycle finish before response transformation, route-after subscribers, authorization result handling, and serialization; hydration, operation, or reload failure rolls back, while a later route-after failure cannot roll back the committed work. When `REQUIRED` joins an outer owner, that owner commits later. Custom routes continue to own transactions through custom functions or steps.

Generated service functions and explicit function decorators use the same transaction modes without exposing `EntityManager` as a public method argument:

```typescript
import { ApiService, ApiServiceBase, EApiFunctionTransactionMode, EApiFunctionType } from "@elsikora/nestjs-crud-automator";

@ApiService<UserEntity>({
	entity: UserEntity,
	functions: {
		[EApiFunctionType.CREATE]: {
			transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
		},
	},
})
export class UserService extends ApiServiceBase<UserEntity> {}
```

The `functions` map accepts generated function types (`CREATE`, `UPDATE`, `DELETE`, `GET`, `GET_LIST`, `GET_MANY`). Omitted entries keep the default `SUPPORTS` mode. `CUSTOM` is configured separately with `@ApiFunctionCustom`.

```typescript
import { ApiFunctionCustom, EApiFunctionTransactionMode } from "@elsikora/nestjs-crud-automator";

@ApiFunctionCustom<UserEntity>({
	action: "bulkPromote",
	entity: UserEntity,
	transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
})
async bulkPromote(ids: Array<string>): Promise<Array<UserEntity>> {
	const context = this.getApiFunctionContext<UserEntity>();

	return await Promise.all(ids.map(async (id) => await context.operations.update({ id }, { role: "admin" })));
}
```

Use `@ApiFunctionStep` for internal helper methods that need ApiFunction transaction semantics and context but should not become standalone custom actions. Steps can also be called directly when the selected transaction mode permits:

```typescript
import { ApiFunctionStep, EApiFunctionTransactionMode } from "@elsikora/nestjs-crud-automator";

@ApiFunctionStep<UserEntity>({
	entity: UserEntity,
	transaction: { mode: EApiFunctionTransactionMode.MANDATORY },
})
private async recordPromotionAudit(user: UserEntity): Promise<void> {
	const context = this.getApiFunctionStepContext<UserEntity>();

	await context.repository.save(user);
}
```

Steps do not dispatch function subscribers, create route metadata, or define Swagger/authorization action identities. Step context intentionally exposes only `eventManager`, `repository`, and `getRepository`; use `@ApiFunctionCustom` plus `getApiFunctionContext()` when you need `operations` or lifecycle hooks.

`REQUIRED` opens one Automator-owned `QueryRunner` transaction when none exists. Nested `REQUIRED`, `MANDATORY`, and transactional `SUPPORTS` calls join the same manager and register ordered transaction events; only the outer route, function, or named scope owner commits, rolls back, and flushes post-transaction subscribers. `NONE` and nontransactional `SUPPORTS` do not produce post-transaction lifecycle work.

Before `onBeforeUpdate` runs, `ApiFunctionUpdate` performs one ordinary decorated GET through the active transaction manager when present. Update subscribers receive the incoming patch in `context.result`, the active manager repository when a transaction exists (otherwise the service base repository) in `context.DATA.repository`, and a top-level detached and frozen snapshot in `context.DATA.currentEntity: Readonly<TEntity>`. Enumerable own patch fields whose value is `undefined` are treated as omitted before subscribers and persistence, while `null` remains an explicit value; patches without such fields retain their original object identity. The same normalization is applied to a subscriber-replaced patch before it is saved. The snapshot is shallow: nested relations, arrays, JSON, dates, buffers, and lazy values retain aliases to the internal loaded entity, so mutating them can affect persistence. Automator merges the subscriber-returned patch into its internal loaded entity and does not issue a second explicit GET. A missing row keeps the GET error lifecycle, skips `onBeforeUpdate`, and then enters the UPDATE error lifecycle.

Use a named scope when application code, rather than a decorated function, must own the transaction. Inside an active Automator transaction on the same `DataSource` a scope joins it and refuses an `observation`; on another `DataSource` it runs on its own and does not roll back with the active one:

```typescript
import { ApiFunctionTransactionScope } from "@elsikora/nestjs-crud-automator";

await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "register-user" }, async (entityManager) => {
	await userService.create(body);
	await entityManager.getRepository(AuditEntity).save(entry);
});
```

The callback receives the exact manager owned by the named scope. Decorated operations join it automatically; use the argument for transaction-bound raw repository or migration work. The scope name is trimmed and must be non-empty. `runWithEntityManager()` is join-only: it accepts only the manager already bound to an active Automator transaction and never opens a second transaction.

Named scopes can also select bounded execution measurements without adding ordinary function subscribers:

```typescript
await ApiFunctionTransactionScope.runWithDataSource(
	dataSource,
	{
		name: "register-user",
		observation: {
			selectors: [{ entity: UserEntity, functionType: EApiFunctionType.CREATE, methodName: "create" }],
			onSettled(snapshot) {
				captureTransactionObservation(snapshot);
			},
		},
	},
	async () => await userService.create(properties),
);
```

`captureTransactionObservation` is an application-provided bounded synchronous capture function, not a package API. Selectors match the exact entity constructor, native function type (or `EApiFunctionTransactionTraceType.STEP`) and method name. The package copies the selectors and callback before query-runner work, rejects duplicate selectors and invalid configuration, and allows at most 32 selectors with nonblank method names of at most 256 characters. An empty selector list produces only the owner settlement. `runWithEntityManager()` continues to join the existing owner and cannot replace observation.

Each owner reserves at most 256 selected invocations at their start, including overlapping work. The detached, frozen snapshot contains `measurements` with only `selectorIndex`, fractional `durationMs` and native execution `status`, plus the existing transaction `outcome` and `droppedCount`. The index refers to the configured selector order. Omitted intervals include capacity overflow, incomplete work at settlement and unavailable/invalid clock samples. Late completions are ignored. No transaction IDs, arguments, results, entities, managers or raw errors enter this projection; ordinary transaction event shapes and pending-event rules stay unchanged.

Duration covers the actual native execution callback, including STEP context construction or CUSTOM subscriber work, and excludes its own transaction preflight and event bookkeeping. Nested intervals are inclusive: do not sum them or label them as isolated method-body, SQL or lock-wait time. A successful execution remains `SUCCEEDED` if its owner later rolls back or has an unknown commit outcome. Disabled and unmatched observation performs no clock sampling; rejected preflight or failed owner startup creates no fabricated duration.

`onSettled` runs once after the best-effort release attempt, context exit and terminal lifecycle hooks have finished or failed. It does not run when owner startup fails. Its synchronous throws and accidental Promise/thenable rejections are contained; returned asynchronous work is never awaited and cannot replace the original result or error. Synchronous callback work still adds latency, so capture into a bounded application buffer and let its existing transport own delivery. STEP remains trace-only and does not become an ordinary subscriber event. The public observation types and `API_FUNCTION_TRANSACTION_OBSERVATION_CONSTANT` are available from the package root.

Function subscribers can react once after the outer commit or rollback. The observed service must use `@ApiServiceObservable()`, and the subscriber must be registered as a Nest provider:

```typescript
import type { IApiSubscriberFunctionTransactionContext } from "@elsikora/nestjs-crud-automator";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase } from "@elsikora/nestjs-crud-automator";

@ApiFunctionSubscriber({ entity: UserEntity })
export class UserSubscriber extends ApiFunctionSubscriberBase<UserEntity> {
	async onAfterCommit(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		await recordCommittedEventCount(context.DATA.matchedEvents.length);
	}

	async onAfterRollback(context: IApiSubscriberFunctionTransactionContext): Promise<void> {
		await discardPendingWork(context.DATA.transaction.id);
	}
}
```

`context.DATA` is readonly and contains the transaction UUID, immutable outer owner, all ordered events, and only the events matched by that subscriber. Events contain identity and status only; arguments, request bodies, entities, and results are never retained. Steps appear in `events` with trace type `STEP`, but they do not select or independently invoke subscribers.

Post-commit and post-rollback hooks run sequentially by subscriber priority and registration order. Hook failures do not stop later hooks. A committed transaction with failing hooks throws `ApiFunctionTransactionPostCommitException` with outcome `COMMITTED`; a failed database commit throws `ApiFunctionTransactionCommitUnknownOutcomeException` with outcome `UNKNOWN`; rollback handling failures throw `ApiFunctionTransactionRollbackException` while retaining the original operation error as the cause.

```typescript
// app.module.ts
import type { IApiAuthorizationPrincipal, IApiHookPermissionSource, IApiPolicyAttachmentSource, IApiPolicyDocumentSource, IApiResolvedPolicyAttachments } from "@elsikora/nestjs-crud-automator";

import { Module } from "@nestjs/common";

import { ApiAuthorizationModule, EApiAuthorizationCacheMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, AuthorizationResolveDefaultPrincipal } from "@elsikora/nestjs-crud-automator";

const hookPermissionSource: IApiHookPermissionSource = {
	async getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
		const permissions = principal.claims?.permissions;

		return Array.isArray(permissions) ? permissions.filter((value): value is string => typeof value === "string") : [];
	},
};

const iamAttachmentSource: IApiPolicyAttachmentSource = {
	async getAttachments(principal): Promise<IApiResolvedPolicyAttachments> {
		return {
			attachments: [
				{
					policyId: "user-items",
					principalId: principal.id,
					principalType: principal.type,
				},
			],
			boundaries: [],
		};
	},
};

const iamDocumentSource: IApiPolicyDocumentSource = {
	async getDocumentsByIds(ids) {
		return ids.map((id) => ({
			document: {
				Statement: [
					{
						Action: ["admin:item:list", "admin:item:read"],
						Condition: {
							StringEquals: {
								"resource.operatorId": "operator-1",
							},
						},
						Effect: EApiPolicyEffect.ALLOW,
						Resource: ["gameport:admin:item/*"],
						Sid: "AllowOperatorItems",
					},
				],
				Version: "2012-10-17",
			},
			id,
			namespace: "admin:item",
			sourceType: EApiPolicySourceType.MANAGED,
			version: "2026-03-14",
		}));
	},
};

@Module({
	imports: [
		ApiAuthorizationModule.forRoot({
			cache: {
				mode: EApiAuthorizationCacheMode.SOURCE_FIRST,
			},
			hookPermissionSources: [hookPermissionSource],
			iam: {
				attachmentSources: [iamAttachmentSource],
				documentSources: [iamDocumentSource],
			},
			principalResolver: {
				resolve(user) {
					if (!user || typeof user !== "object" || !("account" in user)) {
						return AuthorizationResolveDefaultPrincipal(user);
					}

					const payload = user as {
						account: { id: string; operatorId: string };
						access: { permissions: Array<string>; roles: Array<string> };
					};

					return {
						attributes: { operatorId: payload.account.operatorId },
						claims: { permissions: payload.access.permissions },
						id: payload.account.id,
						roles: payload.access.roles,
						type: EApiAuthorizationPrincipalType.USER,
					};
				},
			},
		}),
	],
})
export class AppModule {}
```

Authorization resolver caches default to `EApiAuthorizationCacheMode.SOURCE_FIRST`, so every hooks permission, IAM attachment, and IAM document evaluation reads its configured authoritative sources. This mode does not read or populate cross-request resolver maps, and source errors propagate without a stale cached fallback. The explicit setting above is optional, but documents the intended multi-instance contract.

`MEMORY` is an explicit single-process optimization. It requires both a positive `ttlMs` and `maxEntries`; the limit applies independently to the hook permission, IAM attachment, and IAM document cache:

```typescript
ApiAuthorizationModule.forRoot({
	cache: {
		maxEntries: 1_000,
		mode: EApiAuthorizationCacheMode.MEMORY,
		ttlMs: 30_000,
	},
	// sources...
});
```

Memory entries expire from insertion time, the oldest entry is evicted at the configured limit, and backing-data changes still require `ApiAuthorizationCacheInvalidationService` when immediate visibility is needed. In-memory mode is local to one application process; it is not a multi-instance consistency mechanism. Hooks policy-rule caching remains a separate, default-disabled `ApiAuthorizationPolicyRegistry` option.

Use `ApiAuthorizationModule.forRootAsync(...)` when the resolver or IAM sources must be real Nest providers with `Repository`, `DataSource`, or service dependencies. The module supports `imports`, `inject`, `useFactory`, `useClass`, and `useExisting`.

```typescript
// authorization.module.ts
import { Injectable, Module } from "@nestjs/common";

import { ApiAuthorizationModule, AuthorizationResolveDefaultPrincipal } from "@elsikora/nestjs-crud-automator";

@Injectable()
class DbPrincipalResolver {
	resolve(user: unknown) {
		return AuthorizationResolveDefaultPrincipal(user);
	}
}

@Injectable()
class DbAttachmentSource {
	// Inject Repository / DataSource / services here
}

@Injectable()
class DbDocumentSource {
	// Inject Repository / DataSource / services here
}

@Module({
	exports: [DbAttachmentSource, DbDocumentSource, DbPrincipalResolver],
	providers: [DbAttachmentSource, DbDocumentSource, DbPrincipalResolver],
})
class AuthorizationSourcesModule {}

@Module({
	imports: [
		AuthorizationSourcesModule,
		ApiAuthorizationModule.forRootAsync({
			imports: [AuthorizationSourcesModule],
			inject: [DbAttachmentSource, DbDocumentSource, DbPrincipalResolver],
			useFactory: (attachmentSource, documentSource, principalResolver) => ({
				iam: {
					attachmentSources: [attachmentSource],
					documentSources: [documentSource],
				},
				principalResolver,
			}),
		}),
	],
})
export class AppModule {}
```

Use the controller `authorization` block to pick the mode:

```typescript
// user.controller.ts
import { EApiAuthorizationMode, ApiController, ApiControllerSecurable } from "@elsikora/nestjs-crud-automator";

@ApiControllerSecurable()
@ApiController<UserEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
	},
	entity: UserEntity,
	path: "users",
	routes: {},
})
export class UserController {
	constructor(public service: UserService) {}
}
```

Hooks mode keeps entity-based policy autodiscovery:

```typescript
// policies/user-hooks.policy.ts
import type { IApiAuthorizationRuleContext, IApiAuthorizationScope, TApiAuthorizationPolicyBeforeGetListContext, TApiAuthorizationPolicyBeforeUpdateContext } from "@elsikora/nestjs-crud-automator";

import { EApiAuthorizationPermissionMatch, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "@elsikora/nestjs-crud-automator";

@ApiAuthorizationPolicy<UserEntity>({ entity: UserEntity, priority: 200 })
export class UserHooksPolicy extends ApiAuthorizationPolicyBase<UserEntity> {
	private getOperatorId(principal: IApiAuthorizationRuleContext<UserEntity>["principal"]): string | undefined {
		return principal.attributes.operatorId as string | undefined;
	}

	private scopeToOperator(context: IApiAuthorizationRuleContext<UserEntity>): IApiAuthorizationScope<UserEntity> {
		return {
			where: {
				operatorId: this.getOperatorId(context.principal),
			},
		};
	}

	public onBeforeGetList(context: TApiAuthorizationPolicyBeforeGetListContext<UserEntity>) {
		const requestedOperatorId = context.query.operatorId as string | undefined;

		if (requestedOperatorId && requestedOperatorId !== this.getOperatorId(context.principal)) {
			return [];
		}

		return [
			...this.allowForRoles(["platform-admin"]),
			...this.allowForPermissions(["admin.user.read", "admin.user.list"], {
				match: EApiAuthorizationPermissionMatch.ALL,
				scope: (ruleContext: IApiAuthorizationRuleContext<UserEntity>): IApiAuthorizationScope<UserEntity> => this.scopeToOperator(ruleContext),
			}),
		];
	}

	public onBeforeUpdate(_context: TApiAuthorizationPolicyBeforeUpdateContext<UserEntity>) {
		return [
			...this.allowForPermissions(["admin.user.update"], {
				scope: (ruleContext: IApiAuthorizationRuleContext<UserEntity>): IApiAuthorizationScope<UserEntity> => this.scopeToOperator(ruleContext),
			}),
			...this.denyForPermissions(["admin.user.update"], {
				condition: ({ principal }: IApiAuthorizationRuleContext<UserEntity>): boolean => Boolean(principal.attributes.isOperatorLocked),
				priority: 1000,
			}),
		];
	}
}
```

Register hooks policies as Nest providers; discovery only sees provider instances:

```typescript
@Module({
	providers: [UserHooksPolicy],
})
export class UserModule {}
```

Generated CRUD routes dispatch to CRUD hooks such as `onBeforeGetList` or `onBeforeUpdate` using the internal `routeType`. Custom `@ApiMethod(...)` routes do not use CRUD hook names; handle them in `getCustomActionRule(action, context)` instead:

```typescript
public getCustomActionRule(action: string) {
	if (action === "update.promote") {
		return this.allowForPermissions(["admin.user.promote"]);
	}

	return [];
}
```

IAM mode stays storage-agnostic. Attachments and documents come from your configured sources, while the controller defines the resource model used for action/resource matching and safe query planning:

```typescript
@ApiControllerSecurable()
@ApiController<ItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: "admin:item",
		resourceDefinition: {
			entity: ItemEntity,
			fields: [
				{
					isFilterable: true,
					path: "resource.id",
					queryPath: "id",
				},
				{
					isFilterable: true,
					path: "resource.operatorId",
					queryPath: "operator.id",
				},
			],
			namespace: "admin:item",
			resourcePath: "gameport:admin:item/{id}",
			resourceType: "gameport:admin:item",
		},
	},
	entity: ItemEntity,
	path: "items",
	routes: {},
})
export class ItemController {
	constructor(public service: ItemService) {}
}
```

Generated CRUD actions are normalized to IAM-friendly names inside the configured namespace:

- `get` -> `<policyNamespace>:read`
- `getList` -> `<policyNamespace>:list`
- `create` -> `<policyNamespace>:create`
- `update` / `partialUpdate` -> `<policyNamespace>:update`
- `delete` -> `<policyNamespace>:delete`

Custom `@ApiMethod(...)` actions pass through unchanged after the namespace. For example, `resource.action: "update.promote"` becomes `admin:item:update.promote` when `policyNamespace` is `admin:item`.

The runtime resolves a `principal`, dispatches to the selected mode, and stores a unified `authorizationDecision` on the request. Hooks mode traces matched rules and resolved permissions; IAM mode traces attachments, documents, statements, boundaries, and final decision type. For out-of-band checks, inject `ApiAuthorizationSimulator` and call `evaluate(...)` with the same controller authorization metadata you use at runtime.

Custom handlers can inject that evaluated decision without accepting the raw request. The decorator returns the exact guard-attached object and fails closed with `403 Forbidden` when a securable route did not produce one:

```typescript
public async publish(
	@ApiAuthorizationDecision<PostEntity>() authorizationDecision: IApiAuthorizationDecision<PostEntity>,
): Promise<PostEntity> {
	return await this.service.publish(authorizationDecision.principal.id);
}
```

Important IAM details from the current implementation:

- `resource.id` and `resource.operatorId` are safe planner-friendly paths for `GET` and `GET_LIST` when declared in `resourceDefinition.fields`
- `queryPath` may be nested, for example `operator.id`, when your repository where-shape uses relations
- route filters and authorization scopes are merged with logical `AND`, not overwrite semantics
- impossible conflicts collapse to a match-nothing branch instead of rewriting the requested filter
- relation payloads can be raw UUID strings, so create/update conditions like `request.body.operator = "${principal.attributes.operatorId}"` work without hooks fallback
- `{id}` placeholders belong to `resourceDefinition.resourcePath`; policy document `Resource` entries should use concrete strings or wildcards such as `gameport:admin:item/*`
- conditions support exactly `StringEquals`, `StringEqualsIfExists`, `StringNotEquals`, and `StringNotEqualsIfExists` (`EApiPolicyConditionOperator`); any other operator fails document validation
- a matched Deny with compilable `resource.*` keys becomes a row exclusion ANDed into the scope that keeps exactly the rows the in-memory evaluator allows: lists omit those rows and row routes answer `404`; a Deny whose `resource.*` keys cannot compile, whose values are `""` or resolve to `null`/`""`, or any `resource.*` Deny on `CREATE`, denies the whole request with `403`
- a list Deny with a row-specific `Resource`, such as `gameport:admin:item/item-1` or `gameport:admin:item/abc*` (string fields only), hides the matching rows from `GET_LIST` and from custom `list` actions; unmappable patterns deny the list, and a Deny on `read` never affects `list`
- custom routes receive the same Allow scope and Deny exclusions through `decision.scope`

### `CorrelationIDResponseBodyInterceptor`: Request Tracing

To simplify debugging and request tracing in complex systems, the library provides the `CorrelationIDResponseBodyInterceptor` and the `CorrelationIDResponseBodyExceptionFilter`. Register both globally in your `main.ts`. They are written for the Fastify adapter, so the application needs `@nestjs/platform-fastify`.

**What it does:**

1.  The interceptor handles exceptions from the handler chain (`HttpException` and others). The filter handles HTTP failures that never reach an interceptor, such as guard and middleware rejections (`401`, `403`, `429`), unmatched routes, and malformed bodies. Without the filter, those responses have no correlation ID. It acts only in an HTTP context; do not apply it to WebSocket gateways.
2.  Looks for the `x-correlation-id` header in the incoming request headers and keeps it only when it is one value of 1 to 128 characters of `[A-Za-z0-9._:-]`.
3.  If the header is kept, its value is added to the `x-correlation-id` response header and the body of the error response.
4.  Otherwise (missing, empty, longer than 128 characters, other characters, or a repeated header), a new `UUID` is generated and added to both places.
5.  Adds a `timestamp` field to the error response body and corrects `statusCode`, so every error body has `correlationID`, `statusCode`, and `timestamp`. An object response is the application's body: an `error` or `message` it lacks stays absent, and one of the wrong type is replaced by the status text. A string or an array response becomes `message`, next to `error`.
6.  Keeps the original failure as `cause` on the rethrown exception, so an exception filter can report it through `FormatErrorEvidenceForLog(exception.cause)`. Never send, log, or serialize the exception or its `cause`.

Nest runs only one filter for each exception: `useGlobalFilters` registrations win over `APP_FILTER` ones, and among them the last registered wins. Register `CorrelationIDResponseBodyExceptionFilter` before your own filter, and call `CorrelationIDNormalizeException(exception, host, httpAdapterHost)` inside your filter to keep the contract. Answer through `httpAdapterHost.httpAdapter.reply`, because a middleware failure carries the native response.

This allows you to link a specific client request with the logs on the server, which is invaluable when investigating incidents.

**Registration:** `main.ts`

```typescript
import { HttpAdapterHost } from "@nestjs/core";
import { CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor } from "@elsikora/nestjs-crud-automator";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	// ...
	app.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(app.get(HttpAdapterHost)));
	app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
	// ...
	await app.listen(3000);
}
```

### Subscriber System (Hooks): Intercepting and Extending Logic

This is the most powerful feature for extending the default behavior. It allows you to "subscribe" to events in the CRUD request lifecycle and execute your code before, after, or in case of an error in the main operation. This is an ideal solution for tasks such as:

- Auditing.
- Sending notifications.
- Complex, context-dependent validation.
- Data enrichment before saving.
- Custom error handling.

#### Enabling the Subscriber System

To get the subscriber system working, you need to follow **four mandatory steps**:

1.  **Import `ApiSubscriberModule`**: This module provides the `ApiSubscriberDiscoveryService`, which is responsible for discovering your subscribers. You need to import it into the root module of your application. `app.module.ts`

    ```typescript
    import { ApiSubscriberModule } from "@elsikora/nestjs-crud-automator";

    @Module({
    	imports: [
    		// ... other modules
    		ApiSubscriberModule, // <--- IMPORTANT
    	],
    	// ...
    })
    export class AppModule {}
    ```

2.  **Make the controller "observable"**: Add the `@ApiControllerObservable()` decorator to the controller class whose events you want to monitor.

    ```typescript
    import { ApiController, ApiControllerObservable } from "@elsikora/nestjs-crud-automator";

    @ApiController({
    	entity: PostEntity,
    	path: "posts",
    	routes: {},
    })
    @ApiControllerObservable() // <--- IMPORTANT
    export class PostController {
    	/* ... */
    }
    ```

3.  **Make the service "observable"**: Similarly, add the `@ApiServiceObservable()` decorator to the service class.

    ```typescript
    import { ApiService, ApiServiceBase, ApiServiceObservable } from "@elsikora/nestjs-crud-automator";

    @Injectable()
    @ApiService({
    	entity: PostEntity,
    })
    @ApiServiceObservable() // <--- IMPORTANT
    export class PostService extends ApiServiceBase<PostEntity> {
    	/* ... */
    }
    ```

4.  **Register subscriber classes as Nest providers**: discovery only sees provider instances.

    Without these steps, your subscriber classes will simply not be discovered and called.

#### Two Levels of Interception

There are two types of subscribers that operate at different levels of abstraction:

1.  **`ApiRouteSubscriberBase`** (Controller Level): Intercepts data at the highest level. Ideal for working with the HTTP context: headers, IP address, authenticated user (`request.user`). The hooks of this subscriber are called before and after the main logic of the _controller_.
2.  **`ApiFunctionSubscriberBase`** (Service Level): Intercepts decorated function execution, including the pre-UPDATE GET lifecycle and post-transaction completion when a transaction owner exists. Ideal for persistence-aware validation, enrichment, auditing, and confirmed-commit side effects.

#### Lifecycle and Execution Order

Understanding the order in which hooks are called is critically important:

1.  **Incoming Request**
2.  Route `onBefore...` hooks.
3.  Request transformation, validation, and typed GET_LIST parsing.
4.  Optional generated-route transaction resolution and request relation hydration.
5.  Decorated function lifecycle: UPDATE first runs one decorated GET and exposes `currentEntity`, then function `onBefore...`, repository work, and function `onAfter...` run.
6.  If the function opened the transaction, it commits and runs matching `onAfterCommit` before returning. A function that joined a route or scope owner leaves that outer transaction open.
7.  Generated response reload when applicable; it remains inside the transaction only when the route owns that boundary.
8.  If the route opened the transaction, it now commits and runs matching `onAfterCommit`. A joined scope owner commits later when its outer callback completes.
9.  Response transformation, route `onAfter...`, authorization result handling, and serialization.
10. **The response is sent to the client.**

Operation failures invoke the matching function or route error lifecycle, and an owning boundary performs confirmed rollback plus `onAfterRollback`. A post-commit hook failure is different: the database is already committed and Automator throws `ApiFunctionTransactionPostCommitException` with outcome `COMMITTED`, never a rollback result.

#### Example 1: Auditing with `ApiRouteSubscriberBase`

**Task**: Log which user created which post.

1.  **Create the subscriber:** `post-audit.subscriber.ts`

    ```typescript
    import { Injectable } from "@nestjs/common";
    import { ApiRouteSubscriber, ApiRouteSubscriberBase, TApiSubscriberRouteAfterCreateContext } from "@elsikora/nestjs-crud-automator";
    import { Post } from "./post.entity";

    @Injectable()
    @ApiRouteSubscriber({ entity: Post, priority: 10 })
    export class PostAuditSubscriber extends ApiRouteSubscriberBase<Post> {
    	// Hook is called AFTER a post is successfully created in the controller
    	async onAfterCreate(context: TApiSubscriberRouteAfterCreateContext<Post>): Promise<Post> {
    		const createdPost = context.result;

    		// Fully typed access to authentication and request data
    		const currentUser = context.DATA.authenticationRequest?.user as { id: string } | undefined;
    		const clientIp = context.DATA.ip;

    		if (createdPost && currentUser) {
    			console.log(`AUDIT: User ${currentUser.id} created Post ${createdPost.id} ` + `with title "${createdPost.title}" from IP ${clientIp}`);
    		}

    		return createdPost;
    	}
    }
    ```

    For before-route subscribers that only observe routes guaranteed to be authenticated and authorized, opt into type-only authorization narrowing:

    ```typescript
    import { ApiRouteSubscriber, ApiRouteSubscriberBase, EApiRouteSubscriberAuthorizationExpectation, TApiSubscriberRouteBeforeCreateContext } from "@elsikora/nestjs-crud-automator";

    @ApiRouteSubscriber({
    	entity: Post,
    	authorization: { expectation: EApiRouteSubscriberAuthorizationExpectation.REQUIRED },
    })
    export class PostBeforeAuditSubscriber extends ApiRouteSubscriberBase<Post, EApiRouteSubscriberAuthorizationExpectation.REQUIRED> {
    	async onBeforeCreate(context: TApiSubscriberRouteBeforeCreateContext<Post, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>): Promise<TApiSubscriberRouteBeforeCreateContext<Post, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]> {
    		const principal = context.result.authenticationRequest.authorizationDecision.principal;
    		console.log(`AUDIT: Principal ${principal.id} is creating a post`);

    		return context.result;
    	}
    }
    ```

    This metadata does not add runtime guards; it only narrows `authenticationRequest.authorizationDecision` in the matching route before-context types.

2.  **Register the subscriber:** Add `PostAuditSubscriber` to the `providers` of your module.

#### Example 2: Data Enrichment with `ApiFunctionSubscriberBase`

**Task**: When creating a post, automatically generate a `slug` from the `title` before saving it to the database.

1.  **Create the subscriber:** `post-slug.subscriber.ts`

    ```typescript
    import { Injectable } from "@nestjs/common";
    import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, TApiSubscriberFunctionBeforeCreateContext, TApiFunctionCreateProperties } from "@elsikora/nestjs-crud-automator";
    import { Post } from "./post.entity";
    import slugify from "slugify";

    @Injectable()
    @ApiFunctionSubscriber({ entity: Post })
    export class PostSlugSubscriber extends ApiFunctionSubscriberBase<Post> {
    	// Hook is called BEFORE repository.save() is called
    	async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<Post>): Promise<TApiFunctionCreateProperties<Post>> {
    		// Fully typed access to transaction manager and repository
    		const manager = context.DATA.eventManager;
    		const repository = context.DATA.repository;

    		if (context.result.title) {
    			// Modify the object, adding the slug
    			context.result.slug = slugify(context.result.title, {
    				lower: true,
    				strict: true,
    			});
    			console.log(`ENRICHMENT: Generated slug: ${context.result.slug}`);
    		}

    		// Return the modified object, which will be saved
    		return context.result;
    	}
    }
    ```

2.  **Register the subscriber:** Add `PostSlugSubscriber` to the module's `providers`.
    ```typescript
    // ...
    providers: [
        UserService,
        PostService,
        PostSlugSubscriber, // <-- Register our subscriber as a provider
    ],
    // ...
    ```

#### Helper Types for Simplified Usage

The library provides helper types that require only the Entity generic parameter, making subscriber implementation cleaner:

```typescript
// Instead of this:
IApiSubscriberFunctionExecutionContext<User, TApiFunctionCreateProperties<User>, IApiSubscriberFunctionExecutionContextData<User>>;

// Use this:
TApiSubscriberFunctionBeforeCreateContext<User>;
```

Before function helper types also accept an optional `Result` generic for advanced subscribers that work with a stricter application-defined service payload. Define this payload type yourself to match the service input shape; the generic only narrows TypeScript's `context.result` type and does not change validation, transformation, or runtime behavior.

```typescript
type WithdrawalCreateInput = {
	amount: string;
	currency: { id: string };
};

class WithdrawalSubscriber extends ApiFunctionSubscriberBase<Withdrawal, WithdrawalCreateInput> {
	async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<Withdrawal, WithdrawalCreateInput>): Promise<WithdrawalCreateInput> {
		context.result.amount; // string
		context.result.currency.id; // string

		return context.result;
	}
}
```

Function subscribers that require a transaction manager should declare that expectation on the subscriber metadata and pass the same transaction expectation to the class/context generic. `REQUIRED` and `MANDATORY` narrow `context.DATA.eventManager` to `EntityManager` and fail before the hook runs if no manager is available. `SUPPORTS`, `NONE`, and subscribers without `transaction` metadata keep `eventManager` optional.

```typescript
import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, EApiFunctionSubscriberTransactionExpectation, TApiSubscriberFunctionBeforeCreateContext } from "@elsikora/nestjs-crud-automator";

@ApiFunctionSubscriber({
	entity: Withdrawal,
	transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED },
})
class WithdrawalAuditSubscriber extends ApiFunctionSubscriberBase<Withdrawal, WithdrawalCreateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED> {
	async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<Withdrawal, WithdrawalCreateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED>): Promise<WithdrawalCreateInput> {
		await context.DATA.eventManager.save(WithdrawalAudit, {
			amount: context.result.amount,
		});

		return context.result;
	}
}
```

**Available helper types:**

- Function subscribers: `TApiSubscriberFunctionBeforeCreateContext`, `TApiSubscriberFunctionAfterCreateContext`, etc.
- Route subscribers: `TApiSubscriberRouteBeforeCreateContext`, `TApiSubscriberRouteAfterCreateContext`, etc.

These helpers provide full type safety and autocomplete for `context.DATA`, `context.ENTITY`, and `context.result`.

### Swagger Documentation

The library automatically generates Swagger/OpenAPI documentation for all endpoints. To enable it in your NestJS application:

```typescript
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const config = new DocumentBuilder()
		.setTitle("Your API")
		.setDescription("API description")
		.setVersion("1.0")
		.addBearerAuth(
			{
				bearerFormat: "JWT",
				scheme: "bearer",
				type: "http",
			},
			"jwt",
		)
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api", app, document);

	await app.listen(3000);
}
bootstrap();
```

Generated DTOs are named after their controller, and that name is the OpenAPI component name. The prefix is the controller class name without a trailing `Controller`, and the entity name is not part of the name: `UserController` generates `UserGetResponseDTO`, and `AdminUserController` generates `AdminUserGetResponseDTO`. Two controllers on one entity, such as an admin and a public controller with different guards, each get their own schemas. A `@ApiRouteCustom` handler uses its method name in place of the route type, so `PublicUserController.getMe` generates `PublicUserGetMeParametersDTO`. Nested generated DTOs are named after the DTO that holds them plus the property, such as `UserGetResponseDetailsV1OwnerDTO`. An anonymous controller class fails when it is decorated. A relation or dynamic object copied with `@ApiPropertyCopy` is named after the DTO it is copied into. At bootstrap (`app.init()`), each application checks its own controllers, plain `@Controller` classes included, and fails for two controller classes with the same prefix, for two different classes, generated or hand-written, with one component name anywhere in a route's schema, and for a lazy type that cannot be resolved; call `app.init()` before exporting the document with `SwaggerModule.createDocument`. Before 5.0.0 the names had no controller prefix, so one controller's schema replaced the other's; regenerate API clients after upgrading. See [Generated Schema Names](https://elsikora.com/docs/nestjs-crud-automator/core-concepts/dtos#generated-schema-names).

Generated routes declare exactly the error statuses they can return. Every route declares `400`, `413`, `415`, and `500`. Row routes declare `404`, and CREATE declares it when `relations.request` loads a relation; a securable CREATE refuses a body outside the policy scope with `403`. CREATE and the updates declare `409`. `401` and `403` need a guard: `security.authentication`, `execution.guards`, or `@UseGuards` on the class or the route, not counting the authorization guards that `ApiMethod` and `@ApiControllerSecurable()` attach. `403` also comes with a securable controller with `authorization`. A guard registered with `APP_GUARD` is out of reach, so document its statuses yourself. Each request validator adds the status of its exception, also one `HttpStatus` does not list. GET_LIST never declares `404`. Each status uses its `Exception<Status>DTO`, and `details` exists only on `400` and `409`. Every status requires only `statusCode` and `message`: `error` is on the wire only when the exception sets it or `CorrelationIDResponseBodyExceptionFilter` is registered, and `correlationID` and `timestamp` appear when `CorrelationIDResponseBodyInterceptor` or that filter handles the error. Custom routes (`@ApiRouteCustom`, `@ApiMethod`) declare `401` and `403` by the same rule, `429` with `throttling.default`, `400`, `413`, `415`, and `500` on every route, each validator exception status, and `404` with an enabled relation in `relations.request.load.include` or any key in `relations.response.load.include`, which reloads the row even when set to `false`; what a handler throws comes from `response.errors`. Declare application-owned statuses, such as a global `ThrottlerGuard` `429`, with `documentation.response.statuses`; a status declared there replaces the default response of that status. See [Error Handling](https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling#error-responses-in-openapi).

### Custom Filtering

The library provides advanced filtering capabilities for list endpoints:

```typescript
// GET /users?username[operator]=cont&username[value]=john&createdAt[operator]=between&createdAt[values]=2023-01-01T00:00:00.000Z&createdAt[values]=2023-12-31T00:00:00.000Z
```

This query would search for users with "john" in their username and created between Jan 1 and Dec 31, 2023.

GET_LIST query DTOs remain dynamically generated from entity `ApiPropertyDescribe` and TypeORM metadata. A route can optionally narrow or overlay that baseline through `routes[GET_LIST].request[QUERY].filter` and `order`, and select `pagination.mode`. The normalized plan drives the generated DTO, strict runtime parser, TypeORM predicates, response wrapper, and OpenAPI deep-object `oneOf` branches. Omitted pagination remains PAGE; omitted filter/order sections retain legacy metadata-driven behavior in PAGE mode.

Use `INHERIT` to overlay metadata-enabled fields or `REJECT` to create an allowlist. Enabled filters declare a non-empty operation set and optional `OMIT`, `REJECT`, or `USE_DEFAULT` missing behavior; `REJECT` returns `400 FILTER_REQUIRED`. Route plans cannot re-enable metadata-disabled fields or properties with `isAutoDtoEnabled: false`. A manual QUERY DTO is mutually exclusive with generated filter/order/pagination config, while a manual RESPONSE DTO remains compatible.

### Generated Nested Reads and Stable Ordering

Generated `GET` and `GET_LIST` routes can bind inherited controller path parameters to described direct scalar entity fields. This keeps nested owner/resource reads inside the native generated runtime:

```typescript
@ApiController<GameEntity>({
	entity: GameEntity,
	path: "providers/:providerKey/games",
	routes: {
		[EApiRouteType.GET]: {
			identity: { parameter: "gameId" },
			read: {
				scope: {
					parameters: [{ parameter: "providerKey", field: "providerId" }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ parameter: "providerKey", field: "providerId" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [
							{ direction: EFilterOrderDirection.DESC, field: "rank" },
							{ direction: EFilterOrderDirection.ASC, field: "id" },
						],
						fields: {
							rank: { isEnabled: true },
						},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
	},
})
export class ProviderGameController {
	constructor(public service: GameService) {}
}
```

`identity.parameter` gives generated `GET` an external primary-identity name without changing the entity field: the example exposes `:gameId` while its TypeORM predicate still targets the entity primary column. The identity config is GET-only. It may be used by itself only when the controller path has no inherited dynamic parameters; any inherited path parameter requires `read.scope.parameters` on the same GET, with every inherited parameter mapped. Its value must be a safe simple identifier such as `gameId`; whitespace, slashes, control characters, punctuation, inherited-path collisions, and unsafe object-property names fail at bootstrap. It does not select an arbitrary lookup field and it does not rename response properties.

Every required scalar `:parameter` inherited from the controller `path` must be mapped exactly once. Wildcards and optional/grouped dynamic parameters are not valid read-scope owners and fail at bootstrap. Each mapping targets a described direct scalar field; duplicate parameters, duplicate fields, unknown path parameters, relations, objects, and missing mappings also fail at bootstrap. Automator generates and documents a route-scoped PARAMETERS DTO from the mapped field metadata and the configured external GET identity. A manual PARAMETERS DTO and generated read configuration are mutually exclusive.

Read criteria are merged conjunctively in a fixed order: GET identity or GET_LIST query predicates, then path scope, then HOOKS/IAM scope. A later layer never overwrites an earlier field; incompatible values become a match-nothing condition. During an additional-scope merge, scalar leaves are emitted as explicit TypeORM `Equal(...)` predicates so relation-shaped paths cannot cause TypeORM to discard them. Wrap object-valued scalar columns such as JSON/JSONB or geometry in `Equal(value)` explicitly; unwrapped objects are interpreted as relation or embedded criteria.

`defaultOrder` applies when the client omits `orderBy`/`orderDirection`. A supplied client order replaces the defaults, after which `tieBreakers` are appended and duplicate fields are removed with the earlier entry winning. In PAGE mode, these server-owned entries may use any described direct scalar field, including a UUID `id` or a property with `isAutoDtoEnabled: false`, without exposing that field in the client `orderBy` allowlist. Hidden properties are not valid for generated GET identity, `read.scope.parameters`, or client filter/order fields. Use a deterministic final tie-breaker for stable `page`/`limit` pagination.

### Generated Cursor Pagination

Opt into cursor pagination beside the typed filter/order plan:

```typescript
[EApiRouteType.GET_LIST]: {
	request: {
		[EApiControllerRequestTarget.QUERY]: {
			order: {
				defaultOrder: [{ direction: EFilterOrderDirection.DESC, field: "position" }],
				fields: {
					isFeatured: { isEnabled: true },
					position: { isEnabled: true },
				},
				tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
				unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
			},
			pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
		},
	},
}
```

The request has required `limit`, optional paired `orderBy`/`orderDirection`, existing filters, and at most one of `after`/`before`; it has no `page`. The response always contains exactly `items`, `nextCursor`, and `previousCursor`. The first window performs one `getMany` query with `limit + 1`; a cursor window adds one opposite-direction `take: 1` probe. Tokens are unsigned canonical stateless Base64URL values, so no cursor table or key is needed.

CURSOR requires the complete primary key, single or composite, as the final explicit tie-breakers: each component appears exactly once, in any order among them, after every other order entry. Every possible order field must be a described non-null direct scalar that is exposed in the generated response. A property with `isAutoDtoEnabled: false` therefore cannot participate in CURSOR ordering, even as a server-only default or tie-breaker. Tokens bind route, inherited path values, plan signature, normalized actual filters, and effective order. They exclude `limit` and HOOKS/IAM: current query/path/IAM predicates are recalculated and AND-merged on every window and probe.

CURSOR v1 deliberately supports only PostgreSQL with its standard text result parsers. Proven TypeORM order declarations are limited to `boolean`; signed `smallint` and `integer`, including increment-generated columns whose PostgreSQL DDL uses `SMALLSERIAL` or `SERIAL`; numeric enums backed by `smallint` or `integer`; signed `bigint`, including increment-generated columns whose DDL uses `BIGSERIAL`, exposed as a canonical decimal `BIGINT_STRING`; native `uuid`; and `timestamptz` with a declared integer `precision` from 0 to 3, described as `DATE_TIME` so a JavaScript `Date` round-trips exactly. An unset precision (PostgreSQL defaults to 6), any other precision, `timestamp`, and any date column the active driver does not store as `timestamptz`, such as an untyped `@CreateDateColumn`, fail at bootstrap. PostgreSQL binary mode, custom `extra.types` parsers, every other PostgreSQL storage type, and every other database driver fail at application bootstrap, naming the route and the active driver, and again before CURSOR query I/O, which is where a request-scoped controller fails, because Nest runs no bootstrap hook on it. PAGE behavior and its existing TypeORM driver support are unchanged.

The route authorization action remains GET_LIST (`onBeforeGetList`). One GET_MANY BEFORE chain runs per CURSOR HTTP request; its detached candidate `where` and `withDeleted` snapshot is reused for the main window and opposite probe. The framework re-ANDs mandatory scope and window predicates, owns `order`/`take`, forces `cache: false`, shadows `select`/`skip`, and rejects subscriber `join`/`lock`. GET_MANY AFTER hooks run for each actual query. Direct `getMany(...)` calls retain their ordinary per-call subscriber contract.

Generated mandatory reads bypass explicit, inherited, and globally enabled TypeORM query caches. Requested relations with effective `relationLoadStrategy: "query"` and a data-source cache configured with `alwaysEnabled: true` cannot inherit the root `cache: false` guarantee, so Automator rejects that combination before repository I/O; use join loading or disable the global always-on cache.

On PostgreSQL and CockroachDB, Automator binds no `Date` into a `timestamptz` condition and no parsed `Date` of a temporal primary key, because pg serializes a `Date` through the process's local offset truncated to whole minutes. On PostgreSQL and CockroachDB, every `Date` a read compares with a column whose driver-normalized type is `timestamptz`, from filters, authorization scopes, keys, or a service caller's where clause, binds as canonical UTC text after the column transformers ran once on every operand of the condition, and so does a `Date` a transformer returns for another operand; other drivers bind what the transformers return, and on every driver a composed condition such as `And` on a transformed `timestamptz`, `timestamp`, `datetime`, or `date` column runs the transformers once on each operand; an invalid `Date` fails before query I/O. A client date-time filter value is the UTC instant `YYYY-MM-DDTHH:mm:ss.sssZ` on every column, a calendar `date` filter takes `YYYY-MM-DD`, and a `time` filter takes `HH:mm:ss`, each within the years 0001 to 9999 and the calendar; any other value, an offset or a zone-less date-time included, answers `400 FILTER_NOT_VALID` on every GET_LIST route. A paged read of an entity whose primary key includes a `timestamptz`, `timestamp`, or `date` column, with joined relations from `include`, eager relations, or relation filters, loads its distinct page keys as PostgreSQL text and then the entities of exactly those keys on one query runner; such a page orders only by the entity's own columns. Every `relationLoadStrategy: "query"` relation of such an entity, a `"query"` relation over a temporal join column, and a to-many `@RelationId` or `loadRelationIds` relation under the same conditions fail at bootstrap for every generated route that is not disabled and its request relation loads, and before query I/O for other reads, naming the relation load, the bound column, and the recipe `relationLoadStrategy: "join"`; the exact text also goes to the error log. Other drivers keep TypeORM's own loading; on MySQL, mysql2 truncates `DATETIME(4)`–`DATETIME(6)` values to milliseconds and shifts local times inside a daylight-saving gap of the process zone.

Because unsigned tokens carry reversible order values, every potential order/tie field must be selected, persisted, non-null, exactly representable, free of TypeORM value transformers/accessors, and unconditionally raw-exposed in the response. Entity `@AfterLoad` listeners are rejected at bootstrap, and applicable active TypeORM `afterLoad` subscribers fail at bootstrap and again before query I/O. Automator snapshots each subscriber's `listenTo()` target once; subscriber implementations and PostgreSQL parser configuration are trusted TypeORM extension code and must be deterministic. Before decoding, the actual transaction repository proves the supported PostgreSQL storage, hydration, comparison, and canonical wire domain; everything outside the v1 matrix fails closed. Request-only DTO bounds, lengths, patterns, and `multipleOf` rules do not constrain the opaque seek boundary, and `BIGINT_STRING` values never convert through `Number`. Later function, route, authorization, relation, DTO, and serialization work may redact unrelated fields but cannot change cardinality, row sequence, protected raw tuples, cursors, or the flat envelope.

### Polymorphic Reads For Table Inheritance

A generated controller over a TypeORM single-table-inheritance root needs no DTO or option. Import the child entity files before the controller:

```typescript
import "./deposit-detail-card-transfer.entity";
import "./deposit-detail-qr.entity";

import { DepositDetailEntity } from "./deposit-detail.entity";

@ApiController<DepositDetailEntity>({
	entity: DepositDetailEntity,
	name: "DepositDetails",
	path: "deposit-details",
	routes: {
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
	},
})
export class DepositDetailController {
	constructor(public readonly service: DepositDetailService) {}
}
```

Each row is serialized through the DTO of its variant, such as `DepositDetailGetResponseCardTransferDTO`, and Swagger describes GET and the GET_LIST `items` as `oneOf` with a discriminator mapping. A row whose discriminator value has no variant fails with `500` without echoing the value, and a child entity loaded after the controller, or a root with no child loaded, fails startup with a message naming the fix. Discriminator values use only letters, digits, `_` and `-`. The root declares the discriminator with `@Column` and `@ApiPropertyDescribe`, keeps it selected, stores it as a string, and leaves it in GET and GET_LIST responses; otherwise startup fails.

Filters, order, pagination, and HOOKS/IAM scope stay on root columns. CURSOR order fields must be root columns that every variant still proves. Generated writes keep working on the root columns only, and a `relations.request` key declared only on a child entity fails startup with a message naming the key, the root, and the child. From 5.0.0, on every entity and route, a `relations.request` block that would fail at request time fails startup instead, including on GET, GET_LIST, and DELETE, which used to ignore it; see [Request Relation Startup Checks](https://elsikora.com/docs/nestjs-crud-automator/guides/relations#request-relation-startup-checks). Also from 5.0.0, an existing controller over such a root changes from silently stripped variant fields to the full polymorphic shape, and the 4.x `<Root>GetResponseDTO` and `<Root>GetListResponseDTO` Swagger components disappear; a manual RESPONSE DTO keeps the old shape. See [Table Inheritance](https://elsikora.com/docs/nestjs-crud-automator/core-concepts/entities#table-inheritance) for the variant rules and migration notes.

## 🧭 Migrating to 4.0

Generated controller routes now resolve and capture the exact service function before the Automator-managed route transaction or repository I/O. GET, GET_LIST, GET_MANY, UPDATE, and DELETE accept only a function produced for the same entity and function type by `@ApiService` or the matching built-in `@ApiFunctionGet`, `@ApiFunctionGetList`, `@ApiFunctionGetMany`, `@ApiFunctionUpdate`, or `@ApiFunctionDelete` decorator. Undecorated overrides, instance shadows, accessors, and wrong-entity/type decorators fail closed before the method body runs. Generated CREATE applies the same check to `create` and to its reload `get`, and since 5.0.0 a controller fails at startup when either one is not protected. Generated UPDATE also preflights a protected GET when response relation loading requires a reload.

This intentionally breaks the former generated-route selective-override behavior. Remove a reserved override and use the `@ApiService` implementation, apply the matching built-in decorator knowing that it owns the resulting CRUD implementation, or move domain behavior to subscribers, `@ApiFunctionCustom`, or a custom route. Direct service calls remain outside this route capability check. See the full [4.0 migration guide](https://elsikora.com/docs/nestjs-crud-automator/guides/migrating-to-4-0).

The release commit must use `feat!:` or a `BREAKING CHANGE:` footer so semantic-release publishes a major version.

## 🧭 Migrating to 3.0

The 3.0 line is published, and `3.0.2` is the baseline before the current source work. Review the [3.0 release notes](https://elsikora.com/docs/nestjs-crud-automator/guides/release-notes-3-0) and follow [Migrating to 3.0](https://elsikora.com/docs/nestjs-crud-automator/guides/migrating-to-3-0) when upgrading a pre-3.0 consumer. The separate generated-route capability boundary above requires a later major release.

The major migration covers semantic timestamp ownership, UPDATE `currentEntity`, named transaction scopes and post-transaction hooks, source-first authorization, opt-in generated-route transactions and relation locks, entity-based service relation inputs, typed GET_LIST query plans and strict `400` responses, the BigInt string sign enum, and retired validator configuration exports.

The current contract has no arbitrary immutable controller `baseWhere`, no `FULL` or `PRESERVE` relation projection, and no custom-only/default-disabled controller mode. Generated `read.scope.parameters` is specifically a request-bound mapping from inherited path parameters, while GET-only `identity.parameter` names the wire parameter for the actual primary column; neither is a fixed-scope escape hatch. HOOKS/IAM scope remains the authorization boundary, custom-only controllers disable all six generated routes explicitly, and a consumer-side typed URL/bracket-filter builder remains deferred.

## 🛣 Current Status

Version `4.0.1` is the published baseline before the current source; package versions remain owned by release automation. Core CRUD generation, DTO generation, Swagger/OpenAPI metadata, request/response transformers, relation loading, default page pagination, opt-in stateless cursor pagination, filtering/sorting, subscribers, transactions, and HOOKS/IAM authorization are implemented.

MongoDB, GraphQL, soft deletes, bulk operations, general-purpose cache integration, and custom parameter decorators are not part of the current public contract. Authorization supports source-first resolver reads by default, bounded in-process resolver caching as an explicit opt-in, separate policy-rule caching, and explicit cache invalidation.

## 🛣 Roadmap

The roadmap is aligned with the current source contract rather than older docs-only examples.

### Available in Current Source

- REST CRUD controller and service generation for TypeORM entities
- Entity-driven DTO generation for body, query, parameters, and response contracts, including controller-scoped typed GET_LIST query plans and inherited read-path parameter DTOs
- Custom DTO support, including nested manual DTOs and GET_LIST item response DTOs
- Polymorphic GET and GET_LIST responses for TypeORM single-table-inheritance roots, with `oneOf` Swagger schemas and fail-closed serialization
- Swagger/OpenAPI metadata generation for generated and custom routes
- Default page/limit and opt-in bidirectional cursor pagination, typed filtering, client ordering plus server defaults/tie-breakers, request validators, and request/response transformers
- Generated nested GET/GET_LIST owner scoping through exact inherited path-parameter mappings
- Request and response relation loading with configurable reference projection
- Route and function subscribers, including custom route/function hooks and error hooks
- Hooks-mode authorization policies and IAM-style policy document authorization
- Function, generated-route, and named transaction ownership with direct relation locks
- Environment-agnostic AI guidance bundle for AI-assisted development

### Current Focus

- Keep `ApiRouteCustom` and generated routes on the same `ApiMethod` composition path for typed execution and HTTP documentation concerns
- Keep `README.md`, `docs/`, and `ai/` synchronized with the public TypeScript interfaces
- Expand examples for `ApiRouteCustom`, `ApiFunctionCustom`, relation loading boundaries, and IAM cache invalidation
- Harden documentation around generated `PUT` vs `PATCH`, GET_LIST response modes, subscriber context shapes, and authorization custom actions
- Continue improving tests for custom DTOs, route runtime behavior, policy execution, and transaction scopes

### Future Candidates

- Extend CURSOR beyond the PostgreSQL v1 boolean/int2/int4/numeric-enum/int8/UUID matrix only as a separate storage-domain slice rewritten from the current source with an exact database/type matrix and real PostgreSQL E2E. The superseded prototype evidence is recovery object `202e2eab`; it must never be restored wholesale.
- Soft-delete route semantics
- Bulk create/update/delete operations
- File upload recipes for generated and custom controllers
- General-purpose cache adapter examples beyond authorization rule caching
- GraphQL or MongoDB support after a separate API design pass

## 🤖 AI Guidance Bundle

This repository includes a source-aligned, environment-agnostic AI guidance bundle at `ai/`. The canonical CRUD Automator skill lives at `ai/crud-automator/SKILL.md`, with adapters for Cursor, Claude Code, Codex-style agents, and other agent runners.

Use `ai/README.md` for installation instructions when a specific tool expects files such as `.cursor/skills`, `AGENTS.md`, or `CLAUDE.md`. The skill covers current route config shape, DTO rules, custom route/function boundaries, subscribers, HOOKS/IAM authorization, relation loading, transactions, and common docs drift pitfalls.

## ❓ FAQ

### How does NestJS-Crud-Automator compare to @nestjsx/crud?

While @nestjsx/crud provides similar functionality, NestJS-Crud-Automator offers more comprehensive TypeScript integration, better Swagger documentation, and more flexible customization options. It's designed from the ground up to work with the latest NestJS and TypeORM versions.

### Can I customize the generated endpoints?

Yes! The library provides multiple ways to customize your endpoints:

1. You can disable specific routes
2. Add authentication guards to specific routes
3. Customize DTO validation and transformation
4. Add custom request validators
5. Override the auto-generated DTOs with your own

### Does it support pagination?

Yes. PAGE is the source-compatible default: it requires 1-based `page` and `limit` and returns counts/totals. CURSOR is opt-in: it requires `limit`, accepts at most one of `after`/`before`, and returns `{ items, nextCursor, previousCursor }`. Configure an explicit order that ends with the complete primary key, single or composite, as its final tie-breakers; cursor mode then supports next/previous navigation without database cursor storage. CURSOR v1 is PostgreSQL-only and accepts only the exact boolean, signed int2/int4, numeric-enum int2/int4, signed `BIGINT_STRING` int8, native UUID, and millisecond-precision `timestamptz` storage contracts described above; PAGE is unchanged.

### How is filtering implemented?

Filtering uses an operator-based bracket wire format with operations such as equals, contains, comparison, membership, and between. By default, fields come from entity metadata. A generated GET_LIST route may add a typed filter/order plan to narrow or allowlist direct scalar and one-hop to-one scalar paths such as `author.id[...]` or `author.username[...]`; UUID fields support membership (`in`/`notin`) like boolean, enum, number, and string fields. Configured plans reject unknown, disabled, malformed, or disallowed input with `400` independently of the host `ValidationPipe`. A PAGE route without a typed filter takes its fields from entity metadata and validates its own QUERY DTO: from 5.0.0, a value outside the DTO, such as an `orderBy` outside the generated enum or an uppercase `orderDirection`, returns the `ValidationPipe` `400` body before any SQL, with or without a host pipe. This includes a filter group such as `nmae[operator]=eq&nmae[value]=x` or `id[...]` for a field the DTO does not publish, which used to return the unfiltered list, a filter through a to-many relation such as `tags.name[...]`, which the generated DTO no longer publishes, and any other key the DTO does not publish, such as a cache-buster `_=…` or `utm_source`, which used to be ignored. Each unpublished key reads `property <key> should not exist`; a typed plan rejects the same keys with `FILTER_NOT_VALID`. On every GET_LIST route, a column is orderable only when the list response exposes its value (its GET_LIST `RESPONSE` side is not disabled, not `isExpose: false`, and visible for the route guard), it is enabled as a list query field, and it does not set `useAsOrderByFilter: false`, so a column the response hides cannot leak its values through row order. A route with a manual GET_LIST response DTO, either a list wrapper or `{ itemType }`, can order only by item properties that DTO publishes in its OpenAPI schema; a wrapper without a documented `items` element allows no ordering.

### Can I use this with NestJS microservices?

Yes, while the library primarily targets REST APIs, you can use the generated DTOs and validation logic in microservice implementations as well.

### Does it support file uploads?

The core library doesn't include file upload functionality, but you can easily extend the generated controllers to add file upload capabilities using NestJS's built-in features.

### Is it compatible with custom database repositories?

Yes, as long as your repository follows the TypeORM Repository pattern, it will work with NestJS-Crud-Automator.

## 🔒 License

This project is licensed under **MIT License**.

Copyright (c) 2025 ElsiKora

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

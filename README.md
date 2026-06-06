<p align="center">
  <img src="https://6jft62zmy9nx2oea.public.blob.vercel-storage.com/nestjs-crud-automator-8vS2Gox6Qf3xgQazi0Uf8j4ML1surI.png" width="500" alt="project-logo">
</p>

<h1 align="center">NestJS-Crud-Automator 🚀</h1>
<p align="center"><em>A powerful library for automating CRUD operations in NestJS applications</em></p>

<p align="center">
    <a aria-label="ElsiKora logo" href="https://elsikora.com">
  <img src="https://img.shields.io/badge/MADE%20BY%20ElsiKora-333333.svg?style=for-the-badge" alt="ElsiKora">
</a> <img src="https://img.shields.io/badge/npm-blue.svg?style=for-the-badge&logo=npm&logoColor=white" alt="npm"> <img src="https://img.shields.io/badge/typescript-blue.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript"> <img src="https://img.shields.io/badge/nestjs-red.svg?style=for-the-badge&logo=nestjs&logoColor=white" alt="nestjs"> <img src="https://img.shields.io/badge/swagger-green.svg?style=for-the-badge&logo=swagger&logoColor=white" alt="swagger"> <img src="https://img.shields.io/badge/license-blue.svg?style=for-the-badge&logo=license&logoColor=white" alt="license"> <img src="https://img.shields.io/badge/version-1.24.0-brightgreen.svg?style=for-the-badge&logo=v&logoColor=white" alt="version-1.24.0">
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
- ✨ **🔍 Advanced filtering, sorting, and pagination for list operations**
- ✨ **📚 Support for object relations with include-driven loading**
- ✨ **⚡ Performance optimized with TypeORM integration for database operations**
- ✨ **🌐 Full support for TypeScript with strong typing throughout the library**
- ✨ **Hooks and Subscriber System:** Intercept and extend business logic at both the controller and service level.
- ✨ **Dynamic and Polymorphic DTOs:** Generate DTOs on-the-fly based on discriminator fields.
- ✨ **Guard-Based Field Exposure:** Generate route-specific response DTOs based on configured guard classes.
- ✨ **🔐 Declarative Authorization Policies:** Subscriber-style policies with automatic guard wiring, scopes, and response transforms.
- ✨ **Request Tracing:** Built-in `CorrelationIDResponseBodyInterceptor` to correlate requests and logs.
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

### Prerequisites

Make sure you have the following dependencies installed in your NestJS project:

- NestJS `@nestjs/common` and `@nestjs/core` `>=11.0.5`
- `@nestjs/passport` `>=11.0.5`
- `@nestjs/platform-fastify` `>=11.0.5`
- `@nestjs/swagger` `>=11.0.3`
- `@nestjs/throttler` `>=6.4.0`
- TypeORM `>=0.3.20`
- Fastify `>=5.0.0`
- `class-validator` `>=0.14.1`
- `class-transformer` `>=0.5.1`
- `lodash` `>=4.17.21`

You might need to install these peer dependencies if they're not already in your project:

```bash
npm install @nestjs/common @nestjs/core @nestjs/passport @nestjs/platform-fastify @nestjs/swagger @nestjs/throttler typeorm class-transformer class-validator fastify lodash
```

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
					bearerStrategies: ["jwt"],
				},
			},
		},
		[EApiRouteType.UPDATE]: {
			security: {
				authentication: {
					type: EApiAuthenticationType.USER,
					guard: JwtAuthGuard,
					bearerStrategies: ["jwt"],
				},
			},
		},
		[EApiRouteType.DELETE]: {
			security: {
				authentication: {
					type: EApiAuthenticationType.USER,
					guard: JwtAuthGuard,
					bearerStrategies: ["jwt"],
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
import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "@elsikora/nestjs-crud-automator";

@ApiController<PostEntity>({
	entity: PostEntity,
	name: "Posts",
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

The generated response keeps `count`, `currentPage`, `items`, `totalCount`, and `totalPages`, while `items` are serialized with `PublicUserResponseDto`.

### Authorization

Authorization now has two first-class modes:

- `hooks`: auto-discovered `@ApiAuthorizationPolicy({ entity })` classes
- `iam`: attachment/document-based IAM evaluation with optional boundaries

`@ApiControllerSecurable()` is marker-only. It turns on the authorization pipeline, but mode selection and all authorization configuration live in `@ApiController({ authorization: ... })`. Each route uses exactly one mode, and route config can override the controller default with `routes[routeType].security.authorization.mode`.

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

Declare the discriminator field, such as `channel` or `mode`, on every variant DTO with the usual property decorators. If `shouldKeepDiscriminatorProperty` is `false`, make that DTO property optional so Swagger can still document the input contract while the transformed instance omits the field.

Root-level discriminator selection runs before Nest can infer a concrete DTO class, so global `ValidationPipe` options are not applied automatically to the selected variant. Add `validatorOptions` or `transformOptions` to the discriminated body config when a route needs specific validation or transformation settings.

Generated service functions and explicit function decorators support transaction modes without exposing `EntityManager` as a public method argument:

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

Use `@ApiFunctionStep` for internal helper methods that need ApiFunction transaction semantics and context but should not become standalone custom actions:

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

```typescript
// app.module.ts
import type { IApiAuthorizationPrincipal, IApiHookPermissionSource, IApiPolicyAttachmentSource, IApiPolicyDocumentSource, IApiResolvedPolicyAttachments } from "@elsikora/nestjs-crud-automator";

import { Module } from "@nestjs/common";

import { ApiAuthorizationModule, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, AuthorizationResolveDefaultPrincipal } from "@elsikora/nestjs-crud-automator";

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

Important IAM details from the current implementation:

- `resource.id` and `resource.operatorId` are safe planner-friendly paths for `GET` and `GET_LIST` when declared in `resourceDefinition.fields`
- `queryPath` may be nested, for example `operator.id`, when your repository where-shape uses relations
- route filters and authorization scopes are merged with logical `AND`, not overwrite semantics
- impossible conflicts collapse to a match-nothing branch instead of rewriting the requested filter
- relation payloads can be raw UUID strings, so create/update conditions like `request.body.operator = "${principal.attributes.operatorId}"` work without hooks fallback
- `{id}` placeholders belong to `resourceDefinition.resourcePath`; policy document `Resource` entries should use concrete strings or wildcards such as `gameport:admin:item/*`

### `CorrelationIDResponseBodyInterceptor`: Request Tracing

To simplify debugging and request tracing in complex systems, the library provides the `CorrelationIDResponseBodyInterceptor`. This interceptor should be registered globally in your `main.ts`.

**What it does:**

1.  Intercepts all exceptions in the application (`HttpException` and others).
2.  Looks for the `x-correlation-id` header in the incoming request headers.
3.  If the header is found, its value is added to the body of the error response.
4.  If the header is not found, a new `UUID` is generated, which is added to both the response and the logs (if `LoggerUtility` is used).
5.  Adds a `timestamp` field to the error response body.

This allows you to link a specific client request with the logs on the server, which is invaluable when investigating incidents.

**Registration:** `main.ts`

```typescript
import { CorrelationIDResponseBodyInterceptor } from "@elsikora/nestjs-crud-automator";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	// ...
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
2.  **`ApiFunctionSubscriberBase`** (Service Level): Intercepts data immediately before and after calling a repository method (database). Ideal for manipulating data that is to be saved or data that has just been retrieved from the DB.

#### Lifecycle and Execution Order

Understanding the order in which hooks are called is critically important:

1.  **Incoming Request**
2.  `onBefore...` hooks of **Route** subscribers (executed in `priority` order from highest to lowest).
3.  Internal controller logic (transformers for `request`, `query`, `body`; validators).
4.  A service method is called (e.g., `service.create(body)`).
5.  `onBefore...` hooks of **Function** subscribers (executed in `priority` order).
6.  The main logic of `@ApiFunction` is executed (e.g., `repository.save(body)`).
7.  `onAfter...` hooks of **Function** subscribers (executed in `priority` order).
8.  The result is returned to the controller.
9.  `onAfter...` hooks of **Route** subscribers (executed in `priority` order).
10. **The response is sent to the client.**

In case of an error at any stage, execution is interrupted, and the corresponding `on...Error...` hooks are called.

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

	const config = new DocumentBuilder().setTitle("Your API").setDescription("API description").setVersion("1.0").addBearerAuth().build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("api", app, document);

	await app.listen(3000);
}
bootstrap();
```

### Custom Filtering

The library provides advanced filtering capabilities for list endpoints:

```typescript
// GET /users?username[operator]=cont&username[value]=john&createdAt[operator]=between&createdAt[values]=["2023-01-01","2023-12-31"]
```

This query would search for users with "john" in their username and created between Jan 1 and Dec 31, 2023.

## 🛣 Current Status

The current public package focuses on NestJS REST controllers backed by TypeORM repositories. Core CRUD generation, DTO generation, Swagger/OpenAPI metadata, request/response transformers, relation loading, pagination, filtering/sorting, subscribers, and hooks/IAM authorization are implemented.

MongoDB, GraphQL, soft deletes, bulk operations, general-purpose cache integration, and custom parameter decorators are not part of the current public contract. Authorization policy rule caching and explicit authorization cache invalidation are supported.

## 🛣 Roadmap

The roadmap is aligned with the current source contract rather than older docs-only examples.

### Available Now

- REST CRUD controller and service generation for TypeORM entities
- Entity-driven DTO generation for body, query, parameters, and response contracts
- Custom DTO support, including nested manual DTOs and GET_LIST item response DTOs
- Swagger/OpenAPI metadata generation for generated and custom routes
- Pagination, filtering, sorting, request validators, and request/response transformers
- Request and response relation loading with configurable reference projection
- Route and function subscribers, including custom route/function hooks and error hooks
- Hooks-mode authorization policies and IAM-style policy document authorization
- Function transaction scopes for generated and custom service operations
- Environment-agnostic AI guidance bundle for AI-assisted development

### Current Focus

- Keep `README.md`, `docs/`, and `ai/` synchronized with the public TypeScript interfaces
- Expand examples for `ApiRouteCustom`, `ApiFunctionCustom`, relation loading boundaries, and IAM cache invalidation
- Harden documentation around generated `PUT` vs `PATCH`, GET_LIST response modes, subscriber context shapes, and authorization custom actions
- Continue improving tests for custom DTOs, route runtime behavior, policy execution, and transaction scopes

### Future Candidates

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

Yes, the GET_LIST operation automatically includes pagination with limit and page parameters, and returns count, currentPage, totalCount, and totalPages in the response.

### How is filtering implemented?

Filtering is implemented using a flexible operator-based approach that supports operations like equals, contains, greater than, less than, and between. Filters apply to generated query fields: scalar entity fields and explicit one-level relation property paths such as `author.id[...]` or `author.username[...]`; hidden query fields, object fields, relation-valued fields, and top-level `author[...]` relation filters are skipped.

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

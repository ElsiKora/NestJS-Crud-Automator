# API Controller Configuration Documentation

## Overview
The API Controller configuration is a TypeScript-based configuration system that provides a comprehensive way to define API endpoints with authentication, request/response handling, validation, and data transformation capabilities.

## Table of Contents
- [Basic Configuration Structure](#basic-configuration-structure)
- [Route Configuration](#route-configuration)
- [Authentication](#authentication)
- [Request Handling](#request-handling)
- [Response Handling](#response-handling)
- [Data Transformation](#data-transformation)
- [Validation](#validation)
- [Relations Management](#relations-management)
- [Auto DTO Configuration](#auto-dto-configuration)

## Basic Configuration Structure

The base configuration object follows this interface:

```typescript
interface IApiControllerProperties<E> {
    entity: IApiBaseEntity;
    name?: string;
    path?: string;
    routes: {
        [R in EApiRouteType]?: TApiControllerPropertiesRoute<E, R>;
    };
}
```

### Properties:
- `entity`: The base entity class for the controller
- `name`: Optional name for the controller
- `path`: Optional URL path for the controller
- `routes`: Object containing route configurations

## Route Configuration

Routes are defined using the `EApiRouteType` enum, which includes:
- CREATE
- GET
- GET_LIST
- UPDATE
- PARTIAL_UPDATE
- DELETE

Each route can be configured with:
- Authentication settings
- Request handling
- Response handling
- Data transformations
- Validation rules

Example:
```typescript
{
    [EApiRouteType.CREATE]: {
        authentication: {...},
        request: {...},
        response: {...}
    }
}
```

## Authentication

Authentication configuration allows you to specify:
- Bearer token strategies
- Security strategies
- Authentication guards
- Authentication type

```typescript
interface IApiControllerPropertiesRouteAuthentication {
    bearerStrategies?: Array<string>;
    guard: Type<IAuthGuard>;
    securityStrategies?: Array<string>;
    type: EApiAuthenticationType;
}
```

Example:
```typescript
authentication: {
    bearerStrategies: ["accountAuthorization"],
    guard: AccountGuard,
    securityStrategies: ["accountRequestSignature", "accountRequestTimestamp"],
    type: EApiAuthenticationType.ACCOUNT
}
```

## Request Handling

Request configuration includes:
- Relations loading
- Data transformation
- Request validation

```typescript
interface IApiControllerPropertiesRouteBaseRequest<E, R> {
    relations?: TApiControllerPropertiesRouteBaseRequestRelations<E>;
    transformers?: TApiControllerPropertiesRouteBaseRequestTransformers<E, R>;
    validators?: Array<IApiRequestValidator<E>>;
}
```

### Relations Loading Strategies

Two strategies are available:
1. **AUTO**: Automatically loads relations
2. **MANUAL**: Manually specify relations to load

```typescript
relations: {
    loadRelations: true,
    relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
    relationsToLoad: ["bank"],
    servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
    relationsServices: {
        bank: "bankService"
    }
}
```

## Response Handling

Response configuration allows you to:
- Specify relations to include
- Transform response data

```typescript
interface IApiControllerPropertiesRouteBaseResponse<E, R> {
    relations?: FindOptionsRelations<E>;
    transformers?: TApiControllerPropertiesRouteBaseResponseTransformers<E, R>;
}
```

Example:
```typescript
response: {
    relations: {
        bank: true,
        currency: true
    },
    transformers: {
        [EApiDtoType.RESPONSE]: [
            {
                key: "user",
                type: EApiControllerRequestTransformerType.DYNAMIC,
                value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP
            }
        ]
    }
}
```

## Data Transformation

Transformers can be configured for different DTO types:
- BODY
- QUERY
- REQUEST
- RESPONSE

Two types of transformers are available:
1. **DYNAMIC**: Uses predefined constants
2. **STATIC**: Uses static values

```typescript
type TApiRequestTransformer<E> = {
    key: keyof IApiGetListResponseResult<E> | keyof Partial<E> | keyof TApiFunctionGetListProperties<E>;
} & (
    | {
        type: EApiControllerRequestTransformerType.DYNAMIC;
        value: (typeof TRANSFORMER_VALUE_DTO_CONSTANT)[keyof typeof TRANSFORMER_VALUE_DTO_CONSTANT];
    }
    | {
        type: EApiControllerRequestTransformerType.STATIC;
        value: string;
    }
);
```

## Validation

Validators can be configured for requests with:
- Error type
- Exception class
- Validation function

```typescript
interface IApiRequestValidator<E> {
    errorType: EErrorStringAction;
    exception: TApiException;
    validationFunction: (entity: DeepPartial<E> | Partial<E> | TApiFunctionGetListProperties<E>) => boolean | Promise<boolean>;
}
```

Example:
```typescript
validators: [
    {
        errorType: EErrorStringAction.ADDRESS_NOT_MATCH_PATTERN,
        exception: BadRequestException,
        validationFunction: (account: Partial<Account>): boolean => 
            (account.id?.includes("7") ? account.id.includes("AAAA") : true)
    }
]
```

## Auto DTO Configuration

Auto DTO allows automatic Data Transfer Object configuration:

```typescript
autoDto?: {
    [key in EApiDtoType]?: IApiControllerPropertiesRouteAutoDtoConfig;
};
```

Example:
```typescript
autoDto: {
    [EApiDtoType.REQUEST]: {
        validators: [
            {
                constraintClass: HasAtLeastOneOfListedProperties,
                options: ["hybrid", "currencyId"]
            }
        ]
    }
}
```

## Usage Example

Here's a complete example of a route configuration:

```typescript
[EApiRouteType.CREATE]: {
    authentication: {
        bearerStrategies: ["accountAuthorization"],
        guard: AccountGuard,
        securityStrategies: ["accountRequestSignature", "accountRequestTimestamp"],
        type: EApiAuthenticationType.ACCOUNT
    },
    request: {
        relations: {
            loadRelations: true,
            relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
            relationsServices: {
                bank: "bankService"
            },
            relationsToLoad: ["bank"],
            servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL
        },
        transformers: {
            [EApiDtoType.BODY]: [
                {
                    key: "user",
                    type: EApiControllerRequestTransformerType.DYNAMIC,
                    value: TRANSFORMER_VALUE_DTO_CONSTANT.AUTHORIZED_ENTITY
                }
            ]
        },
        validators: [
            {
                errorType: EErrorStringAction.ADDRESS_NOT_MATCH_PATTERN,
                exception: BadRequestException,
                validationFunction: (account: Partial<Account>): boolean => 
                    (account.id?.includes("7") ? account.id.includes("AAAA") : true)
            }
        ]
    },
    response: {
        relations: {
            bank: true,
            currency: true
        },
        transformers: {
            [EApiDtoType.RESPONSE]: [
                {
                    key: "user",
                    type: EApiControllerRequestTransformerType.DYNAMIC,
                    value: TRANSFORMER_VALUE_DTO_CONSTANT.REQUEST_IP
                }
            ]
        }
    }
}
```

## Best Practices

1. **Authentication**
    - Always specify appropriate bearer and security strategies
    - Use proper guards for route protection
    - Choose the correct authentication type

2. **Relations**
    - Use MANUAL strategy when you need precise control over relation loading
    - Use AUTO strategy for simpler cases
    - Always specify required services when using MANUAL strategy

3. **Validation**
    - Implement comprehensive validation rules
    - Use appropriate error types and exceptions
    - Consider both sync and async validation functions

4. **Transformation**
    - Use DYNAMIC transformers for runtime values
    - Use STATIC transformers for constant values
    - Consider the DTO type when applying transformations

## Notes

- All configurations are type-safe with TypeScript
- Relations loading can be controlled at a granular level
- Transformers can be applied at multiple stages of request/response handling
- Validation can be both synchronous and asynchronous
- Auto DTO configuration provides a simplified way to handle data transfer objects

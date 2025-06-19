# NestJS Crud Automator: Subscriber System Implementation Guide

## Overview
This guide documents the comprehensive implementation of the subscriber system in the NestJS Crud Automator. The system allows developers to hook into the lifecycle of CRUD operations at both the granular service (function) level and the broader controller (route) level, providing a powerful and flexible event-based architecture.

## Core Components

### 1. Function Subscribers
Function subscribers intercept entity operations directly within the service layer, before and after the core database logic is executed. This allows for direct manipulation of the data being passed to and returned from the repository.

A function subscriber is a standard NestJS injectable class that implements one or more methods from the `IApiSubscriberFunction` interface.

```typescript
import { Injectable } from "@nestjs/common";
import { ApiFunctionSubscriber, ApiFunctionSubscriberBase, IApiSubscriberFunctionExecutionContext } from "@elsikora/nestjs-crud-automator";
import { EApiFunctionType } from "@elsikora/nestjs-crud-automator";
import { Challenge } from './challenge.entity';

@Injectable()
@ApiFunctionSubscriber({ entity: Challenge })
export class ChallengeFunctionSubscriber extends ApiFunctionSubscriberBase<Challenge> {
    /**
     * Executes before the 'create' function.
     * @param context The execution context.
     * @returns The modified properties to be saved.
     */
    async onBeforeCreate(context: IApiSubscriberFunctionExecutionContext<Challenge, TApiFunctionCreateProperties<Challenge>>): Promise<TApiFunctionCreateProperties<Challenge> | undefined> {
        console.log("Before creating challenge:", context.result);

        // Modify properties before they are saved to the database
        if (context.result) {
            context.result.type = "MODIFIED_BY_SUBSCRIBER";
        }

        return context.result;
    }

    /**
     * Executes after the 'create' function.
     * @param context The execution context.
     * @returns The modified entity before it's returned by the service.
     */
    async onAfterCreate(context: IApiSubscriberFunctionExecutionContext<Challenge, Challenge>): Promise<Challenge | undefined> {
        console.log("After creating challenge:", context.result);

        // Modify the final result
        if (context.result) {
            context.result.name = `${context.result.name} (Processed)`;
        }

        return context.result;
    }
}
```

### 2. Route Subscribers
Route subscribers intercept the request/response lifecycle at the controller level. This is useful for tasks like modifying incoming request bodies before validation or altering the final response DTO before it's sent to the client.

Similar to function subscribers, they are injectable classes implementing methods from the `IApiSubscriberRoute` interface.

```typescript
import { Injectable } from "@nestjs/common";
import { ApiRouteSubscriber, ApiRouteSubscriberBase, IApiSubscriberRouteExecutionContext } from "@elsikora/nestjs-crud-automator";
import { EApiRouteType } from "@elsikora/nestjs-crud-automator";
import { Challenge } from './challenge.entity';
import { DeepPartial } from "typeorm";

@Injectable()
@ApiRouteSubscriber({ entity: Challenge })
export class ChallengeRouteSubscriber extends ApiRouteSubscriberBase<Challenge> {
    /**
     * Executes before the 'create' route handler.
     * @param context The execution context containing request data.
     * @returns The modified request context.
     */
    async onBeforeCreate(context: IApiSubscriberRouteExecutionContext<Challenge, { body: DeepPartial<Challenge> }>): Promise<{ body: DeepPartial<Challenge> } | undefined> {
        console.log("Before create route execution:", context.result.body);

        // Access HTTP metadata
        const headers = context.data.headers;
        const ip = context.data.ip;
        
        // Modify request body before validation and processing
        context.result.body.description = "Modified by Route Subscriber";

        return context.result;
    }

    /**
     * Executes after the 'create' route handler.
     * @param context The execution context containing the response data.
     * @returns The modified response.
     */
    async onAfterCreate(context: IApiSubscriberRouteExecutionContext<Challenge, Challenge>): Promise<Challenge | undefined> {
        console.log("After create route execution:", context.result);

        // Modify the final DTO before it's sent to the client
        context.result.name = `${context.result.name} - [ROUTE_PROCESSED]`;

        return context.result;
    }
}
```

### 3. Enabling Subscriber Discovery
For the subscriber system to discover and execute hooks on a service or controller, the target class must be marked with a special decorator. This opt-in mechanism prevents unintended side effects.

-   **For Services**: Use `@ApiServiceObservable()`
-   **For Controllers**: Use `@ApiControllerObservable()`

```typescript
// Service Example
@ApiServiceObservable()
@Injectable()
export class ChallengeService extends ApiServiceBase<Challenge> {
    // Service implementation...
    // This service can now be intercepted by function subscribers.
}

// Controller Example
@ApiControllerObservable()
@ApiController<Challenge>({
    entity: Challenge,
    // ...
})
export class ChallengeController {
    // This controller can now be intercepted by route subscribers.
}
```
If a service or controller is not decorated with an `*Observable` decorator, it will be ignored by the subscriber system.

### 4. Registration System
The system relies on NestJS's discovery service to automatically find and register all subscriber classes. To enable this, you **must** import the `ApiSubscriberModule` into your application's root module (usually `app.module.ts`).

```typescript
// In your app's main module (e.g., app.module.ts)
import { Module } from '@nestjs/common';
import { ApiSubscriberModule } from '@elsikora/nestjs-crud-automator';

@Module({
    imports: [
        ApiSubscriberModule, // <-- Import the module here
        // ... other modules
    ]
})
export class AppModule {}
```

Once the module is imported, any subscriber class decorated with `@ApiFunctionSubscriber` or `@ApiRouteSubscriber` that is included in the `providers` array of any module in your application will be automatically discovered and registered.

```typescript
// In any feature module (e.g., challenge.module.ts)
@Module({
    providers: [
        ChallengeService,
        ChallengeFunctionSubscriber, // <-- The discovery service will find this provider
        ChallengeRouteSubscriber,
    ],
    controllers: [ChallengeController]
})
export class ChallengeModule {}
```

## System Architecture

### Key Files and Structure
The subscriber system is organized as follows:

1.  **Decorators**:
    *   `/src/decorator/api/subscriber/function.decorator.ts`: Decorator (`@ApiFunctionSubscriber`) to mark and configure function subscribers.
    *   `/src/decorator/api/subscriber/route.decorator.ts`: Decorator (`@ApiRouteSubscriber`) to mark and configure route subscribers.
    *   `/src/decorator/api/service/observable.decorator.ts`: Decorator (`@ApiServiceObservable`) to make services discoverable.
    *   `/src/decorator/api/controller/observable.decorator.ts`: Decorator (`@ApiControllerObservable`) to make controllers discoverable.

2.  **Base Classes**:
    *   `/src/class/api/subscriber/base.class.ts`: An optional base class (`ApiSubscriberBase`) for all subscribers.
    *   `/src/class/api/subscriber/function-base.class.ts`: An optional base class (`ApiFunctionSubscriberBase`) with all possible function hooks pre-defined.
    *   `/src/class/api/subscriber/route-base.class.ts`: An optional base class (`ApiRouteSubscriberBase`) for route subscribers.

3.  **Module & Discovery**:
    *   `/src/module/api-subscriber.module.ts`: The `ApiSubscriberModule` which provides the discovery capabilities and must be imported into the application's root module. It exports the `ApiSubscriberDiscoveryService`.
    *   `/src/class/api/subscriber/discovery-service.class.ts`: The `ApiSubscriberDiscoveryService` leverages the `@nestjs/core` `DiscoveryService` to find all registered providers. On the `onModuleInit` lifecycle hook, it filters these providers to find classes that extend the subscriber base classes and have the necessary metadata attached by the decorators. It then calls the `register` methods on the `ApiSubscriberRegistry`.

4.  **Registry & Executor**:
    *   `/src/class/api/subscriber/registry.class.ts`: A singleton `ApiSubscriberRegistry` that stores all discovered subscriber instances in a `Map`, keyed by the entity name.
    *   `/src/class/api/subscriber/executor.class.ts`: The `ApiSubscriberExecutor` which is responsible for retrieving the correct subscribers from the registry for a given entity and executing their hooks in the correct order.

5.  **Interfaces**:
    *   `/src/interface/class/api/subscriber/interface.ts`: Defines the base subscriber interface.
    *   `/src/interface/class/api/subscriber/execution-context.interface.ts`: Defines the base shape of the context object passed to all subscribers.
    *   `/src/interface/class/api/subscriber/function.interface.ts`: Defines the function subscriber interface.
    *   `/src/interface/class/api/subscriber/function-execution-context.interface.ts`: Extends the base context with function-specific data (`functionType`).
    *   `/src/interface/class/api/subscriber/route.interface.ts`: Defines the route subscriber interface.
    *   `/src/interface/class/api/subscriber/route-execution-context.interface.ts`: Extends the base context with route-specific data (`routeType`, HTTP metadata).

### Execution Flow
The system executes subscribers in a nested sequence:

1.  A request hits a controller method (e.g., `POST /challenge`).
2.  **Before Route Subscriber**: The `ApiSubscriberExecutor` runs the `onBeforeCreate` methods of all relevant route subscribers. The request body can be modified here.
3.  The controller's method continues, performing validation and transformations.
4.  The corresponding service method is called (e.g., `challengeService.create()`).
5.  **Before Function Subscriber**: The `ApiSubscriberExecutor` runs the `onBeforeCreate` methods of all relevant function subscribers. The properties to be saved to the database can be modified here.
6.  The core database operation (e.g., `repository.save()`) is executed.
7.  **After Function Subscriber**: The `ApiSubscriberExecutor` runs the `onAfterCreate` methods. The entity result from the database can be modified here.
8.  The service method returns the final entity to the controller.
9.  The controller performs any final response mapping (e.g., to a DTO).
10. **After Route Subscriber**: The `ApiSubscriberExecutor` runs the `onAfterCreate` methods. The final DTO response can be modified here.
11. The final response is sent to the client.

This layered approach provides maximum flexibility for intercepting logic at different stages of the request lifecycle.

## Technical Implementation Details

### The Executor (`ApiSubscriberExecutor`)
The `ApiSubscriberExecutor` is a static class that acts as the engine of the subscriber system. Its methods, like `executeFunctionSubscribers`, form the core of the execution logic.

**Key Logic:**
1.  **Observability Check**: It first checks if the target service/controller is "observable" via metadata. If not, it returns the original data immediately.
2.  **Subscriber Retrieval**: It fetches the relevant subscribers for the given entity from the `ApiSubscriberRegistry`.
3.  **Hook Construction & Execution**: It dynamically determines the correct hook method name (e.g., `onBeforeCreate`) and iterates through the subscribers, calling the hook if it exists.

```typescript
// From: /src/class/api/subscriber/executor.class.ts

export const ApiSubscriberExecutor = {
	async executeFunctionSubscribers<E extends IApiBaseEntity, TResult, TInput>(
        constructor: new (...args: Array<unknown>) => E, 
        entity: E, 
        functionType: EApiFunctionType, 
        onType: EApiSubscriberOnType, 
        context: IApiSubscriberFunctionExecutionContext<E, TResult, TInput>
    ): Promise<TResult | undefined> {
		if (!Reflect.hasMetadata(METADATA_CONSTANT.API_SERVICE_OBSERVABLE_METADATA_KEY, constructor)) {
			return context.result as TResult;
		}

		const subscribers = ApiSubscriberRegistry.getInstance().getFunctionSubscribers(entity.name);

		for (const subscriber of subscribers) {
			const hookName = `on${onType}${functionType}`; // Simplified for example
			const hook = subscriber[hookName];

			if (typeof hook === "function") {
                // The result of the first hook to return a value is used.
				const result = await hook.call(subscriber, context);
                if (result !== undefined) {
				    return result;
                }
			}
		}
        // Return original result if no subscriber returned a value
		return context.result as TResult;
	},
    // ... similar logic for executeRouteSubscribers
};
```

### Execution Context (`IApiSubscriberExecutionContext`)
The context object is the primary data carrier. It provides access to the operation's state and allows for mutation of the result.

```typescript
// From: /src/interface/class/api/subscriber/execution-context.interface.ts

export interface IApiSubscriberExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> {
	// An immutable container for metadata (e.g., transaction manager, HTTP headers)
	readonly data: Input;
	
    // The entity instance the operation is being performed on.
	readonly entity: E;

	// The mutable data payload that subscribers can modify.
	result?: Result;
}
```
The `IApiSubscriberFunctionExecutionContext` and `IApiSubscriberRouteExecutionContext` interfaces extend this base, adding `functionType` and `routeType` respectively.

### The Discovery Service
The `ApiSubscriberDiscoveryService` is the bridge between the NestJS application and the `ApiSubscriberRegistry`.

**Key Logic:**
1.  It injects NestJS's core `DiscoveryService`.
2.  On the `OnModuleInit` lifecycle hook, it gets all application providers.
3.  It filters these providers to find only those that are subscribers (by checking `instanceof AbstractApiSubscriber...Base` and the presence of decorator metadata).
4.  For each discovered subscriber, it retrieves the entity from the metadata and calls the appropriate `register` method on the `ApiSubscriberRegistry`.

```typescript
// From: /src/class/api/subscriber/discovery-service.class.ts

@Injectable()
export class ApiSubscriberDiscoveryService implements OnModuleInit {
	constructor(private readonly discoveryService: DiscoveryService) {}

	onModuleInit(): void {
		const providers = this.discoveryService.getProviders();
		this.registerFunctionSubscribers(providers);
		// ...
	}

	private registerFunctionSubscribers(providers: Array<InstanceWrapper>): void {
		const functionSubscribers = providers.filter(wrapper =>
            wrapper.instance &&
            wrapper.instance instanceof AbstractApiSubscriberFunctionBase &&
            Reflect.hasMetadata(METADATA_KEY, wrapper.metatype)
        );

		for (const wrapper of functionSubscribers) {
			const properties = Reflect.getMetadata(METADATA_KEY, wrapper.metatype);
			ApiSubscriberRegistry.getInstance().registerFunctionSubscriber(properties.entity, wrapper.instance);
		}
	}
    // ... similar logic for registerRouteSubscribers
}
```

### The Registry (`ApiSubscriberRegistry`)
The registry is a singleton that acts as a simple, in-memory repository for all active subscriber instances, keyed by entity name.

```typescript
// From: /src/class/api/subscriber/registry.class.ts

export class ApiSubscriberRegistry {
	private static instance: ApiSubscriberRegistry;
	private readonly FUNCTION_SUBSCRIBERS = new Map<string, Array<IApiSubscriberFunction<any>>>();

	public static getInstance(): ApiSubscriberRegistry {
		// Singleton implementation...
	}

	public registerFunctionSubscriber<E extends IApiBaseEntity>(entity: E, subscriber: IApiSubscriberFunction<E>): void {
		const entityName = entity.name ?? "";
		if (!this.FUNCTION_SUBSCRIBERS.has(entityName)) {
			this.FUNCTION_SUBSCRIBERS.set(entityName, []);
		}
		const subscribers = this.FUNCTION_SUBSCRIBERS.get(entityName)!;
		subscribers.push(subscriber);
	}

	public getFunctionSubscribers<E extends IApiBaseEntity>(entityName: string): Array<IApiSubscriberFunction<E>> {
		return (this.FUNCTION_SUBSCRIBERS.get(entityName) ?? []) as Array<IApiSubscriberFunction<E>>;
	}
    // ... similar logic for route subscribers
}
``` 
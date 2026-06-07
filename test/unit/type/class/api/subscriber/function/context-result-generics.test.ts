import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function";
import type { TApiSubscriberFunctionBeforeCreateContext, TApiSubscriberFunctionBeforeDeleteContext, TApiSubscriberFunctionBeforeGetContext, TApiSubscriberFunctionBeforeGetListContext, TApiSubscriberFunctionBeforeGetManyContext, TApiSubscriberFunctionBeforeUpdateContext, TApiSubscriberFunctionExecutionContextData } from "@type/class/api/subscriber/function";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionSubscriberBase } from "@class/api/subscriber/function-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import { EApiFunctionType } from "@enum/decorator/api/function";
import { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import { SubscriberResultCreateSubscriber, SubscriberResultEntity, SubscriberResultService, type TSubscriberResultCreateInput, type TSubscriberResultDeleteInput, type TSubscriberResultGetInput, type TSubscriberResultGetListInput, type TSubscriberResultGetManyInput, type TSubscriberResultUpdateInput } from "./fixture";

const resetSubscriberRegistry = (): void => {
	const registry = apiSubscriberRegistry as unknown as {
		FUNCTION_SUBSCRIBERS: { clear: () => void };
		ROUTE_SUBSCRIBERS: { clear: () => void };
	};

	registry.FUNCTION_SUBSCRIBERS.clear();
	registry.ROUTE_SUBSCRIBERS.clear();
};

function createBeforeCreateContext<Result extends TApiFunctionCreateProperties<SubscriberResultEntity>>(result: Result): TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, Result> {
	return {
		DATA: {
			repository: {} as Repository<SubscriberResultEntity>,
		},
		ENTITY: new SubscriberResultEntity(),
		FUNCTION_TYPE: EApiFunctionType.CREATE,
		result,
	};
}

function createCustomPayload(): TSubscriberResultCreateInput {
	return {
		amount: "10.50",
		currency: {
			id: "currency-id",
		},
		destination: "wallet",
		ipAddress: null,
		payWayProvider: {
			id: "provider-id",
		},
		user: {
			id: "user-id",
		},
		userAgent: "vitest",
	};
}

describe("function subscriber result generics", () => {
	beforeEach(() => {
		resetSubscriberRegistry();
	});

	it("should keep one-generic create context usage typed as default create properties", () => {
		const context: TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity> = createBeforeCreateContext({
			amount: "10.50",
		});

		expectTypeOf(context.result).toEqualTypeOf<TApiFunctionCreateProperties<SubscriberResultEntity>>();
		expectTypeOf(context.result.amount).toEqualTypeOf<string | undefined>();
		expect(context.result.amount).toBe("10.50");
	});

	it("should strongly type custom create context result payloads", () => {
		const context: TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, TSubscriberResultCreateInput> = createBeforeCreateContext(createCustomPayload());

		expectTypeOf(context.result.amount).toEqualTypeOf<string>();
		expectTypeOf(context.result.currency.id).toEqualTypeOf<string>();
		expect(context.result.currency.id).toBe("currency-id");
	});

	it("should expose default and custom result generics for every before helper", () => {
		expectTypeOf<TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity>["result"]>().toEqualTypeOf<TApiFunctionCreateProperties<SubscriberResultEntity>>();
		expectTypeOf<TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, TSubscriberResultCreateInput>["result"]>().toEqualTypeOf<TSubscriberResultCreateInput>();
		expectTypeOf<TApiSubscriberFunctionBeforeDeleteContext<SubscriberResultEntity>["result"]>().toEqualTypeOf<TApiFunctionDeleteCriteria<SubscriberResultEntity>>();
		expectTypeOf<TApiSubscriberFunctionBeforeDeleteContext<SubscriberResultEntity, TSubscriberResultDeleteInput>["result"]>().toEqualTypeOf<TSubscriberResultDeleteInput>();
		expectTypeOf<TApiSubscriberFunctionBeforeGetContext<SubscriberResultEntity>["result"]>().toEqualTypeOf<TApiFunctionGetProperties<SubscriberResultEntity>>();
		expectTypeOf<TApiSubscriberFunctionBeforeGetContext<SubscriberResultEntity, TSubscriberResultGetInput>["result"]>().toEqualTypeOf<TSubscriberResultGetInput>();
		expectTypeOf<TApiSubscriberFunctionBeforeGetListContext<SubscriberResultEntity>["result"]>().toEqualTypeOf<TApiFunctionGetListProperties<SubscriberResultEntity>>();
		expectTypeOf<TApiSubscriberFunctionBeforeGetListContext<SubscriberResultEntity, TSubscriberResultGetListInput>["result"]>().toEqualTypeOf<TSubscriberResultGetListInput>();
		expectTypeOf<TApiSubscriberFunctionBeforeGetManyContext<SubscriberResultEntity>["result"]>().toEqualTypeOf<TApiFunctionGetManyProperties<SubscriberResultEntity>>();
		expectTypeOf<TApiSubscriberFunctionBeforeGetManyContext<SubscriberResultEntity, TSubscriberResultGetManyInput>["result"]>().toEqualTypeOf<TSubscriberResultGetManyInput>();
		expectTypeOf<TApiSubscriberFunctionBeforeUpdateContext<SubscriberResultEntity>["result"]>().toEqualTypeOf<TApiFunctionUpdateProperties<SubscriberResultEntity>>();
		expectTypeOf<TApiSubscriberFunctionBeforeUpdateContext<SubscriberResultEntity, TSubscriberResultUpdateInput>["result"]>().toEqualTypeOf<TSubscriberResultUpdateInput>();
	});

	it("should reject custom result generics that are not assignable to the operation payload", () => {
		// @ts-expect-error Result must remain assignable to TApiFunctionCreateProperties<SubscriberResultEntity>.
		const invalidCreateContext: TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, { readonly amount: number }> = undefined as never;
		// @ts-expect-error IApiSubscriberFunction uses the same constrained before-create result generic.
		const invalidCreateSubscriber: IApiSubscriberFunction<SubscriberResultEntity, { readonly amount: number }> = undefined as never;

		expect(invalidCreateContext).toBeUndefined();
		expect(invalidCreateSubscriber).toBeUndefined();
	});

	it("should narrow event manager by subscriber transaction expectation", () => {
		const repository = {} as Repository<SubscriberResultEntity>;
		const requiredData: TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.REQUIRED> = {
			eventManager: {} as EntityManager,
			repository,
		};
		const unionData: TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.REQUIRED | EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = {
			repository,
		};
		const requiredUnionData: TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.MANDATORY | EApiFunctionSubscriberTransactionExpectation.REQUIRED> = {
			eventManager: {} as EntityManager,
			repository,
		};
		const wideExpectationData: TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation> = {
			repository,
		};
		const supportsData: IApiSubscriberFunctionExecutionContextData<SubscriberResultEntity> = {
			repository,
		};
		// @ts-expect-error REQUIRED subscriber DATA must include an event manager.
		const invalidRequiredData: TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.REQUIRED> = {
			repository,
		};
		// @ts-expect-error Required-only union modes must include an event manager.
		const invalidRequiredUnionData: TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.MANDATORY | EApiFunctionSubscriberTransactionExpectation.REQUIRED> = {
			repository,
		};

		expectTypeOf<IApiSubscriberFunctionExecutionContextData<SubscriberResultEntity>["eventManager"]>().toEqualTypeOf<EntityManager | undefined>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.NONE>["eventManager"]>().toEqualTypeOf<EntityManager | undefined>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.SUPPORTS>["eventManager"]>().toEqualTypeOf<EntityManager | undefined>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.MANDATORY>["eventManager"]>().toEqualTypeOf<EntityManager>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.REQUIRED>["eventManager"]>().toEqualTypeOf<EntityManager>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.MANDATORY | EApiFunctionSubscriberTransactionExpectation.REQUIRED>["eventManager"]>().toEqualTypeOf<EntityManager>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation.REQUIRED | EApiFunctionSubscriberTransactionExpectation.SUPPORTS>["eventManager"]>().toEqualTypeOf<EntityManager | undefined>();
		expectTypeOf<TApiSubscriberFunctionExecutionContextData<SubscriberResultEntity, EApiFunctionSubscriberTransactionExpectation>["eventManager"]>().toEqualTypeOf<EntityManager | undefined>();
		expectTypeOf<TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, TSubscriberResultCreateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED>["DATA"]["eventManager"]>().toEqualTypeOf<EntityManager>();
		expect(requiredData.eventManager).toBeDefined();
		expect(requiredUnionData.eventManager).toBeDefined();
		expect(unionData.eventManager).toBeUndefined();
		expect(wideExpectationData.eventManager).toBeUndefined();
		expect(supportsData.eventManager).toBeUndefined();
		expect(invalidRequiredData.repository).toBe(repository);
		expect(invalidRequiredUnionData.repository).toBe(repository);
	});

	it("should allow ApiFunctionSubscriberBase shorthand transaction expectation as the third generic", async () => {
		class RequiredTransactionSubscriber extends ApiFunctionSubscriberBase<SubscriberResultEntity, TSubscriberResultCreateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED> {
			public async onBeforeCreate(context: TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, TSubscriberResultCreateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED>): Promise<TSubscriberResultCreateInput> {
				expectTypeOf(context.DATA.eventManager).toEqualTypeOf<EntityManager>();

				return context.result;
			}
		}

		const subscriber = new RequiredTransactionSubscriber();

		expectTypeOf(subscriber).toMatchTypeOf<IApiSubscriberFunction<SubscriberResultEntity, TSubscriberResultCreateInput, TApiFunctionDeleteCriteria<SubscriberResultEntity>, TApiFunctionGetProperties<SubscriberResultEntity>, TApiFunctionGetListProperties<SubscriberResultEntity>, TApiFunctionGetManyProperties<SubscriberResultEntity>, TApiFunctionUpdateProperties<SubscriberResultEntity>, EApiFunctionSubscriberTransactionExpectation.REQUIRED>>();
		expect(await subscriber.onBeforeCreate(createBeforeCreateContext(createCustomPayload()) as TApiSubscriberFunctionBeforeCreateContext<SubscriberResultEntity, TSubscriberResultCreateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED>)).toEqual(createCustomPayload());
	});

	it("should allow ApiFunctionSubscriberBase custom delete result with final transaction expectation generic", () => {
		class RequiredDeleteTransactionSubscriber extends ApiFunctionSubscriberBase<SubscriberResultEntity, TSubscriberResultCreateInput, TSubscriberResultDeleteInput, TApiFunctionGetProperties<SubscriberResultEntity>, TApiFunctionGetListProperties<SubscriberResultEntity>, TApiFunctionGetManyProperties<SubscriberResultEntity>, TSubscriberResultUpdateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED> {
			public async onBeforeDelete(context: TApiSubscriberFunctionBeforeDeleteContext<SubscriberResultEntity, TSubscriberResultDeleteInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED>): Promise<TSubscriberResultDeleteInput> {
				expectTypeOf(context.DATA.eventManager).toEqualTypeOf<EntityManager>();
				expectTypeOf(context.result).toMatchTypeOf<TSubscriberResultDeleteInput>();

				return context.result;
			}
		}

		const subscriber = new RequiredDeleteTransactionSubscriber();

		expectTypeOf(subscriber).toMatchTypeOf<IApiSubscriberFunction<SubscriberResultEntity, TSubscriberResultCreateInput, TSubscriberResultDeleteInput, TApiFunctionGetProperties<SubscriberResultEntity>, TApiFunctionGetListProperties<SubscriberResultEntity>, TApiFunctionGetManyProperties<SubscriberResultEntity>, TSubscriberResultUpdateInput, EApiFunctionSubscriberTransactionExpectation.REQUIRED>>();
		expect(subscriber).toBeInstanceOf(ApiFunctionSubscriberBase);
	});

	it("should allow function subscriber contracts to return a custom create result", async () => {
		const subscriber: IApiSubscriberFunction<SubscriberResultEntity, TSubscriberResultCreateInput> = new SubscriberResultCreateSubscriber();
		const result = await subscriber.onBeforeCreate?.(createBeforeCreateContext(createCustomPayload()));

		expectTypeOf(result).toEqualTypeOf<TSubscriberResultCreateInput | undefined>();
		expect(result?.user.id).toBe("user-id");
	});

	it("should preserve executor generic result type through registered subscriber dispatch", async () => {
		const subscriber = new SubscriberResultCreateSubscriber();
		const hookSpy = vi.spyOn(subscriber, "onBeforeCreate");

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: SubscriberResultEntity }, subscriber);

		const result = await ApiSubscriberExecutor.executeFunctionSubscribers<SubscriberResultEntity, TSubscriberResultCreateInput, IApiSubscriberFunctionExecutionContextData<SubscriberResultEntity>>(SubscriberResultService, new SubscriberResultEntity(), EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE, createBeforeCreateContext(createCustomPayload()));

		expectTypeOf(result).toEqualTypeOf<TSubscriberResultCreateInput | undefined>();
		expect(hookSpy).toHaveBeenCalledTimes(1);
		expect(result?.payWayProvider.id).toBe("provider-id");
	});
});

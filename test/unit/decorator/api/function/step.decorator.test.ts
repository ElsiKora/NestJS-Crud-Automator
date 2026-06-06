import "reflect-metadata";

import type { IApiFunctionStepContext } from "@interface/class/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionStepRuntime } from "@class/api/function/step-runtime.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction-scope.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";
import { ApiFunctionStep } from "@decorator/api/function/step.decorator";
import { EApiFunctionTransactionMode } from "@enum/decorator/api";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { DECORATORS } from "@nestjs/swagger/dist/constants.js";
import { afterEach, describe, expect, it, vi } from "vitest";

class StepDecoratorEntity {
	public id?: string;
}

class StepDecoratorService extends ApiServiceBase<StepDecoratorEntity> {
	public constructor(public readonly repository: Repository<StepDecoratorEntity>) {
		super();
	}

	@ApiFunctionStep({ entity: StepDecoratorEntity })
	public async publicStep(value: string): Promise<string> {
		return `public:${value}`;
	}

	public async callPrivateStep(value: string): Promise<IApiFunctionStepContext<StepDecoratorEntity>> {
		return await this.privateStep(value);
	}

	public async callProtectedStep(value: string): Promise<IApiFunctionStepContext<StepDecoratorEntity>> {
		return await this.protectedStep(value);
	}

	public readStepContextOutsideStep(): IApiFunctionStepContext<StepDecoratorEntity> {
		return this.getApiFunctionStepContext<StepDecoratorEntity>();
	}

	@ApiFunctionStep({
		entity: StepDecoratorEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	private async privateStep(_value: string): Promise<IApiFunctionStepContext<StepDecoratorEntity>> {
		return this.getApiFunctionStepContext<StepDecoratorEntity>();
	}

	@ApiFunctionStep({
		entity: StepDecoratorEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	protected async protectedStep(_value: string): Promise<IApiFunctionStepContext<StepDecoratorEntity>> {
		return this.getApiFunctionStepContext<StepDecoratorEntity>();
	}

	@ApiFunctionStep({
		entity: StepDecoratorEntity,
	})
	public async readFullFunctionContextFromStep(): Promise<unknown> {
		return this.getApiFunctionContext<StepDecoratorEntity>();
	}
}

const createRepository = () => {
	const transactionRepository = {} as Repository<StepDecoratorEntity>;
	const transactionManager = {
		getRepository: vi.fn().mockReturnValue(transactionRepository),
	} as unknown as EntityManager;
	const repository = {
		manager: {
			getRepository: vi.fn().mockReturnValue({} as Repository<StepDecoratorEntity>),
			transaction: vi.fn(async (callback: (entityManager: EntityManager) => Promise<unknown>) => await callback(transactionManager)),
		},
	} as unknown as Repository<StepDecoratorEntity>;

	return {
		repository,
		transactionManager,
		transactionRepository,
	};
};

describe("ApiFunctionStep", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("wraps methods and delegates to the step runtime with SUPPORTS by default", async () => {
		const { repository } = createRepository();
		const service = new StepDecoratorService(repository);
		const executeSpy = vi.spyOn(ApiFunctionStepRuntime, "execute").mockResolvedValue("runtime-result");

		const result = await service.publicStep("input");

		expect(result).toBe("runtime-result");
		expect(executeSpy).toHaveBeenCalledWith({
			functionArguments: ["input"],
			originalMethod: expect.any(Function),
			properties: {
				entity: StepDecoratorEntity,
			},
			target: service,
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});
	});

	it("does not attach route, subscriber, or Swagger metadata", () => {
		expect(Reflect.getMetadata(PATH_METADATA, StepDecoratorService.prototype.publicStep)).toBeUndefined();
		expect(Reflect.getMetadata(METHOD_METADATA, StepDecoratorService.prototype.publicStep)).toBeUndefined();
		expect(Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, StepDecoratorService.prototype.publicStep)).toBeUndefined();
		expect(Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, StepDecoratorService.prototype.publicStep)).toBeUndefined();
		expect(Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, StepDecoratorService)).toBeUndefined();
		expect(Reflect.getMetadata(DECORATORS.API_OPERATION, StepDecoratorService.prototype.publicStep)).toBeUndefined();
	});

	it("supports decorated private methods invoked by public service methods", async () => {
		const { repository, transactionManager, transactionRepository } = createRepository();
		const service = new StepDecoratorService(repository);

		const context = await ApiFunctionTransactionScope.runWithEntityManager(transactionManager, async () => await service.callPrivateStep("private"));

		expect(context.eventManager).toBe(transactionManager);
		expect(context.repository).toBe(transactionRepository);
		expect(context).not.toHaveProperty("operations");
	});

	it("supports decorated protected methods invoked by public service methods", async () => {
		const { repository, transactionManager, transactionRepository } = createRepository();
		const service = new StepDecoratorService(repository);

		const context = await ApiFunctionTransactionScope.runWithEntityManager(transactionManager, async () => await service.callProtectedStep("protected"));

		expect(context.eventManager).toBe(transactionManager);
		expect(context.repository).toBe(transactionRepository);
	});

	it("rejects full function context access from step bodies", async () => {
		const { repository } = createRepository();
		const service = new StepDecoratorService(repository);

		await expect(service.readFullFunctionContextFromStep()).rejects.toThrow("Api function context is not available inside a decorated ApiFunctionStep execution");
	});

	it("rejects step context access outside step bodies", () => {
		const { repository } = createRepository();
		const service = new StepDecoratorService(repository);

		expect(() => service.readStepContextOutsideStep()).toThrow("Api function step context is not available outside a decorated ApiFunctionStep execution");
	});
});

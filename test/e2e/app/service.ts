import type { DataSource, Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";

import { ApiFunction, ApiFunctionCustom, ApiFunctionStep, ApiFunctionTransactionScope, ApiService, ApiServiceBase, ApiServiceObservable, EApiFunctionTransactionMode, EApiFunctionType } from "../../../src/index";

import { E2eEntity } from "./entity";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: E2eEntity })
export class E2eService extends ApiServiceBase<E2eEntity> {
	@InjectRepository(E2eEntity)
	public readonly repository!: Repository<E2eEntity>;

	@InjectDataSource()
	public readonly dataSource!: DataSource;

	public async reset(): Promise<void> {
		await this.repository.clear();
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.update.current-entity",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async updateAfterUncommittedChange(id: string, name: string): Promise<E2eEntity> {
		const context = this.getApiFunctionContext<E2eEntity>();

		await context.repository.update({ id }, { name });

		return await context.operations.update({ id }, { count: 2 });
	}

	public async createWithTransaction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await ApiFunctionTransactionScope.runWithDataSource(this.dataSource, { name: "createWithTransaction" }, async () => await this.create(body));
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.mandatory",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	public async createWithCustomMandatory(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.none",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.NONE,
		},
	})
	public async createWithCustomNone(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.required",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async createWithCustomRequired(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.supports",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.SUPPORTS,
		},
	})
	public async createWithCustomSupports(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.getApiFunctionContext<E2eEntity>().operations.create(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.step",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async createWithCustomStep(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.createWithMandatoryStep(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.step.rollback",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async createWithFailingCustomStep(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.createWithFailingMandatoryStep(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.step.generated",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async createWithStepGeneratedFunction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.createWithGeneratedFunctionStep(body);
	}

	@ApiFunctionCustom<E2eEntity>({
		action: "custom.step.custom",
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
	})
	public async createWithStepCustomFunction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.createWithNestedCustomFunctionStep(body);
	}

	public async createWithCustomNoneInsideTransaction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await ApiFunctionTransactionScope.runWithDataSource(this.dataSource, { name: "createWithCustomNoneInsideTransaction" }, async () => await this.createWithCustomNone(body));
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinMandatory(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.NONE,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinNone(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.REQUIRED,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinRequired(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	@ApiFunction<E2eEntity, E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.SUPPORTS,
		},
		type: EApiFunctionType.CREATE,
	})
	public async createWithBuiltinSupports(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return body as E2eEntity;
	}

	public async createWithBuiltinNoneInsideTransaction(body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await ApiFunctionTransactionScope.runWithDataSource(this.dataSource, { name: "createWithBuiltinNoneInsideTransaction" }, async () => await this.createWithBuiltinNone(body));
	}

	@ApiFunctionStep<E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	private async createWithMandatoryStep(body: Partial<E2eEntity>): Promise<E2eEntity> {
		const context = this.getApiFunctionStepContext<E2eEntity>();

		if (!context.eventManager) {
			throw new Error("Step transaction manager is required");
		}

		return await context.repository.save({
			...body,
			name: `step-${body.name ?? ""}`,
		});
	}

	@ApiFunctionStep<E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	private async createWithFailingMandatoryStep(body: Partial<E2eEntity>): Promise<E2eEntity> {
		const context = this.getApiFunctionStepContext<E2eEntity>();

		await context.repository.save({
			...body,
			name: `rollback-${body.name ?? ""}`,
		});

		throw new Error("Forced function step failure");
	}

	@ApiFunctionStep<E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	private async createWithGeneratedFunctionStep(body: Partial<E2eEntity>): Promise<E2eEntity> {
		const beforeContext = this.getApiFunctionStepContext<E2eEntity>();
		const result = await this.create({
			...body,
			name: `generated-step-${body.name ?? ""}`,
		});
		const afterContext = this.getApiFunctionStepContext<E2eEntity>();

		if (beforeContext !== afterContext) {
			throw new Error("Step context was not restored after generated function call");
		}

		return result;
	}

	@ApiFunctionStep<E2eEntity>({
		entity: E2eEntity,
		transaction: {
			mode: EApiFunctionTransactionMode.MANDATORY,
		},
	})
	private async createWithNestedCustomFunctionStep(body: Partial<E2eEntity>): Promise<E2eEntity> {
		const beforeContext = this.getApiFunctionStepContext<E2eEntity>();
		const result = await this.createWithCustomMandatory({
			...body,
			name: `nested-step-${body.name ?? ""}`,
		});
		const afterContext = this.getApiFunctionStepContext<E2eEntity>();

		if (beforeContext !== afterContext) {
			throw new Error("Step context was not restored after custom function call");
		}

		return result;
	}
}

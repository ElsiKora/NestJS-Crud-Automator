import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { getMetadataArgsStorage } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { TableMetadataArgs } from "typeorm/metadata-args/TableMetadataArgs";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyCopy } from "@decorator/api/property/copy.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { RegisterAutoDtoChild } from "@utility/register-auto-dto-child.utility";
import { PopAutoDtoContext, PushAutoDtoContext } from "@utility/set-auto-dto-context.utility";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

interface IDeferredDeposit {
	amount: number;
	id: string;
	status: string;
}

type DeferredDepositConstructor = new () => IDeferredDeposit;

let DeferredDepositReference: DeferredDepositConstructor | undefined;

class DeferredDepositCallbackDto {
	amount!: number;
}

class DeferredDepositEntity implements IDeferredDeposit {
	id!: string;
	amount!: number;
	status!: string;
}

registerDeferredDepositEntityMetadata(DeferredDepositEntity);

describe("ApiPropertyCopy", () => {
	it("copies metadata when entity factory resolves after class definition", async () => {
		DeferredDepositReference = undefined;

		const decorator = ApiPropertyCopy({
			entity: () => DeferredDepositReference as DeferredDepositConstructor,
			propertyName: "amount",
			method: EApiRouteType.GET,
			dtoType: EApiDtoType.RESPONSE,
		});
		decorator(DeferredDepositCallbackDto.prototype, "amount");

		DeferredDepositReference = DeferredDepositEntity;

		await flushDeferredTasks();

		const swaggerMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DeferredDepositCallbackDto.prototype, "amount");
		assert.ok(swaggerMetadata, "Swagger metadata should be generated for copied property");
		assert.equal(swaggerMetadata.description, "DeferredDepositEntity transaction amount");

		const registeredProperties: Array<string> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES_ARRAY, DeferredDepositCallbackDto.prototype);
		assert.ok(registeredProperties?.includes(":amount"), "Property should be registered in Swagger metadata array");
	});

	it("throws descriptive error when factory never resolves an entity", async () => {
		DeferredDepositReference = undefined;

		const decorator = ApiPropertyCopy({
			entity: () => DeferredDepositReference as DeferredDepositConstructor,
			propertyName: "amount",
			method: EApiRouteType.GET,
			dtoType: EApiDtoType.RESPONSE,
		});

		const error: Error = await captureDeferredExecutionError(() => {
			class BrokenDepositCallbackDto {
				status!: string;
			}

			decorator(BrokenDepositCallbackDto.prototype, "status");
		});

		assert.match(error.message, /Entity for ApiPropertyCopy could not be resolved/);
	});

	it("supports nested DTO chains with lazy entity factories", async () => {
		DeferredDepositReference = undefined;

		class ThirdLevelDto {
			@ApiPropertyCopy({
				entity: () => DeferredDepositReference as DeferredDepositConstructor,
				propertyName: "status",
				method: EApiRouteType.GET,
				dtoType: EApiDtoType.RESPONSE,
			})
			status!: string;
		}

		class SecondLevelDto {
			@ApiPropertyCopy({
				entity: () => DeferredDepositReference as DeferredDepositConstructor,
				propertyName: "amount",
				method: EApiRouteType.GET,
				dtoType: EApiDtoType.RESPONSE,
			})
			amount!: number;

			@ApiPropertyObject({
				description: "meta",
				entity: () => DeferredDepositReference as DeferredDepositConstructor,
				shouldValidateNested: true,
				type: ThirdLevelDto,
			})
			meta!: ThirdLevelDto;
		}

		class RootDto {
			@ApiPropertyObject({
				description: "payload",
				entity: () => DeferredDepositReference as DeferredDepositConstructor,
				shouldValidateNested: true,
				type: SecondLevelDto,
			})
			payload!: SecondLevelDto;
		}

		DeferredDepositReference = DeferredDepositEntity;

		await flushDeferredTasks();

		const payloadMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, RootDto.prototype, "payload");
		assert.equal(payloadMetadata?.description, "DeferredDepositEntity payload");

		const amountMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, SecondLevelDto.prototype, "amount");
		assert.equal(amountMetadata?.description, "DeferredDepositEntity transaction amount");

		const statusMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, ThirdLevelDto.prototype, "status");
		assert.equal(statusMetadata?.description, "DeferredDepositEntity status");
	});

	it("auto resolves method and dtoType when context flag is enabled", () => {
		class AutoContextDto {
			amount!: number;
		}

		PushAutoDtoContext(AutoContextDto.prototype, EApiRouteType.GET, EApiDtoType.RESPONSE);

		try {
			const decorator = ApiPropertyCopy({
				entity: DeferredDepositEntity,
				propertyName: "amount",
				shouldAutoResolveContext: true,
			});

			decorator(AutoContextDto.prototype, "amount");

			const swaggerMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, AutoContextDto.prototype, "amount");
			assert.equal(swaggerMetadata?.description, "DeferredDepositEntity transaction amount");
		} finally {
			PopAutoDtoContext(AutoContextDto.prototype);
		}
	});

	it("propagates auto context to nested DTOs registered after the parent context", () => {
		class ParentDto {
			payload!: unknown;
		}

		class NestedDto {
			amount!: number;
		}

		PushAutoDtoContext(ParentDto.prototype, EApiRouteType.GET, EApiDtoType.RESPONSE);

		try {
			RegisterAutoDtoChild(ParentDto.prototype, NestedDto);

			const decorator = ApiPropertyCopy({
				entity: DeferredDepositEntity,
				propertyName: "amount",
				shouldAutoResolveContext: true,
			});

			decorator(NestedDto.prototype, "amount");

			const swaggerMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, NestedDto.prototype, "amount");
			assert.equal(swaggerMetadata?.description, "DeferredDepositEntity transaction amount");
		} finally {
			PopAutoDtoContext(ParentDto.prototype);
		}
	});

	it("does not decorate when auto context flag is enabled outside auto DTO generation", async () => {
		class NoContextDto {
			amount!: number;
		}

		const decorator = ApiPropertyCopy({
			entity: DeferredDepositEntity,
			propertyName: "amount",
			shouldAutoResolveContext: true,
		});

		decorator(NoContextDto.prototype, "amount");

		await flushDeferredTasks();

		const swaggerMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, NoContextDto.prototype, "amount");
		assert.equal(swaggerMetadata, undefined);
	});

	it("decorates before auto context is popped in the same tick", async () => {
		class ParentDto {
			payload!: unknown;
		}

		class ImmediatePopChildDto {
			@ApiPropertyCopy({
				entity: DeferredDepositEntity,
				propertyName: "amount",
				shouldAutoResolveContext: true,
			})
			amount!: number;
		}

		PushAutoDtoContext(ParentDto.prototype, EApiRouteType.CREATE, EApiDtoType.RESPONSE);

		try {
			RegisterAutoDtoChild(ParentDto.prototype, ImmediatePopChildDto);
		} finally {
			PopAutoDtoContext(ParentDto.prototype);
		}

		await flushDeferredTasks();

		const swaggerMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, ImmediatePopChildDto.prototype, "amount");
		assert.equal(swaggerMetadata?.description, "DeferredDepositEntity transaction amount");
	});
});

function flushDeferredTasks(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

function captureDeferredExecutionError(action: () => void): Promise<Error> {
	return new Promise((resolve, reject) => {
		const originalQueueMicrotask = global.queueMicrotask;
		const originalSetTimeout = global.setTimeout;

		let isResolved = false;

		const restore = (): void => {
			if (originalQueueMicrotask) {
				global.queueMicrotask = originalQueueMicrotask;
			}

			global.setTimeout = originalSetTimeout;
		};

		const resolveWithError = (error: unknown): void => {
			if (!isResolved) {
				isResolved = true;
				restore();
				resolve(error as Error);
			}
		};

		const resolveWithFailure = (): void => {
			if (!isResolved) {
				isResolved = true;
				restore();
				reject(new Error("Expected deferred execution to throw"));
			}
		};

		if (typeof originalQueueMicrotask === "function") {
			global.queueMicrotask = ((callback: () => void) => {
				originalQueueMicrotask(() => {
					try {
						callback();
					} catch (error) {
						resolveWithError(error);

						return;
					}

					resolveWithFailure();
				});
			}) as typeof queueMicrotask;
		} else {
			global.setTimeout = ((handler: (...args: Array<unknown>) => void, delay?: number, ...rest: Array<unknown>) => {
				return originalSetTimeout(
					(...handlerArgs: Array<unknown>) => {
						try {
							handler(...handlerArgs);
						} catch (error) {
							resolveWithError(error);

							return;
						}

						resolveWithFailure();
					},
					delay,
					...rest,
				);
			}) as typeof setTimeout;
		}

		try {
			action();
		} catch (error) {
			restore();
			reject(error as Error);
		}
	});
}

function registerDeferredDepositEntityMetadata(entity: DeferredDepositConstructor): void {
	const tables: Array<TableMetadataArgs> = getMetadataArgsStorage().tables;
	const columns: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns;
	const metadataStorage: MetadataStorage = MetadataStorage.getInstance();

	tables.push({
		target: entity,
		type: "regular",
		name: "deferred_deposit",
		orderBy: undefined,
	});

	columns.push({
		target: entity,
		propertyName: "id",
		mode: "regular",
		options: {
			primary: true,
			type: "uuid",
		},
	});

	columns.push({
		target: entity,
		propertyName: "amount",
		mode: "regular",
		options: {
			type: "integer",
		},
	});

	columns.push({
		target: entity,
		propertyName: "status",
		mode: "regular",
		options: {
			type: "varchar",
		},
	});

	const amountMetadata: TApiPropertyDescribeProperties = {
		description: "transaction amount",
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100000,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	} as TApiPropertyDescribeProperties;

	metadataStorage.setMetadata(entity.name, "amount", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, amountMetadata);

	const statusMetadata: TApiPropertyDescribeProperties = {
		description: "status",
		exampleValue: "WAITING",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/.*/",
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties;

	metadataStorage.setMetadata(entity.name, "status", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, statusMetadata);
}


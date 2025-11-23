import "reflect-metadata";

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DECORATORS } from "@nestjs/swagger/dist/constants";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";

describe("API Property Decorators", () => {
	it("uses resolved entity name when entity is provided via factory", async () => {
		let DeferredDepositReference: typeof DeferredDeposit | undefined;

		class DeferredDeposit {}

		class DepositAmountDto {
			@ApiPropertyNumber({
				description: "amount",
				entity: () => DeferredDepositReference,
				format: EApiPropertyNumberType.INTEGER,
				isRequired: true,
				maximum: 100,
				minimum: 0,
				multipleOf: 1,
			})
			amount!: number;
		}

		DeferredDepositReference = DeferredDeposit;

		await flushDeferredTasks();

		const swaggerMetadata: Record<string, unknown> | undefined = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, DepositAmountDto.prototype, "amount");
		assert.ok(swaggerMetadata, "Swagger metadata should exist");
		assert.equal(swaggerMetadata?.description, "DeferredDeposit amount");
	});

	it("throws descriptive error when factory never resolves an entity", async () => {
		const error: Error = await captureDeferredDecoratorError(() => {
			class BrokenDto {
				@ApiPropertyNumber({
					description: "amount",
					entity: () => undefined,
					format: EApiPropertyNumberType.INTEGER,
					isRequired: true,
					maximum: 100,
					minimum: 0,
					multipleOf: 1,
				})
				amount!: number;
			}

			return BrokenDto;
		});

		assert.match(error.message, /Entity for ApiPropertyNumber could not be resolved/);
	});
});

function flushDeferredTasks(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

function captureDeferredDecoratorError(action: () => void): Promise<Error> {
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


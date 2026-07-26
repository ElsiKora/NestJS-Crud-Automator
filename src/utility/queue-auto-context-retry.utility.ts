import type { EApiDtoType, EApiRouteType } from "@enum/index";

import { QueueAutoDtoContextExecution } from "@utility/auto-dto-context-queue.utility";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";

/**
 * Queues execution until auto DTO context becomes available on the provided prototype.
 * @param {object} target - DTO prototype awaiting context.
 * @param {() => void} executor - Callback to execute once context is ready.
 */
export function QueueAutoContextRetry(target: object, executor: () => void): void {
	const context: { dtoType: EApiDtoType; method: EApiRouteType } | undefined = GetAutoDtoContext(target);

	if (context) {
		executor();

		return;
	}

	QueueAutoDtoContextExecution(target, executor);
}

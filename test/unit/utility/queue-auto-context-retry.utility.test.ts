import "reflect-metadata";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { FlushAutoDtoContextExecutions } from "@utility/auto-dto-context-queue.utility";
import { QueueAutoContextRetry } from "@utility/queue-auto-context-retry.utility";
import { describe, expect, it, vi } from "vitest";

describe("QueueAutoContextRetry", () => {
	it("executes immediately when context is available", () => {
		const target = {};
		Reflect.defineMetadata(DTO_AUTO_CONTEXT_METADATA_KEY, [{ method: EApiRouteType.GET, dtoType: EApiDtoType.RESPONSE }], target);

		const handler = vi.fn();
		QueueAutoContextRetry(target, handler);

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("queues execution until context is flushed", () => {
		const target = {};
		const handler = vi.fn();

		QueueAutoContextRetry(target, handler);
		expect(handler).not.toHaveBeenCalled();

		FlushAutoDtoContextExecutions(target);
		expect(handler).toHaveBeenCalledTimes(1);
	});
});

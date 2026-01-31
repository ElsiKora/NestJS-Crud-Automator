import { FlushAutoDtoContextExecutions, QueueAutoDtoContextExecution } from "@utility/auto-dto-context-queue.utility";
import { describe, expect, it, vi } from "vitest";

describe("auto DTO context queue", () => {
	it("queues handlers and flushes them safely", () => {
		const target = {};
		const first = vi.fn();
		const second = vi.fn(() => {
			throw new Error("ignore");
		});
		const third = vi.fn();

		QueueAutoDtoContextExecution(target, first);
		QueueAutoDtoContextExecution(target, second);
		QueueAutoDtoContextExecution(target, third);

		FlushAutoDtoContextExecutions(target);

		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(third).toHaveBeenCalledTimes(1);
	});

	it("ignores invalid targets or handlers", () => {
		expect(() => QueueAutoDtoContextExecution(undefined as unknown as object, () => undefined)).not.toThrow();
		expect(() => QueueAutoDtoContextExecution({}, undefined as unknown as () => void)).not.toThrow();
		expect(() => FlushAutoDtoContextExecutions({})).not.toThrow();
	});
});

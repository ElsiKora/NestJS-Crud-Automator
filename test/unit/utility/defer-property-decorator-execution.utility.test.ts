import { DeferPropertyDecoratorExecution } from "@utility/defer-property-decorator-execution.utility";
import { describe, expect, it, vi } from "vitest";

describe("DeferPropertyDecoratorExecution", () => {
	it("uses microtask when available", async () => {
		const handler = vi.fn();

		DeferPropertyDecoratorExecution(handler);
		expect(handler).not.toHaveBeenCalled();

		await Promise.resolve();
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("falls back to setTimeout when queueMicrotask is unavailable", async () => {
		const original = (globalThis as { queueMicrotask?: typeof queueMicrotask }).queueMicrotask;
		(globalThis as { queueMicrotask?: typeof queueMicrotask }).queueMicrotask = undefined;

		try {
			const handler = vi.fn();
			DeferPropertyDecoratorExecution(handler);

			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(handler).toHaveBeenCalledTimes(1);
		} finally {
			(globalThis as { queueMicrotask?: typeof queueMicrotask }).queueMicrotask = original;
		}
	});
});

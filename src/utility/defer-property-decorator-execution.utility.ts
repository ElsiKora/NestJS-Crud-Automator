/**
 * Defers decorator execution to the next microtask (or macrotask) to allow entity factories to resolve.
 * @param {() => void} handler - Callback executed after the current call stack completes.
 */
export function DeferPropertyDecoratorExecution(handler: () => void): void {
	if (typeof queueMicrotask === "function") {
		queueMicrotask(handler);

		return;
	}

	setTimeout(handler, 0);
}

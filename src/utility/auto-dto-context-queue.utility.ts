const AUTO_DTO_CONTEXT_QUEUE: WeakMap<object, Set<() => void>> = new WeakMap<object, Set<() => void>>();

/**
 * Executes and clears all queued handlers that were waiting for the DTO context on the specified prototype.
 * @param {object} target - DTO prototype whose queued handlers should run.
 */
export function FlushAutoDtoContextExecutions(target: object): void {
	const queue: Set<() => void> | undefined = AUTO_DTO_CONTEXT_QUEUE.get(target);

	if (!queue) return;

	AUTO_DTO_CONTEXT_QUEUE.delete(target);

	for (const handler of queue.values()) {
		try {
			handler();
		} catch {
			// ignore to avoid breaking other handlers
		}
	}
}

/**
 * Queues a handler to run once the DTO context becomes available for the specified prototype.
 * @param {object} target - DTO prototype awaiting context.
 * @param {() => void} handler - Callback to execute after context is defined.
 */
export function QueueAutoDtoContextExecution(target: object, handler: () => void): void {
	if (!target || typeof handler !== "function") return;

	let queue: Set<() => void> | undefined = AUTO_DTO_CONTEXT_QUEUE.get(target);

	if (!queue) {
		queue = new Set<() => void>();
		AUTO_DTO_CONTEXT_QUEUE.set(target, queue);
	}

	queue.add(handler);
}

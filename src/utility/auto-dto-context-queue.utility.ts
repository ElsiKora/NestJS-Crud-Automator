const AUTO_DTO_CONTEXT_QUEUE: WeakMap<object, Set<() => void>> = new WeakMap<object, Set<() => void>>();
const AUTO_DTO_CONTEXT_LISTENERS: WeakMap<object, Set<() => boolean>> = new WeakMap<object, Set<() => boolean>>();

/**
 * Executes and clears all queued handlers that were waiting for the DTO context on the specified prototype.
 * @param {object} target - DTO prototype whose queued handlers should run.
 */
export function FlushAutoDtoContextExecutions(target: object): void {
	const queue: Set<() => void> | undefined = AUTO_DTO_CONTEXT_QUEUE.get(target);

	if (queue) {
		AUTO_DTO_CONTEXT_QUEUE.delete(target);

		for (const handler of queue.values()) {
			try {
				handler();
			} catch {
				// ignore to avoid breaking other handlers
			}
		}
	}

	const listeners: Set<() => boolean> | undefined = AUTO_DTO_CONTEXT_LISTENERS.get(target);

	if (!listeners) return;

	for (const listener of listeners) {
		try {
			const shouldKeepListener: boolean = listener();

			if (!shouldKeepListener) {
				listeners.delete(listener);
			}
		} catch {
			listeners.delete(listener);
		}
	}

	if (listeners.size === 0) {
		AUTO_DTO_CONTEXT_LISTENERS.delete(target);
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

/**
 * Registers a listener that should be notified whenever DTO auto-context becomes available
 * for the provided prototype. Return true to stay subscribed, false to unsubscribe.
 * @param {object} target - DTO prototype awaiting context notifications.
 * @param {() => boolean} listener - Callback executed on each context propagation.
 */
export function RegisterAutoDtoContextListener(target: object, listener: () => boolean): void {
	if (!target || typeof listener !== "function") return;

	let listeners: Set<() => boolean> | undefined = AUTO_DTO_CONTEXT_LISTENERS.get(target);

	if (!listeners) {
		listeners = new Set<() => boolean>();
		AUTO_DTO_CONTEXT_LISTENERS.set(target, listeners);
	}

	listeners.add(listener);
}

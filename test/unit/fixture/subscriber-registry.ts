import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";

export function resetApiSubscriberRegistry(): void {
	const registry = apiSubscriberRegistry as unknown as {
		FUNCTION_SUBSCRIBER_REGISTRATION_ORDER: WeakMap<object, number>;
		FUNCTION_SUBSCRIBERS: { clear: () => void };
		ROUTE_SUBSCRIBERS: { clear: () => void };
		nextFunctionSubscriberRegistrationOrder: number;
	};

	registry.FUNCTION_SUBSCRIBERS.clear();
	registry.ROUTE_SUBSCRIBERS.clear();
	registry.FUNCTION_SUBSCRIBER_REGISTRATION_ORDER = new WeakMap<object, number>();
	registry.nextFunctionSubscriberRegistrationOrder = 0;
}

import "reflect-metadata";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";
import { ApiFunctionSubscriber } from "@decorator/api/subscriber/function.decorator";
import { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

class SubscriberEntity {}

describe("ApiFunctionSubscriber", () => {
	it("stores metadata on subscriber class", () => {
		@ApiFunctionSubscriber({ entity: SubscriberEntity, priority: 10 })
		class FunctionSubscriber {}

		const metadata = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, FunctionSubscriber);
		expect(metadata).toEqual({ entity: SubscriberEntity, priority: 10 });
	});

	it("stores transaction expectation metadata on subscriber class", () => {
		@ApiFunctionSubscriber({ entity: SubscriberEntity, transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED } })
		class FunctionSubscriber {}

		const metadata = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, FunctionSubscriber);
		expect(metadata).toEqual({ entity: SubscriberEntity, transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED } });
	});
});

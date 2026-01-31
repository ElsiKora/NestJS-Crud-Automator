import type { Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunction } from "@decorator/api/function/decorator";
import { EApiFunctionType } from "@enum/decorator/api";
import { afterEach, describe, expect, it, vi } from "vitest";

class FunctionEntity {
	public id?: string;
	public name?: string;
}

class FunctionService {
	public constructor(public repository: Repository<FunctionEntity>) {}

	public handler(..._arguments: Array<unknown>): unknown {
		void _arguments;
		return undefined;
	}
}

const applyDecorator = (decorator: ReturnType<typeof ApiFunction>): void => {
	const descriptor = Object.getOwnPropertyDescriptor(FunctionService.prototype, "handler") ?? {
		value: FunctionService.prototype.handler,
	};
	const updatedDescriptor = decorator(FunctionService.prototype, "handler", descriptor);
	Object.defineProperty(FunctionService.prototype, "handler", updatedDescriptor);
};

describe("ApiFunction", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("delegates to create decorator", async () => {
		const repository = {
			save: vi.fn(async (value: Partial<FunctionEntity>) => ({ id: "id-1", ...value })),
		} as unknown as Repository<FunctionEntity>;
		const service = new FunctionService(repository) as FunctionService & Record<string, any>;

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		applyDecorator(
			ApiFunction({
				entity: FunctionEntity,
				type: EApiFunctionType.CREATE,
			}),
		);

		await service.handler({ name: "created" });

		expect(repository.save).toHaveBeenCalledWith({ name: "created" });
	});

	it("delegates to get list decorator", async () => {
		const repository = {
			findAndCount: vi.fn(async () => [[{ id: "id-1" }], 1]),
		} as unknown as Repository<FunctionEntity>;
		const service = new FunctionService(repository) as FunctionService & Record<string, any>;

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		applyDecorator(
			ApiFunction({
				entity: FunctionEntity,
				type: EApiFunctionType.GET_LIST,
			}),
		);

		const result = (await service.handler({ take: 1 })) as { items: Array<FunctionEntity> };

		expect(result.items).toHaveLength(1);
		expect(repository.findAndCount).toHaveBeenCalled();
	});

	it("throws for unsupported function types", () => {
		applyDecorator(
			ApiFunction({
				entity: FunctionEntity,
				type: "unknown" as EApiFunctionType,
			}),
		);

		const service = new FunctionService({} as Repository<FunctionEntity>) as FunctionService & Record<string, any>;

		expect(() => service.handler()).toThrow("Unsupported function");
	});
});

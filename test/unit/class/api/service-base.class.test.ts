import { ApiServiceBase } from "@class/api/service-base.class";
import { describe, expect, it } from "vitest";

class ServiceEntity {
	public id?: string;
}

describe("ApiServiceBase", () => {
	it("returns default responses for CRUD methods", async () => {
		const service = new ApiServiceBase<ServiceEntity>();

		await expect(service.create({} as never)).resolves.toEqual({});
		await expect(service.get({} as never)).resolves.toEqual({});
		await expect(service.getList({} as never)).resolves.toEqual({ items: [], total: 0 });
		await expect(service.getMany({} as never)).resolves.toEqual([]);
		await expect(service.update({} as never, {} as never)).resolves.toEqual({});
		await expect(service.delete({} as never)).resolves.toBeUndefined();
	});
});

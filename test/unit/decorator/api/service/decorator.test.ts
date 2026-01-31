import { ApiService } from "@decorator/api/service/decorator";
import { describe, expect, it, vi } from "vitest";

class ServiceEntity {
	public id!: string;
	public name!: string;
	public count!: number;
}

describe("ApiService", () => {
	it("wires CRUD methods to repository operations", async () => {
		type TRepository = {
			save: (entity: Partial<ServiceEntity>) => Promise<ServiceEntity>;
			findOne: (options?: { where?: Partial<ServiceEntity> }) => Promise<ServiceEntity | null>;
			findAndCount: (options?: { skip?: number; take?: number }) => Promise<[Array<ServiceEntity>, number]>;
			find: (options?: { where?: Partial<ServiceEntity> }) => Promise<Array<ServiceEntity>>;
			remove: (entity: ServiceEntity) => Promise<ServiceEntity>;
		};

		const repository: TRepository = {
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
			findOne: vi.fn(async (options?: { where?: Partial<ServiceEntity> }) => ({
				id: options?.where?.id ?? "id-1",
				name: "existing",
				count: 1,
			})),
			findAndCount: vi.fn(async (options?: { skip?: number; take?: number }) => {
				void options;
				return [[{ id: "id-1", name: "list", count: 1 }], 1] as [Array<ServiceEntity>, number];
			}),
			find: vi.fn(async (options?: { where?: Partial<ServiceEntity> }) => {
				void options;
				return [{ id: "id-2", name: "many", count: 2 }];
			}),
			remove: vi.fn(async (entity: ServiceEntity) => entity),
		};

		@ApiService({ entity: ServiceEntity })
		class Service {
			public constructor(public repository: TRepository) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;

		const created = await service.create({ id: "id-1", name: "created", count: 1 });
		expect(repository.save).toHaveBeenCalledWith({ id: "id-1", name: "created", count: 1 });
		expect(created).toMatchObject({ id: "id-1", name: "created" });

		const found = await service.get({ where: { id: "id-1" } });
		expect(repository.findOne).toHaveBeenCalledWith({ where: { id: "id-1" } });
		expect(found).toMatchObject({ id: "id-1", name: "existing" });

		const list = await service.getList({ skip: 0, take: 1 }, undefined);
		expect(repository.findAndCount).toHaveBeenCalledWith({ skip: 0, take: 1 });
		expect(list.items).toHaveLength(1);
		expect(list.totalCount).toBe(1);

		const many = await service.getMany({ where: { id: "id-2" } });
		expect(repository.find).toHaveBeenCalledWith({ where: { id: "id-2" } });
		expect(many).toHaveLength(1);

		const updated = await service.update({ id: "id-1" }, { name: "updated" });
		expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ id: "id-1", name: "updated" }));
		expect(updated).toMatchObject({ id: "id-1", name: "updated" });

		const deleted = await service.delete({ id: "id-1" });
		expect(repository.remove).toHaveBeenCalledWith(expect.objectContaining({ id: "id-1" }));
		expect(deleted).toMatchObject({ id: "id-1" });
	});

	it("does not override existing instance methods", async () => {
		type TRepository = {
			save: (entity: Partial<ServiceEntity>) => Promise<ServiceEntity>;
			findAndCount: () => Promise<[Array<{ id: string }>, number]>;
		};
		const repository: TRepository = {
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
			findAndCount: vi.fn(async () => [[{ id: "id-1" }], 1] as [Array<{ id: string }>, number]),
		};

		const customCreate = vi.fn(async (_entity: Partial<ServiceEntity>) => {
			void _entity;
			return { id: "custom" } as ServiceEntity;
		});
		const customGetList = vi.fn(async (_options: { skip?: number; take?: number }) => {
			void _options;
			return { count: 0, currentPage: 0, items: [], totalCount: 0, totalPages: 0 };
		});

		@ApiService({ entity: ServiceEntity })
		class CustomService {
			public create = customCreate;
			public getList = customGetList;

			public constructor(public repository: TRepository) {}
		}

		const service = new CustomService(repository) as CustomService & Record<string, any>;

		await service.create({ id: "id-1" });
		await service.getList({ skip: 0, take: 1 });

		expect(customCreate).toHaveBeenCalled();
		expect(customGetList).toHaveBeenCalled();
		expect(repository.save).not.toHaveBeenCalled();
		expect(repository.findAndCount).not.toHaveBeenCalled();
	});
});

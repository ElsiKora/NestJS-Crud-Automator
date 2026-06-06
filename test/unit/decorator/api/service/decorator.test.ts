import { ApiService } from "@decorator/api/service/decorator";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction-scope.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import type { EntityManager } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

class ServiceEntity {
	public id!: string;
	public name!: string;
	public count!: number;
}

describe("ApiService", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

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

		const list = await service.getList({ skip: 0, take: 1 });
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
		expect(deleted).toBeUndefined();
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

	it("does not override existing prototype methods", async () => {
		const repository = {
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
		};
		const customCreate = vi.fn(async (_entity: Partial<ServiceEntity>) => {
			void _entity;

			return { id: "prototype-custom" } as ServiceEntity;
		});

		@ApiService({ entity: ServiceEntity })
		class CustomService {
			public constructor(public repository: unknown) {}

			public async create(entity: Partial<ServiceEntity>): Promise<ServiceEntity> {
				return await customCreate(entity);
			}
		}

		const service = new CustomService(repository) as CustomService & Record<string, any>;
		const created = await service.create({ id: "id-1" });

		expect(created).toMatchObject({ id: "prototype-custom" });
		expect(customCreate).toHaveBeenCalledWith({ id: "id-1" });
		expect(repository.save).not.toHaveBeenCalled();
	});

	it("does not override inherited prototype methods", async () => {
		const repository = {
			remove: vi.fn(async (entity: ServiceEntity) => entity),
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
		};
		const customCreate = vi.fn(async (_entity: Partial<ServiceEntity>) => {
			void _entity;

			return { id: "inherited-create" } as ServiceEntity;
		});
		const customDelete = vi.fn(async (_criteria: Partial<ServiceEntity>) => {
			void _criteria;

			return { id: "inherited-delete" } as ServiceEntity;
		});

		class BaseService {
			public constructor(public repository: unknown) {}

			public async create(entity: Partial<ServiceEntity>): Promise<ServiceEntity> {
				return await customCreate(entity);
			}

			public async delete(criteria: Partial<ServiceEntity>): Promise<ServiceEntity> {
				return await customDelete(criteria);
			}
		}

		@ApiService({ entity: ServiceEntity })
		class CustomService extends BaseService {}

		const service = new CustomService(repository) as CustomService & Record<string, any>;
		const created = await service.create({ id: "id-1" });
		const deleted = await service.delete({ id: "id-1" });

		expect(created).toMatchObject({ id: "inherited-create" });
		expect(deleted).toMatchObject({ id: "inherited-delete" });
		expect(customCreate).toHaveBeenCalledWith({ id: "id-1" });
		expect(customDelete).toHaveBeenCalledWith({ id: "id-1" });
		expect(repository.save).not.toHaveBeenCalled();
		expect(repository.remove).not.toHaveBeenCalled();
	});

	it("defines generated methods over ApiServiceBase stubs", async () => {
		const repository = {
			manager: {
				transaction: vi.fn(),
			},
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity, id: "generated" }) as ServiceEntity),
		};

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		@ApiService({ entity: ServiceEntity })
		class Service extends ApiServiceBase<ServiceEntity> {
			public constructor(public repository: unknown) {
				super();
			}
		}

		const service = new Service(repository) as Service & Record<string, any>;
		const created = await service.create({ name: "created" });

		expect(repository.save).toHaveBeenCalledWith({ name: "created" });
		expect(created).toMatchObject({ id: "generated", name: "created" });
	});

	it("keeps generated create non-transactional by default", async () => {
		const repository = {
			manager: {
				transaction: vi.fn(),
			},
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
		};

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		@ApiService({ entity: ServiceEntity })
		class Service {
			public constructor(public repository: unknown) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;
		const created = await service.create({ id: "id-1", name: "created", count: 1 });

		expect(repository.manager.transaction).not.toHaveBeenCalled();
		expect(repository.save).toHaveBeenCalledWith({ id: "id-1", name: "created", count: 1 });
		expect(created).toMatchObject({ id: "id-1", name: "created" });
	});

	it("opens transactions for configured generated create functions", async () => {
		const eventRepository = {
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity, id: "event" }) as ServiceEntity),
		};
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		};
		const repository = {
			manager: {
				transaction: vi.fn(async (callback: (manager: typeof eventManager) => Promise<ServiceEntity>) => await callback(eventManager)),
			},
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity, id: "repo" }) as ServiceEntity),
		};

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		@ApiService({
			entity: ServiceEntity,
			functions: {
				[EApiFunctionType.CREATE]: {
					transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
				},
			},
		})
		class Service {
			public constructor(public repository: unknown) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;
		const created = await service.create({ name: "created", count: 1 });

		expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
		expect(eventManager.getRepository).toHaveBeenCalledWith(ServiceEntity);
		expect(eventRepository.save).toHaveBeenCalledWith({ name: "created", count: 1 });
		expect(repository.save).not.toHaveBeenCalled();
		expect(created).toMatchObject({ id: "event", name: "created" });
	});

	it("opens one transaction for configured generated update functions including internal get", async () => {
		const existingEntity: ServiceEntity = { count: 1, id: "id-1", name: "existing" };
		const eventRepository = {
			findOne: vi.fn(async () => existingEntity),
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
		};
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		};
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			manager: {
				transaction: vi.fn(async (callback: (manager: typeof eventManager) => Promise<ServiceEntity>) => await callback(eventManager)),
			},
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity, id: "repo" }) as ServiceEntity),
		};

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		@ApiService({
			entity: ServiceEntity,
			functions: {
				[EApiFunctionType.UPDATE]: {
					transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
				},
			},
		})
		class Service {
			public constructor(public repository: unknown) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;
		const updated = await service.update({ id: "id-1" }, { name: "updated" });

		expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
		expect(eventManager.getRepository).toHaveBeenCalledWith(ServiceEntity);
		expect(eventRepository.findOne).toHaveBeenCalledWith({ where: { id: "id-1" } });
		expect(eventRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: "id-1", name: "updated" }));
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(repository.save).not.toHaveBeenCalled();
		expect(updated).toMatchObject({ id: "id-1", name: "updated" });
	});

	it("opens one transaction for configured generated delete functions including internal get", async () => {
		const existingEntity: ServiceEntity = { count: 1, id: "id-1", name: "existing" };
		const eventRepository = {
			findOne: vi.fn(async () => existingEntity),
			remove: vi.fn(async (entity: ServiceEntity) => entity),
		};
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		};
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			manager: {
				transaction: vi.fn(async (callback: (manager: typeof eventManager) => Promise<unknown>) => await callback(eventManager)),
			},
			remove: vi.fn(async (entity: ServiceEntity) => entity),
		};

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		@ApiService({
			entity: ServiceEntity,
			functions: {
				[EApiFunctionType.DELETE]: {
					transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
				},
			},
		})
		class Service {
			public constructor(public repository: unknown) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;
		const deleted = await service.delete({ id: "id-1" });

		expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
		expect(eventManager.getRepository).toHaveBeenCalledWith(ServiceEntity);
		expect(eventRepository.findOne).toHaveBeenCalledWith({ where: { id: "id-1" } });
		expect(eventRepository.remove).toHaveBeenCalledWith(existingEntity);
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(repository.remove).not.toHaveBeenCalled();
		expect(deleted).toBeUndefined();
	});

	it("fires before_error for generated mandatory transaction preflight failures", async () => {
		const repository = {
			manager: {
				transaction: vi.fn(),
			},
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
		};
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		@ApiService({
			entity: ServiceEntity,
			functions: {
				[EApiFunctionType.CREATE]: {
					transaction: { mode: EApiFunctionTransactionMode.MANDATORY },
				},
			},
		})
		class Service {
			public constructor(public repository: unknown) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;

		await expect(service.create({ name: "created" })).rejects.toThrow("ApiFunction transaction mode MANDATORY requires an active transaction");
		expect(errorSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(ServiceEntity), EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE_ERROR, expect.any(Object), expect.any(Error));
		expect(repository.save).not.toHaveBeenCalled();
		expect(repository.manager.transaction).not.toHaveBeenCalled();
	});

	it("fires before_error for generated none transaction preflight failures", async () => {
		const repository = {
			manager: {
				transaction: vi.fn(),
			},
			save: vi.fn(async (entity: Partial<ServiceEntity>) => ({ ...entity }) as ServiceEntity),
		};
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);
		const eventManager = {
			getRepository: vi.fn(),
		} as unknown as EntityManager;

		@ApiService({
			entity: ServiceEntity,
			functions: {
				[EApiFunctionType.CREATE]: {
					transaction: { mode: EApiFunctionTransactionMode.NONE },
				},
			},
		})
		class Service {
			public constructor(public repository: unknown) {}
		}

		const service = new Service(repository) as Service & Record<string, any>;

		await expect(ApiFunctionTransactionScope.runWithEntityManager(eventManager, async () => await service.create({ name: "created" }))).rejects.toThrow("ApiFunction transaction mode NONE cannot run inside an active transaction");
		expect(errorSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(ServiceEntity), EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE_ERROR, expect.any(Object), expect.any(Error));
		expect(repository.save).not.toHaveBeenCalled();
		expect(repository.manager.transaction).not.toHaveBeenCalled();
	});
});

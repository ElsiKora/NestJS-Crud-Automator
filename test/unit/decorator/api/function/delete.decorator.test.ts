import type { EntityManager, FindOperator, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedScopeWhereContract } from "@class/api/controller/generated/scope-where-contract.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionDelete } from "@decorator/api/function/delete.decorator";
import { EApiFunctionType } from "@enum/decorator/api";
import { ConflictException, HttpStatus } from "@nestjs/common";
import { createTransactionFixture } from "@test/unit/fixture";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

const scopeMergeLimit = vi.hoisted((): { branches: number } => ({ branches: Number.POSITIVE_INFINITY }));

// Checks the size of an expansion before it runs, so a merge that expands too much fails at once instead of building the product first.
vi.mock("@utility/authorization/scope-merge-where.utility", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@utility/authorization/scope-merge-where.utility")>();

	return {
		...actual,
		AuthorizationScopeMergeWhere: (...[baseWhere, scopedWhere]: Parameters<typeof actual.AuthorizationScopeMergeWhere>) => {
			const mergedBranchCount: number = (Array.isArray(baseWhere) ? baseWhere.length : 1) * (Array.isArray(scopedWhere) ? scopedWhere.length : 1);

			if (baseWhere && scopedWhere && mergedBranchCount > scopeMergeLimit.branches) {
				throw new Error(`Scope merge would expand to ${String(mergedBranchCount)} branches instead of ${String(scopeMergeLimit.branches)}`);
			}

			return actual.AuthorizationScopeMergeWhere(baseWhere, scopedWhere);
		},
	};
});

class DeleteEntity {
	public id?: string;

	public name?: string;

	public payload?: Buffer;

	public status?: string;

	public tenantId?: string;
}

const buildDeleteService = (repository: Repository<DeleteEntity>) => {
	class DeleteService {
		public constructor(public repository: Repository<DeleteEntity>) {}

		@ApiFunctionDelete({ entity: DeleteEntity })
		public async delete(criteria: Partial<DeleteEntity>): Promise<DeleteEntity> {
			void criteria;

			return {};
		}
	}

	return new DeleteService(repository);
};

// Reads the single value a scope column can still match: an And of different values matches nothing.
const getMatchableValue = (operator: FindOperator<unknown>): unknown => {
	const values: Array<unknown> = operator.type === "and" ? (operator.value as Array<FindOperator<unknown>>).map((conjunct: FindOperator<unknown>): unknown => conjunct.value) : [operator.value];

	return new Set(values).size === 1 ? values[0] : undefined;
};

const buildQueryFailedError = (code: string, message: string) => ({
	driverError: { code, message },
	name: "QueryFailedError",
});

describe("ApiFunctionDelete", () => {
	afterEach(() => {
		scopeMergeLimit.branches = Number.POSITIVE_INFINITY;
		vi.restoreAllMocks();
	});

	it("deletes existing entities", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await service.delete({ id: "id-1" });

		expect(repository.remove).toHaveBeenCalled();
		expect(result).toMatchObject({ id: "id-1", name: "old" });
	});

	it("keeps generated delete criteria and its internal GET inside the detached owner scope", async () => {
		const existingEntity: { ownerId: string } & DeleteEntity = { id: "id-required", name: "old", ownerId: "owner-required" };

		const repository = {
			findOne: vi.fn(async () => existingEntity),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const criteria = { id: "id-required", ownerId: "owner-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => {
			if (functionType === EApiFunctionType.DELETE) {
				return { id: "id-delete-foreign", ownerId: "owner-delete-foreign" };
			}

			if (functionType === EApiFunctionType.GET) {
				const prototype = { cache: { id: "shared-cross-owner", milliseconds: 60_000 } };
				const hostileProperties = Object.create(prototype) as { where: object };
				hostileProperties.where = { id: "id-get-foreign", ownerId: "owner-get-foreign" };

				return hostileProperties;
			}

			return;
		});
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria));
		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[Record<string, unknown>]> } }).mock.calls[0]?.[0];

		expect(Object.prototype.hasOwnProperty.call(findOptions, "cache")).toBe(true);
		expect(findOptions?.cache).toBe(false);
		expect(findOptions?.where).toMatchObject({
			id: { _type: "and", _value: [{ _value: "id-get-foreign" }, { _type: "and", _value: [{ _value: "id-delete-foreign" }, { _value: "id-required" }] }] },
			ownerId: { _type: "and", _value: [{ _value: "owner-get-foreign" }, { _type: "and", _value: [{ _value: "owner-delete-foreign" }, { _value: "owner-required" }] }] },
		});
		expect(repository.remove).toHaveBeenCalledWith(existingEntity);
		expect(result).toBe(existingEntity);
	});

	it.each([
		["unchanged", 10],
		["narrowed", 10],
		["missing", 10],
		["foreign", 10],
		["unchanged", 40],
		["narrowed", 40],
		["missing", 40],
		["foreign", 40],
	] as const)("keeps generated delete scope containment linear in the scope size for %s subscriber criteria with %i branches", async (mode, size) => {
		const tenants: Array<string> = Array.from({ length: size }, (_value: unknown, index: number): string => `tenant-${index}`);
		const criteria: Array<Partial<DeleteEntity>> = tenants.map((tenantId: string): Partial<DeleteEntity> => ({ id: "id-required", tenantId }));
		const subscriberCriteria: Array<Partial<DeleteEntity>> = criteria.map((branch: Partial<DeleteEntity>, index: number): Partial<DeleteEntity> => {
			if (mode === "missing" && index === criteria.length - 1) {
				return { id: branch.id };
			}

			if (mode === "foreign" && index === criteria.length - 1) {
				return { id: branch.id, tenantId: "tenant-foreign" };
			}

			return mode === "narrowed" ? { ...branch, status: "active" } : branch;
		});
		const isExpanded: boolean = mode === "missing" || mode === "foreign";
		const expectedBranchCount: number = isExpanded ? size * size : size;
		// Each of the two containment checks, on the subscriber criteria and on the merged scope in GET hydration, costs about one comparison per branch.
		// The budget doubles that: it still fails a scan of every branch, which is 1,281,620 comparisons for 40 missing branches.
		const comparisonBudget: number = 2 * (size + expectedBranchCount);
		const expectedTenants: Record<typeof mode, Array<string>> = {
			foreign: tenants.slice(0, -1),
			missing: [...tenants.slice(0, -1), ...tenants],
			narrowed: tenants,
			unchanged: tenants,
		};
		const existingEntity: DeleteEntity = { id: "id-required", name: "old", status: "active", tenantId: "tenant-0" };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const branchContains: (typeof ApiControllerGeneratedScopeWhereContract)["branchContains"] = ApiControllerGeneratedScopeWhereContract["branchContains"];
		let comparisonCount: number = 0;

		scopeMergeLimit.branches = expectedBranchCount;
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => (functionType === EApiFunctionType.DELETE ? subscriberCriteria : undefined));
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		onTestFinished((): void => {
			ApiControllerGeneratedScopeWhereContract["branchContains"] = branchContains;
		});
		ApiControllerGeneratedScopeWhereContract["branchContains"] = (candidate: object, mandatory: object): boolean => {
			comparisonCount += 1;

			if (comparisonCount > comparisonBudget) {
				throw new Error(`Scope containment exceeded ${String(comparisonBudget)} branch comparisons for ${String(expectedBranchCount)} generated branches`);
			}

			return branchContains.call(ApiControllerGeneratedScopeWhereContract, candidate, mandatory);
		};

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria as never, criteria as never, async () => await service.delete(criteria as never));

		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[{ where: Array<Record<string, FindOperator<unknown>>> }]> } }).mock.calls[0]?.[0];
		const protectedWhere: Array<Record<string, FindOperator<unknown>>> = findOptions?.where ?? [];
		const matchableTenants: Array<unknown> = protectedWhere.map((branch: Record<string, FindOperator<unknown>>): unknown => (branch.tenantId ? getMatchableValue(branch.tenantId) : undefined)).filter((tenantId: unknown): boolean => tenantId !== undefined);

		expect(protectedWhere).toHaveLength(expectedBranchCount);
		expect(protectedWhere.every((branch: Record<string, FindOperator<unknown>>): boolean => Object.hasOwn(branch, "tenantId"))).toBe(true);
		expect(matchableTenants).toEqual(expectedTenants[mode]);
		// Every branch reaches branchContains at least once, so a containment check that bypasses it cannot pass with a low count.
		expect(comparisonCount).toBeGreaterThanOrEqual(size);
		expect(comparisonCount).toBeLessThanOrEqual(comparisonBudget);

		if (mode === "narrowed") {
			expect(protectedWhere.map((branch: Record<string, FindOperator<unknown>>): unknown => (branch.status ? getMatchableValue(branch.status) : undefined))).toEqual(tenants.map((): string => "active"));
		}
	});

	it.each(["plain", "polluted"] as const)("keeps a foreign subscriber branch past the end of the scope out of a generated delete on a %s prototype", async (mode) => {
		const criteria = { id: "id-1", tenantId: "tenant-A" };
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old", tenantId: "tenant-A" })),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockImplementation(async (_constructor, _entity, functionType) => (functionType === EApiFunctionType.DELETE ? [criteria, { id: "id-1", tenantId: "tenant-VICTIM" }] : undefined));
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		if (mode === "polluted") {
			Object.defineProperty(Object.prototype, "1", { configurable: true, value: {}, writable: true });
		}

		try {
			await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria));
		} finally {
			Reflect.deleteProperty(Object.prototype, "1");
		}

		const findOptions = (repository.findOne as unknown as { mock: { calls: Array<[{ where: Array<Record<string, FindOperator<unknown>>> }]> } }).mock.calls[0]?.[0];
		const protectedWhere: Array<Record<string, FindOperator<unknown>>> = findOptions?.where ?? [];

		expect(protectedWhere.every((branch: Record<string, FindOperator<unknown>>): boolean => Object.hasOwn(branch, "tenantId"))).toBe(true);
		expect(protectedWhere.map((branch: Record<string, FindOperator<unknown>>): unknown => (branch.tenantId ? getMatchableValue(branch.tenantId) : undefined))).toEqual(["tenant-A", undefined]);
	});

	it.each(["unchanged", "mutation"] as const)("%s Buffer data during protected generated delete hydration", async (mode) => {
		const existingEntity: DeleteEntity = { id: "id-required", name: "old", payload: Buffer.from([1, 2, 3]) };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const criteria = { id: "id-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, entity, functionType) => {
			if (mode === "mutation" && functionType === EApiFunctionType.GET) {
				(entity as DeleteEntity).payload![0] = 9;
			}

			return undefined;
		});

		const operation = ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria));

		if (mode === "mutation") {
			await expect(operation).rejects.toMatchObject({ cause: { message: expect.stringContaining("changed the protected hydration entity") } });
			expect(repository.remove).not.toHaveBeenCalled();
		} else {
			await expect(operation).resolves.toMatchObject({ id: "id-required", name: "old", payload: Buffer.from([1, 2, 3]) });
			expect(repository.remove).toHaveBeenCalledOnce();
		}

		expect(existingEntity.payload).toEqual(Buffer.from([1, 2, 3]));
	});

	it.each(["mutation", "replacement"] as const)("rejects GET-after %s before a generated delete can remove", async (mode) => {
		const existingEntity: DeleteEntity = { id: "id-required", name: "old" };
		const foreignEntity: DeleteEntity = { id: "id-foreign", name: "foreign" };
		const repository = {
			findOne: vi.fn(async () => existingEntity),
			metadata: { relations: [] },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const criteria = { id: "id-required" };

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_constructor, entity, functionType) => {
			if (functionType !== EApiFunctionType.GET) {
				return undefined;
			}

			if (mode === "replacement") {
				return foreignEntity;
			}

			(entity as DeleteEntity).id = "id-foreign";

			return undefined;
		});

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.DELETE, criteria, criteria, async () => await service.delete(criteria))).rejects.toMatchObject({
			cause: {
				message: expect.stringContaining("changed the protected hydration entity"),
			},
		});
		expect(repository.remove).not.toHaveBeenCalled();
		expect(existingEntity).toEqual({ id: "id-required", name: "old" });
	});

	it("uses the current service instance for each internal GET", async () => {
		const firstEntity: DeleteEntity = { id: "first", name: "first" };
		const secondEntity: DeleteEntity = { id: "second", name: "second" };
		const firstRepository = {
			findOne: vi.fn(async () => firstEntity),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const secondRepository = {
			findOne: vi.fn(async () => secondEntity),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const firstService = buildDeleteService(firstRepository);
		const ServiceConstructor = firstService.constructor as new (repository: Repository<DeleteEntity>) => typeof firstService;
		const secondService = new ServiceConstructor(secondRepository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await firstService.delete({ id: "first" });
		await secondService.delete({ id: "second" });

		expect(firstRepository.findOne).toHaveBeenCalledTimes(1);
		expect(secondRepository.findOne).toHaveBeenCalledTimes(1);
		expect(firstRepository.remove).toHaveBeenCalledWith(firstEntity);
		expect(secondRepository.remove).toHaveBeenCalledWith(secondEntity);
	});

	it("exposes the active transaction repository to DELETE before subscribers", async () => {
		const eventRepository = {
			findOne: vi.fn(async () => ({ id: "event", name: "event" })),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const eventManager = {
			getRepository: vi.fn(() => eventRepository),
		} as unknown as EntityManager;
		const transaction = createTransactionFixture(eventManager);
		const repository = {
			findOne: vi.fn(async () => ({ id: "base", name: "base" })),
			manager: { dataSource: transaction.dataSource },
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const before = vi.spyOn(ApiSubscriberExecutor, "executeFunctionBeforeSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await ApiFunctionTransactionScope.runWithDataSource(transaction.dataSource, { name: "delete" }, async () => await service.delete({ id: "event" }));

		const deleteCall = before.mock.calls.find(([, , functionType]) => functionType === EApiFunctionType.DELETE);
		const deleteContext = deleteCall?.[3] as { DATA: { repository: Repository<DeleteEntity> } } | undefined;

		expect(deleteContext?.DATA.repository).toBe(eventRepository);
		expect(eventRepository.findOne).toHaveBeenCalledOnce();
		expect(eventRepository.remove).toHaveBeenCalledOnce();
		expect(repository.findOne).not.toHaveBeenCalled();
		expect(repository.remove).not.toHaveBeenCalled();
	});

	it("throws not found when entity is missing", async () => {
		const repository = {
			findOne: vi.fn(async () => null),
			remove: vi.fn(async (value: DeleteEntity) => value),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.delete({ id: "missing" })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
	});

	it("throws when repository is missing", async () => {
		const service = buildDeleteService(undefined as unknown as Repository<DeleteEntity>);
		const errorSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.delete({ id: "id-1" })).rejects.toThrow("Repository is not available in this context");
		expect(errorSpy).toHaveBeenCalled();
	});

	it("answers a row still referenced with the code-only 409, logs the schema names and passes the refusal to the error subscribers", async () => {
		const driverError = { code: "23503", constraint: "FK_owner_items", detail: 'Key (id)=(id-1) is still referenced from table "items".', message: 'update or delete on table "owners" violates foreign key constraint "FK_owner_items" on table "items"', table: "items" };
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			remove: vi.fn(async () => {
				throw { driverError, message: driverError.message, name: "QueryFailedError" };
			}),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);
		const verbose = vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		const errorSubscribers = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		const refusal: unknown = await service.delete({ id: "id-1" }).catch((error: unknown) => error);

		expect(refusal).toBeInstanceOf(ConflictException);
		expect((refusal as ConflictException).getResponse()).toEqual({ details: { type: "FOREIGN_KEY_VIOLATION" }, error: "Conflict", message: "DELETEENTITY_REFERENCED", statusCode: HttpStatus.CONFLICT });
		expect(JSON.stringify((refusal as ConflictException).getResponse())).not.toMatch(/items|owners|FK_owner_items|id-1/u);
		expect((refusal as ConflictException).cause).toMatchObject({ driverError });
		expect(errorSubscribers.mock.calls.at(-1)?.at(-1)).toBe(refusal);
		expect(verbose.mock.calls.map((call: Array<unknown>) => call[0])).toContain('Foreign key violation (still referenced) for entity DeleteEntity: errorType=QueryFailedError sqlState=23503 details={"constraint":"FK_owner_items","field":"id","referencedTable":"items","table":"items"}');
	});

	it("answers 409 for a foreign key violation on delete whatever direction the driver names", async () => {
		const repository = {
			findOne: vi.fn(async () => ({ id: "id-1", name: "old" })),
			remove: vi.fn(async () => {
				throw buildQueryFailedError("SQLITE_CONSTRAINT_FOREIGNKEY", "FOREIGN KEY constraint failed");
			}),
		} as unknown as Repository<DeleteEntity>;
		const service = buildDeleteService(repository);

		vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(service.delete({ id: "id-1" })).rejects.toMatchObject({ response: { details: { type: "FOREIGN_KEY_VIOLATION" }, error: "Conflict", message: "DELETEENTITY_REFERENCED", statusCode: HttpStatus.CONFLICT }, status: HttpStatus.CONFLICT });
	});
});

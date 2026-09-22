import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedGetManyContract } from "@class/api/controller/generated/get-many-contract.class";
import { EApiFunctionType } from "@enum/decorator/api";
import type { FindManyOptions, FindOneOptions } from "typeorm";

import { Column, DataSource, Entity, Equal, PrimaryColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

@Entity({ name: "generated_read_scope_cache" })
class GeneratedReadScopeEntity {
	@PrimaryColumn({ type: "varchar" })
	public id?: string;

	@Column({ type: "varchar" })
	public tenantId?: string;
}

describe("ApiControllerGeneratedReadScopeStorage", () => {
	it("captures write hydration options once with independent query and capture snapshots", async () => {
		const input = { where: { id: "item" } };
		const options: FindOneOptions<GeneratedReadScopeEntity> = { select: { id: true, tenantId: true }, where: input.where };
		let captured: FindOneOptions<GeneratedReadScopeEntity> | undefined;
		const capture = vi.fn((properties: FindOneOptions<GeneratedReadScopeEntity>) => {
			captured = properties;
		});

		await ApiControllerGeneratedReadScopeStorage.runWriteHydration(
			input,
			input.where,
			async () => {
				expect(ApiControllerGeneratedReadScopeStorage.captureWriteHydrationReadProperties(input, options)).toBe(options);
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, input);
				expect(ApiControllerGeneratedReadScopeStorage.captureWriteHydrationReadProperties({}, options)).toBe(options);
				expect(capture).not.toHaveBeenCalled();

				const queryOptions = ApiControllerGeneratedReadScopeStorage.captureWriteHydrationReadProperties(input, options);
				expect(capture).toHaveBeenCalledOnce();
				expect(queryOptions).toEqual(options);
				expect(captured).toEqual(options);
				expect(queryOptions).not.toBe(options);
				expect(captured).not.toBe(queryOptions);
				(options.select as { tenantId?: boolean }).tenantId = false;
				(queryOptions.where as { id: string }).id = "query-mutated";
				expect(captured).toEqual({ select: { id: true, tenantId: true }, where: { id: "item" } });
				expect(queryOptions.select).toEqual({ id: true, tenantId: true });
				expect(() => ApiControllerGeneratedReadScopeStorage.captureWriteHydrationReadProperties(input, queryOptions)).toThrow("captured exactly once");
			},
			capture,
		);
	});

	it("requires capture on successful opted-in hydration and preserves callback errors", async () => {
		const input = { where: { id: "item" } };
		const capture = vi.fn();
		await expect(
			ApiControllerGeneratedReadScopeStorage.runWriteHydration(
				input,
				input.where,
				async () => {
					ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, input);
					return "uncaptured";
				},
				capture,
			),
		).rejects.toThrow("did not capture its read properties");

		const error = new Error("query-failed");
		await expect(
			ApiControllerGeneratedReadScopeStorage.runWriteHydration(
				input,
				input.where,
				async () => {
					ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, input);
					throw error;
				},
				capture,
			),
		).rejects.toBe(error);
		expect(capture).not.toHaveBeenCalled();
	});

	it("leaves ordinary GET and SAVE hydration options unchanged without capture opt-in", async () => {
		const input = { where: { id: "item" } };
		const options = Object.freeze({ where: input.where });
		expect(ApiControllerGeneratedReadScopeStorage.captureWriteHydrationReadProperties(input, options)).toBe(options);
		await ApiControllerGeneratedReadScopeStorage.runWriteHydration(input, input.where, async () => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, input);
			expect(ApiControllerGeneratedReadScopeStorage.captureWriteHydrationReadProperties(input, options)).toBe(options);
		});
	});

	it("binds a detached mandatory scope to the exact input once and supports frozen subscriber options", async () => {
		const requiredOperator = Equal("tenant-required");
		const input = { where: { id: "item-required", tenantId: requiredOperator } };

		await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, input, input.where, async () => {
			expect(ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, { where: input.where })).toBeUndefined();

			const mandatoryWhere = ApiControllerGeneratedReadScopeStorage.claim<GeneratedReadScopeEntity>(EApiFunctionType.GET, input);

			expect(mandatoryWhere).toBeDefined();
			expect(() => ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, input)).toThrow("Generated mandatory scope must be claimed exactly once");

			(requiredOperator as unknown as { _value: string })._value = "tenant-mutated";

			const subscriberOptions = Object.freeze({ where: Object.freeze({ id: "item-foreign", tenantId: "tenant-foreign" }) });
			const protectedOptions = ApiControllerGeneratedReadScopeStorage.protect(subscriberOptions, mandatoryWhere!);
			const protectedWhere = protectedOptions.where as Record<string, unknown>;

			expect(protectedOptions).not.toBe(subscriberOptions);
			expect(subscriberOptions.where).toEqual({ id: "item-foreign", tenantId: "tenant-foreign" });
			expect(protectedWhere.id).toMatchObject({
				_type: "and",
				_value: [
					{ _type: "equal", _value: "item-foreign" },
					{ _type: "equal", _value: "item-required" },
				],
			});
			expect(protectedWhere.tenantId).toMatchObject({
				_type: "and",
				_value: [
					{ _type: "equal", _value: "tenant-foreign" },
					{ _type: "equal", _value: "tenant-required" },
				],
			});
		});
	});

	it("fails closed when the generated service function does not claim the scope", async () => {
		const input = { where: { tenantId: "tenant-required" } };

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, input, input.where, async () => "unprotected")).rejects.toThrow("Generated service function did not claim its mandatory scope");
	});

	it("preserves the service error when an unclaimed generated call fails", async () => {
		const input = { where: { tenantId: "tenant-required" } };
		const serviceError = new Error("service-failed");

		await expect(
			ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, input, input.where, async () => {
				throw serviceError;
			}),
		).rejects.toBe(serviceError);
	});

	it("bypasses explicit, inherited, and globally enabled query caches for every mandatory generated read", async () => {
		const dataSource = new DataSource({
			cache: {
				alwaysEnabled: true,
				duration: 60_000,
			},
			database: ":memory:",
			entities: [GeneratedReadScopeEntity],
			synchronize: true,
			type: "sqlite",
		});

		await dataSource.initialize();

		try {
			const repository = dataSource.getRepository(GeneratedReadScopeEntity);
			const requiredWhere = { tenantId: "tenant-a" };
			const getOptions: FindOneOptions<GeneratedReadScopeEntity> = { where: { id: "get-item", ...requiredWhere } };
			const listOptions: FindManyOptions<GeneratedReadScopeEntity> = { order: { id: "ASC" }, where: requiredWhere };
			const cursorOptions: FindManyOptions<GeneratedReadScopeEntity> = { order: { id: "ASC" }, take: 2, where: requiredWhere };

			await repository.save([
				{ id: "cursor-item", tenantId: "tenant-a" },
				{ id: "get-item", tenantId: "tenant-a" },
				{ id: "page-item", tenantId: "tenant-a" },
			]);
			await repository.findOne(getOptions);
			await repository.findAndCount(listOptions);
			await repository.find(cursorOptions);
			await dataSource.query('UPDATE "generated_read_scope_cache" SET "tenantId" = ?', ["tenant-b"]);

			expect(await repository.findOne(getOptions)).toMatchObject({ id: "get-item", tenantId: "tenant-a" });
			expect((await repository.findAndCount(listOptions))[0]).toHaveLength(3);
			expect(await repository.find(cursorOptions)).toHaveLength(2);

			const inheritedCacheGetter = (): never => {
				throw new Error("inherited cache accessor must not run");
			};
			const createSubscriberOptions = <T extends object>(options: T): T => {
				const prototype = Object.defineProperty({}, "cache", {
					configurable: true,
					get: inheritedCacheGetter,
				});

				return Object.assign(Object.create(prototype) as T, options);
			};

			const protectedGet = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, getOptions, getOptions.where!, async () => {
				const mandatoryWhere = ApiControllerGeneratedReadScopeStorage.claim<GeneratedReadScopeEntity>(EApiFunctionType.GET, getOptions)!;
				const properties = ApiControllerGeneratedReadScopeStorage.protect(createSubscriberOptions(getOptions), mandatoryWhere);

				expect(Object.hasOwn(properties, "cache")).toBe(true);
				expect(properties.cache).toBe(false);

				return repository.findOne(properties);
			});
			const protectedPage = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_LIST, listOptions, listOptions.where!, async () => {
				const mandatoryWhere = ApiControllerGeneratedReadScopeStorage.claim<GeneratedReadScopeEntity>(EApiFunctionType.GET_LIST, listOptions)!;
				const properties = ApiControllerGeneratedReadScopeStorage.protect(createSubscriberOptions(listOptions), mandatoryWhere);

				expect(properties.cache).toBe(false);

				return repository.findAndCount(properties);
			});
			const protectedCursor = await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET_MANY, cursorOptions, cursorOptions.where!, async () => {
				const mandatoryWhere = ApiControllerGeneratedReadScopeStorage.claim<GeneratedReadScopeEntity>(EApiFunctionType.GET_MANY, cursorOptions)!;
				const readProperties = ApiControllerGeneratedReadScopeStorage.protect(createSubscriberOptions(cursorOptions), mandatoryWhere);
				const properties = ApiControllerGeneratedGetManyContract.protect(readProperties, ApiControllerGeneratedGetManyContract.createSnapshot(cursorOptions));

				expect(properties.cache).toBe(false);

				return repository.find(properties);
			});

			expect(protectedGet).toBeNull();
			expect(protectedPage).toEqual([[], 0]);
			expect(protectedCursor).toEqual([]);
		} finally {
			await dataSource.destroy();
		}
	});
});

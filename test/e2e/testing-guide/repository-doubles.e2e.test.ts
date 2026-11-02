import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { EntitySubscriberInterface } from "typeorm";

import { Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository } from "@nestjs/typeorm";
import { Column, DataSource, Entity, EventSubscriber, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiRouteType, EFilterOrderDirection } from "../../../src/index";
import { ApiControllerAssertRouteCursorDataSource } from "../../../src/utility/api/controller/assert/route/cursor-data-source.utility";

class MetadataDataSource extends DataSource {
	public async buildWithoutConnection(): Promise<void> {
		await this.buildMetadatas();
	}
}

@Entity("double_invoices")
class DoubleInvoiceEntity {
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
	@Column({ precision: 3, type: "timestamptz" })
	public issuedAt!: Date;
}

@EventSubscriber()
class DoubleInvoiceSubscriber implements EntitySubscriberInterface<DoubleInvoiceEntity> {
	public afterLoad(): void {}

	public listenTo(): typeof DoubleInvoiceEntity {
		return DoubleInvoiceEntity;
	}
}

@Injectable()
@ApiService<DoubleInvoiceEntity>({ entity: DoubleInvoiceEntity })
class DoubleInvoiceService extends ApiServiceBase<DoubleInvoiceEntity> {
	public constructor(
		@InjectRepository(DoubleInvoiceEntity)
		public repository: Repository<DoubleInvoiceEntity>,
	) {
		super();
	}
}

const CURSOR_ROUTE = {
	request: {
		[EApiControllerRequestTarget.QUERY]: {
			order: {
				defaultOrder: [{ direction: EFilterOrderDirection.DESC, field: "issuedAt" }],
				fields: {},
				tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
				unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
			},
			pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
		},
	},
};

@ApiController<DoubleInvoiceEntity>({ entity: DoubleInvoiceEntity, path: "double-invoices", routes: { [EApiRouteType.GET_LIST]: CURSOR_ROUTE as never } })
class DoubleInvoiceController {
	public constructor(public service: DoubleInvoiceService) {}
}

const INVOICE: DoubleInvoiceEntity = { id: "aaaaaaaa-0000-4000-8000-000000000001", issuedAt: new Date("2026-01-01T00:00:00.000Z") };

describe("Repository doubles of a DataSource without a connection (E2E)", () => {
	const dataSource: MetadataDataSource = new MetadataDataSource({ entities: [DoubleInvoiceEntity], type: "postgres" });
	let app: INestApplication | undefined;

	beforeAll(async () => {
		await dataSource.buildWithoutConnection();
	});

	afterEach(async () => {
		await app?.close();
		app = undefined;
	});

	const start = async (controller: unknown, service: unknown, entity: unknown, repository: unknown): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			controllers: [controller as never],
			imports: [ApiAuthorizationModule.forRoot()],
			providers: [service as never, { provide: getRepositoryToken(entity as never), useValue: repository }],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();

		return app;
	};

	it.each([
		["a Repository", (): unknown => new Repository(DoubleInvoiceEntity, dataSource.manager)],
		["the plain double { metadata, manager }", (): unknown => ({ manager: dataSource.manager, metadata: dataSource.getMetadata(DoubleInvoiceEntity) })],
	])("%s passes every bootstrap check on a timestamptz CURSOR route and serves it from a stubbed find", async (_label: string, createRepository: () => unknown) => {
		const connect = vi.spyOn(dataSource.driver, "connect");
		const createQueryRunner = vi.spyOn(dataSource.driver, "createQueryRunner");
		const repository = createRepository() as { find: () => Promise<Array<DoubleInvoiceEntity>> };
		const find = vi.fn().mockResolvedValue([INVOICE]);

		repository.find = find;

		expect(() => ApiControllerAssertRouteCursorDataSource(DoubleInvoiceController.prototype, repository as never, CURSOR_ROUTE as never, "Route")).not.toThrowError();

		const started = await start(DoubleInvoiceController, DoubleInvoiceService, DoubleInvoiceEntity, repository);
		const response = await (started.getHttpAdapter().getInstance() as { inject: (options: object) => Promise<{ json: () => unknown; statusCode: number }> }).inject({ method: "GET", url: "/double-invoices?limit=10" });

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ items: [{ id: INVOICE.id, issuedAt: "2026-01-01T00:00:00.000Z" }], nextCursor: null, previousCursor: null });
		expect(find).toHaveBeenCalledOnce();
		expect(dataSource.isInitialized).toBe(false);
		expect(connect).not.toHaveBeenCalled();
		expect(createQueryRunner).not.toHaveBeenCalled();

		vi.restoreAllMocks();
	});

	it("still runs the CURSOR contract without a connection, so a data source it refuses fails at bootstrap", async () => {
		const subscribedDataSource: MetadataDataSource = new MetadataDataSource({ entities: [DoubleInvoiceEntity], subscribers: [DoubleInvoiceSubscriber], type: "postgres" });

		await subscribedDataSource.buildWithoutConnection();

		await expect(start(DoubleInvoiceController, DoubleInvoiceService, DoubleInvoiceEntity, new Repository(DoubleInvoiceEntity, subscribedDataSource.manager))).rejects.toThrow('Controller "DoubleInvoiceController" route "getList": CURSOR GET_LIST entity cannot use an applicable TypeORM afterLoad subscriber');
	});

	it("refuses a service double with no repository on an enabled route", async () => {
		await expect(start(DoubleInvoiceController, DoubleInvoiceService, DoubleInvoiceEntity, undefined)).rejects.toThrow('Controller "DoubleInvoiceController" of entity "DoubleInvoiceEntity": service.repository is not a usable TypeORM repository because the service has no repository.');
	});
});

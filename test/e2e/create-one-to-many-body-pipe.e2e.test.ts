import "reflect-metadata";

import type { INestApplication, PipeTransform } from "@nestjs/common";

import { Inject, Injectable, Module, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, DataSource, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

@Entity("one_to_many_pipe_parents")
class PipeParentEntity {
	@OneToMany(() => PipeChildEntity, (child: PipeChildEntity) => child.parent, { cascade: true })
	public children?: Array<PipeChildEntity>;

	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "name", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ length: 64, type: "varchar" })
	public name!: string;
}

@Entity("one_to_many_pipe_children")
class PipeChildEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	public name!: string;

	@JoinColumn({ name: "parentId" })
	@ManyToOne(() => PipeParentEntity, (parent: PipeParentEntity) => parent.children, { nullable: true })
	public parent?: null | PipeParentEntity;
}

@Injectable()
@ApiService({ entity: PipeParentEntity })
class PipeParentService extends ApiServiceBase<PipeParentEntity> {
	@InjectRepository(PipeParentEntity)
	public readonly repository!: Repository<PipeParentEntity>;
}

@ApiController<PipeParentEntity>({
	entity: PipeParentEntity,
	name: "one-to-many-pipe",
	path: "parents",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class PipeParentController {
	@Inject(PipeParentService)
	public readonly service!: PipeParentService;
}

interface IPipeCase {
	name: string;
	pipe?: PipeTransform;
	// Status of a body that references an existing child row, sends an existing child row with values, and sends a new child row.
	statuses: { existingWithValues: number; newChild: number; reference: number };
}

const UNKNOWN_CHILDREN: Record<string, unknown> = { error: "Bad Request", message: ["property children should not exist"], statusCode: 400 };

// The generated CREATE body does not declare a OneToMany relation, so the host pipe decides what happens to one in the body.
const PIPE_CASES: Array<IPipeCase> = [
	{ name: "without a pipe", statuses: { existingWithValues: 409, newChild: 201, reference: 400 } },
	{ name: "behind a pipe that only whitelists", pipe: new ValidationPipe({ whitelist: true }), statuses: { existingWithValues: 201, newChild: 201, reference: 201 } },
	{ name: "behind a pipe that forbids unknown properties", pipe: new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }), statuses: { existingWithValues: 400, newChild: 400, reference: 400 } },
];

describe.each(PIPE_CASES)("Generated CREATE with OneToMany items in the body $name (E2E)", (pipeCase: IPipeCase) => {
	let app: INestApplication;
	let children: Repository<PipeChildEntity>;
	let parents: Repository<PipeParentEntity>;
	let foreignParentId: string;

	const readChildren = async (): Promise<Array<Record<string, unknown>>> => (await children.find({ order: { id: "ASC" }, relations: { parent: true } })).map((child: PipeChildEntity): Record<string, unknown> => ({ id: child.id, name: child.name, parentId: child.parent?.id ?? null }));

	beforeAll(async () => {
		@Module({
			controllers: [PipeParentController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [PipeChildEntity, PipeParentEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([PipeParentEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [PipeParentService],
		})
		class PipeModule {}

		const moduleRef = await Test.createTestingModule({ imports: [PipeModule] }).compile();
		app = moduleRef.createNestApplication(new FastifyAdapter());

		if (pipeCase.pipe) {
			app.useGlobalPipes(pipeCase.pipe);
		}

		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		const dataSource: DataSource = moduleRef.get(DataSource);
		children = dataSource.getRepository(PipeChildEntity);
		parents = dataSource.getRepository(PipeParentEntity);
	});

	afterAll(async () => {
		await app?.close();
	});

	beforeEach(async () => {
		await children.createQueryBuilder().delete().execute();
		await parents.createQueryBuilder().delete().execute();
		foreignParentId = (await parents.save({ name: "Foreign parent" })).id;
		await children.save({ id: "child-foreign", name: "Foreign child", parent: { id: foreignParentId } });
	});

	// Sends the body and checks the answer, the parent rows and the child rows, and that the foreign child row never changed.
	const expectAnswer = async (body: object, status: number, isNewChildInserted: boolean = false): Promise<void> => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { ...body, name: "New parent" }, url: "/parents" });
		const foreignChild: Record<string, unknown> = { id: "child-foreign", name: "Foreign child", parentId: foreignParentId };

		expect.soft(response.statusCode).toBe(status);

		if (status === 400) {
			expect.soft(response.json()).toEqual(UNKNOWN_CHILDREN);
		}

		expect(await parents.count()).toBe(status === 201 ? 2 : 1);

		if (!isNewChildInserted) {
			expect(await readChildren()).toEqual([foreignChild]);

			return;
		}

		const created: { id: string } = response.json() as { id: string };

		expect(await readChildren()).toEqual([foreignChild, { id: "child-new", name: "New child", parentId: created.id }]);
	};

	it("answers a reference to an existing child row", async () => {
		await expectAnswer({ children: [{ id: "child-foreign" }] }, pipeCase.statuses.reference);
	});

	it("answers an existing child row sent with values", async () => {
		await expectAnswer({ children: [{ id: "child-foreign", name: "Taken" }] }, pipeCase.statuses.existingWithValues);
	});

	it("answers a new child row sent with values", async () => {
		await expectAnswer({ children: [{ id: "child-new", name: "New child" }] }, pipeCase.statuses.newChild, !pipeCase.pipe);
	});
});

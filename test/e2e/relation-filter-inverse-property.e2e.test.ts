import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Inject, Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const describeId = (): PropertyDecorator => ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID });

const describeName = (): PropertyDecorator => ApiPropertyDescribe({ description: "name", exampleValue: "name", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

// One model, three ways: with no inverse property, with one nothing describes, and with one in the hidden shape Core gives its game source.
@Entity("rf_inverse_proof_plain_games")
class PlainGame {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeName()
	public name!: string;
}

@Entity("rf_inverse_proof_plain_links")
class PlainLink {
	@JoinColumn()
	@ManyToOne(() => PlainGame)
	public game!: PlainGame;

	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("rf_inverse_proof_undescribed_games")
class UndescribedGame {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@OneToMany(() => UndescribedLink, (link: UndescribedLink) => link.game)
	public links!: Array<UndescribedLink>;

	@Column({ length: 64, type: "varchar" })
	@describeName()
	public name!: string;
}

@Entity("rf_inverse_proof_undescribed_links")
class UndescribedLink {
	@JoinColumn()
	@ManyToOne(() => UndescribedGame, (game: UndescribedGame) => game.links)
	public game!: UndescribedGame;

	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("rf_inverse_proof_hidden_games")
class HiddenGame {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "links", isAutoDtoEnabled: false, type: EApiPropertyDescribeType.RELATION })
	@OneToMany(() => HiddenLink, (link: HiddenLink) => link.game)
	public links!: Array<HiddenLink>;

	@Column({ length: 64, type: "varchar" })
	@describeName()
	public name!: string;
}

@Entity("rf_inverse_proof_hidden_links")
class HiddenLink {
	@JoinColumn()
	@ManyToOne(() => HiddenGame, (game: HiddenGame) => game.links)
	public game!: HiddenGame;

	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

const createController = <E extends object>(entity: Type<E>, path: string): { controller: Type<unknown>; service: Type<unknown> } => {
	@Injectable()
	@ApiService({ entity } as never)
	class ProofService extends ApiServiceBase<E> {
		@InjectRepository(entity)
		public readonly repository!: Repository<E>;
	}

	Object.defineProperty(ProofService, "name", { value: `${entity.name}Service` });

	class ProofController {
		@Inject(ProofService)
		public readonly service!: ProofService;
	}

	Object.defineProperty(ProofController, "name", { value: `${entity.name}Controller` });

	return {
		controller: ApiController<E>({
			entity,
			name: path,
			path,
			routes: {
				[EApiRouteType.CREATE]: {},
				[EApiRouteType.DELETE]: {},
				[EApiRouteType.GET]: {},
				[EApiRouteType.GET_LIST]: {},
				[EApiRouteType.PARTIAL_UPDATE]: {},
				[EApiRouteType.UPDATE]: {},
			},
		} as never)(ProofController) as Type<unknown>,
		service: ProofService,
	};
};

describe("An inverse relation property on a route entity", () => {
	const apps: Array<INestApplication> = [];

	const documentOf = async (name: string, entity: Type<object>, link: Type<object>): Promise<string> => {
		const { controller, service }: { controller: Type<unknown>; service: Type<unknown> } = createController(entity, "games");
		const moduleReference = await Test.createTestingModule({
			controllers: [controller],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [entity, link], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([entity, link]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [service],
		}).compile();
		const app: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		apps.push(app);
		await app.init();

		// A generated query DTO is named by a hash of its content, which holds the name of the entity, and each UUID example is a random one.
		return JSON.stringify(SwaggerModule.createDocument(app, new DocumentBuilder().build()), undefined, "\t")
			.replaceAll(name, "Game")
			.replaceAll(name.toLowerCase(), "game")
			.replaceAll(/[\da-f]{64}/gu, "<hash>")
			.replaceAll(/"example": "[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}"/gu, '"example": "<uuid>"');
	};

	afterAll(async () => {
		await Promise.all(apps.map(async (app: INestApplication) => await app.close()));
	});

	it("changes no DTO, response, OpenAPI or startup check of any generated route", async () => {
		const plain: string = await documentOf("PlainGame", PlainGame, PlainLink);

		expect(plain).toContain('"/games"');
		await expect(documentOf("UndescribedGame", UndescribedGame, UndescribedLink)).resolves.toBe(plain);
		await expect(documentOf("HiddenGame", HiddenGame, HiddenLink)).resolves.toBe(plain);
	});
});

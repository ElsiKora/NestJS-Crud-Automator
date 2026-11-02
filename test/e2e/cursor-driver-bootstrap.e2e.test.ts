import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { DataSourceOptions } from "typeorm";

import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eValidationPipe } from "./app/validation-pipe";
import { E2E_EAGER_CURSOR_CONTROLLERS } from "./to-many-relation-eager";
import { E2eEagerAuthGuard } from "./to-many-relation-eager/auth-guard";
import { E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity } from "./to-many-relation-eager/entity";
import { E2eEagerPostPolicySubscriber } from "./to-many-relation-eager/policy";
import { E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostService, E2eEagerTagService } from "./to-many-relation-eager/service";

const ENTITIES: Array<Function> = [E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity];

describe("CURSOR GET_LIST on a driver other than PostgreSQL (E2E)", () => {
	let app: INestApplication | undefined;

	afterAll(async () => {
		await app?.close();
	});

	it("fails application bootstrap naming the route and the driver", async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: E2E_EAGER_CURSOR_CONTROLLERS.slice(0, 1),
			imports: [TypeOrmModule.forRoot({ database: ":memory:", entities: ENTITIES, logging: false, synchronize: true, type: "better-sqlite3" } as DataSourceOptions), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eEagerAuthGuard, E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostPolicySubscriber, E2eEagerPostService, E2eEagerTagService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());

		const error: unknown = await app.init().then(
			(): undefined => undefined,
			(reason: unknown): unknown => reason,
		);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain('Controller "E2eEagerNoneCursorController" route "getList": CURSOR GET_LIST supports only PostgreSQL; the active driver is "better-sqlite3"');
	});
});

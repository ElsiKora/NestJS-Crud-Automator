import "reflect-metadata";

import type { AddressInfo } from "node:net";

import { Controller, HttpStatus, Inject, Injectable, type INestApplication, type INestApplicationContext, RequestMethod } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { request as httpRequest, type Server } from "node:http";
import { Entity, PrimaryGeneratedColumn, type Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiControllerObservable, ApiFunctionCustom, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiRouteCustom, ApiRouteSubscriber, ApiRouteSubscriberBase, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, apiSubscriberRegistry } from "../../src/index";

const APPLICATION_NAME_TOKEN = "SUBSCRIBER_SHUTDOWN_APPLICATION_NAME";
const RUN_ACTION = "subscriber-shutdown.run";
const RUN_PATH = "/subscriber-shutdown/run";

const events: Array<string> = [];
let waitInsideFunction: (() => Promise<void>) | undefined;

@Entity("subscriber_shutdown_entities")
class SubscriberShutdownEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SubscriberShutdownEntity })
class SubscriberShutdownService extends ApiServiceBase<SubscriberShutdownEntity> {
	@InjectRepository(SubscriberShutdownEntity)
	public readonly repository!: Repository<SubscriberShutdownEntity>;

	@ApiFunctionCustom<SubscriberShutdownEntity>({ action: RUN_ACTION, entity: SubscriberShutdownEntity })
	public async run(): Promise<{ isDone: boolean }> {
		await waitInsideFunction?.();

		return { isDone: true };
	}
}

@ApiControllerObservable()
@Controller("subscriber-shutdown")
class SubscriberShutdownController {
	@Inject(SubscriberShutdownService)
	public readonly service!: SubscriberShutdownService;

	@ApiRouteCustom<SubscriberShutdownEntity>({
		resource: { action: RUN_ACTION, entity: SubscriberShutdownEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "run" },
	})
	public async run(): Promise<{ isDone: boolean }> {
		return await this.service.run();
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: SubscriberShutdownEntity })
class SubscriberShutdownFunctionSubscriber extends ApiFunctionSubscriberBase<SubscriberShutdownEntity> {
	@Inject(APPLICATION_NAME_TOKEN)
	private readonly applicationName!: string;

	public async onAfterCustom(context: { result: unknown }): Promise<unknown> {
		events.push(`${this.applicationName}:function:after`);

		return context.result;
	}

	public async onBeforeCustom(context: { result: unknown }): Promise<unknown> {
		events.push(`${this.applicationName}:function:before`);

		return context.result;
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: SubscriberShutdownEntity })
class SubscriberShutdownRouteSubscriber extends ApiRouteSubscriberBase<SubscriberShutdownEntity> {
	@Inject(APPLICATION_NAME_TOKEN)
	private readonly applicationName!: string;

	public async onAfterCustom(context: { result: unknown }): Promise<unknown> {
		events.push(`${this.applicationName}:route:after`);

		return context.result;
	}

	public async onBeforeCustom(context: { result: unknown }): Promise<unknown> {
		events.push(`${this.applicationName}:route:before`);

		return context.result;
	}
}

const expectedEvents = (applicationName: string): Array<string> => [`${applicationName}:route:before`, `${applicationName}:function:before`, `${applicationName}:function:after`, `${applicationName}:route:after`];

const getRegisteredFunctionSubscribers = (): Array<unknown> => apiSubscriberRegistry.getFunctionSubscribers<SubscriberShutdownEntity>(SubscriberShutdownEntity.name);
const getRegisteredRouteSubscribers = (): Array<unknown> => apiSubscriberRegistry.getRouteSubscribers<SubscriberShutdownEntity>(SubscriberShutdownEntity.name);

describe("Subscriber registry on application shutdown (E2E)", () => {
	const openContexts: Set<INestApplicationContext> = new Set();

	const compileModule = async (applicationName: string) =>
		await Test.createTestingModule({
			controllers: [SubscriberShutdownController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					entities: [SubscriberShutdownEntity],
					logging: false,
					synchronize: true,
					type: "sqlite",
				}),
				TypeOrmModule.forFeature([SubscriberShutdownEntity]),
				ApiAuthorizationModule,
				ApiSubscriberModule,
			],
			providers: [{ provide: APPLICATION_NAME_TOKEN, useValue: applicationName }, SubscriberShutdownService, SubscriberShutdownFunctionSubscriber, SubscriberShutdownRouteSubscriber],
		}).compile();

	const createApplication = async (applicationName: string): Promise<INestApplication> => {
		const moduleRef = await compileModule(applicationName);
		const application: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());

		await application.init();
		await application.getHttpAdapter().getInstance().ready();
		openContexts.add(application);

		return application;
	};

	const closeContext = async (context: INestApplicationContext): Promise<void> => {
		openContexts.delete(context);
		await context.close();
	};

	const runRoute = async (application: INestApplication): Promise<number> => {
		const response = await application.getHttpAdapter().getInstance().inject({ method: "POST", url: RUN_PATH });

		return response.statusCode as number;
	};

	beforeEach(() => {
		events.length = 0;
		waitInsideFunction = undefined;
	});

	afterEach(async () => {
		await Promise.all([...openContexts].map(async (context: INestApplicationContext) => await closeContext(context)));
	});

	it("runs only the second application's subscribers, once, after the first application closed", async () => {
		const firstApplication = await createApplication("first");

		expect(await runRoute(firstApplication)).toBe(HttpStatus.OK);
		expect(events).toEqual(expectedEvents("first"));

		await closeContext(firstApplication);

		expect(getRegisteredFunctionSubscribers()).toEqual([]);
		expect(getRegisteredRouteSubscribers()).toEqual([]);

		events.length = 0;

		const secondApplication = await createApplication("second");

		expect(await runRoute(secondApplication)).toBe(HttpStatus.OK);
		expect(events).toEqual(expectedEvents("second"));
	});

	it("keeps subscribers for a request that is in flight during close", async () => {
		const application = await createApplication("draining");
		let markFunctionEntered: () => void = () => undefined;
		let releaseFunction: () => void = () => undefined;
		const functionEntered: Promise<void> = new Promise((resolve) => {
			markFunctionEntered = resolve;
		});
		const functionReleased: Promise<void> = new Promise((resolve) => {
			releaseFunction = resolve;
		});

		waitInsideFunction = async () => {
			markFunctionEntered();
			await functionReleased;
		};

		await application.listen(0, "127.0.0.1");

		const server = application.getHttpServer() as Server;
		const { port } = server.address() as AddressInfo;
		const responseStatus: Promise<number | undefined> = new Promise((resolve, reject) => {
			httpRequest({ agent: false, host: "127.0.0.1", method: "POST", path: RUN_PATH, port }, (response) => {
				response.resume();
				response.on("end", () => {
					resolve(response.statusCode);
				});
			})
				.on("error", reject)
				.end();
		});

		await functionEntered;

		const closing: Promise<void> = closeContext(application);

		await vi.waitFor(() => {
			expect(server.listening).toBe(false);
		});

		expect(getRegisteredFunctionSubscribers()).toHaveLength(1);
		expect(getRegisteredRouteSubscribers()).toHaveLength(1);

		releaseFunction();

		expect(await responseStatus).toBe(HttpStatus.OK);

		await closing;

		expect(events).toEqual(expectedEvents("draining"));
		expect(getRegisteredFunctionSubscribers()).toEqual([]);
		expect(getRegisteredRouteSubscribers()).toEqual([]);
	});

	it("leaves the subscribers of another live application registered", async () => {
		const closingApplication = await createApplication("closing");
		const remainingApplication = await createApplication("remaining");

		expect(await runRoute(closingApplication)).toBe(HttpStatus.OK);
		expect(events).toEqual(expect.arrayContaining([...expectedEvents("closing"), ...expectedEvents("remaining")]));

		await closeContext(closingApplication);

		events.length = 0;

		expect(getRegisteredFunctionSubscribers()).toHaveLength(1);
		expect(getRegisteredFunctionSubscribers()[0]).toBe(remainingApplication.get(SubscriberShutdownFunctionSubscriber));
		expect(getRegisteredRouteSubscribers()).toHaveLength(1);
		expect(getRegisteredRouteSubscribers()[0]).toBe(remainingApplication.get(SubscriberShutdownRouteSubscriber));
		expect(await runRoute(remainingApplication)).toBe(HttpStatus.OK);
		expect(events).toEqual(expectedEvents("remaining"));
	});

	it("tolerates a repeated close", async () => {
		const closingApplication = await createApplication("closing");
		const remainingApplication = await createApplication("remaining");

		await closeContext(closingApplication);
		await closeContext(closingApplication);

		expect(getRegisteredFunctionSubscribers()).toHaveLength(1);
		expect(getRegisteredFunctionSubscribers()[0]).toBe(remainingApplication.get(SubscriberShutdownFunctionSubscriber));
		expect(getRegisteredRouteSubscribers()).toHaveLength(1);
		expect(getRegisteredRouteSubscribers()[0]).toBe(remainingApplication.get(SubscriberShutdownRouteSubscriber));
	});

	it("removes subscribers when a standalone application context closes", async () => {
		const moduleRef = await compileModule("standalone");

		await moduleRef.init();
		openContexts.add(moduleRef);

		expect(getRegisteredFunctionSubscribers()).toHaveLength(1);
		expect(getRegisteredRouteSubscribers()).toHaveLength(1);

		await closeContext(moduleRef);

		expect(getRegisteredFunctionSubscribers()).toEqual([]);
		expect(getRegisteredRouteSubscribers()).toEqual([]);
	});
});

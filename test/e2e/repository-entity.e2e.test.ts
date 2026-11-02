import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Logger } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule } from "../../src/index";

import { E2eValidationPipe } from "./app/validation-pipe";
import { createController, createCustomOnlyController, createCustomRepositoryProvider, createCustomRepositoryService, createEntity, createModule, createRequestScopedController, createService, createSubclassedService, RepositoryEntityFirstChild, RepositoryEntityRoot, RepositoryEntitySecondChild } from "./repository-entity/fixture";

type TClass = new () => object;
type TInject = (options: { method: string; url: string }) => Promise<{ statusCode: number }>;

const memory = (entities: Array<TClass>, name?: string): object => ({ database: ":memory:", dropSchema: true, entities, logging: false, name, synchronize: true, type: "better-sqlite3" });

const boot = async (imports: Array<unknown>, override?: (builder: ReturnType<typeof Test.createTestingModule>) => ReturnType<typeof Test.createTestingModule>): Promise<{ application: INestApplication; inject: TInject }> => {
	const builder = Test.createTestingModule({ imports: [ApiAuthorizationModule.forRoot(), ...imports] as never });
	const moduleReference = await (override ? override(builder) : builder).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	application.useGlobalPipes(new E2eValidationPipe());

	try {
		await application.init();
		await (application.getHttpAdapter().getInstance() as { ready: () => Promise<void> }).ready();
	} catch (error) {
		await application.close();

		throw error;
	}

	const instance = application.getHttpAdapter().getInstance() as { inject: TInject };

	return { application, inject: instance.inject.bind(instance) };
};

const LIST: string = "?limit=10&page=1";

describe("Repository of a controller entity (E2E)", () => {
	describe("refused", () => {
		it("two same-named entities in one module, where the repository token picks the last one", async () => {
			const First = createEntity("repository_entity_docs_first");
			const Second = createEntity("repository_entity_docs_second");
			const FirstService = createService(First);
			const SecondService = createService(Second);
			const module = createModule([createController(First, FirstService, "RepositoryEntityFirstDocController", "repository-entity-first-docs"), createController(Second, SecondService, "RepositoryEntitySecondDocController", "repository-entity-second-docs")], [FirstService, SecondService], [First, Second]);
			const failure: Promise<unknown> = boot([TypeOrmModule.forRoot(memory([First, Second])), module]);

			await expect(failure).rejects.toThrowError('Controller "RepositoryEntityFirstDocController" serves entity RepositoryEntityDoc (table repository_entity_docs_first), but its service repository is for RepositoryEntityDoc (table repository_entity_docs_second)');
			await expect(failure).rejects.toThrowError("share one class name, so they have one repository token");
		});

		it("a repository of a sibling child entity", async () => {
			const service = createService(RepositoryEntitySecondChild);
			const module = createModule([createController(RepositoryEntityFirstChild, service, "RepositoryEntitySiblingController", "repository-entity-siblings")], [service], [RepositoryEntityFirstChild, RepositoryEntitySecondChild]);

			await expect(boot([TypeOrmModule.forRoot(memory([RepositoryEntityRoot, RepositoryEntityFirstChild, RepositoryEntitySecondChild])), module])).rejects.toThrowError('Controller "RepositoryEntitySiblingController" serves entity RepositoryEntityFirstChild');
		});

		it("a request-scoped controller on its first request, because Nest calls no bootstrap hook for it", async () => {
			const errors = vi.spyOn(Logger.prototype, "error").mockImplementation((): void => undefined);
			const Served = createEntity("repository_entity_scoped_served", "RepositoryEntityScopedDoc");
			const Other = createEntity("repository_entity_scoped_other", "RepositoryEntityScopedDoc");
			const ServedService = createService(Served);
			const OtherService = createService(Other);
			const module = createModule([createRequestScopedController(Served, ServedService, "RepositoryEntityScopedDocController", "repository-entity-scoped-docs"), createController(Other, OtherService, "RepositoryEntityScopedOtherController", "repository-entity-scoped-others")], [ServedService, OtherService], [Served, Other]);
			const { application, inject } = await boot([TypeOrmModule.forRoot(memory([Served, Other])), module]).catch((error: unknown) => {
				errors.mockRestore();

				throw error;
			});

			try {
				expect((await inject({ method: "GET", url: `/repository-entity-scoped-docs${LIST}` })).statusCode).toBe(500);
				expect(errors.mock.calls.flat().join(" ")).toContain('Controller "RepositoryEntityScopedDocController" serves entity RepositoryEntityScopedDoc');
			} finally {
				errors.mockRestore();
				await application.close();
			}
		});
	});

	describe("allowed", () => {
		const running: Array<INestApplication> = [];

		const expectList = async (imports: Array<unknown>, path: string, override?: Parameters<typeof boot>[1]): Promise<void> => {
			const { application, inject } = await boot(imports, override);

			running.push(application);

			expect((await inject({ method: "GET", url: `/${path}${LIST}` })).statusCode).toBe(200);
		};

		afterAll(async () => {
			await Promise.all(running.map(async (application: INestApplication): Promise<void> => await application.close()));
		});

		it.each([
			["a root controller with the root repository", RepositoryEntityRoot, RepositoryEntityRoot, "root-root"],
			["a child controller with the child repository", RepositoryEntityFirstChild, RepositoryEntityFirstChild, "child-child"],
			["a child controller with the root repository", RepositoryEntityFirstChild, RepositoryEntityRoot, "child-root"],
			["a root controller with a child repository", RepositoryEntityRoot, RepositoryEntityFirstChild, "root-child"],
		])("%s", async (_title: string, entity: TClass, repositoryEntity: TClass, path: string) => {
			const service = createService(repositoryEntity);
			const module = createModule([createController(entity, service, `RepositoryEntityLineage${path.replace("-", "")}Controller`, `repository-entity-${path}`)], [service], [repositoryEntity]);
			const { application } = await boot([TypeOrmModule.forRoot(memory([RepositoryEntityRoot, RepositoryEntityFirstChild, RepositoryEntitySecondChild])), module]);

			running.push(application);
		});

		it("a custom repository from getRepository().extend()", async () => {
			const Custom = createEntity("repository_entity_customs", "RepositoryEntityCustomDoc");
			const service = createCustomRepositoryService(Custom);
			const module = createModule([createController(Custom, service, "RepositoryEntityCustomController", "repository-entity-customs")], [service, createCustomRepositoryProvider(Custom)], [Custom]);

			await expectList([TypeOrmModule.forRoot(memory([Custom])), module], "repository-entity-customs");
		});

		it("a repository of a named data source", async () => {
			const Named = createEntity("repository_entity_named", "RepositoryEntityNamedDoc");
			const service = createService(Named, "second");
			const module = createModule([createController(Named, service, "RepositoryEntityNamedController", "repository-entity-named")], [service], [Named], "second");

			await expectList([TypeOrmModule.forRoot(memory([])), TypeOrmModule.forRoot(memory([Named], "second")), module], "repository-entity-named");
		});

		it("a mock repository without metadata from overrideProvider", async () => {
			const Mocked = createEntity("repository_entity_mocked", "RepositoryEntityMockedDoc");
			const service = createService(Mocked);
			const module = createModule([createController(Mocked, service, "RepositoryEntityMockedController", "repository-entity-mocked")], [service], [Mocked]);
			const { application } = await boot([TypeOrmModule.forRoot(memory([Mocked])), module], (builder) => builder.overrideProvider(getRepositoryToken(Mocked)).useValue({ find: vi.fn() }) as never);

			running.push(application);
		});

		it("@InjectRepository through a service subclass", async () => {
			const Subclassed = createEntity("repository_entity_subclassed", "RepositoryEntitySubclassedDoc");
			const service = createSubclassedService(Subclassed);
			const module = createModule([createController(Subclassed, service, "RepositoryEntitySubclassedController", "repository-entity-subclassed")], [service], [Subclassed]);

			await expectList([TypeOrmModule.forRoot(memory([Subclassed])), module], "repository-entity-subclassed");
		});

		it("a request-scoped controller with its own repository", async () => {
			const Scoped = createEntity("repository_entity_scoped_own", "RepositoryEntityScopedOwnDoc");
			const service = createService(Scoped);
			const module = createModule([createRequestScopedController(Scoped, service, "RepositoryEntityScopedOwnController", "repository-entity-scoped-own")], [service], [Scoped]);

			await expectList([TypeOrmModule.forRoot(memory([Scoped])), module], "repository-entity-scoped-own");
		});

		it("a controller with no generated route and a service of another entity", async () => {
			const Declared = createEntity("repository_entity_declared", "RepositoryEntityDeclaredDoc");
			const Used = createEntity("repository_entity_used", "RepositoryEntityUsedDoc");
			const service = createService(Used);
			const module = createModule([createCustomOnlyController(Declared, service, "RepositoryEntityCustomOnlyController", "repository-entity-custom-only")], [service], [Used]);
			const { application } = await boot([TypeOrmModule.forRoot(memory([Declared, Used])), module]);

			running.push(application);
		});
	});
});

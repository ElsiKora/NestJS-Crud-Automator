import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValidatorOptions } from "class-validator";

import { HttpStatus, RequestMethod, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiPropertyObject, ApiPropertyString, ApiRouteCustom, ApiSubscriberModule, EApiAuthenticationType, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";
import { E2eKeepAllowGuard, E2eKeepCatDto, E2eKeepCustomController, E2eKeepDogDto, E2eKeepEchoController, E2eKeepRecordController, E2eKeepRecordEntity, E2eKeepRecordService, E2eKeepResponseRecordController, E2eKeepRootOptionalBodyDto, E2eKeepRootRawRequiredBodyDto, E2eKeepRootRequiredBodyDto, E2eKeepResponseRecordEntity, E2eKeepResponseRecordService } from "./discriminator-keep";

interface IInjectResponse {
	json: () => unknown;
	statusCode: number;
}

interface IPipeCase {
	createPipe: () => ValidationPipe;
	name: string;
}

const CAT: Record<string, unknown> = { kind: "cat", lives: 9 };
const DOG: Record<string, unknown> = { kind: "dog", name: "Rex" };
const MODES: Array<string> = ["omitted", "true"];
const PET_MESSAGES: Record<string, Array<string>> = {
	missing: ["pets is missing required discriminator field 'kind'"],
	unknown: ["pets has invalid discriminator value for field 'kind'. must be one of: 'cat', 'dog'"],
};

describe("discriminator shouldKeepDiscriminatorProperty on a request property at decoration", () => {
	class OwnerEntity {}

	const FALSE_ERROR = (name: string): string => `Request property '${name}' cannot set 'discriminator.shouldKeepDiscriminatorProperty' to false`;

	it("rejects false on a single request property, naming the class and property", () => {
		expect(() => {
			class SingleFalseDto {
				@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, entity: OwnerEntity, isRequired: true, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
				public pet!: unknown;
			}

			return SingleFalseDto;
		}).toThrow(FALSE_ERROR("SingleFalseDto.pet"));
	});

	it("rejects false on a request array, naming the class and property", () => {
		expect(() => {
			class ArrayFalseDto {
				@ApiPropertyObject({ description: "pets", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, entity: OwnerEntity, isArray: true, isRequired: true, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
				public pets!: Array<unknown>;
			}

			return ArrayFalseDto;
		}).toThrow(FALSE_ERROR("ArrayFalseDto.pets"));
	});

	it("rejects false on a dynamically generated request property", () => {
		expect(() => {
			class DynamicFalseDto {
				@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: "E2eKeepCatDto" }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, entity: OwnerEntity, generatedDTOs: { E2eKeepCatDto }, isDynamicallyGenerated: true, isRequired: true, shouldValidateNested: true, type: [E2eKeepCatDto] })
				public pet!: unknown;
			}

			return DynamicFalseDto;
		}).toThrow(FALSE_ERROR("DynamicFalseDto.pet"));
	});

	it("rejects false from entity metadata when a generated request DTO applies it", () => {
		expect(() => {
			@Entity("e2e_discriminator_keep_false_metadata")
			class FalseMetadataEntity {
				@PrimaryGeneratedColumn("uuid")
				@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
				public id!: string;

				@Column({ type: "simple-json" })
				@ApiPropertyDescribe({ dataType: [E2eKeepCatDto, E2eKeepDogDto], description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
				public pet!: unknown;
			}

			@ApiController<FalseMetadataEntity>({
				entity: FalseMetadataEntity,
				name: "FalseMetadata",
				path: "false-metadata",
				routes: {
					[EApiRouteType.CREATE]: {},
					[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
					[EApiRouteType.GET]: { generation: { isEnabled: false } },
					[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
					[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
					[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
				},
			})
			class FalseMetadataController {
				public readonly service!: never;
			}

			return FalseMetadataController;
		}).toThrow(/Request property '.*\.pet' cannot set 'discriminator\.shouldKeepDiscriminatorProperty' to false/u);
	});

	it("allows false from entity metadata when the write bodies leave the property out", () => {
		expect(() => {
			@Entity("e2e_discriminator_keep_false_read_only")
			class FalseReadOnlyEntity {
				@PrimaryGeneratedColumn("uuid")
				@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
				public id!: string;

				@Column({ type: "simple-json", nullable: true })
				@ApiPropertyDescribe({
					dataType: [E2eKeepCatDto, E2eKeepDogDto],
					description: "pet",
					discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false },
					properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isEnabled: false } } },
					shouldValidateNested: true,
					type: EApiPropertyDescribeType.OBJECT,
				})
				public pet!: unknown;
			}

			@ApiController<FalseReadOnlyEntity>({
				entity: FalseReadOnlyEntity,
				name: "FalseReadOnly",
				path: "false-read-only",
				routes: {
					[EApiRouteType.CREATE]: {},
					[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
					[EApiRouteType.GET]: {},
					[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
					[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
					[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
				},
			})
			class FalseReadOnlyController {
				public readonly service!: never;
			}

			return FalseReadOnlyController;
		}).not.toThrow();
	});

	it("allows false on a response property", () => {
		expect(() => {
			class ResponseFalseDto {
				@ApiPropertyObject({ description: "pet", discriminator: { mapping: { cat: E2eKeepCatDto, dog: E2eKeepDogDto }, propertyName: "kind", shouldKeepDiscriminatorProperty: false }, entity: OwnerEntity, isRequired: true, isResponse: true, shouldValidateNested: true, type: [E2eKeepCatDto, E2eKeepDogDto] })
				public pet!: unknown;
			}

			return ResponseFalseDto;
		}).not.toThrow();
	});
});

describe("discriminator shouldKeepDiscriminatorProperty on a root-level request body at startup", () => {
	const decorate = (variant: new () => unknown, validatorOptions?: ValidatorOptions) => (): unknown => {
		class RootFalseController {
			@ApiRouteCustom<E2eKeepRecordEntity>({
				dto: { [EApiDtoType.BODY]: { discriminator: { mapping: { token: variant }, propertyName: "channel", shouldKeepDiscriminatorProperty: false }, type: [variant], validatorOptions } },
				resource: { action: "custom.rootFalse", entity: E2eKeepRecordEntity },
				response: { status: HttpStatus.OK, type: undefined },
				route: { method: RequestMethod.POST, path: "root-false" },
				security: { authentication: { guard: E2eKeepAllowGuard, type: EApiAuthenticationType.USER } },
			})
			public rootFalse(): unknown {
				return {};
			}
		}

		return RootFalseController;
	};

	it("refuses false with a variant that requires the property through its decorator", () => {
		expect(decorate(E2eKeepRootRequiredBodyDto)).toThrow("ApiRouteCustom body discriminator config error: DTO E2eKeepRootRequiredBodyDto requires discriminator property 'channel'");
	});

	it("allows false with a variant that makes the property optional", () => {
		expect(decorate(E2eKeepRootOptionalBodyDto)).not.toThrow();
	});

	it("allows false with a variant that requires it under skipMissingProperties", () => {
		expect(decorate(E2eKeepRootRequiredBodyDto, { skipMissingProperties: true })).not.toThrow();
	});

	it("allows false with a variant whose property only exists on the response", () => {
		class ResponseOnlyChannelDto {
			@ApiPropertyString({ description: "channel", entity: E2eKeepRecordEntity, exampleValue: "token", format: EApiPropertyStringType.STRING, isRequired: true, isResponse: true, maxLength: 8, minLength: 1, pattern: "/^[a-z]+$/" })
			public channel!: string;
		}

		expect(decorate(ResponseOnlyChannelDto)).not.toThrow();
	});

	it("cannot see a variant that requires it through raw class-validator", () => {
		expect(decorate(E2eKeepRootRawRequiredBodyDto)).not.toThrow();
	});
});

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("discriminator shouldKeepDiscriminatorProperty over HTTP on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<IPipeCase>([
		{ createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" },
		{ createPipe: () => new ValidationPipe({ transform: true, whitelist: true }), name: "a transforming, whitelisting host ValidationPipe" },
		{ createPipe: () => new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }), name: "a forbidding host ValidationPipe" },
	])("with $name", ({ createPipe }: IPipeCase) => {
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<IInjectResponse> };

		const post = async (path: string, payload?: unknown): Promise<IInjectResponse> => await fastify.inject({ method: "POST", payload, url: `/discriminator-keep/${path}` });

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eKeepRecordEntity, E2eKeepResponseRecordEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eKeepEchoController, E2eKeepCustomController, E2eKeepRecordController, E2eKeepResponseRecordController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eKeepAllowGuard, E2eKeepRecordService, E2eKeepResponseRecordService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			app.useGlobalPipes(createPipe());
			await app.init();
			await app.getHttpAdapter().getInstance().ready();
			fastify = app.getHttpAdapter().getInstance();
		});

		afterAll(async () => {
			await app?.close();
		});

		describe.each(MODES)("a request property with the option %s", (mode: string) => {
			it("accepts an array and keeps the discriminator", async () => {
				const response: IInjectResponse = await post(`echo/${mode}`, { pets: [CAT, DOG] });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ pets: [CAT, DOG] });
			});

			it("accepts a single value and keeps the discriminator", async () => {
				const response: IInjectResponse = await post(`echo/${mode}`, { pet: DOG });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ pet: DOG });
			});

			it("answers 400 for an unknown or a missing discriminator value", async () => {
				const unknown: IInjectResponse = await post(`echo/${mode}`, { pets: [{ kind: "cow", lives: 1 }] });
				const missing: IInjectResponse = await post(`echo/${mode}`, { pets: [{ lives: 1 }] });

				expect(unknown.statusCode, JSON.stringify(unknown.json())).toBe(HttpStatus.BAD_REQUEST);
				expect((unknown.json() as { message: Array<string> }).message).toEqual(expect.arrayContaining(PET_MESSAGES.unknown as Array<string>));
				expect(missing.statusCode, JSON.stringify(missing.json())).toBe(HttpStatus.BAD_REQUEST);
				expect((missing.json() as { message: Array<string> }).message).toEqual(expect.arrayContaining(PET_MESSAGES.missing as Array<string>));
			});

			it("answers 400 for a variant field that breaks its DTO", async () => {
				const response: IInjectResponse = await post(`echo/${mode}`, { pet: { kind: "cat", lives: 100 } });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			});
		});

		it("stores and returns the discriminator on a generated CREATE and GET with the option omitted", async () => {
			const details: Record<string, unknown> = { kind: "Variant", score: 5 };
			const created: IInjectResponse = await fastify.inject({ method: "POST", payload: { details, pets: [CAT, DOG] }, url: "/discriminator-keep/records" });
			const body: { id: string } = created.json() as never;

			expect(created.statusCode, JSON.stringify(body)).toBe(HttpStatus.CREATED);
			expect(body).toMatchObject({ details, pets: [CAT, DOG] });
			expect(await app!.get(E2eKeepRecordService).repository.findOneBy({ id: body.id })).toMatchObject({ details, pets: [CAT, DOG] });

			const read: IInjectResponse = await fastify.inject({ method: "GET", url: `/discriminator-keep/records/${body.id}` });

			expect(read.statusCode, JSON.stringify(read.json())).toBe(HttpStatus.OK);
			expect(read.json()).toMatchObject({ details, pets: [CAT, DOG] });
		});

		describe("a response property", () => {
			it.each(MODES)("keeps the discriminator with the option %s", async (mode: string) => {
				const response: IInjectResponse = await post(`custom/response-${mode}`);

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ pet: CAT, pets: [CAT, DOG] });
			});

			it("removes the discriminator with the option false", async () => {
				const response: IInjectResponse = await post("custom/response-false");

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ pet: { lives: 9 }, pets: [{ lives: 9 }, { name: "Rex" }] });
			});
		});

		it("removes the discriminator from a generated GET response when entity metadata sets false", async () => {
			const saved: E2eKeepResponseRecordEntity = await app!.get(E2eKeepResponseRecordService).repository.save({ pet: { ...CAT } } as unknown as E2eKeepResponseRecordEntity);
			const read: IInjectResponse = await fastify.inject({ method: "GET", url: `/discriminator-keep/response-records/${saved.id}` });

			expect(read.statusCode, JSON.stringify(read.json())).toBe(HttpStatus.OK);
			expect(read.json()).toEqual({ id: saved.id, pet: { lives: 9 } });
		});

		describe("a root-level discriminated body", () => {
			it.each(["omitted", "true"])("keeps the discriminator with the option %s", async (mode: string) => {
				const response: IInjectResponse = await post(`custom/root-${mode}`, { channel: "token", token: "abc" });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ channel: "token", token: "abc" });
			});

			it("lets a variant that requires it through with false under skipMissingProperties", async () => {
				const response: IInjectResponse = await post("custom/root-false-skip-missing", { channel: "token", token: "abc" });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ token: "abc" });
			});

			it("answers 400 with false for a variant that requires it through raw class-validator, which startup cannot see", async () => {
				const response: IInjectResponse = await post("custom/root-false-raw", { channel: "token", token: "abc" });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect((response.json() as { message: Array<string> }).message.join()).toContain("channel");
			});

			it("removes the discriminator with the option false from a variant that makes it optional", async () => {
				const response: IInjectResponse = await post("custom/root-false-optional", { channel: "token", token: "abc" });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ token: "abc" });
			});

			it("selects the variant from the discriminator before removing it", async () => {
				const response: IInjectResponse = await post("custom/root-false-optional", { channel: "other", token: "abc" });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			});
		});
	});
});

import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Inject, Injectable, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { Column, Entity, Not, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyCopy, ApiPropertyDescribe, ApiPropertyString, ApiService, ApiServiceBase, ApiSubscriberModule, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

class E2eManualChildEntityReference {}

const STRING_OPTIONS = { entity: E2eManualChildEntityReference, exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: "/^.+$/" };

class E2eManualChildSecretDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "open", isRequired: true })
	public open!: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "secret", isRequired: false })
	@Exclude()
	public secret?: string;
}

class E2eManualChildNamedDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "childValue", isRequired: true })
	@Expose({ name: "child_wire" })
	public childValue!: string;
}

const SHOWN_PROVIDERS: ReadonlySet<unknown> = new Set(["email", "phone", "username"]);
const STORED_SUBJECT = "stored-google-subject";

class E2eManualChildNoteDto {
	@Expose({ name: "note_wire" })
	public text?: string;
}

class E2eManualChildMaskDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "identifier", isNullable: true, isRequired: false, maxLength: 40 })
	@Transform(({ obj }: { obj: { identifier?: string; provider?: string } }): null | string | undefined => (SHOWN_PROVIDERS.has(obj.provider) ? obj.identifier : null), { toClassOnly: true })
	public identifier?: null | string;

	// No Automator decorator: a copy has no replay to bring these back.
	@Expose()
	@Type(() => E2eManualChildNoteDto)
	public note?: E2eManualChildNoteDto;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "provider", isRequired: false })
	public provider?: string;

	@Expose()
	@Transform((): string => "***", { toClassOnly: true })
	public token?: string;
}

const GENERATED_ROUTES = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@Entity("e2e_manual_child_secret_rows")
class E2eManualChildSecretEntity {
	@ApiPropertyDescribe({ description: "manualChildSecretId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eManualChildSecretDto, description: "manualChildSecretBody", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ type: "simple-json" })
	public body!: E2eManualChildSecretDto;
}

@Entity("e2e_manual_child_named_rows")
class E2eManualChildNamedEntity {
	@ApiPropertyDescribe({ description: "manualChildNamedId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eManualChildNamedDto, description: "manualChildNamedDetails", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ type: "simple-json" })
	public details!: E2eManualChildNamedDto;
}

@Entity("e2e_manual_child_mask_rows")
class E2eManualChildMaskEntity {
	@ApiPropertyDescribe({ description: "manualChildMaskId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eManualChildMaskDto, description: "manualChildMaskProfile", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ type: "simple-json" })
	public profile!: E2eManualChildMaskDto;
}

// A manual child whose property is copied from the mask column, so its generated copy holds a copy of the mask DTO.
class E2eManualChildCopyHolderDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.RESPONSE, entity: E2eManualChildMaskEntity, method: EApiRouteType.GET, propertyName: "profile" })
	public profile!: E2eManualChildMaskDto;
}

@Entity("e2e_manual_child_holder_rows")
class E2eManualChildHolderEntity {
	@ApiPropertyDescribe({ description: "manualChildHolderId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eManualChildCopyHolderDto, description: "manualChildHolderBody", shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ type: "simple-json" })
	public holder!: E2eManualChildCopyHolderDto;
}

@Injectable()
@ApiService({ entity: E2eManualChildSecretEntity })
class E2eManualChildSecretService extends ApiServiceBase<E2eManualChildSecretEntity> {
	@InjectRepository(E2eManualChildSecretEntity)
	public readonly repository!: Repository<E2eManualChildSecretEntity>;
}

@Injectable()
@ApiService({ entity: E2eManualChildNamedEntity })
class E2eManualChildNamedService extends ApiServiceBase<E2eManualChildNamedEntity> {
	@InjectRepository(E2eManualChildNamedEntity)
	public readonly repository!: Repository<E2eManualChildNamedEntity>;
}

@Injectable()
@ApiService({ entity: E2eManualChildMaskEntity })
class E2eManualChildMaskService extends ApiServiceBase<E2eManualChildMaskEntity> {
	@InjectRepository(E2eManualChildMaskEntity)
	public readonly repository!: Repository<E2eManualChildMaskEntity>;
}

@ApiController<E2eManualChildMaskEntity>({ entity: E2eManualChildMaskEntity, name: "E2eManualChildMasks", path: "manual-child-masks", routes: GENERATED_ROUTES })
class E2eManualChildMaskController {
	public constructor(@Inject(E2eManualChildMaskService) public readonly service: E2eManualChildMaskService) {}
}

@Injectable()
@ApiService({ entity: E2eManualChildHolderEntity })
class E2eManualChildHolderService extends ApiServiceBase<E2eManualChildHolderEntity> {
	@InjectRepository(E2eManualChildHolderEntity)
	public readonly repository!: Repository<E2eManualChildHolderEntity>;
}

@ApiController<E2eManualChildHolderEntity>({ entity: E2eManualChildHolderEntity, name: "E2eManualChildHolders", path: "manual-child-holders", routes: GENERATED_ROUTES })
class E2eManualChildHolderController {
	public constructor(@Inject(E2eManualChildHolderService) public readonly service: E2eManualChildHolderService) {}
}

@ApiController<E2eManualChildSecretEntity>({ entity: E2eManualChildSecretEntity, name: "E2eManualChildSecrets", path: "manual-child-secrets", routes: GENERATED_ROUTES })
class E2eManualChildSecretController {
	public constructor(@Inject(E2eManualChildSecretService) public readonly service: E2eManualChildSecretService) {}
}

@ApiController<E2eManualChildNamedEntity>({ entity: E2eManualChildNamedEntity, name: "E2eManualChildNamed", path: "manual-child-named", routes: GENERATED_ROUTES })
class E2eManualChildNamedController {
	public constructor(@Inject(E2eManualChildNamedService) public readonly service: E2eManualChildNamedService) {}
}

describe("generated copy of a manual child DTO (E2E)", () => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };
	let holderRepository: Repository<E2eManualChildHolderEntity>;
	let maskRepository: Repository<E2eManualChildMaskEntity>;
	let secretRepository: Repository<E2eManualChildSecretEntity>;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eManualChildHolderController, E2eManualChildMaskController, E2eManualChildNamedController, E2eManualChildSecretController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eManualChildHolderEntity, E2eManualChildMaskEntity, E2eManualChildNamedEntity, E2eManualChildSecretEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eManualChildHolderEntity, E2eManualChildMaskEntity, E2eManualChildNamedEntity, E2eManualChildSecretEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) }, E2eManualChildHolderService, E2eManualChildMaskService, E2eManualChildNamedService, E2eManualChildSecretService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		holderRepository = moduleReference.get(getRepositoryToken(E2eManualChildHolderEntity));
		maskRepository = moduleReference.get(getRepositoryToken(E2eManualChildMaskEntity));
		secretRepository = moduleReference.get(getRepositoryToken(E2eManualChildSecretEntity));
	});

	afterAll(async () => {
		await app?.close();
	});

	it("keeps @Exclude of the child off the wire on a generated GET", async () => {
		const row: E2eManualChildSecretEntity = await secretRepository.save({ body: { open: "o", secret: "secretValue" } });
		const response = await fastify.inject({ method: "GET", url: `/manual-child-secrets/${row.id}` });

		expect(response.statusCode).toBe(200);
		expect(response.json().body).toEqual({ open: "o" });
	});

	it("does not store an excluded child property from a generated POST", async () => {
		const response = await fastify.inject({ method: "POST", payload: { body: { open: "o", secret: "fromClient" } }, url: "/manual-child-secrets" });

		expect(response.statusCode).toBe(201);
		expect((await secretRepository.findOneByOrFail({ id: String(response.json().id) })).body).toEqual({ open: "o" });
	});

	it("accepts the exposed name of the child on a generated POST", async () => {
		const response = await fastify.inject({ method: "POST", payload: { details: { child_wire: "w" } }, url: "/manual-child-named" });

		expect(response.statusCode).toBe(201);
	});

	it("refuses the property key of the child on a generated POST", async () => {
		const response = await fastify.inject({ method: "POST", payload: { details: { childValue: "v" } }, url: "/manual-child-named" });

		expect(response.statusCode).toBe(400);
	});

	describe("transforms and types of the child", () => {
		const MASKED_PROFILE = { identifier: null, note: { note_wire: "n" }, provider: "google", token: "***" };
		const SHOWN_PROFILE = { identifier: "shown@example.com", note: { note_wire: "n" }, provider: "email", token: "***" };

		let googleRow: E2eManualChildMaskEntity;

		beforeAll(async () => {
			await maskRepository.clear();
			googleRow = await maskRepository.save({ profile: { identifier: STORED_SUBJECT, note: { text: "n" }, provider: "google", token: `token-${STORED_SUBJECT}` } });
			await maskRepository.save({ profile: { identifier: "shown@example.com", note: { text: "n" }, provider: "email", token: "token-email" } });
		});

		it("keeps the transforms and types of the child on a generated GET", async () => {
			const response = await fastify.inject({ method: "GET", url: `/manual-child-masks/${googleRow.id}` });

			expect(response.statusCode).toBe(200);
			expect(JSON.stringify(response.json())).not.toContain(STORED_SUBJECT);
			expect(response.json().profile).toEqual(MASKED_PROFILE);
		});

		it("keeps the transforms and types of a child copied through ApiPropertyCopy on a generated GET", async () => {
			const row: E2eManualChildHolderEntity = await holderRepository.save({ holder: { profile: { identifier: STORED_SUBJECT, note: { text: "n" }, provider: "google", token: `token-${STORED_SUBJECT}` } } });
			const response = await fastify.inject({ method: "GET", url: `/manual-child-holders/${row.id}` });

			expect(response.statusCode).toBe(200);
			expect(JSON.stringify(response.json())).not.toContain(STORED_SUBJECT);
			expect(response.json().holder).toEqual({ profile: MASKED_PROFILE });
		});

		it("keeps a shown value of the child on a generated GET", async () => {
			const row: E2eManualChildMaskEntity | null = await maskRepository.findOneBy({ id: Not(googleRow.id) });
			const response = await fastify.inject({ method: "GET", url: `/manual-child-masks/${String(row?.id)}` });

			expect(response.json().profile).toEqual(SHOWN_PROFILE);
		});
	});
});

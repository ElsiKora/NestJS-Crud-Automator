import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { Repository } from "typeorm";

import { Body, ClassSerializerInterceptor, Controller, Get, HttpCode, HttpStatus, Inject, Injectable, Post, Query, RequestMethod, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Exclude, Expose } from "class-transformer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiControllerObservable, ApiPropertyDescribe, ApiPropertyObject, ApiPropertyString, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TDocument = { components: { schemas: Record<string, { properties: Record<string, unknown>; required?: Array<string> }> }; paths: Record<string, { get: { parameters: Array<{ name: string }> } }> };

class E2eWireEntityReference {}

const STRING_OPTIONS = { entity: E2eWireEntityReference, exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: "/^.+$/" };

class E2eWireChildResponseDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "childValue", isResponse: true })
	@Expose({ name: "child_wire" })
	public childValue?: string;
}

class E2eWireResponseDto {
	@ApiPropertyObject({ description: "child", entity: E2eWireEntityReference, isResponse: true, type: E2eWireChildResponseDto })
	public child?: E2eWireChildResponseDto;

	@Expose({ name: "display_name" })
	@ApiPropertyString({ ...STRING_OPTIONS, description: "displayName", isResponse: true })
	public displayName?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "below", isResponse: true })
	@Expose({ name: "below_wire" })
	public below?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "hidden", isResponse: true })
	@Exclude({ toPlainOnly: true })
	public hidden?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "plain", isResponse: true })
	public plain?: string;
}

class E2eWireParentDto {
	@Expose({ name: "inherited_wire" })
	public inherited?: string;
}

class E2eWireChildOfParentDto extends E2eWireParentDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "inherited", isRequired: true })
	public override inherited?: string = undefined;
}

class E2eWireRequestDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "displayName", isRequired: true })
	@Expose({ name: "display_name" })
	public displayName!: string;
}

class E2eWireEntityWithGetter {
	public get displayName(): string {
		return "fromGetter";
	}
}

const HANDLER_RESULT = { below: "b", below_wire: "ignored", child: { childValue: "c", child_wire: "ignored" }, display_name: "ignored", displayName: "first", hidden: "secret", plain: "p" };
const WIRE_RESULT = { below_wire: "b", child: { child_wire: "c" }, display_name: "first", plain: "p" };

const customRoute = (action: string, path: string): MethodDecorator => ApiRouteCustom<E2eWireEntityReference>({ resource: { action, entity: E2eWireEntityReference }, response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eWireResponseDto }, route: { method: RequestMethod.GET, path } });

@ApiControllerObservable()
@Controller("wire-library")
class E2eWireLibraryController {
	@customRoute("wireLibrary.getter", "getter")
	public getter(): unknown {
		return new E2eWireEntityWithGetter();
	}

	@customRoute("wireLibrary.list", "list")
	public list(): unknown {
		return [HANDLER_RESULT, HANDLER_RESULT];
	}

	@customRoute("wireLibrary.named", "named")
	public named(): unknown {
		return HANDLER_RESULT;
	}
}

@ApiControllerObservable()
@Controller("wire-interceptor")
@UseInterceptors(ClassSerializerInterceptor)
class E2eWireInterceptorController {
	@customRoute("wireInterceptor.named", "named")
	public named(): unknown {
		return HANDLER_RESULT;
	}
}

@Controller("wire-manual")
class E2eWireManualController {
	@HttpCode(HttpStatus.OK)
	@Post()
	public body(@Body() body: E2eWireRequestDto): { displayName: string } {
		return { displayName: body.displayName };
	}

	@Get("inherited")
	public inherited(@Query() query: E2eWireChildOfParentDto): { inherited?: string } {
		return { inherited: query.inherited };
	}

	@Get()
	public query(@Query() query: E2eWireRequestDto): { displayName: string } {
		return { displayName: query.displayName };
	}
}

class E2eWireManualResponseDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "id", isResponse: true })
	public id?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "title", isResponse: true })
	@Expose({ name: "headline" })
	public title?: string;
}

class E2eWireStoredChildDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "childValue", isRequired: true })
	@Expose({ name: "child_wire" })
	public childValue!: string;
}

@Entity("e2e_wire_rows")
class E2eWireRowEntity {
	@ApiPropertyDescribe({ description: "wireRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ dataType: E2eWireStoredChildDto, description: "wireRowDetails", isNullable: true, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ nullable: true, type: "simple-json" })
	public details?: E2eWireStoredChildDto;

	@ApiPropertyDescribe({ ...STRING_OPTIONS, description: "wireRowTitle", isNullable: true, type: EApiPropertyDescribeType.STRING })
	@Column({ nullable: true, type: "varchar" })
	public title?: string;
}

@Injectable()
@ApiService({ entity: E2eWireRowEntity })
class E2eWireRowService extends ApiServiceBase<E2eWireRowEntity> {
	@InjectRepository(E2eWireRowEntity)
	public readonly repository!: Repository<E2eWireRowEntity>;
}

@ApiController<E2eWireRowEntity>({ entity: E2eWireRowEntity, name: "E2eWireRows", path: "wire-rows", routes: { [EApiRouteType.DELETE]: { generation: { isEnabled: false } }, [EApiRouteType.GET_LIST]: { generation: { isEnabled: false } }, [EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } }, [EApiRouteType.UPDATE]: { generation: { isEnabled: false } } } })
class E2eWireRowController {
	public constructor(@Inject(E2eWireRowService) public readonly service: E2eWireRowService) {}
}

@ApiController<E2eWireRowEntity>({
	entity: E2eWireRowEntity,
	name: "E2eWireManualRows",
	path: "wire-manual-rows",
	routes: { [EApiRouteType.CREATE]: { generation: { isEnabled: false } }, [EApiRouteType.DELETE]: { generation: { isEnabled: false } }, [EApiRouteType.GET]: { dto: { [EApiDtoType.RESPONSE]: E2eWireManualResponseDto } }, [EApiRouteType.GET_LIST]: { generation: { isEnabled: false } }, [EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } }, [EApiRouteType.UPDATE]: { generation: { isEnabled: false } } },
})
class E2eWireManualRowController {
	public constructor(@Inject(E2eWireRowService) public readonly service: E2eWireRowService) {}
}

describe("one wire name on every path (E2E)", () => {
	let app: INestApplication | undefined;
	let document: TDocument;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let rowRepository: Repository<E2eWireRowEntity>;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eWireInterceptorController, E2eWireLibraryController, E2eWireManualController, E2eWireManualRowController, E2eWireRowController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eWireRowEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eWireRowEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) }, E2eWireRowService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		rowRepository = moduleReference.get(getRepositoryToken(E2eWireRowEntity));
		document = JSON.parse(JSON.stringify(SwaggerModule.createDocument(app, new DocumentBuilder().build())));
	});

	afterAll(async () => {
		await app?.close();
	});

	describe("response", () => {
		it.each(["wire-library", "wire-interceptor"])("sends the exposed name from the property key of the handler result on %s", async (controller: string) => {
			const response = await fastify.inject({ method: "GET", url: `/${controller}/named` });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json()).toEqual(WIRE_RESULT);
		});

		it("sends the exposed name for every item of an array", async () => {
			const response = await fastify.inject({ method: "GET", url: "/wire-library/list" });

			expect(response.json()).toEqual([WIRE_RESULT, WIRE_RESULT]);
		});

		it("reads the property key through a getter of a class instance", async () => {
			const response = await fastify.inject({ method: "GET", url: "/wire-library/getter" });

			expect(response.json()).toEqual({ display_name: "fromGetter" });
		});

		it("sends the exposed name of a manual response DTO on a generated GET", async () => {
			const row: E2eWireRowEntity = await rowRepository.save({ title: "t" });
			const response = await fastify.inject({ method: "GET", url: `/wire-manual-rows/${row.id}` });

			expect(response.json()).toEqual({ headline: "t", id: row.id });
		});

		it("round-trips a manual child through its exposed name on generated routes", async () => {
			const created = await fastify.inject({ method: "POST", payload: { details: { child_wire: "w" }, title: "t" }, url: "/wire-rows" });

			expect(created.statusCode).toBe(HttpStatus.CREATED);
			expect(created.json()).toMatchObject({ details: { child_wire: "w" } });

			const read = await fastify.inject({ method: "GET", url: `/wire-rows/${(created.json() as { id: string }).id}` });

			expect(read.json()).toMatchObject({ details: { child_wire: "w" } });
		});
	});

	describe("request", () => {
		it("reads the exposed name into the property key of the handler", async () => {
			const response = await fastify.inject({ method: "POST", payload: { display_name: "first" }, url: "/wire-manual" });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ displayName: "first" });
		});
	});

	describe("schema", () => {
		const componentNames = (): Array<string> => Object.keys(document.components.schemas);

		it.each([["response", "E2eWireResponseDto", ["below_wire", "child", "display_name", "plain"]]])("publishes the exposed name in the %s schema", (_kind: string, schemaName: string, expected: Array<string>) => {
			expect(
				Object.keys(document.components.schemas[schemaName]?.properties ?? {})
					.filter((name: string) => name !== "hidden")
					.toSorted(),
			).toEqual(expected);
		});

		it("publishes the exposed name of a nested response DTO", () => {
			expect(Object.keys(document.components.schemas.E2eWireChildResponseDto?.properties ?? {})).toEqual(["child_wire"]);
		});

		it("publishes the exposed name in a request schema and its required list", () => {
			const schema = Object.values(document.components.schemas).find((candidate: { properties: Record<string, unknown> }) => "display_name" in candidate.properties && !("plain" in candidate.properties));

			expect(schema?.required).toContain("display_name");
			expect(schema?.required).not.toContain("displayName");
		});

		it("publishes the exposed name in query parameters", () => {
			expect(document.paths["/wire-manual"]?.get.parameters.map(({ name }: { name: string }) => name)).toEqual(["display_name"]);
		});

		it("publishes a name inherited from a parent class", () => {
			expect(document.paths["/wire-manual/inherited"]?.get.parameters.map(({ name }: { name: string }) => name)).toEqual(["inherited_wire"]);
		});

		it("publishes the exposed name of a manual response DTO on a generated route", () => {
			expect(Object.keys(document.components.schemas.E2eWireManualResponseDto?.properties ?? {}).toSorted()).toEqual(["headline", "id"]);
		});

		it("publishes the exposed name of the generated copy of a manual child", () => {
			const copies: Array<string> = componentNames().filter((name: string) => name.endsWith("DetailsDTO"));

			expect(copies.length).toBeGreaterThanOrEqual(2);
			expect(copies.filter((name: string) => !("child_wire" in (document.components.schemas[name]?.properties ?? {})) || "childValue" in (document.components.schemas[name]?.properties ?? {}))).toEqual([]);
		});

		it("leaves no declared name of a renamed property in any component", () => {
			const renamed: Array<string> = ["below", "childValue", "displayName", "inherited", "title"];
			const leftovers: Array<string> = componentNames().filter((name: string) => !name.startsWith("E2eWireRow") && !name.startsWith("E2eWireManualRows") && renamed.some((property: string) => property in (document.components.schemas[name]?.properties ?? {})));

			expect(leftovers).toEqual([]);
		});
	});
});

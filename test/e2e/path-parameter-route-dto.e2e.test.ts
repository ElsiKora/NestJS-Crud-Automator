import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { IApiAuthorizationPrincipal } from "../../src/index";
import type { IE2ePathParameterRouteDtoCase, TE2ePathParameterRouteDtoPipe } from "./path-parameter";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType } from "../../src/index";
import { buildE2ePathParameterConsumerPipe, buildE2ePathParameterRouteDtoController, E2E_PATH_PARAMETER_ROUTE_DTO_CASES, E2E_PATH_PARAMETER_ROUTE_DTO_CONTROLLERS, E2E_PATH_PARAMETER_ROUTE_DTO_DOCUMENTS, E2E_PATH_PARAMETER_ROUTE_DTO_REFUSED, E2ePathParameterRouteDtoGuard, E2ePathParameterRouteDtoItemEntity, E2ePathParameterRouteDtoItemService } from "./path-parameter";

type TRouteDtoFastify = { inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };

const SPELLINGS: Array<[string, string]> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.flatMap((routeCase: IE2ePathParameterRouteDtoCase) => routeCase.denied.map((spelling: string): [string, string] => [routeCase.name, spelling]));
const INVALID_VALUES: Array<[string, string]> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.flatMap((routeCase: IE2ePathParameterRouteDtoCase) => routeCase.invalid.map((value: string): [string, string] => [routeCase.name, value]));
const UPPER_CASE_UUIDS: Array<[string, string]> = INVALID_VALUES.filter(([, value]: [string, string]): boolean => /^[\dA-F]{8}(?:-[\dA-F]{4}){3}-[\dA-F]{12}$/.test(value));

const PIPES: Array<TE2ePathParameterRouteDtoPipe> = ["none", "validate", "transform", "implicit", "consumer", "groups", "version", "oldVersion"];

/**
 * Builds the application of one host pipe mode, not yet started.
 * @param {TE2ePathParameterRouteDtoPipe} pipe - Host pipe mode.
 * @param {Array<new () => unknown>} controllers - Controllers to serve.
 * @returns {Promise<INestApplication>} The application.
 */
const buildApplication = async (pipe: TE2ePathParameterRouteDtoPipe, controllers: Array<new () => unknown>): Promise<INestApplication> => {
	const moduleReference = await Test.createTestingModule({
		controllers,
		imports: [
			TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2ePathParameterRouteDtoItemEntity], synchronize: true, type: "better-sqlite3" }),
			TypeOrmModule.forFeature([E2ePathParameterRouteDtoItemEntity]),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_ROUTE_DTO_DOCUMENTS.filter((document: unknown): boolean => ids.includes((document as { id: string }).id))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
			ApiSubscriberModule,
		],
		providers: [E2ePathParameterRouteDtoItemService, E2ePathParameterRouteDtoGuard],
	}).compile();
	const application: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	if (pipe === "validate") {
		application.useGlobalPipes(new ValidationPipe());
	}

	if (pipe === "transform") {
		application.useGlobalPipes(new ValidationPipe({ transform: true }));
	}

	if (pipe === "implicit") {
		application.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
	}

	if (pipe === "consumer") {
		application.useGlobalPipes(buildE2ePathParameterConsumerPipe());
	}

	if (pipe === "groups") {
		application.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { groups: ["g"] } }));
	}

	if (pipe === "version") {
		application.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { version: 2 } }));
	}

	if (pipe === "oldVersion") {
		application.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { version: 1 } }));
	}

	return application;
};

describe.each<TE2ePathParameterRouteDtoPipe>(PIPES)("the guard runs the route PARAMETERS DTO, host pipe: %s (E2E)", (pipe: TE2ePathParameterRouteDtoPipe) => {
	let app: INestApplication;
	let fastify: TRouteDtoFastify;

	beforeAll(async () => {
		app = await buildApplication(pipe, E2E_PATH_PARAMETER_ROUTE_DTO_CONTROLLERS);
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		await (fastify as unknown as { ready: () => Promise<void> }).ready();
	});

	afterAll(async () => {
		await app.close();
	});

	it.each(SPELLINGS)("denies %s/%s, the spelling of the denied value", async (name: string, spelling: string) => {
		const response = await fastify.inject({ method: "GET", url: `/route-dto/${name}/${spelling}` });

		expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
	});

	it.each(INVALID_VALUES)("rejects %s/%s before IAM", async (name: string, value: string) => {
		const response = await fastify.inject({ method: "GET", url: `/route-dto/${name}/${value}` });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});

	it.each(UPPER_CASE_UUIDS)("refuses %s/%s, an upper-case UUID, with the lower-case rule", async (name: string, value: string) => {
		const response = await fastify.inject({ method: "GET", url: `/route-dto/${name}/${value}` });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual(["id must be a lower-case UUID"]);
	});

	it.each(E2E_PATH_PARAMETER_ROUTE_DTO_CASES)("gives the handler the value IAM saw on $name", async (routeCase: IE2ePathParameterRouteDtoCase) => {
		const response = await fastify.inject({ method: "GET", url: `/route-dto/${routeCase.name}/${routeCase.allowed.sent}` });

		const answer: { status: number; value?: unknown } | undefined = routeCase.allowed.pipes?.[pipe];

		if (answer) {
			expect(response.statusCode).toBe(answer.status);

			if (answer.value !== undefined) {
				expect(JSON.parse(response.json().value as string)).toEqual(answer.value);
			}

			return;
		}

		// The DTO requires a property the path does not carry, which only a host pipe enforces.
		if (pipe !== "none" && routeCase.widerThanPath) {
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);

			return;
		}

		expect(response.statusCode).toBe(HttpStatus.OK);

		expect(JSON.parse(response.json().value as string)).toEqual(pipe === "none" || pipe === "validate" ? routeCase.allowed.raw : routeCase.allowed.piped);
	});

	it.each(E2E_PATH_PARAMETER_ROUTE_DTO_REFUSED)("does not start a route whose DTO cannot keep the value IAM saw: $name", async (refused: { dto: new () => unknown; name: string }) => {
		const refusedApp: INestApplication = await buildApplication(pipe, [buildE2ePathParameterRouteDtoController(refused)]);

		await expect(refusedApp.init()).rejects.toThrow(/Controller "\w+" method "read" property "\w+" of PARAMETERS DTO/);
	});
});

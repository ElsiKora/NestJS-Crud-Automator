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
import { buildE2ePathParameterConsumerPipe, E2E_PATH_PARAMETER_ROUTE_DTO_CASES, E2E_PATH_PARAMETER_ROUTE_DTO_CONTROLLERS, E2E_PATH_PARAMETER_ROUTE_DTO_DOCUMENTS, E2ePathParameterRouteDtoGuard, E2ePathParameterRouteDtoItemEntity, E2ePathParameterRouteDtoItemService } from "./path-parameter";

type TRouteDtoFastify = { inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };

const SPELLINGS: Array<[string, string]> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.flatMap((routeCase: IE2ePathParameterRouteDtoCase) => routeCase.denied.map((spelling: string): [string, string] => [routeCase.name, spelling]));
const INVALID_VALUES: Array<[string, string]> = E2E_PATH_PARAMETER_ROUTE_DTO_CASES.flatMap((routeCase: IE2ePathParameterRouteDtoCase) => routeCase.invalid.map((value: string): [string, string] => [routeCase.name, value]));

describe.each<TE2ePathParameterRouteDtoPipe>(["none", "transform", "implicit", "consumer"])("the guard runs the route PARAMETERS DTO, host pipe: %s (E2E)", (pipe: TE2ePathParameterRouteDtoPipe) => {
	let app: INestApplication;
	let fastify: TRouteDtoFastify;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: E2E_PATH_PARAMETER_ROUTE_DTO_CONTROLLERS,
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
		app = moduleReference.createNestApplication(new FastifyAdapter());

		if (pipe === "transform") {
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
		}

		if (pipe === "implicit") {
			app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
		}

		if (pipe === "consumer") {
			app.useGlobalPipes(buildE2ePathParameterConsumerPipe());
		}

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

	it.each(E2E_PATH_PARAMETER_ROUTE_DTO_CASES)("gives the handler the value IAM saw on $name", async (routeCase: IE2ePathParameterRouteDtoCase) => {
		const response = await fastify.inject({ method: "GET", url: `/route-dto/${routeCase.name}/${routeCase.allowed.sent}` });

		if (pipe === "transform" && routeCase.allowed.transformStatus !== undefined) {
			expect(response.statusCode).toBe(routeCase.allowed.transformStatus);

			return;
		}

		// The DTO requires a property the path does not carry, which only a host pipe enforces.
		if (pipe !== "none" && routeCase.widerThanPath) {
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);

			return;
		}

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(JSON.parse(response.json().value as string)).toEqual(pipe === "none" ? routeCase.allowed.raw : routeCase.allowed.piped);
	});
});

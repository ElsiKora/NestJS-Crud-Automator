import type { IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { ExecutionContext } from "@nestjs/common";
import type { FindOperator, ValueTransformer } from "typeorm";

import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiDtoType, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { ApiRouteProjectRelationResponse } from "@utility/api/route/response/project-relation.utility";
import { In } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { RuntimeRouteEmailBodyDTO, RuntimeRouteEntity, RuntimeRouteExposedEmailBodyDTO, RuntimeRouteExposedPhoneBodyDTO, RuntimeRoutePhoneBodyDTO, RuntimeRouteResponseDTO, RuntimeRouteSessionResponseDTO, RuntimeRouteVerificationResponseDTO } from "./runtime/fixture";

const createExecutionContext = (request: IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>): ExecutionContext =>
	({
		getArgByIndex: () => undefined,
		getArgs: () => [],
		getClass: () => class RuntimeRouteController {},
		getHandler: () => function runtimeRouteHandler() {},
		getType: () => "http",
		switchToHttp: () => ({
			getRequest: () => request,
		}),
		switchToRpc: () => ({
			getContext: () => undefined,
			getData: () => undefined,
		}),
		switchToWs: () => ({
			getClient: () => undefined,
			getData: () => undefined,
		}),
	}) as unknown as ExecutionContext;

describe("ApiRouteRuntime", () => {
	it("executes custom route request targets, response targets, and explicit serialization", async () => {
		const request = {
			body: {
				id: "custom-route-id",
			},
			headers: {
				"user-agent": "runtime-test",
			},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		const result = await ApiRouteRuntime.executeCustom({
			executionContext: createExecutionContext(request),
			metadata: {
				resource: {
					action: "custom.action",
					entity: RuntimeRouteEntity,
				},
				response: {
					serialization: {
						isEnabled: true,
					},
					status: HttpStatus.OK,
					type: RuntimeRouteResponseDTO,
				},
				route: {
					method: RequestMethod.POST,
					path: "custom",
				},
			},
			operation: async () => ({
				hidden: "should-not-serialize",
				id: request.body?.id,
				responseSource: "handler",
			}),
			runtimeProperties: {
				request: {
					[EApiControllerRequestTarget.BODY]: {
						transformers: [
							{
								key: "source",
								shouldSetValueEvenIfMissing: true,
								type: EApiControllerRequestTransformerType.STATIC,
								value: "api",
							},
						],
					},
				},
				response: {
					[EApiControllerResponseTarget.RESPONSE]: {
						transformers: [
							{
								key: "responseSource",
								type: EApiControllerRequestTransformerType.STATIC,
								value: "runtime",
							},
						],
					},
				},
			},
		});

		expect(request.body?.source).toBe("api");
		expect(result).toBeInstanceOf(RuntimeRouteResponseDTO);
		expect(result).toMatchObject({
			id: "custom-route-id",
			responseSource: "runtime",
		});
		expect(result).not.toHaveProperty("hidden");
	});

	it("transforms discriminated custom route request bodies to the selected DTO", async () => {
		const request = {
			body: {
				channel: "email",
				email: "user@example.com",
			},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		const result = await ApiRouteRuntime.executeCustom({
			executionContext: createExecutionContext(request),
			metadata: {
				resource: {
					action: "custom.discriminatedBody",
					entity: RuntimeRouteEntity,
				},
				response: {
					status: HttpStatus.OK,
					type: undefined,
				},
				route: {
					method: RequestMethod.POST,
					path: "custom",
				},
			},
			operation: async () => request.body,
			runtimeProperties: {
				dto: {
					body: {
						discriminator: {
							mapping: {
								email: RuntimeRouteEmailBodyDTO,
								phone: RuntimeRoutePhoneBodyDTO,
							},
							propertyName: "channel",
							shouldKeepDiscriminatorProperty: true,
						},
						type: [RuntimeRouteEmailBodyDTO, RuntimeRoutePhoneBodyDTO],
					},
				},
			},
		});

		expect(request.body).toBeInstanceOf(RuntimeRouteEmailBodyDTO);
		expect(result).toBeInstanceOf(RuntimeRouteEmailBodyDTO);
		expect(result).toMatchObject({
			channel: "email",
			email: "user@example.com",
		});
	});

	it("rejects invalid discriminated custom route request bodies", async () => {
		const request = {
			body: {
				channel: "sms",
				phone: "+10000000000",
			},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		let thrownError: unknown;

		try {
			await ApiRouteRuntime.executeCustom({
				executionContext: createExecutionContext(request),
				metadata: {
					resource: {
						action: "custom.discriminatedBody",
						entity: RuntimeRouteEntity,
					},
					response: {
						status: HttpStatus.OK,
						type: undefined,
					},
					route: {
						method: RequestMethod.POST,
						path: "custom",
					},
				},
				operation: async () => request.body,
				runtimeProperties: {
					dto: {
						body: {
							discriminator: {
								mapping: {
									email: RuntimeRouteEmailBodyDTO,
									phone: RuntimeRoutePhoneBodyDTO,
								},
								propertyName: "channel",
							},
							type: [RuntimeRouteEmailBodyDTO, RuntimeRoutePhoneBodyDTO],
						},
					},
				},
			});
		} catch (error) {
			thrownError = error;
		}

		const responseBody = (thrownError as { getResponse: () => { message?: Array<string> } }).getResponse();

		expect(thrownError).toMatchObject({
			status: 400,
		});
		expect(responseBody.message).toEqual([expect.stringContaining("channel has invalid discriminator value 'sms'")]);
	});

	it("passes configured validator options to selected discriminated custom route request DTO validation", async () => {
		const request = {
			body: {
				channel: "email",
			},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		const result = await ApiRouteRuntime.executeCustom({
			executionContext: createExecutionContext(request),
			metadata: {
				resource: {
					action: "custom.discriminatedBody",
					entity: RuntimeRouteEntity,
				},
				response: {
					status: HttpStatus.OK,
					type: undefined,
				},
				route: {
					method: RequestMethod.POST,
					path: "custom",
				},
			},
			operation: async () => request.body,
			runtimeProperties: {
				dto: {
					body: {
						discriminator: {
							mapping: {
								email: RuntimeRouteEmailBodyDTO,
								phone: RuntimeRoutePhoneBodyDTO,
							},
							propertyName: "channel",
						},
						type: [RuntimeRouteEmailBodyDTO, RuntimeRoutePhoneBodyDTO],
						validatorOptions: {
							skipMissingProperties: true,
						},
					},
				},
			},
		});

		expect(result).toBeInstanceOf(RuntimeRouteEmailBodyDTO);
		expect(result).toMatchObject({
			channel: "email",
		});
	});

	it("passes configured transform options to selected discriminated custom route request DTO transformation", async () => {
		const request = {
			body: {
				channel: "email",
				email: "user@example.com",
				hidden: "should-not-survive",
			},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		const result = await ApiRouteRuntime.executeCustom({
			executionContext: createExecutionContext(request),
			metadata: {
				resource: {
					action: "custom.discriminatedBody",
					entity: RuntimeRouteEntity,
				},
				response: {
					status: HttpStatus.OK,
					type: undefined,
				},
				route: {
					method: RequestMethod.POST,
					path: "custom",
				},
			},
			operation: async () => request.body,
			runtimeProperties: {
				dto: {
					body: {
						discriminator: {
							mapping: {
								email: RuntimeRouteExposedEmailBodyDTO,
								phone: RuntimeRouteExposedPhoneBodyDTO,
							},
							propertyName: "channel",
						},
						transformOptions: {
							// eslint-disable-next-line @elsikora/typescript/naming-convention
							excludeExtraneousValues: true,
						},
						type: [RuntimeRouteExposedEmailBodyDTO, RuntimeRouteExposedPhoneBodyDTO],
					},
				},
			},
		});

		expect(result).toBeInstanceOf(RuntimeRouteExposedEmailBodyDTO);
		expect(result).toMatchObject({
			channel: "email",
			email: "user@example.com",
		});
		expect(result).not.toHaveProperty("hidden");
	});

	it("serializes discriminated custom route responses with the selected DTO", async () => {
		const request = {
			body: {},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		const result = await ApiRouteRuntime.executeCustom({
			executionContext: createExecutionContext(request),
			metadata: {
				resource: {
					action: "custom.discriminatedResponse",
					entity: RuntimeRouteEntity,
				},
				response: {
					discriminator: {
						mapping: {
							session: RuntimeRouteSessionResponseDTO,
							verification: RuntimeRouteVerificationResponseDTO,
						},
						propertyName: "mode",
						shouldKeepDiscriminatorProperty: true,
					},
					serialization: {
						isEnabled: true,
					},
					status: HttpStatus.OK,
					type: [RuntimeRouteVerificationResponseDTO, RuntimeRouteSessionResponseDTO],
				},
				route: {
					method: RequestMethod.POST,
					path: "custom",
				},
			},
			operation: async () => ({
				hidden: "should-not-serialize",
				id: "response-1",
				mode: "session",
				sessionToken: "session-token",
				verificationToken: "wrong-token",
			}),
			runtimeProperties: {},
		});

		expect(result).toBeInstanceOf(RuntimeRouteSessionResponseDTO);
		expect(result).toMatchObject({
			id: "response-1",
			mode: "session",
			sessionToken: "session-token",
		});
		expect(result).not.toHaveProperty("hidden");
		expect(result).not.toHaveProperty("verificationToken");
	});

	it("rejects discriminated custom route responses outside the declared contract", async () => {
		const request = {
			body: {},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;

		await expect(
			ApiRouteRuntime.executeCustom({
				executionContext: createExecutionContext(request),
				metadata: {
					resource: {
						action: "custom.discriminatedResponse",
						entity: RuntimeRouteEntity,
					},
					response: {
						discriminator: {
							mapping: {
								session: RuntimeRouteSessionResponseDTO,
								verification: RuntimeRouteVerificationResponseDTO,
							},
							propertyName: "mode",
						},
						serialization: {
							isEnabled: true,
						},
						status: HttpStatus.OK,
						type: [RuntimeRouteVerificationResponseDTO, RuntimeRouteSessionResponseDTO],
					},
					route: {
						method: RequestMethod.POST,
						path: "custom",
					},
				},
				operation: async () => ({
					id: "response-1",
					sessionToken: "session-token",
				}),
				runtimeProperties: {},
			}),
		).rejects.toThrow("missing required discriminator field");
	});

	it("passes response relation load strategy to custom route response reload", async () => {
		const service = new ApiServiceBase<RuntimeRouteEntity>();
		const get = vi.spyOn(service, "get").mockResolvedValue({
			id: "response-1",
			source: {
				id: "source-1",
			} as never,
		});
		const controller = {
			service,
		};

		const result = await ApiRouteRuntime.executeCustomResponseRelations(
			controller as never,
			{
				relations: {
					response: {
						load: {
							include: {
								source: true,
							} as never,
							relationLoadStrategy: "query",
						},
						reference: {
							key: "id",
							shape: EApiControllerRelationReferenceShape.SCALAR,
						},
					},
				},
			} as never,
			{ id: "response-1" },
		);

		expect(get).toHaveBeenCalledWith({
			relations: {
				source: true,
			},
			relationLoadStrategy: "query",
			where: {
				id: "response-1",
			},
		});
		expect(result).toMatchObject({
			id: "response-1",
			source: {
				id: "source-1",
			},
		});
	});

	it("skips custom route request relation loading when body is absent", async () => {
		const ownerService = new ApiServiceBase<RuntimeRouteEntity>();
		const get = vi.spyOn(ownerService, "get");
		const controller = {
			ownerService,
		};

		await ApiRouteRuntime.executeCustomRequestRelations(
			controller as never,
			{
				resource: {
					action: "custom.absentBody",
					entity: RuntimeRouteEntity,
				},
				route: {
					method: RequestMethod.POST,
					path: "custom",
				},
			} as never,
			{
				relations: {
					request: {
						load: {
							include: {
								owner: true,
							} as never,
						},
						reference: {
							key: "id",
							shape: EApiControllerRelationReferenceShape.SCALAR,
						},
					},
				},
			} as never,
			undefined,
		);

		expect(get).not.toHaveBeenCalled();
	});

	it("skips custom route response reload when response include is empty", async () => {
		const service = new ApiServiceBase<RuntimeRouteEntity>();
		const get = vi.spyOn(service, "get");
		const controller = {
			service,
		};
		const response = { id: "response-1" };

		const result = await ApiRouteRuntime.executeCustomResponseRelations(
			controller as never,
			{
				relations: {
					response: {
						load: {
							include: {},
						},
						reference: {
							key: "id",
							shape: EApiControllerRelationReferenceShape.SCALAR,
						},
					},
				},
			} as never,
			response,
		);

		expect(get).not.toHaveBeenCalled();
		expect(result).toBe(response);
	});

	it("does not project or clone custom route responses when response include is empty", async () => {
		const request = {
			body: {},
			headers: {},
			ip: "127.0.0.1",
			params: {},
			query: {},
		} as IApiRouteRuntimeHttpRequest<RuntimeRouteEntity>;
		const firstItem = new RuntimeRouteEntity();
		firstItem.id = "response-1";
		const response = [firstItem];

		const result = await ApiRouteRuntime.executeCustom({
			executionContext: createExecutionContext(request),
			metadata: {
				resource: {
					action: "custom.emptyIncludeResponse",
					entity: RuntimeRouteEntity,
				},
				response: {
					status: HttpStatus.OK,
					type: undefined,
				},
				route: {
					method: RequestMethod.GET,
					path: "custom",
				},
			},
			operation: async () => response,
			runtimeProperties: {
				relations: {
					response: {
						load: {
							include: {},
						},
						reference: {
							key: "id",
							shape: EApiControllerRelationReferenceShape.SCALAR,
						},
					},
				},
			},
		});

		expect(result).toBe(response);
		expect(result[0]).toBe(firstItem);
		expect(result[0]).toBeInstanceOf(RuntimeRouteEntity);
	});

	it("projects non-empty response includes without cloning array items", () => {
		const firstItem = new RuntimeRouteEntity();
		firstItem.id = "response-1";
		firstItem.source = {
			id: "source-1",
		} as never;
		const response = [firstItem];

		const result = ApiRouteProjectRelationResponse(
			{
				load: {
					include: {
						source: true,
					} as never,
				},
				reference: {
					key: "id",
					shape: EApiControllerRelationReferenceShape.SCALAR,
				},
			},
			response,
		);

		expect(result).toBe(response);
		const projectedItem: RuntimeRouteEntity = result[0] as RuntimeRouteEntity;

		expect(projectedItem).toBe(firstItem);
		expect(projectedItem).toBeInstanceOf(RuntimeRouteEntity);
		expect(projectedItem.source).toBe("source-1");
	});

	it("projects non-empty response includes without cloning get-list items", () => {
		const firstItem = new RuntimeRouteEntity();
		firstItem.id = "response-1";
		firstItem.source = {
			id: "source-1",
		} as never;
		const response = {
			items: [firstItem],
		};

		const result = ApiRouteProjectRelationResponse(
			{
				load: {
					include: {
						source: true,
					} as never,
				},
				reference: {
					key: "id",
					shape: EApiControllerRelationReferenceShape.OBJECT,
				},
			},
			response,
		);

		expect(result).toBe(response);
		const projectedItem: RuntimeRouteEntity = result.items[0] as RuntimeRouteEntity;

		expect(projectedItem).toBe(firstItem);
		expect(projectedItem).toBeInstanceOf(RuntimeRouteEntity);
		expect(projectedItem.source).toEqual({ id: "source-1" });
	});

	it("throws configuration error when response relation reference is missing", () => {
		expect(() =>
			ApiRouteProjectRelationResponse(
				{
					load: {
						include: {
							source: true,
						} as never,
					},
				} as never,
				{ id: "response-1" },
			),
		).toThrow("Response relation reference config is required when relation loading is configured");
	});

	it("passes response relation load strategy to generated GET relation loading", async () => {
		const service = new ApiServiceBase<RuntimeRouteEntity>();
		const get = vi.spyOn(service, "get").mockImplementation(async (properties) => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

			return {
				id: "response-1",
			};
		});
		ApiControllerGeneratedFunctionCapability.mark(get, EApiFunctionType.GET, RuntimeRouteEntity);
		const controller = {
			service,
		};

		await ApiRouteRuntime.executeGenerated({
			controller: controller as never,
			entityMetadata: {
				columns: [
					{
						isPrimary: true,
						name: "id",
						type: "varchar",
					},
				],
				primaryKey: {
					isPrimary: true,
					name: "id",
					type: "varchar",
				},
				tableName: "runtime_route_entities",
			},
			method: EApiRouteType.GET,
			methodName: "get",
			properties: {
				entity: RuntimeRouteEntity,
				routes: {
					[EApiRouteType.GET]: {
						dto: {
							[EApiDtoType.RESPONSE]: RuntimeRouteResponseDTO,
						},
						relations: {
							response: {
								load: {
									include: {
										source: true,
									} as never,
									relationLoadStrategy: "query",
								},
								reference: {
									key: "id",
									shape: EApiControllerRelationReferenceShape.SCALAR,
								},
							},
						},
						response: {
							serialization: {
								isEnabled: false,
							},
						},
					},
				},
			},
			targets: {
				headers: {},
				ip: "127.0.0.1",
				parameters: {
					id: "response-1",
				},
			},
		});

		expect(get).toHaveBeenCalledWith({
			relationLoadStrategy: "query",
			relations: {
				source: true,
			},
			where: {
				id: "response-1",
			},
		});
	});

	it("passes a detached mutable authorization operator to generated GET persistence", async () => {
		const scopeOperator = In(["owner-a", "owner-b"]);
		const transformer: ValueTransformer = {
			from: (value: unknown): unknown => value,
			to: (value: unknown): unknown => `db:${String(value)}`,
		};
		const service = new ApiServiceBase<RuntimeRouteEntity>();
		const get = vi.spyOn(service, "get").mockImplementation(async (properties) => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
			const persistenceOperator = (properties.where as { ownerId: FindOperator<Array<string>> }).ownerId;

			expect(Object.isFrozen(persistenceOperator)).toBe(false);
			expect(() => persistenceOperator.transformValue(transformer)).not.toThrow();
			expect(persistenceOperator.value).toEqual(["db:owner-a", "db:owner-b"]);

			return { id: "response-1" };
		});
		ApiControllerGeneratedFunctionCapability.mark(get, EApiFunctionType.GET, RuntimeRouteEntity);

		await ApiRouteRuntime.executeGenerated({
			controller: { service } as never,
			entityMetadata: {
				columns: [{ isPrimary: true, name: "id", type: "varchar" }],
				primaryKey: { isPrimary: true, name: "id", type: "varchar" },
				tableName: "runtime_route_entities",
			},
			method: EApiRouteType.GET,
			methodName: "get",
			properties: {
				entity: RuntimeRouteEntity,
				routes: {
					[EApiRouteType.GET]: {
						dto: { [EApiDtoType.RESPONSE]: RuntimeRouteResponseDTO },
						response: { serialization: { isEnabled: false } },
					},
				},
			},
			targets: {
				authenticationRequest: {
					authorizationDecision: {
						scope: { where: { ownerId: scopeOperator } },
						transforms: [],
					} as never,
					user: {},
				},
				headers: {},
				ip: "127.0.0.1",
				parameters: { id: "response-1" },
			},
		});

		expect(get).toHaveBeenCalledOnce();
		expect(scopeOperator.value).toEqual(["owner-a", "owner-b"]);
	});

	it("passes response relation load strategy to generated GET_LIST relation loading", async () => {
		const service = new ApiServiceBase<RuntimeRouteEntity>();
		const getList = vi.spyOn(service, "getList").mockImplementation(async (properties) => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_LIST, properties);

			return {
				count: 0,
				currentPage: 1,
				items: [],
				totalCount: 0,
				totalPages: 0,
			};
		});
		ApiControllerGeneratedFunctionCapability.mark(getList, EApiFunctionType.GET_LIST, RuntimeRouteEntity);
		const controller = {
			service,
		};

		await ApiRouteRuntime.executeGenerated({
			controller: controller as never,
			entityMetadata: {
				columns: [],
				primaryKey: undefined,
				tableName: "runtime_route_entities",
			},
			method: EApiRouteType.GET_LIST,
			methodName: "getList",
			properties: {
				entity: RuntimeRouteEntity,
				routes: {
					[EApiRouteType.GET_LIST]: {
						dto: {
							[EApiDtoType.RESPONSE]: RuntimeRouteResponseDTO,
						},
						relations: {
							response: {
								load: {
									include: {
										source: true,
									} as never,
									relationLoadStrategy: "query",
								},
								reference: {
									key: "id",
									shape: EApiControllerRelationReferenceShape.SCALAR,
								},
							},
						},
						response: {
							serialization: {
								isEnabled: false,
							},
						},
					},
				},
			},
			targets: {
				headers: {},
				ip: "127.0.0.1",
				query: {
					limit: 10,
					page: 1,
				} as never,
			},
		});

		expect(getList).toHaveBeenCalledWith({
			relationLoadStrategy: "query",
			relations: {
				source: true,
			},
			skip: 0,
			take: 10,
			where: {},
		});
	});
});

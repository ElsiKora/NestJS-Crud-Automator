import type { IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { ExecutionContext } from "@nestjs/common";

import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";

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
});

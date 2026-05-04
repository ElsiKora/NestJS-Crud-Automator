import type { IApiRouteRuntimeHttpRequest } from "@interface/class/api/route";
import type { ExecutionContext } from "@nestjs/common";

import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { Expose } from "class-transformer";
import { describe, expect, it } from "vitest";

class RuntimeRouteEntity {
	public id?: string;
	public responseSource?: string;
	public source?: string;
}

class RuntimeRouteResponseDTO {
	@Expose()
	public id!: string;

	@Expose()
	public responseSource!: string;
}

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
});

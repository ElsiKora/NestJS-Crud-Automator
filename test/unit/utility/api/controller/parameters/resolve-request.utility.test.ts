import "reflect-metadata";

import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerParametersResolveRequest } from "@utility/api/controller/parameters";
import { describe, expect, it } from "vitest";

class ResolveRequestEntity {
	public id?: number;
}

class ResolveRequestDto {
	@ApiPropertyNumber({ description: "id", entity: ResolveRequestEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 100, minimum: 1, multipleOf: 1 })
	public id!: number;
}

const rule: IApiControllerParametersRule = { dto: ResolveRequestDto };

describe("ApiControllerParametersResolveRequest", () => {
	it("types the path values once per request and hands every reader a copy of the same values", async () => {
		const request: object = {};
		const first = await ApiControllerParametersResolveRequest<ResolveRequestEntity>(request, rule, { id: "16" as unknown as number });
		const second = await ApiControllerParametersResolveRequest<ResolveRequestEntity>(request, rule, { id: "not-parsed-again" as unknown as number });

		expect(first).toEqual({ id: 16 });
		expect(second).toEqual({ id: 16 });
		expect(second).not.toBe(first);
	});

	it("validates again for another request", async () => {
		await expect(ApiControllerParametersResolveRequest<ResolveRequestEntity>({}, rule, { id: "17" as unknown as number })).resolves.toEqual({ id: 17 });
		await expect(ApiControllerParametersResolveRequest<ResolveRequestEntity>({}, rule, { id: "017" as unknown as number })).rejects.toBeInstanceOf(BadRequestException);
	});

	it("returns the given values for a route without a path value rule", async () => {
		const parameters = { id: "raw" as unknown as number };

		await expect(ApiControllerParametersResolveRequest<ResolveRequestEntity>({}, undefined, parameters)).resolves.toBe(parameters);
	});
});

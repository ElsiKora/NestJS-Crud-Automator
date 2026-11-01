import type { IApiControllerProperties } from "@interface/decorator/api";

import { EErrorStringAction, EErrorStringCompositeAction } from "@enum/utility";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerValidateRequest } from "@utility/api/controller/validate-request.utility";
import { ErrorString } from "@utility/error/string.utility";
import { describe, expect, it } from "vitest";

class ValidateEntity {
	public id?: string;
}

const properties: IApiControllerProperties<ValidateEntity> = {
	entity: ValidateEntity,
	routes: {},
};

describe("ApiControllerValidateRequest", () => {
	it("passes when no validators are provided", async () => {
		await expect(ApiControllerValidateRequest(undefined, properties, { id: "1" })).resolves.toBeUndefined();
	});

	it("throws when a validator fails", async () => {
		const target = {
			validators: [
				{
					errorType: EErrorStringAction.DATA_NOT_VALID,
					exception: BadRequestException,
					validationFunction: () => false,
				},
			],
		};

		await expect(ApiControllerValidateRequest(target, properties, { id: "1" })).rejects.toBeInstanceOf(BadRequestException);
	});

	it("keeps a property-level code thrown from the validation function", async () => {
		const target = {
			validators: [
				{
					errorType: EErrorStringAction.BAD_REQUEST,
					exception: BadRequestException,
					validationFunction: () => {
						throw new BadRequestException(ErrorString({ entity: ValidateEntity, property: "id", type: EErrorStringCompositeAction.NOT_VALID }));
					},
				},
			],
		};

		await expect(ApiControllerValidateRequest(target, properties, { id: "1" })).rejects.toThrow("VALIDATEENTITY_ID_NOT_VALID");
	});
});

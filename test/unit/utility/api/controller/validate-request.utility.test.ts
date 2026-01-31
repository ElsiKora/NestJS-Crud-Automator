import type { IApiControllerProperties } from "@interface/decorator/api";

import { EErrorStringAction } from "@enum/utility";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerValidateRequest } from "@utility/api/controller/validate-request.utility";
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
		const validators = [
			{
				errorType: EErrorStringAction.INVALID_DATA,
				exception: BadRequestException,
				validationFunction: () => false,
			},
		];

		await expect(ApiControllerValidateRequest(validators, properties, { id: "1" })).rejects.toBeInstanceOf(BadRequestException);
	});
});

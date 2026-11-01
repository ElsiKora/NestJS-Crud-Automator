import "reflect-metadata";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ApiExtraModels, ApiProperty, ApiQuery } from "@nestjs/swagger";
import { describe, expect, it } from "vitest";

class SwaggerExtraModel {}

@ApiExtraModels(SwaggerExtraModel)
class SwaggerDecoratedController {
	@ApiQuery({ name: "search" })
	public getList(): void {}
}

class SwaggerDecoratedModel {
	@ApiProperty()
	public name!: string;
}

describe("SWAGGER_METADATA_CONSTANT", () => {
	it("reads the extra models stored by the public ApiExtraModels decorator", () => {
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, SwaggerDecoratedController)).toEqual([SwaggerExtraModel]);
	});

	it("reads the property metadata stored by the public ApiProperty decorator", () => {
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, SwaggerDecoratedModel.prototype, "name")).toBeDefined();
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, SwaggerDecoratedModel.prototype)).toEqual([":name"]);
	});

	it("reads the parameters stored by the public ApiQuery decorator", () => {
		const parameters: Array<{ in?: string; name?: string }> = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.PARAMETERS, SwaggerDecoratedController.prototype.getList) as Array<{ in?: string; name?: string }>;

		expect(parameters).toEqual([expect.objectContaining({ in: "query", name: "search" })]);
	});
});

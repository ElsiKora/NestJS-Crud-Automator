import type { IApiEntity } from "@interface/entity";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperationBoolean, EFilterOperationRelation } from "@enum/filter";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { DtoGenerateFilterDecorator } from "@utility/dto/generate/filter-decorator.utility";
import { describe, expect, it } from "vitest";

const entity: IApiEntity<{ name?: string }> = {
	columns: [],
	name: "FilterEntity",
	primaryKey: undefined,
	tableName: "filter_entities",
};

class FilterDto {
	@DtoGenerateFilterDecorator({ description: "flag", type: EApiPropertyDescribeType.BOOLEAN }, entity)
	public flag?: boolean;

	@DtoGenerateFilterDecorator({ description: "owner", type: EApiPropertyDescribeType.RELATION }, entity)
	public owner?: string;
}

describe("DtoGenerateFilterDecorator", () => {
	it("maps boolean properties to boolean filter enum", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, FilterDto.prototype, "flag");

		expect(metadata).toBeDefined();
		expect(metadata?.enum).toEqual(Object.values(EFilterOperationBoolean));
	});

	it("maps relation properties to relation filter enum", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, FilterDto.prototype, "owner");

		expect(metadata).toBeDefined();
		expect(metadata?.enum).toEqual(Object.values(EFilterOperationRelation));
	});
});

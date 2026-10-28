import type { IApiEntity } from "@interface/entity";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperation, EFilterOperationBoolean, EFilterOperationRelation, EFilterOperationUuid } from "@enum/filter";
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

	@DtoGenerateFilterDecorator({ description: "external id", type: EApiPropertyDescribeType.UUID }, entity)
	public externalId?: string;

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

	it("maps uuid properties to a uuid filter enum with membership operators", () => {
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, FilterDto.prototype, "externalId");

		expect(metadata?.enum).toEqual(Object.values(EFilterOperationUuid));
		expect(metadata?.enum).toEqual(expect.arrayContaining([EFilterOperation.IN, EFilterOperation.NOTIN]));
	});
});

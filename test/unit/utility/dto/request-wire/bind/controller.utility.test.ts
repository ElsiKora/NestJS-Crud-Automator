import "reflect-metadata";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { DtoRequestWireBindController } from "@utility/dto/request-wire/bind";
import { plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";

class RequestWireRouteEntity {}

const COUNT_OPTIONS = { description: "count", entity: RequestWireRouteEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: false, maximum: 100, minimum: 0, multipleOf: 1 } as const;

class RouteBodyDto {
	@ApiPropertyNumber(COUNT_OPTIONS)
	public count?: number;
}

class RouteQueryDto {
	@ApiPropertyNumber(COUNT_OPTIONS)
	public count?: number;
}

class RouteParametersDto {
	@ApiPropertyNumber(COUNT_OPTIONS)
	public count?: number;
}

class RouteKeyedQueryDto {
	@ApiPropertyNumber(COUNT_OPTIONS)
	public count?: number;
}

class RouteInheritedQueryDto {
	@ApiPropertyNumber(COUNT_OPTIONS)
	public count?: number;
}

@Controller("base")
class RouteBaseController {
	@Get("inherited")
	public inherited(@Query() _query: RouteInheritedQueryDto): void {}
}

@Controller("plain")
class RoutePlainController extends RouteBaseController {
	@Post(":count")
	public create(@Param() _parameters: RouteParametersDto, @Query("filter") _filter: RouteKeyedQueryDto, @Body() _body: RouteBodyDto): void {}

	@Get()
	public list(@Query() _query: RouteQueryDto): void {}
}

@Controller("shared")
class RouteSharedController {
	@Post()
	public create(@Body() _body: RouteQueryDto): void {}
}

describe("DtoRequestWireBindController", () => {
	it("binds the DTO of each body, query and path argument of a plain Nest controller, inherited handlers and keyed arguments included", () => {
		DtoRequestWireBindController(RoutePlainController);

		expect(plainToInstance(RouteQueryDto, { count: "5" }).count).toBe(5);
		expect(plainToInstance(RouteKeyedQueryDto, { count: "5" }).count).toBe(5);
		expect(plainToInstance(RouteParametersDto, { count: "5" }).count).toBe(5);
		expect(plainToInstance(RouteInheritedQueryDto, { count: "5" }).count).toBe(5);
		expect(plainToInstance(RouteBodyDto, { count: "5" }).count).toBe("5");
	});

	it("fails when another controller reads a query DTO from a JSON body, naming both routes", () => {
		DtoRequestWireBindController(RoutePlainController);

		expect(() => {
			DtoRequestWireBindController(RouteSharedController);
		}).toThrow("DTO RouteQueryDto is read from text in the query of route list in controller RoutePlainController and from a JSON body in the body of route create in controller RouteSharedController");
	});
});

import "reflect-metadata";

import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { Exclude, Expose, instanceToPlain, plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";

class ExposeOrderEntity {}

class ExposeOrderChildDto {}

type TDecoratorOptions = Record<string, unknown>;
type TDecoratorFactory = (options: never) => PropertyDecorator;
type TDtoInstance = { value?: unknown };

const SHARED_OPTIONS: TDecoratorOptions = { description: "value", entity: ExposeOrderEntity };

const DECORATORS: Array<[string, TDecoratorFactory, TDecoratorOptions, unknown]> = [
	["ApiPropertyBoolean", ApiPropertyBoolean, {}, true],
	["ApiPropertyDate", ApiPropertyDate, { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE }, new Date(0)],
	["ApiPropertyEnum", ApiPropertyEnum, { enum: { ACTIVE: "active" }, enumName: "ExposeOrderStatus" }, "active"],
	["ApiPropertyNumber", ApiPropertyNumber, { exampleValue: 2, format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 1, multipleOf: 1 }, 2],
	["ApiPropertyObject", ApiPropertyObject, { type: ExposeOrderChildDto }, {}],
	["ApiPropertyString", ApiPropertyString, { exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/" }, "first"],
	["ApiPropertyUUID", ApiPropertyUUID, {}, "6f1b0c7e-5c3b-4c0a-8a1a-0d6f3e2b1a11"],
];

// The decorator written lower in the source runs first, so `@Expose` below `@ApiProperty*` runs before it.
const ORDERS: Array<[string, boolean]> = [
	["@Expose above @ApiProperty*", false],
	["@Expose below @ApiProperty*", true],
];

const MODES: Array<[string, TDecoratorOptions]> = [
	["a neutral property", { isRequired: true }],
	["a response property", { isResponse: true }],
	["a response property with isExpose true", { isExpose: true, isResponse: true }],
];

const buildDto = (decorators: Array<PropertyDecorator>): new () => TDtoInstance => {
	class Dto {
		public value?: unknown;
	}

	for (const decorator of decorators) {
		decorator(Dto.prototype, "value");
	}

	return Dto;
};

const flushDeferredDecorators = async (): Promise<void> => {
	await Promise.resolve();
	await new Promise((resolve: (value: unknown) => void) => {
		setTimeout(resolve, 0);
	});
};

describe.each(DECORATORS)("%s and @Expose", (_name: string, factory: TDecoratorFactory, specificOptions: TDecoratorOptions, value: unknown) => {
	const apiProperty = (options: TDecoratorOptions): PropertyDecorator => Reflect.apply(factory, undefined, [{ ...SHARED_OPTIONS, ...specificOptions, ...options }]);

	describe.each(MODES)("on %s", (_mode: string, modeOptions: TDecoratorOptions) => {
		it.each(ORDERS)("keeps the name with %s", (_order: string, isExplicitFirst: boolean) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Expose({ name: "wire" })];
			const Dto: new () => TDtoInstance = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);
			const instance: TDtoInstance = Object.assign(new Dto(), { value });

			expect(Object.keys(instanceToPlain(instance))).toEqual(["wire"]);
			expect(plainToInstance(Dto, { value: "ignored", wire: value }, { excludeExtraneousValues: true }).value).toBeDefined();
			expect(plainToInstance(Dto, { value }, { excludeExtraneousValues: true }).value).toBeUndefined();
		});

		it.each(ORDERS)("keeps every other option with %s", (_order: string, isExplicitFirst: boolean) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Expose({ groups: ["admin"] })];
			const Dto: new () => TDtoInstance = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);
			const instance: TDtoInstance = Object.assign(new Dto(), { value });

			expect(instanceToPlain(instance, { groups: ["admin"] })).toHaveProperty("value");
			expect(instanceToPlain(instance, { groups: ["other"] })).not.toHaveProperty("value");
		});

		it.each(ORDERS)("keeps the name with %s and an entity that resolves later", async (_order: string, isExplicitFirst: boolean) => {
			let entity: typeof ExposeOrderEntity | undefined;
			const decorators: Array<PropertyDecorator> = [apiProperty({ ...modeOptions, entity: () => entity }), Expose({ name: "wire" })];
			const Dto: new () => TDtoInstance = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);

			entity = ExposeOrderEntity;
			await flushDeferredDecorators();

			expect(Object.keys(instanceToPlain(Object.assign(new Dto(), { value })))).toEqual(["wire"]);
		});

		it("exposes a property without an explicit @Expose under its own name", () => {
			const Dto: new () => TDtoInstance = buildDto([apiProperty(modeOptions)]);

			expect(plainToInstance(Dto, { value }, { excludeExtraneousValues: true }).value).toBeDefined();
		});

		it.each(ORDERS)("lets @Exclude win with %s", (_order: string, isExplicitFirst: boolean) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Exclude()];
			const Dto: new () => TDtoInstance = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);

			expect(instanceToPlain(Object.assign(new Dto(), { value }))).toEqual({});
		});
	});

	it.each(ORDERS)("lets isExpose false win over a name with %s", (_order: string, isExplicitFirst: boolean) => {
		const decorators: Array<PropertyDecorator> = [apiProperty({ isExpose: false, isResponse: true }), Expose({ name: "wire" })];
		const Dto: new () => TDtoInstance = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);

		expect(instanceToPlain(Object.assign(new Dto(), { value }))).toEqual({});
	});

	it("keeps a name its parent class declares when the child redeclares the property", () => {
		class ParentDto {
			@Expose({ name: "wire" })
			public value?: unknown;
		}

		class ChildDto extends ParentDto {}

		apiProperty({ isRequired: true })(ChildDto.prototype, "value");

		expect(Object.keys(instanceToPlain(Object.assign(new ChildDto(), { value })))).toEqual(["wire"]);
	});

	it.each(ORDERS)("lets a child class rename a property its parent exposes through the decorator with %s", (_order: string, isExplicitFirst: boolean) => {
		class ParentDto {
			public value?: unknown;
		}

		apiProperty({ isRequired: true })(ParentDto.prototype, "value");

		class ChildDto extends ParentDto {}

		const decorators: Array<PropertyDecorator> = [apiProperty({ isRequired: true }), Expose({ name: "wire" })];

		for (const decorator of isExplicitFirst ? decorators.toReversed() : decorators) {
			decorator(ChildDto.prototype, "value");
		}

		expect(Object.keys(instanceToPlain(Object.assign(new ChildDto(), { value })))).toEqual(["wire"]);
		expect(Object.keys(instanceToPlain(Object.assign(new ParentDto(), { value })))).toEqual(["value"]);
	});
});

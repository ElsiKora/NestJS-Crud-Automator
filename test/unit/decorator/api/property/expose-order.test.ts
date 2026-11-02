import "reflect-metadata";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { Exclude, Expose, instanceToPlain, plainToInstance } from "class-transformer";
import { describe, expect, it, vi } from "vitest";

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

// Indexes into [@ApiProperty*, @Exclude, @Expose] in the order they run.
const DECORATOR_ORDERS: Array<[string, Array<number>]> = [
	["property, exclude, expose", [0, 1, 2]],
	["property, expose, exclude", [0, 2, 1]],
	["exclude, property, expose", [1, 0, 2]],
	["exclude, expose, property", [1, 2, 0]],
	["expose, property, exclude", [2, 0, 1]],
	["expose, exclude, property", [2, 1, 0]],
];

const EXCLUDE_REFUSAL: RegExp = /Cannot combine a named @Expose with @Exclude or isExpose: false on '\w+\.value': class-transformer still reads the exposed name from a plain object into the excluded property\. Remove one of them, or limit the exclude with @Exclude\(\{ toPlainOnly: true \}\)$/;

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

const buildNamedDto = (name: string, decorators: Array<PropertyDecorator>): new () => TDtoInstance => {
	const Dto: new () => TDtoInstance = { [name]: class {} }[name] as new () => TDtoInstance;

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

// The refusal waits for the other decorators of the property, so it runs in a microtask; collecting those keeps its error inside the test.
const runWithDeferredDecorators = (decorate: () => void): void => {
	const deferred: Array<() => void> = [];
	const queueSpy = vi.spyOn(globalThis, "queueMicrotask").mockImplementation((handler: () => void): void => {
		deferred.push(handler);
	});

	try {
		decorate();

		for (let handler: (() => void) | undefined = deferred.shift(); handler; handler = deferred.shift()) {
			handler();
		}
	} finally {
		queueSpy.mockRestore();
	}
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

		it.each(ORDERS)("refuses the property key in a plain request object in either key order, also with exposeUnsetFields off, with %s", (_order: string, isExplicitFirst: boolean) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Expose({ name: "wire" })];
			let Dto: (new () => TDtoInstance) | undefined;

			runWithDeferredDecorators(() => {
				Dto = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);
			});

			if (!Dto) {
				throw new Error("The DTO was not built");
			}

			const BuiltDto: new () => TDtoInstance = Dto;

			for (const exposeUnsetFields of [true, false]) {
				expect(() => plainToInstance(BuiltDto, { value }, { exposeUnsetFields })).toThrow(ApiRequestValidationException);
				expect(() => plainToInstance(BuiltDto, { value, wire: value }, { exposeUnsetFields })).toThrow(ApiRequestValidationException);
				expect(() => plainToInstance(BuiltDto, { value, wire: value }, { excludeExtraneousValues: true, exposeUnsetFields })).toThrow(ApiRequestValidationException);
				expect(() => plainToInstance(BuiltDto, { wire: value, value }, { exposeUnsetFields })).toThrow(ApiRequestValidationException);
				expect(() => plainToInstance(BuiltDto, Object.assign(Object.create(null) as object, { value, wire: value }), { exposeUnsetFields })).toThrow(ApiRequestValidationException);
				expect(() => plainToInstance(BuiltDto, Object.assign(Object.create(Object.create(null) as object) as object, { value }), { exposeUnsetFields })).toThrow(ApiRequestValidationException);
				expect(plainToInstance(BuiltDto, { wire: value }, { exposeUnsetFields }).value).toBeDefined();
			}
		});

		it.each(ORDERS)("reads only the exposed name of a class instance, also with exposeUnsetFields off, with %s", (_order: string, isExplicitFirst: boolean) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Expose({ name: "wire" })];
			let Dto: (new () => TDtoInstance) | undefined;

			runWithDeferredDecorators(() => {
				Dto = buildDto(isExplicitFirst ? decorators.toReversed() : decorators);
			});

			if (!Dto) {
				throw new Error("The DTO was not built");
			}

			class Row {
				public value: unknown = value;
			}

			expect(plainToInstance(Dto, new Row(), { exposeUnsetFields: false }).value).toBeUndefined();
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

describe.each(DECORATORS)("%s with a named @Expose next to an exclude", (_name: string, factory: TDecoratorFactory, specificOptions: TDecoratorOptions, value: unknown) => {
	const apiProperty = (options: TDecoratorOptions): PropertyDecorator => Reflect.apply(factory, undefined, [{ ...SHARED_OPTIONS, ...specificOptions, ...options }]);
	const REFUSAL_MODES: Array<[string, TDecoratorOptions]> = [...MODES, ["a request property", { isRequired: true, isResponse: false }], ["a property with an entity factory", { entity: () => ExposeOrderEntity, isRequired: true }]];

	describe.each(REFUSAL_MODES)("on %s", (_mode: string, modeOptions: TDecoratorOptions) => {
		it.each(DECORATOR_ORDERS)("refuses @Exclude with the decorators in order %s", (_order: string, order: Array<number>) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Exclude(), Expose({ name: "wire" })];

			expect(() => {
				runWithDeferredDecorators(() => {
					buildNamedDto(
						"RefusedDto",
						order.flatMap((index: number): Array<PropertyDecorator> => decorators.slice(index, index + 1)),
					);
				});
			}).toThrow(EXCLUDE_REFUSAL);
		});

		it("refuses @Exclude when the name is inherited", () => {
			class ParentDto {
				@Expose({ name: "wire" })
				public value?: unknown;
			}

			class RefusedDto extends ParentDto {}

			expect(() => {
				runWithDeferredDecorators(() => {
					apiProperty(modeOptions)(RefusedDto.prototype, "value");
					Exclude()(RefusedDto.prototype, "value");
				});
			}).toThrow(EXCLUDE_REFUSAL);
		});

		it("refuses a name next to an inherited @Exclude", () => {
			class ParentDto {
				@Exclude()
				public value?: unknown;
			}

			class RefusedDto extends ParentDto {}

			expect(() => {
				runWithDeferredDecorators(() => {
					apiProperty(modeOptions)(RefusedDto.prototype, "value");
					Expose({ name: "wire" })(RefusedDto.prototype, "value");
				});
			}).toThrow(EXCLUDE_REFUSAL);
		});

		it("refuses @Exclude with toClassOnly, which leaves the exposed name readable the same way", () => {
			expect(() => {
				runWithDeferredDecorators(() => {
					buildNamedDto("RefusedDto", [apiProperty(modeOptions), Exclude({ toClassOnly: true }), Expose({ name: "wire" })]);
				});
			}).toThrow(EXCLUDE_REFUSAL);
		});

		it.each(ORDERS)("allows @Exclude with toPlainOnly with %s", (_order: string, isExplicitFirst: boolean) => {
			const decorators: Array<PropertyDecorator> = [apiProperty(modeOptions), Exclude({ toPlainOnly: true }), Expose({ name: "wire" })];
			let Dto: new () => TDtoInstance = buildNamedDto("AllowedDto", []);

			runWithDeferredDecorators(() => {
				Dto = buildNamedDto("AllowedDto", isExplicitFirst ? decorators.toReversed() : decorators);
			});

			expect(instanceToPlain(Object.assign(new Dto(), { value }))).toEqual({});
			expect(plainToInstance(Dto, { wire: value }).value).toBeDefined();
		});

		it("allows @Exclude next to an @Expose without a name", () => {
			let Dto: new () => TDtoInstance = buildNamedDto("AllowedDto", []);

			runWithDeferredDecorators(() => {
				Dto = buildNamedDto("AllowedDto", [apiProperty(modeOptions), Exclude(), Expose({ groups: ["admin"] })]);
			});

			expect(instanceToPlain(Object.assign(new Dto(), { value }), { groups: ["admin"] })).toEqual({});
			expect(plainToInstance(Dto, { value }).value).toBeUndefined();
		});

		it("allows a name under a class-level @Exclude", () => {
			@Exclude()
			class AllowedDto {
				public value?: unknown;
			}

			runWithDeferredDecorators(() => {
				apiProperty(modeOptions)(AllowedDto.prototype, "value");
				Expose({ name: "wire" })(AllowedDto.prototype, "value");
			});

			expect(Object.keys(instanceToPlain(Object.assign(new AllowedDto(), { value })))).toEqual(["wire"]);
		});
	});

	it.each(ORDERS)("refuses isExpose false with %s", (_order: string, isExplicitFirst: boolean) => {
		const decorators: Array<PropertyDecorator> = [apiProperty({ isExpose: false, isResponse: true }), Expose({ name: "wire" })];

		expect(() => {
			runWithDeferredDecorators(() => {
				buildNamedDto("RefusedDto", isExplicitFirst ? decorators.toReversed() : decorators);
			});
		}).toThrow(EXCLUDE_REFUSAL);
	});

	it("refuses isExpose false when the name is inherited", () => {
		class ParentDto {
			@Expose({ name: "wire" })
			public value?: unknown;
		}

		class RefusedDto extends ParentDto {}

		expect(() => {
			runWithDeferredDecorators(() => {
				apiProperty({ isExpose: false, isResponse: true })(RefusedDto.prototype, "value");
			});
		}).toThrow(EXCLUDE_REFUSAL);
	});

	it("excludes a property given isExpose false without isResponse, which only JavaScript can pass", () => {
		const Dto: new () => TDtoInstance = buildDto([apiProperty({ isExpose: false })]);

		expect(instanceToPlain(Object.assign(new Dto(), { value }))).toEqual({});
		expect(plainToInstance(Dto, { value }).value).toBeUndefined();
	});

	it("refuses isExpose false without isResponse next to a name", () => {
		expect(() => {
			runWithDeferredDecorators(() => {
				buildNamedDto("RefusedDto", [apiProperty({ isExpose: false }), Expose({ name: "wire" })]);
			});
		}).toThrow(EXCLUDE_REFUSAL);
	});
});

describe.each(DECORATORS)("%s renamed in a parent class whose property key a child class exposes", (_name: string, factory: TDecoratorFactory, specificOptions: TDecoratorOptions, value: unknown) => {
	const apiProperty = (options: TDecoratorOptions): PropertyDecorator => Reflect.apply(factory, undefined, [{ ...SHARED_OPTIONS, ...specificOptions, ...options }]);
	const KEY_REFUSAL: RegExp = /Cannot expose 'ChildDto\.other' under 'value', the property key of 'ParentDto\.value', which is exposed as 'wire': the check of a request reads that key on every class that inherits 'ParentDto\.value' and cannot tell which class is converted\. Rename one of them$/;

	const buildParentDto = (): new () => TDtoInstance => {
		class ParentDto {
			public value?: unknown;
		}

		apiProperty({ isRequired: true })(ParentDto.prototype, "value");
		Expose({ name: "wire" })(ParentDto.prototype, "value");

		return ParentDto;
	};

	const buildChildDto = (ParentDto: new () => TDtoInstance): new () => TDtoInstance & { other?: unknown } => {
		class ChildDto extends ParentDto {
			public other?: unknown;
		}

		Expose({ name: "value" })(ChildDto.prototype, "other");

		return ChildDto;
	};

	it("refuses at decoration a child class defined before the deferred check of the parent runs", () => {
		expect(() => {
			runWithDeferredDecorators(() => {
				buildChildDto(buildParentDto());
			});
		}).toThrow(KEY_REFUSAL);
	});

	it("refuses at the first conversion a child class defined after the parent was decorated, for the child and the parent", () => {
		let ParentDto: (new () => TDtoInstance) | undefined;

		runWithDeferredDecorators(() => {
			ParentDto = buildParentDto();
		});

		if (!ParentDto) {
			throw new Error("The DTO was not built");
		}

		const BuiltParentDto: new () => TDtoInstance = ParentDto;
		const ChildDto: new () => TDtoInstance = buildChildDto(BuiltParentDto);

		expect(() => plainToInstance(ChildDto, { value })).toThrow(KEY_REFUSAL);
		expect(() => plainToInstance(BuiltParentDto, { value, wire: value })).toThrow(KEY_REFUSAL);
		expect(plainToInstance(BuiltParentDto, { wire: value }).value).toBeDefined();
	});

	it("keeps a property key the parent itself exposes another property under", () => {
		let ParentDto: (new () => TDtoInstance & { other?: unknown }) | undefined;

		runWithDeferredDecorators(() => {
			class SwapDto {
				public other?: unknown;

				public value?: unknown;
			}

			apiProperty({ isRequired: true })(SwapDto.prototype, "value");
			Expose({ name: "wire" })(SwapDto.prototype, "value");
			Expose({ name: "value" })(SwapDto.prototype, "other");
			ParentDto = SwapDto;
		});

		if (!ParentDto) {
			throw new Error("The DTO was not built");
		}

		const instance: TDtoInstance & { other?: unknown } = plainToInstance(ParentDto, { value: "other", wire: value });

		expect(instance.other).toBe("other");
		expect(instance.value).toBeDefined();
	});
});

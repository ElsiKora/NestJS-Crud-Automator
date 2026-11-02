import "reflect-metadata";

import { ApiPropertyDate } from "@decorator/api/property/date.decorator";
import { EApiPropertyDateIdentifier, EApiPropertyDateType } from "@enum/decorator/api";
import { ValidationPipe } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { afterEach, describe, expect, it } from "vitest";

class DateEntity {}

class DateDto {
	@ApiPropertyDate({
		description: "createdAt",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.CREATED_AT,
		isRequired: true,
	})
	public createdAt!: Date;
}

class DateArrayDto {
	@ApiPropertyDate({
		description: "dates",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE,
		identifier: EApiPropertyDateIdentifier.DATE,
		isArray: true,
		isRequired: true,
		isUniqueItems: true,
		maxItems: 3,
		minItems: 2,
	})
	public dates!: Date[];
}

class DateOptionalArrayDto {
	@ApiPropertyDate({
		description: "dates",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE,
		identifier: EApiPropertyDateIdentifier.DATE,
		isArray: true,
		isRequired: false,
		isUniqueItems: false,
		maxItems: 3,
		minItems: 1,
	})
	public dates?: Date[];
}

class CalendarDateDto {
	@ApiPropertyDate({
		description: "happensOn",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE,
		identifier: EApiPropertyDateIdentifier.DATE,
		isNullable: true,
		isRequired: true,
	})
	public happensOn!: null | string;
}

class TimeDto {
	@ApiPropertyDate({
		description: "opensAt",
		entity: DateEntity,
		format: EApiPropertyDateType.TIME,
		identifier: EApiPropertyDateIdentifier.DATE,
		isRequired: false,
	})
	public opensAt?: string;
}

class TimeArrayDto {
	@ApiPropertyDate({
		description: "slots",
		entity: DateEntity,
		format: EApiPropertyDateType.TIME,
		identifier: EApiPropertyDateIdentifier.DATE,
		isArray: true,
		isRequired: true,
		isUniqueItems: false,
		maxItems: 3,
		minItems: 1,
	})
	public slots!: Array<string>;
}

class DateResponseDto {
	@ApiPropertyDate({
		description: "updatedAt",
		entity: DateEntity,
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.UPDATED_AT,
		isResponse: true,
	})
	public updatedAt!: string;
}

describe("ApiPropertyDate", () => {
	it("writes swagger options for date formats", () => {
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, DateDto.prototype, "createdAt");

		expect(metadata?.format).toBe(EApiPropertyDateType.DATE_TIME);
		expect(metadata?.pattern).toBe(String.raw`^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$`);
		expect(metadata?.description).toBe("DateEntity creation date");
		expect(metadata?.minLength).toBe(metadata?.maxLength);
	});

	it("transforms ISO strings to Date instances and validates them", () => {
		const instance = plainToInstance(DateDto, { createdAt: "2025-01-01T00:00:00.000Z" });

		expect(instance.createdAt).toBeInstanceOf(Date);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("validates invalid date values", () => {
		const instance = plainToInstance(DateDto, { createdAt: "not-a-date" });
		const errors = validateSync(instance);

		expect(errors[0]?.constraints).toEqual({ isDateFormatValue: "createdAt must be in YYYY-MM-DDTHH:mm:ss.sssZ format" });
	});

	it("validates array size constraints", () => {
		const errors = validateSync(plainToInstance(DateArrayDto, { dates: [] }));

		expect(errors[0]?.constraints?.arrayMinSize).toBeDefined();
		expect(errors[0]?.constraints?.arrayNotEmpty).toBeDefined();
	});

	it("keeps optional date arrays undefined when missing", () => {
		const instance = plainToInstance(DateOptionalArrayDto, {});
		const errors = validateSync(instance);

		expect(instance.dates).toBeUndefined();
		expect(errors).toHaveLength(0);
	});

	it("skips request validation for response DTOs", () => {
		const instance = plainToInstance(DateResponseDto, { updatedAt: "not-a-date" });

		expect(typeof instance.updatedAt).toBe("string");
		expect(validateSync(instance, { forbidUnknownValues: false })).toHaveLength(0);
	});

	describe("request values in the published form", () => {
		const originalTimeZone: string | undefined = process.env.TZ;

		afterEach(() => {
			process.env.TZ = originalTimeZone;
		});

		it.each(["America/New_York", "Asia/Kolkata", "UTC"])("keeps a DATE value as calendar text in %s", (timeZone: string) => {
			process.env.TZ = timeZone;

			const instance = plainToInstance(CalendarDateDto, { happensOn: "2026-03-01" });

			expect(instance.happensOn).toBe("2026-03-01");
			expect(validateSync(instance)).toHaveLength(0);
		});

		it("keeps a null DATE value on a nullable property", () => {
			const instance = plainToInstance(CalendarDateDto, { happensOn: null });

			expect(instance.happensOn).toBeNull();
			expect(validateSync(instance)).toHaveLength(0);
		});

		it.each(["2026-02-30", "2026-13-01", "2026-03-01T00:00:00.000Z", "20260301", "2026-3-1", "Mar 1 2026", "", "0000-01-01", "10000-01-01", 20_260_301, true, {}, [["2026-03-01"]]])("rejects %j as a DATE value without converting it", (value: unknown) => {
			const instance = plainToInstance(CalendarDateDto, { happensOn: value });

			expect(instance.happensOn).toEqual(value);
			expect(validateSync(instance).map((error) => error.constraints)).toEqual([{ isDateFormatValue: "happensOn must be in YYYY-MM-DD format" }]);
		});

		it.each(["America/New_York", "Asia/Kolkata"])("parses a DATE_TIME value to the same instant in %s", (timeZone: string) => {
			process.env.TZ = timeZone;

			const instance = plainToInstance(DateDto, { createdAt: "2026-03-01T12:34:56.789Z" });

			expect(instance.createdAt).toBeInstanceOf(Date);
			expect(instance.createdAt.toISOString()).toBe("2026-03-01T12:34:56.789Z");
			expect(validateSync(instance)).toHaveLength(0);
		});

		it.each(["2026-03-01T12:34:56Z", "2026-03-01T12:34:56.789+01:00", "2026-03-01T12:34:56.789", "2026-03-01", "2026-02-30T12:00:00.000Z", "2026-03-01T24:00:00.000Z", "2026-03-01T12:34:56X789Z", "March 1 2026", "1", "", "0000-01-01T00:00:00.000Z", "10000-01-01T00:00:00.000Z", 0, 1_772_368_496_789, [["2026-03-01T12:34:56.789Z"]]])("rejects %j as a DATE_TIME value without converting it", (value: unknown) => {
			const instance = plainToInstance(DateDto, { createdAt: value });

			expect(instance.createdAt).toEqual(value);
			expect(validateSync(instance).map((error) => error.constraints)).toEqual([{ isDateFormatValue: "createdAt must be in YYYY-MM-DDTHH:mm:ss.sssZ format" }]);
		});

		it.each(["00:00:00", "09:30:00", "23:59:59"])("keeps the TIME value %s as text", (value: string) => {
			const instance = plainToInstance(TimeDto, { opensAt: value });

			expect(instance.opensAt).toBe(value);
			expect(validateSync(instance)).toHaveLength(0);
		});

		it("keeps an absent optional TIME value absent", () => {
			const instance = plainToInstance(TimeDto, {});

			expect(instance.opensAt).toBeUndefined();
			expect(validateSync(instance)).toHaveLength(0);
		});

		it.each(["24:00:00", "12:60:00", "12:30:60", "9:30:00", "09:30", "09:30:00.000", "09:30:00Z", "2026-03-01T09:30:00.000Z", "", 930, [["09:30:00"]]])("rejects %j as a TIME value without converting it", (value: unknown) => {
			const instance = plainToInstance(TimeDto, { opensAt: value });

			expect(instance.opensAt).toEqual(value);
			expect(validateSync(instance).map((error) => error.constraints)).toEqual([{ isDateFormatValue: "opensAt must be in HH:mm:ss format" }]);
		});

		it("checks each value of a TIME array as text", () => {
			const accepted = plainToInstance(TimeArrayDto, { slots: ["09:30:00", "18:00:00"] });
			const rejected = plainToInstance(TimeArrayDto, { slots: ["09:30:00", "24:00:00"] });

			expect(accepted.slots).toEqual(["09:30:00", "18:00:00"]);
			expect(validateSync(accepted)).toHaveLength(0);
			expect(rejected.slots).toEqual(["09:30:00", "24:00:00"]);
			expect(validateSync(rejected).map((error) => error.constraints)).toEqual([{ isDateFormatValue: "each value in slots must be in HH:mm:ss format" }]);
		});

		it("parses each value of a DATE_TIME array and wraps a single value", () => {
			class InstantArrayDto {
				@ApiPropertyDate({
					description: "instants",
					entity: DateEntity,
					format: EApiPropertyDateType.DATE_TIME,
					identifier: EApiPropertyDateIdentifier.DATE,
					isArray: true,
					isRequired: true,
					isUniqueItems: false,
					maxItems: 3,
					minItems: 1,
				})
				public instants!: Array<Date>;
			}

			const instance = plainToInstance(InstantArrayDto, { instants: "2026-03-01T00:00:00.000Z" });

			expect(instance.instants.map((value: Date): string => value.toISOString())).toEqual(["2026-03-01T00:00:00.000Z"]);
			expect(validateSync(instance)).toHaveLength(0);
		});
	});

	it("throws on invalid array options", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyDate({
				description: "dates",
				entity: DateEntity,
				format: EApiPropertyDateType.DATE,
				identifier: EApiPropertyDateIdentifier.DATE,
				isArray: true,
				isRequired: true,
				isUniqueItems: true,
				maxItems: 1,
				minItems: 2,
			});

			decorator({}, "dates");
		};

		expect(applyDecorator).toThrow("ApiPropertyDate error: Property 'Object.dates': 'minItems' is greater than 'maxItems'");
	});
});

describe("ApiPropertyDate under a ValidationPipe with implicit conversion", () => {
	// Vitest does not emit decorator metadata, so each property declares the design type a TypeScript build emits for `Date`.
	class ImplicitInstantDto {
		@Reflect.metadata("design:type", Date)
		@ApiPropertyDate({ description: "startsAt", entity: DateEntity, format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, isRequired: true })
		public startsAt!: Date;
	}

	class ImplicitCalendarDto {
		@Reflect.metadata("design:type", Date)
		@ApiPropertyDate({ description: "happensOn", entity: DateEntity, format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, isRequired: true })
		public happensOn!: Date;

		@Reflect.metadata("design:type", Date)
		@ApiPropertyDate({ description: "opensAt", entity: DateEntity, format: EApiPropertyDateType.TIME, identifier: EApiPropertyDateIdentifier.DATE, isRequired: true })
		public opensAt!: Date;
	}

	const pipe: ValidationPipe = new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } });
	const originalTimeZone: string | undefined = process.env.TZ;

	afterEach(() => {
		process.env.TZ = originalTimeZone;
	});

	it("parses a published DATE_TIME value to the instant it names", async () => {
		const result = (await pipe.transform({ startsAt: "2026-03-01T12:34:56.789Z" }, { metatype: ImplicitInstantDto, type: "body" })) as ImplicitInstantDto;

		expect(result.startsAt).toBeInstanceOf(Date);
		expect(result.startsAt.toISOString()).toBe("2026-03-01T12:34:56.789Z");
	});

	it.each(["2026-03-01T12:34:56.789+03:00", "March 1 2026", "1", 1_772_368_496_789, "0000-01-01T00:00:00.000Z"])("rejects %j on a DATE_TIME property typed Date", async (value: unknown) => {
		process.env.TZ = "America/New_York";

		await expect(pipe.transform({ startsAt: value }, { metatype: ImplicitInstantDto, type: "body" })).rejects.toMatchObject({ response: { message: ["startsAt must be in YYYY-MM-DDTHH:mm:ss.sssZ format"] } });
	});

	it("keeps DATE and TIME values on properties typed Date as the text sent", async () => {
		process.env.TZ = "America/New_York";

		const result = (await pipe.transform({ happensOn: "2026-03-01", opensAt: "09:30:00" }, { metatype: ImplicitCalendarDto, type: "body" })) as unknown as Record<string, unknown>;

		expect(result).toMatchObject({ happensOn: "2026-03-01", opensAt: "09:30:00" });
	});
});

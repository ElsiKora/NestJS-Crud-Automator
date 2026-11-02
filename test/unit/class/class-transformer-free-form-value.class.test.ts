import "reflect-metadata";

import { ClassTransformerFreeFormValue } from "@class/class-transformer-free-form-value.class";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { Expose, instanceToPlain, plainToInstance } from "class-transformer";
import { describe, expect, it, type MockInstance, vi } from "vitest";

class FreeFormOwnerEntity {
	public id!: string;
}

class FreeFormResponseDto {
	@Expose()
	public name!: string;

	@ApiPropertyObject({ description: "payload", entity: FreeFormOwnerEntity, isRequired: true, isResponse: true, type: Object })
	@Expose()
	public payload!: unknown;
}

const STORED_SHAPES: Array<string> = ['{"inner":{"constructor":"c"},"keep":1}', '{"list":[{"constructor":"c","__proto__":[]}]}', '{"constructor":"c","keep":1}', '{"inner":{"__proto__":{"polluted":1}}}', '{"inner":{"constructor":{"prototype":{"p":1}}}}', '[{"constructor":"c"}]', '{"hasOwnProperty":"y","prototype":"p","date":"2024-01-02"}'];

/**
 * Builds a response DTO instance the way the route serializer does.
 * @param {string} payload - Stored payload as JSON text.
 * @returns {FreeFormResponseDto} The instance.
 */
function createResponse(payload: string): FreeFormResponseDto {
	return plainToInstance(FreeFormResponseDto, { hidden: true, name: "row", payload: JSON.parse(payload) as unknown }, { excludeExtraneousValues: true, strategy: "excludeAll" });
}

describe("ClassTransformerFreeFormValue", () => {
	it.each(STORED_SHAPES)("keeps the free-form value %s exactly through instanceToPlain", (payload: string) => {
		const response: FreeFormResponseDto = createResponse(payload);
		const plain: { name: string; payload: unknown } = ClassTransformerFreeFormValue.instanceToPlain(response) as never;

		expect(JSON.stringify(plain.payload)).toBe(JSON.stringify(JSON.parse(payload)));
		expect(plain.name).toBe("row");
		expect(plain).not.toHaveProperty("hidden");
	});

	it("keeps free-form values in a list of instances", () => {
		const plain: Array<{ payload: unknown }> = ClassTransformerFreeFormValue.instanceToPlain([createResponse(STORED_SHAPES[0] as string), createResponse(STORED_SHAPES[1] as string)]) as never;

		expect(plain.map((item: { payload: unknown }): string => JSON.stringify(item.payload))).toEqual([STORED_SHAPES[0], STORED_SHAPES[1]]);
	});

	it.each(STORED_SHAPES)("lets a plain instanceToPlain, as a host serializer runs it, take %s without failing and drop only the keys class-transformer drops", (payload: string) => {
		const plain: { payload: unknown } = instanceToPlain(createResponse(payload)) as never;
		const expected: string = JSON.stringify(JSON.parse(payload, (key: string, value: unknown): unknown => (key === "constructor" || key === "__proto__" ? undefined : value)));

		expect(JSON.stringify(plain.payload)).toBe(expected);
		expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
	});

	it.each(STORED_SHAPES)("lets a host instanceToPlain walk the converted value %s and answer what it answers for the instance", (payload: string) => {
		const response: FreeFormResponseDto = createResponse(payload);
		const converted: unknown = ClassTransformerFreeFormValue.instanceToPlain(response);

		expect(JSON.stringify(instanceToPlain(converted))).toBe(JSON.stringify(instanceToPlain(response)));
		expect(JSON.stringify(response.payload)).toBe(JSON.stringify(JSON.parse(payload)));
	});

	it("does not change the value it copies for a host serializer", () => {
		const response: FreeFormResponseDto = createResponse(STORED_SHAPES[0] as string);

		instanceToPlain(response);

		expect(JSON.stringify(response.payload)).toBe(STORED_SHAPES[0]);
	});

	it("leaves the value alone when no free-form property is walked", () => {
		const value: Record<string, unknown> = { nested: { kept: true }, text: "x" };

		expect(ClassTransformerFreeFormValue.instanceToPlain(value)).toEqual(value);
	});

	it("restores an outer conversion after a nested one", () => {
		class OuterDto {
			@Expose()
			public get nested(): unknown {
				return ClassTransformerFreeFormValue.instanceToPlain(createResponse(STORED_SHAPES[6] as string));
			}

			@ApiPropertyObject({ description: "payload", entity: FreeFormOwnerEntity, isRequired: true, isResponse: true, type: Object })
			@Expose()
			public payload: unknown = JSON.parse(STORED_SHAPES[0] as string);
		}

		const plain: { nested: { payload: unknown }; payload: unknown } = ClassTransformerFreeFormValue.instanceToPlain(new OuterDto()) as never;

		expect(JSON.stringify(plain.payload)).toBe(STORED_SHAPES[0]);
		expect(JSON.stringify(plain.nested.payload)).toBe(STORED_SHAPES[6]);
	});

	it("does not hold values after a conversion that throws", () => {
		class FailingDto {
			@Expose()
			public get failing(): unknown {
				throw new Error("failing getter");
			}
		}

		expect(() => ClassTransformerFreeFormValue.instanceToPlain(new FailingDto())).toThrow("failing getter");
		expect(ClassTransformerFreeFormValue.toPlain({ constructor: "c", keep: 1 })).toEqual({ keep: 1 });
	});

	it("does not walk the bytes of a Buffer or a typed array beside a free-form value", () => {
		class BinaryDto {
			@Expose()
			public bytes: Buffer = Buffer.alloc(16);

			@ApiPropertyObject({ description: "payload", entity: FreeFormOwnerEntity, isRequired: true, isResponse: true, type: Object })
			@Expose()
			public payload: unknown = JSON.parse(STORED_SHAPES[0] as string);

			@Expose()
			public get samples(): Array<Float64Array> {
				return [new Float64Array(16)];
			}
		}

		const entries: MockInstance<typeof Object.entries> = vi.spyOn(Object, "entries");

		try {
			const plain: { bytes: Buffer; payload: unknown } = ClassTransformerFreeFormValue.instanceToPlain(new BinaryDto()) as never;

			expect(JSON.stringify(plain.payload)).toBe(STORED_SHAPES[0]);
			expect(plain.bytes).toBeInstanceOf(Buffer);
			expect(entries.mock.calls.filter(([value]: [unknown]): boolean => ArrayBuffer.isView(value))).toEqual([]);
		} finally {
			entries.mockRestore();
		}
	});
});

import "reflect-metadata";

import { EXPOSED_SOURCE_DTO_CONSTANT } from "@constant/dto/exposed-source.constant";
import { ClassTransformerSourceToExposed } from "@utility/class-transformer/source-to-exposed.utility";
import { Expose, plainToInstance, Transform, Type } from "class-transformer";
import { describe, expect, it } from "vitest";

class CatDto {
	@Expose()
	public kind?: string;

	@Expose({ name: "meow_wire" })
	public meow?: string;
}

class DogDto {
	@Expose()
	public kind?: string;

	@Expose({ name: "bark_wire" })
	public bark?: string;
}

class ChildDto {
	@Expose({ name: "child_wire" })
	public childValue?: string;
}

class KeysDto {
	@Expose()
	@Transform(({ obj }: { obj: object }): unknown => Object.keys(obj).toSorted().join(","), { toClassOnly: true })
	public keys?: string;

	@Expose({ name: "title_wire" })
	public title?: string;
}

class PlainDto {
	@Expose()
	public from?: string;
}

class ParentDto {
	@Expose({ name: "child_list" })
	@Type(() => ChildDto)
	public children?: Array<ChildDto>;

	@Expose()
	@Transform(({ obj }: { obj: { provider?: string } }): unknown => obj.provider, { toClassOnly: true })
	public from?: string;

	@Expose()
	@Type(() => Object, {
		discriminator: {
			property: "kind",
			subTypes: [
				{ name: "cat", value: CatDto },
				{ name: "dog", value: DogDto },
			],
		},
		keepDiscriminatorProperty: true,
	})
	public pet?: CatDto | DogDto;

	@Expose({ name: "title_wire" })
	public title?: string;
}

describe("ClassTransformerSourceToExposed", () => {
	it("reads each renamed property from its property key, so plain-to-class builds the DTO by property name", () => {
		const source: Record<string, unknown> = { children: [{ childValue: "c", child_wire: "ignored" }], pet: { bark: "b", kind: "dog" }, provider: "email", title: "t", title_wire: "ignored" };

		expect(plainToInstance(ParentDto, ClassTransformerSourceToExposed(ParentDto, source), { excludeExtraneousValues: true })).toEqual(Object.assign(new ParentDto(), { children: [Object.assign(new ChildDto(), { childValue: "c" })], from: "email", pet: Object.assign(new DogDto(), { bark: "b", kind: "dog" }), title: "t" }));
	});

	it("keeps the full source row as obj, including keys the DTO does not declare", () => {
		const source: Record<string, unknown> = { provider: "email", title: "t" };
		const exposed: unknown = ClassTransformerSourceToExposed(ParentDto, source);

		expect(Reflect.get(exposed as object, "provider")).toBe("email");
		expect(Object.getPrototypeOf(exposed)).toBe(source);
	});

	it("reads the property key through a getter of a class instance", () => {
		class Row {
			public get title(): string {
				return "fromGetter";
			}
		}

		expect(Reflect.get(ClassTransformerSourceToExposed(ParentDto, new Row()) as object, "title_wire")).toBe("fromGetter");
	});

	it("lets a transform enumerate the full source row as obj, with the exposed names added", () => {
		const source: Record<string, unknown> = { provider: "email", title: "t" };

		expect(plainToInstance(KeysDto, ClassTransformerSourceToExposed(KeysDto, source), { excludeExtraneousValues: true })).toEqual(Object.assign(new KeysDto(), { keys: "provider,title,title_wire", title: "t" }));
	});

	it("hands over a source whose renamed property is unset, so its property key is never read as a request key", () => {
		const source: Record<string, unknown> = { title: undefined };
		const exposed: unknown = ClassTransformerSourceToExposed(ParentDto, source);

		expect(exposed).not.toBe(source);
		expect(Object.getPrototypeOf(exposed)).toBe(source);
		expect(Object.hasOwn(exposed as object, EXPOSED_SOURCE_DTO_CONSTANT.MARKER)).toBe(true);
		expect(plainToInstance(ParentDto, exposed, { excludeExtraneousValues: true }).title).toBeUndefined();
	});

	it("maps an array and returns a value with nothing to rename as it is", () => {
		const plain: { from: string } = { from: "f" };

		expect(ClassTransformerSourceToExposed(PlainDto, [plain])).toEqual([plain]);
		expect((ClassTransformerSourceToExposed(PlainDto, [plain]) as Array<unknown>)[0]).toBe(plain);
		expect(ClassTransformerSourceToExposed(PlainDto, "text")).toBe("text");
		expect(ClassTransformerSourceToExposed(PlainDto, null)).toBeNull();
	});

	it("leaves an item of an unknown discriminator subtype as it is", () => {
		const pet: { kind: string; meow: string } = { kind: "fish", meow: "m" };

		expect(Reflect.get(ClassTransformerSourceToExposed(ParentDto, { pet }) as object, "pet")).toBe(pet);
	});
});

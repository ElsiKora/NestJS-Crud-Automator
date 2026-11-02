import "reflect-metadata";

import { ClassTransformerCopyExposure } from "@utility/class-transformer/copy-exposure.utility";
import { Exclude, Expose, instanceToPlain, plainToInstance } from "class-transformer";
import { describe, expect, it } from "vitest";

type TCopyInstance = { hidden?: unknown; value?: unknown };

const copyOf = (source: new () => unknown): new () => TCopyInstance => {
	class CopyDto {}

	ClassTransformerCopyExposure(source, CopyDto);

	return CopyDto;
};

describe("ClassTransformerCopyExposure", () => {
	it("copies the name of an @Expose", () => {
		class SourceDto {
			@Expose({ name: "wire" })
			public value?: unknown;
		}

		expect(instanceToPlain(Object.assign(new (copyOf(SourceDto))(), { value: 1 }))).toEqual({ wire: 1 });
	});

	it("copies the groups and versions of an @Expose", () => {
		class SourceDto {
			@Expose({ groups: ["admin"], since: 2 })
			public value?: unknown;
		}

		const Copy: new () => TCopyInstance = copyOf(SourceDto);
		const instance: TCopyInstance = Object.assign(new Copy(), { value: 1 });

		expect(instanceToPlain(instance, { groups: ["admin"], version: 2 })).toEqual({ value: 1 });
		expect(instanceToPlain(instance, { groups: ["other"], version: 2 })).toEqual({});
		expect(instanceToPlain(instance, { groups: ["admin"], version: 1 })).toEqual({});
	});

	it("copies an @Exclude on both directions", () => {
		class SourceDto {
			@Exclude()
			public hidden?: unknown;
		}

		const Copy: new () => TCopyInstance = copyOf(SourceDto);

		expect(instanceToPlain(Object.assign(new Copy(), { hidden: 1 }))).toEqual({});
		expect(plainToInstance(Copy, { hidden: 1 }).hidden).toBeUndefined();
	});

	it("copies the direction of an @Exclude", () => {
		class SourceDto {
			@Exclude({ toPlainOnly: true })
			public hidden?: unknown;
		}

		const Copy: new () => TCopyInstance = copyOf(SourceDto);

		expect(instanceToPlain(Object.assign(new Copy(), { hidden: 1 }))).toEqual({});
		expect(plainToInstance(Copy, { hidden: 1 }).hidden).toBe(1);
	});

	it("copies what a parent class declares", () => {
		class ParentDto {
			@Exclude()
			public hidden?: unknown;

			@Expose({ name: "wire" })
			public value?: unknown;
		}

		class SourceDto extends ParentDto {}

		expect(instanceToPlain(Object.assign(new (copyOf(SourceDto))(), { hidden: 1, value: 2 }))).toEqual({ wire: 2 });
	});

	it("lets a child class win over its parent", () => {
		class ParentDto {
			@Expose({ name: "parent_wire" })
			public value?: unknown;
		}

		class SourceDto extends ParentDto {}

		Expose({ name: "child_wire" })(SourceDto.prototype, "value");

		expect(instanceToPlain(Object.assign(new (copyOf(SourceDto))(), { value: 1 }))).toEqual({ child_wire: 1 });
	});

	it("copies a class-level @Exclude", () => {
		@Exclude()
		class SourceDto {
			public hidden?: unknown;

			@Expose()
			public value?: unknown;
		}

		expect(instanceToPlain(Object.assign(new (copyOf(SourceDto))(), { hidden: 1, value: 2 }))).toEqual({ value: 2 });
	});
});

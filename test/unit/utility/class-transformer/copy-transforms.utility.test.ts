import "reflect-metadata";

import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { ClassTransformerCopyTransforms } from "@utility/class-transformer/copy-transforms.utility";
import { Expose, instanceToPlain, plainToInstance, Transform, Type } from "class-transformer";
import { describe, expect, it } from "vitest";

type TCopy = { child?: unknown; value?: unknown };

const append =
	(suffix: string) =>
	({ value }: { value: unknown }): string =>
		`${String(value)}${suffix}`;

const copyOf = (source: new () => unknown, replay: (target: object) => void = (): void => undefined, replayed: ReadonlyArray<string> = []): new () => TCopy => {
	class CopyDto {}

	replay(CopyDto.prototype);
	ClassTransformerCopyTransforms(source, CopyDto, new Set<string>(replayed));

	return CopyDto;
};

describe("ClassTransformerCopyTransforms", () => {
	it.each([
		["below", "xua", "xur"],
		["above", "xau", "xru"],
	])("runs the transforms of a user decorator %s the Automator one in the order of the source, with the Automator one from the replay", (order: string, sourceValue: string, copyValue: string) => {
		class SourceDto {
			@Expose()
			public value?: string;
		}

		if (order === "below") {
			ClassTransformerAutomatorTransform(append("a"), { toClassOnly: true })(SourceDto.prototype, "value");
			Transform(append("u"), { toClassOnly: true })(SourceDto.prototype, "value");
		} else {
			Transform(append("u"), { toClassOnly: true })(SourceDto.prototype, "value");
			ClassTransformerAutomatorTransform(append("a"), { toClassOnly: true })(SourceDto.prototype, "value");
		}

		const Copy: new () => TCopy = copyOf(
			SourceDto,
			(target: object): void => {
				Expose()(target, "value");
				ClassTransformerAutomatorTransform(append("r"), { toClassOnly: true })(target, "value");
			},
			["value"],
		);

		expect(plainToInstance(SourceDto, { value: "x" }).value).toBe(sourceValue);
		expect(plainToInstance(Copy, { value: "x" }).value).toBe(copyValue);
	});

	it("copies a toPlainOnly and an inherited transform", () => {
		class ParentDto {
			@Transform(append("p"), { toClassOnly: true })
			public value?: string;
		}

		class SourceDto extends ParentDto {
			@Transform(append("o"), { toPlainOnly: true })
			@Transform(append("c"), { toClassOnly: true })
			public override value?: string = undefined;
		}

		const Copy: new () => TCopy = copyOf(SourceDto);

		expect(plainToInstance(Copy, { value: "x" }).value).toBe(plainToInstance(SourceDto, { value: "x" }).value);
		expect(instanceToPlain(Object.assign(new Copy(), { value: "x" }))).toEqual({ value: "xo" });
	});

	it("copies the @Type of a property the copy does not replay, and leaves a replayed one to the replay", () => {
		class ChildDto {
			@Expose({ name: "child_wire" })
			public text?: string;
		}

		class SourceDto {
			@Type(() => ChildDto)
			public child?: ChildDto;

			@Type(() => Number)
			public value?: number;
		}

		const Copy: new () => TCopy = copyOf(SourceDto, (): void => undefined, ["value"]);
		const instance: TCopy = plainToInstance(Copy, { child: { child_wire: "c" }, value: "1" });

		expect(instance.child).toBeInstanceOf(ChildDto);
		expect(instance.child).toEqual(Object.assign(new ChildDto(), { text: "c" }));
		expect(instance.value).toBe("1");
	});

	it("leaves a property with only Automator transforms to the replay", () => {
		class SourceDto {
			@Expose()
			public value?: string;
		}

		ClassTransformerAutomatorTransform(append("a"), { toClassOnly: true })(SourceDto.prototype, "value");

		const Copy: new () => TCopy = copyOf(
			SourceDto,
			(target: object): void => {
				Expose()(target, "value");
				ClassTransformerAutomatorTransform(append("r"), { toClassOnly: true })(target, "value");
			},
			["value"],
		);

		expect(plainToInstance(Copy, { value: "x" }).value).toBe("xr");
	});
});

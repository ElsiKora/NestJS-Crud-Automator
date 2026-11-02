import "reflect-metadata";

import { ClassTransformerAttachWireNames } from "@utility/class-transformer/attach-wire-names.utility";
import { Exclude, Expose, instanceToPlain, Transform, Type } from "class-transformer";
import { describe, expect, it } from "vitest";

class ChildDto {
	@Expose({ name: "child_wire" })
	public childValue?: string;
}

class ParentDto {
	@Expose()
	@Type(() => ChildDto)
	public children?: Array<ChildDto>;

	@Expose()
	public createdAt?: Date;

	@Expose()
	@Transform(({ obj }: { obj: { details?: unknown } }): unknown => obj.details, { toClassOnly: true })
	public details?: unknown;

	@Exclude({ toPlainOnly: true })
	@Expose()
	public hidden?: string;

	@Expose({ name: "label_wire" })
	@Transform(({ value }: { value: string }): string => `plain:${value}`, { toPlainOnly: true })
	public label?: string;

	@Exclude({ toClassOnly: true })
	@Expose()
	public readable?: string;
}

const build = (): ParentDto => Object.assign(new ParentDto(), { children: [Object.assign(new ChildDto(), { childValue: "c" })], createdAt: new Date("2026-01-01T00:00:00.000Z"), details: { free: "form" }, hidden: "h", label: "l", readable: "r" });

describe("ClassTransformerAttachWireNames", () => {
	it("writes each property under its exposed name, through nested DTOs and arrays, without running a transform", () => {
		const instances: Array<ParentDto> = [build()];

		ClassTransformerAttachWireNames(instances);

		expect(JSON.parse(JSON.stringify(instances))).toEqual([{ children: [{ child_wire: "c" }], createdAt: "2026-01-01T00:00:00.000Z", details: { free: "form" }, label_wire: "l", readable: "r" }]);
	});

	it("leaves out a property excluded on the way to plain and keeps one excluded only on the way to the class", () => {
		const instance: ParentDto = build();

		ClassTransformerAttachWireNames(instance);

		expect(JSON.parse(JSON.stringify(instance))).not.toHaveProperty("hidden");
		expect(JSON.parse(JSON.stringify(instance))).toHaveProperty("readable", "r");
	});

	it("keeps the instance for class-to-plain, which runs its own step and does not copy toJSON", () => {
		const instance: ParentDto = build();

		ClassTransformerAttachWireNames(instance);

		expect(instance).toBeInstanceOf(ParentDto);
		expect(Object.keys(instance)).not.toContain("toJSON");
		expect(instanceToPlain(instance)).toEqual({ children: [{ child_wire: "c" }], createdAt: new Date("2026-01-01T00:00:00.000Z"), details: { free: "form" }, label_wire: "plain:l", readable: "r" });
	});

	it("leaves a plain object, a class without renames, a class with its own toJSON and a non-object as they are", () => {
		class PlainDto {
			@Expose()
			public value?: string;
		}

		class OwnJsonDto {
			@Expose({ name: "wire" })
			public value?: string = "v";

			public toJSON(): unknown {
				return "own";
			}
		}

		const plain: { value: string } = { value: "v" };
		const unrenamed: PlainDto = Object.assign(new PlainDto(), { value: "v" });
		const ownJson: OwnJsonDto = new OwnJsonDto();

		ClassTransformerAttachWireNames([plain, unrenamed, ownJson, "text", null]);

		expect(Object.getOwnPropertyNames(plain)).toEqual(["value"]);
		expect(Object.getOwnPropertyNames(unrenamed)).toEqual(["value"]);
		expect(JSON.stringify(ownJson)).toBe('"own"');
	});

	it("walks a cycle once", () => {
		class NodeDto {
			@Expose({ name: "next_wire" })
			public next?: NodeDto;
		}

		const node: NodeDto = new NodeDto();

		node.next = node;

		expect(() => {
			ClassTransformerAttachWireNames(node);
		}).not.toThrow();
		expect(Object.getOwnPropertyDescriptor(node, "toJSON")?.enumerable).toBe(false);
	});
});

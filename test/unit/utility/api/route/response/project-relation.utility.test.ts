import "reflect-metadata";

import { EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { ApiRouteProjectRelationResponse } from "@utility/api/route/response/project-relation.utility";
import { describe, expect, it } from "vitest";

const buildConfig = (shape: EApiControllerRelationReferenceShape, key?: string): never =>
	({
		load: { include: { children: true, owner: true } },
		reference: { key, shape },
	}) as never;

describe("ApiRouteProjectRelationResponse", () => {
	describe("to-many relations", () => {
		it("projects every array element into an object reference", () => {
			const response = {
				children: [
					{ id: "first", name: "a" },
					{ id: "second", name: "b" },
				],
				id: "parent",
			};

			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), response)).toEqual({ children: [{ id: "first" }, { id: "second" }], id: "parent" });
		});

		it("projects every array element into a scalar reference", () => {
			const response = { children: [{ id: "first" }, { id: "second" }], id: "parent" };

			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.SCALAR), response)).toEqual({ children: ["first", "second"], id: "parent" });
		});

		it("uses the configured reference key for array elements", () => {
			const response = { children: [{ code: "c-1", id: "first" }] };

			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT, "code"), response)).toEqual({ children: [{ code: "c-1" }] });
			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.SCALAR, "code"), { children: [{ code: "c-1", id: "first" }] })).toEqual({ children: ["c-1"] });
		});

		it("keeps empty arrays", () => {
			for (const shape of [EApiControllerRelationReferenceShape.OBJECT, EApiControllerRelationReferenceShape.SCALAR]) {
				expect(ApiRouteProjectRelationResponse(buildConfig(shape), { children: [] })).toEqual({ children: [] });
			}
		});

		it("leaves null and non-object elements unchanged, as for to-one values", () => {
			const children: Array<unknown> = [null, undefined, "already-scalar", { id: "first" }];

			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), { children })).toEqual({ children: [null, undefined, "already-scalar", { id: "first" }] });
			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.SCALAR), { children })).toEqual({ children: [null, undefined, "already-scalar", "first"] });
		});

		it("does not mutate the loaded relation array", () => {
			const child: { id: string; name: string } = { id: "first", name: "a" };
			const children: Array<{ id: string; name: string }> = [child];

			ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), { children });

			expect(children).toEqual([{ id: "first", name: "a" }]);
			expect(children[0]).toBe(child);
		});

		it("projects array relations on array and get-list responses", () => {
			const config: never = buildConfig(EApiControllerRelationReferenceShape.SCALAR);

			expect(ApiRouteProjectRelationResponse(config, [{ children: [{ id: "first" }] }])).toEqual([{ children: ["first"] }]);
			expect(ApiRouteProjectRelationResponse(config, { items: [{ children: [{ id: "first" }] }], totalCount: 1 })).toEqual({ items: [{ children: ["first"] }], totalCount: 1 });
		});

		it("is stable when an already projected response is projected again", () => {
			const objectResponse: unknown = ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), { children: [{ id: "first", name: "a" }] });
			const scalarResponse: unknown = ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.SCALAR), { children: [{ id: "first" }] });

			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), objectResponse)).toEqual({ children: [{ id: "first" }] });
			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.SCALAR), scalarResponse)).toEqual({ children: ["first"] });
		});
	});

	describe("to-one relations", () => {
		it("projects a loaded object into an object reference", () => {
			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), { owner: { id: "owner", name: "a" } })).toEqual({ owner: { id: "owner" } });
		});

		it("projects a loaded object into a scalar reference", () => {
			expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.SCALAR), { owner: { id: "owner", name: "a" } })).toEqual({ owner: "owner" });
		});

		it("leaves null, scalar and absent relation values untouched", () => {
			const response: Record<string, unknown> = { children: "already-scalar", owner: null };

			ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), response);

			expect(response).toStrictEqual({ children: "already-scalar", owner: null });

			const absent: Record<string, unknown> = { id: "parent" };

			ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), absent);

			expect(Object.keys(absent)).toEqual(["id"]);
		});
	});

	it("returns the same response reference without cloning", () => {
		const response = { children: [{ id: "first" }], owner: { id: "owner" } };

		expect(ApiRouteProjectRelationResponse(buildConfig(EApiControllerRelationReferenceShape.OBJECT), response)).toBe(response);
	});
});

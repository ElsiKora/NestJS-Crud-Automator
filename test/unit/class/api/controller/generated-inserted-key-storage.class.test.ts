import type { ObjectLiteral } from "typeorm";

import { ApiControllerGeneratedInsertedKeyStorage } from "@class/api/controller/generated/inserted-key-storage.class";
import { describe, expect, it } from "vitest";

describe("ApiControllerGeneratedInsertedKeyStorage", () => {
	it("returns the key the create call with the route's body reports", async () => {
		const input: object = { title: "Created" };

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
				ApiControllerGeneratedInsertedKeyStorage.claim(input)?.({ id: "inserted" });
			}),
		).resolves.toEqual({ id: "inserted" });
	});

	it("lets only the first create call with the route's body claim the entry", async () => {
		const input: object = { title: "Created" };

		const key: ObjectLiteral = await ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
			const report: ((key: ObjectLiteral | undefined) => void) | undefined = ApiControllerGeneratedInsertedKeyStorage.claim(input);

			expect(ApiControllerGeneratedInsertedKeyStorage.claim(input)).toBeUndefined();
			report?.({ id: "inserted" });
		});

		expect(key).toEqual({ id: "inserted" });
	});

	it("does not let a create call with another body claim the entry", async () => {
		const input: object = { title: "Created" };

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
				expect(ApiControllerGeneratedInsertedKeyStorage.claim({ title: "Nested" })).toBeUndefined();
			}),
		).rejects.toThrow("Generated CREATE function did not report the key of the row it inserted");
	});

	it("gives no reporter outside a generated route", () => {
		expect(ApiControllerGeneratedInsertedKeyStorage.claim({ title: "Direct" })).toBeUndefined();
	});

	it("refuses a create call that reports no key", async () => {
		const input: object = { title: "Created" };

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
				ApiControllerGeneratedInsertedKeyStorage.claim(input)?.(undefined);
			}),
		).rejects.toThrow("Generated CREATE function did not report the key of the row it inserted");
	});

	it("keeps the reported key apart from a later change to the reported object", async () => {
		const input: object = { title: "Created" };
		const reported: { id: string } = { id: "inserted" };

		const key: ObjectLiteral = await ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
			ApiControllerGeneratedInsertedKeyStorage.claim(input)?.(reported);
			reported.id = "other";
		});

		expect(key).toEqual({ id: "inserted" });
	});
});

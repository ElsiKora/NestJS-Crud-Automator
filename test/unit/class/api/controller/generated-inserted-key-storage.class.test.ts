import type { ObjectLiteral } from "typeorm";

import { ApiControllerGeneratedInsertedKeyStorage } from "@class/api/controller/generated/inserted-key-storage.class";
import { describe, expect, it } from "vitest";

describe("ApiControllerGeneratedInsertedKeyStorage", () => {
	it("returns the key the create call with the route's body reports", async () => {
		const input: object = { title: "Created" };

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
				ApiControllerGeneratedInsertedKeyStorage.claim(input, "Ticket")?.({ id: "inserted" });
			}),
		).resolves.toEqual({ id: "inserted" });
	});

	it("lets only the first create call with the route's body claim the entry", async () => {
		const input: object = { title: "Created" };

		const key: ObjectLiteral = await ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
			const report: ((key: ObjectLiteral | undefined) => void) | undefined = ApiControllerGeneratedInsertedKeyStorage.claim(input, "Ticket");

			expect(ApiControllerGeneratedInsertedKeyStorage.claim(input, "Ticket")).toBeUndefined();
			report?.({ id: "inserted" });
		});

		expect(key).toEqual({ id: "inserted" });
	});

	it("does not let a create call with another body claim the entry", async () => {
		const input: object = { title: "Created" };

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
				expect(ApiControllerGeneratedInsertedKeyStorage.claim({ title: "Nested" }, "Ticket")).toBeUndefined();
			}),
		).rejects.toThrow("Generated CREATE function did not report the key of the row it inserted");
	});

	it("gives no reporter outside a generated route", () => {
		expect(ApiControllerGeneratedInsertedKeyStorage.claim({ title: "Direct" }, "Ticket")).toBeUndefined();
	});

	it("names the cause when the saved row has no primary key value TypeORM knows", async () => {
		const input: object = { title: "Created" };

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
				ApiControllerGeneratedInsertedKeyStorage.claim(input, "Ticket")?.(undefined);
			}),
		).rejects.toThrow("Generated CREATE route cannot read the Ticket row it inserted: the saved entity has no primary key value TypeORM knows. A primary key the database fills, such as a SQLite rowid or a sequence default added outside TypeORM, must be declared as generated, with @PrimaryGeneratedColumn or @PrimaryColumn({ generated: ... })");
	});

	it("gives no reporter to a direct create call without a body, inside or outside a generated route", async () => {
		expect(ApiControllerGeneratedInsertedKeyStorage.claim(undefined, "Ticket")).toBeUndefined();

		await expect(
			ApiControllerGeneratedInsertedKeyStorage.run({ title: "Created" }, async (): Promise<void> => {
				expect(ApiControllerGeneratedInsertedKeyStorage.claim(undefined, "Ticket")).toBeUndefined();
			}),
		).rejects.toThrow("Generated CREATE function did not report the key of the row it inserted");
	});

	it("keeps the reported key apart from a later change to the reported object", async () => {
		const input: object = { title: "Created" };
		const reported: { id: string } = { id: "inserted" };

		const key: ObjectLiteral = await ApiControllerGeneratedInsertedKeyStorage.run(input, async (): Promise<void> => {
			ApiControllerGeneratedInsertedKeyStorage.claim(input, "Ticket")?.(reported);
			reported.id = "other";
		});

		expect(key).toEqual({ id: "inserted" });
	});
});

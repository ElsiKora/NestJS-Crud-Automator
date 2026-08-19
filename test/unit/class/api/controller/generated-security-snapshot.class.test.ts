import type { IApiAuthorizationDecision } from "@interface/class/api/authorization";
import type { FindOperator, ValueTransformer } from "typeorm";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated";
import { Equal, In } from "typeorm";
import { describe, expect, it } from "vitest";

class GeneratedSecuritySnapshotEntity {
	public id?: string;
	public ownerId?: string;
}

describe("ApiControllerGeneratedSecuritySnapshot", () => {
	it("detaches and freezes the canonical decision while exposing mutable detached subscriber views", () => {
		const originalOperator = Equal("owner-required");
		const transform = async (value: GeneratedSecuritySnapshotEntity): Promise<GeneratedSecuritySnapshotEntity> => ({ ...value, id: "transformed" });
		const original = {
			permissions: ["entity.read"],
			principal: {
				attributes: { nested: { operatorId: "owner-required" } },
			},
			scope: { where: { ownerId: originalOperator } },
			transforms: [transform],
		} as unknown as IApiAuthorizationDecision<GeneratedSecuritySnapshotEntity, GeneratedSecuritySnapshotEntity>;
		const snapshot = ApiControllerGeneratedSecuritySnapshot.create(original)!;

		expect(Object.isFrozen(snapshot)).toBe(true);
		expect(Object.isFrozen(snapshot.scope)).toBe(true);
		expect(Object.isFrozen(snapshot.scope?.where)).toBe(true);
		expect(Object.isFrozen(snapshot.transforms)).toBe(true);

		(originalOperator as unknown as { _value: string })._value = "owner-mutated";
		original.transforms.splice(0);
		(original.principal.attributes.nested as { operatorId: string }).operatorId = "owner-mutated";

		const snapshotOperator = (snapshot.scope?.where as { ownerId: FindOperator<string> }).ownerId;

		expect(snapshotOperator.value).toBe("owner-required");
		expect(snapshot.transforms).toEqual([transform]);
		expect(snapshot.principal.attributes.nested).toEqual({ operatorId: "owner-required" });

		const view = ApiControllerGeneratedSecuritySnapshot.createSubscriberView(snapshot)!;
		const viewOperator = (view.scope?.where as { ownerId: FindOperator<string> }).ownerId;

		expect(view).not.toBe(snapshot);
		expect(view.scope).not.toBe(snapshot.scope);
		expect(view.scope?.where).not.toBe(snapshot.scope?.where);
		expect(view.transforms).not.toBe(snapshot.transforms);

		(viewOperator as unknown as { _value: string })._value = "owner-view";
		view.scope = undefined;
		view.transforms.splice(0);
		(view.principal.attributes.nested as { operatorId: string }).operatorId = "owner-view";

		expect(snapshotOperator.value).toBe("owner-required");
		expect(snapshot.scope).toBeDefined();
		expect(snapshot.transforms).toEqual([transform]);
		expect(snapshot.principal.attributes.nested).toEqual({ operatorId: "owner-required" });
	});

	it("creates a fresh mutable scope WHERE for each persistence consumption", () => {
		const originalOperator = In(["owner-a", "owner-b"]);
		const original = {
			scope: { where: { ownerId: originalOperator } },
			transforms: [],
		} as unknown as IApiAuthorizationDecision<GeneratedSecuritySnapshotEntity, GeneratedSecuritySnapshotEntity>;
		const snapshot = ApiControllerGeneratedSecuritySnapshot.create(original)!;
		const firstWhere = ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(snapshot) as unknown as { ownerId: FindOperator<Array<string>> };
		const secondWhere = ApiControllerGeneratedSecuritySnapshot.createMutableScopeWhere(snapshot) as unknown as { ownerId: FindOperator<Array<string>> };
		const canonicalOperator = (snapshot.scope?.where as unknown as { ownerId: FindOperator<Array<string>> }).ownerId;
		const transformer: ValueTransformer = {
			from: (value: unknown): unknown => value,
			to: (value: unknown): unknown => `db:${String(value)}`,
		};

		expect(Object.isFrozen(canonicalOperator)).toBe(true);
		expect(Object.isFrozen(firstWhere.ownerId)).toBe(false);
		expect(firstWhere).not.toBe(snapshot.scope?.where);
		expect(firstWhere.ownerId).not.toBe(canonicalOperator);
		expect(firstWhere.ownerId).not.toBe(secondWhere.ownerId);
		expect(() => firstWhere.ownerId.transformValue(transformer)).not.toThrow();
		expect(firstWhere.ownerId.value).toEqual(["db:owner-a", "db:owner-b"]);
		expect(secondWhere.ownerId.value).toEqual(["owner-a", "owner-b"]);
		expect(canonicalOperator.value).toEqual(["owner-a", "owner-b"]);
		expect(originalOperator.value).toEqual(["owner-a", "owner-b"]);
	});
});

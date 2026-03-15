import { AuthorizationResolveDefaultPrincipal } from "@utility/authorization/resolve-default-principal.utility";
import { describe, expect, it } from "vitest";

describe("AuthorizationResolveDefaultPrincipal", () => {
	it("returns defaults when user is missing", () => {
		const principal = AuthorizationResolveDefaultPrincipal(undefined);

		expect(principal.id).toBe("anonymous");
		expect(principal.roles).toEqual([]);
		expect(principal.groups).toEqual([]);
	});

	it("resolves id from id, uuid, or email", () => {
		expect(AuthorizationResolveDefaultPrincipal({ id: "id-1", uuid: "uuid-1", email: "email-1" }).id).toBe("id-1");
		expect(AuthorizationResolveDefaultPrincipal({ uuid: "uuid-2", email: "email-2" }).id).toBe("uuid-2");
		expect(AuthorizationResolveDefaultPrincipal({ email: "email-3" }).id).toBe("email-3");
	});

	it("normalizes roles and groups from arrays or strings", () => {
		const arrayPrincipal = AuthorizationResolveDefaultPrincipal({
			groups: ["group-a", 2, "group-b"],
			roles: ["admin", 1, "editor"],
		});

		expect(arrayPrincipal.roles).toEqual(["admin", "editor"]);
		expect(arrayPrincipal.groups).toEqual(["group-a", "group-b"]);

		const stringPrincipal = AuthorizationResolveDefaultPrincipal({
			group: "group-single",
			role: "user",
		});

		expect(stringPrincipal.roles).toEqual(["user"]);
		expect(stringPrincipal.groups).toEqual(["group-single"]);
	});

	it("preserves user attributes", () => {
		const user = { id: "id-10", roles: ["admin"] };
		const principal = AuthorizationResolveDefaultPrincipal(user);

		expect(principal.attributes).toBe(user);
	});
});

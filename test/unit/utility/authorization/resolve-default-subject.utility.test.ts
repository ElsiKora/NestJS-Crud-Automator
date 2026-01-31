import { AuthorizationResolveDefaultSubject } from "@utility/authorization/resolve-default-subject.utility";
import { describe, expect, it } from "vitest";

describe("AuthorizationResolveDefaultSubject", () => {
	it("returns defaults when user is missing", () => {
		const subject = AuthorizationResolveDefaultSubject(undefined);

		expect(subject.id).toBe("anonymous");
		expect(subject.roles).toEqual([]);
		expect(subject.permissions).toEqual([]);
	});

	it("resolves id from id, uuid, or email", () => {
		expect(AuthorizationResolveDefaultSubject({ id: "id-1", uuid: "uuid-1", email: "email-1" }).id).toBe("id-1");
		expect(AuthorizationResolveDefaultSubject({ uuid: "uuid-2", email: "email-2" }).id).toBe("uuid-2");
		expect(AuthorizationResolveDefaultSubject({ email: "email-3" }).id).toBe("email-3");
	});

	it("normalizes roles and permissions from arrays or strings", () => {
		const arraySubject = AuthorizationResolveDefaultSubject({
			permissions: ["perm-a", 2, "perm-b"],
			roles: ["admin", 1, "editor"],
		});

		expect(arraySubject.roles).toEqual(["admin", "editor"]);
		expect(arraySubject.permissions).toEqual(["perm-a", "perm-b"]);

		const stringSubject = AuthorizationResolveDefaultSubject({
			permission: "perm-single",
			role: "user",
		});

		expect(stringSubject.roles).toEqual(["user"]);
		expect(stringSubject.permissions).toEqual(["perm-single"]);
	});

	it("preserves user attributes", () => {
		const user = { id: "id-10", roles: ["admin"] };
		const subject = AuthorizationResolveDefaultSubject(user);

		expect(subject.attributes).toBe(user);
	});
});

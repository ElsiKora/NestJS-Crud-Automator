import type { IApiAuthorizationIamNetwork } from "@interface/class/api/authorization";

import { ApiAuthorizationIamNetwork } from "@class/api/authorization/iam";
import { describe, expect, it } from "vitest";

const parse = (value: string): IApiAuthorizationIamNetwork => {
	const network: IApiAuthorizationIamNetwork | undefined = ApiAuthorizationIamNetwork.parse(value);

	if (!network) {
		throw new Error(`${value} did not parse`);
	}

	return network;
};

describe("ApiAuthorizationIamNetwork", () => {
	it.each([
		["10.0.0.1", 4, 32],
		["10.0.0.0/8", 4, 8],
		["0.0.0.0/0", 4, 0],
		["2001:db8::1", 6, 128],
		["2001:db8::/32", 6, 32],
		["::", 6, 128],
		["::/0", 6, 0],
		["1::", 6, 128],
		["::ffff:10.0.0.1", 6, 128],
		["1:2:3:4:5:6:7:8", 6, 128],
		["2001:0db8:0000:0000:0000:0000:0000:0001", 6, 128],
	])("reads %s", (text: string, family: number, prefix: number) => {
		const network: IApiAuthorizationIamNetwork = parse(text);

		expect(network.family).toBe(family);
		expect(network.prefix).toBe(prefix);
		expect(network.text).toBe(text);
	});

	it.each(["", "10.0.0", "10.0.0.256", "010.0.0.1", "10.0.0.1/33", "10.0.0.1/", "10.0.0.1/-1", "10.0.0.1/08", "10.0.0.1/8/8", "2001:db8::/129", "fe80::1%eth0", "fe80::1%eth0/64", "example.com", "gggg::1", "1:2:3", "1:2:3:4:5:6:7:8:9", "1::2::3", ":1", "1:", "12345::", "::1.2.3", "1.2.3.4::"])("refuses %s", (text: string) => {
		expect(ApiAuthorizationIamNetwork.parse(text)).toBeUndefined();
	});

	it.each([
		["10.0.0.0/8", "10.1.2.3", true],
		["10.0.0.0/8", "11.0.0.0", false],
		["10.0.0.5/8", "10.255.255.255", true],
		["10.0.0.1", "10.0.0.1", true],
		["10.0.0.1", "10.0.0.2", false],
		["0.0.0.0/0", "255.255.255.255", true],
		["2001:db8::/32", "2001:db8:ffff::1", true],
		["2001:db8::/32", "2001:db9::1", false],
		["2001:0db8::1", "2001:db8:0:0::1", true],
		["::/0", "2001:db8::1", true],
		// Each address family stays within itself, as on PostgreSQL.
		["0.0.0.0/0", "::1", false],
		["::/0", "10.0.0.1", false],
		["::ffff:0:0/96", "10.0.0.1", false],
		// A network as the value: it must lie within the range, as `<<=` reads it.
		["10.0.0.0/8", "10.1.0.0/16", true],
		["10.1.0.0/16", "10.0.0.0/8", false],
		["10.1.2.3", "10.1.2.3/16", false],
	])("tells whether %s contains %s", (range: string, value: string, isContained: boolean) => {
		expect(ApiAuthorizationIamNetwork.isContained(parse(range), parse(value))).toBe(isContained);
	});

	it("reads an IPv4-mapped address as its IPv4 address when it is unmapped", () => {
		const unmapped: IApiAuthorizationIamNetwork = ApiAuthorizationIamNetwork.unmap(parse("::ffff:10.0.0.1"));

		expect(unmapped.family).toBe(4);
		expect(unmapped.prefix).toBe(32);
		expect(unmapped.text).toBe("10.0.0.1");
		expect(ApiAuthorizationIamNetwork.isContained(parse("10.0.0.0/8"), unmapped)).toBe(true);
		expect(ApiAuthorizationIamNetwork.isContained(parse("10.0.0.0/8"), parse("::ffff:10.0.0.1"))).toBe(false);
	});

	it("leaves any other address as it is", () => {
		expect(ApiAuthorizationIamNetwork.unmap(parse("2001:db8::1")).family).toBe(6);
		expect(ApiAuthorizationIamNetwork.unmap(parse("10.0.0.1")).family).toBe(4);
		// A mapped range shorter than the mapped part names no one IPv4 network.
		expect(ApiAuthorizationIamNetwork.unmap(parse("::ffff:0:0/64")).family).toBe(6);
	});
});

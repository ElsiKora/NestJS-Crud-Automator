import type { IApiAuthorizationIamNetwork } from "@interface/class/api/authorization";

// Address family of an IPv4 network.
const IAM_NETWORK_IPV4_FAMILY: number = 4;

// Address family of an IPv6 network.
const IAM_NETWORK_IPV6_FAMILY: number = 6;

// Bits of an IPv4 address.
const IAM_NETWORK_IPV4_BITS: number = 32;

// Bits of an IPv6 address.
const IAM_NETWORK_IPV6_BITS: number = 128;

// Groups of a whole IPv6 address.
const IAM_NETWORK_IPV6_GROUPS: number = 8;

// Bits of one group of an IPv6 address.
const IAM_NETWORK_IPV6_GROUP_BITS: bigint = 16n;

// Mask of one group of an IPv6 address.
const IAM_NETWORK_IPV6_GROUP_MASK: bigint = 65_535n;

// Bits of one octet of an IPv4 address.
const IAM_NETWORK_IPV4_OCTET_BITS: bigint = 8n;

// Octets of an IPv4 address.
const IAM_NETWORK_IPV4_OCTETS: number = 4;

// An address of no bits, which the groups and octets shift into.
const IAM_NETWORK_NO_BITS: bigint = 0n;

// Largest octet of an IPv4 address.
const IAM_NETWORK_MAX_OCTET: number = 255;

// Prefix of the IPv4-mapped IPv6 range `::ffff:0:0/96`.
const IAM_NETWORK_MAPPED_PREFIX: number = 96;

// The group before the mapped IPv4 address: `::ffff:a.b.c.d`.
const IAM_NETWORK_MAPPED_MARK: bigint = 65_535n;

// Mask of the mapped IPv4 address.
const IAM_NETWORK_IPV4_MASK: bigint = 4_294_967_295n;

// One decimal octet, without a leading zero.
const IAM_NETWORK_OCTET_PATTERN: RegExp = /^(?:0|[1-9]\d{0,2})$/;

// A CIDR prefix length, without a leading zero.
const IAM_NETWORK_PREFIX_PATTERN: RegExp = /^(?:0|[1-9]\d{0,2})$/;

// One hexadecimal group of an IPv6 address.
const IAM_NETWORK_GROUP_PATTERN: RegExp = /^[\da-f]{1,4}$/i;

/**
 * IPv4 and IPv6 addresses and CIDR ranges for the IAM IP operators, compared as BigInt bits. It takes what PostgreSQL
 * `inet` and `cidr` read and reads back, and refuses a zone identifier, which `inet` does not store. Containment is
 * what PostgreSQL `<<=` says: the families are equal, the value's network is no shorter than the range's, and the bits
 * of the range's network are equal. An IPv4-mapped address stays IPv6 unless `unmap` reads it as IPv4.
 */
export class ApiAuthorizationIamNetwork {
	/**
	 * Tells whether a range contains a value, as PostgreSQL `value <<= range` does.
	 * @param {IApiAuthorizationIamNetwork} range - Range.
	 * @param {IApiAuthorizationIamNetwork} value - Address or network to look for.
	 * @returns {boolean} Whether the value lies within the range.
	 */
	public static isContained(range: IApiAuthorizationIamNetwork, value: IApiAuthorizationIamNetwork): boolean {
		if (range.family !== value.family || value.prefix < range.prefix) {
			return false;
		}

		const hostBits: bigint = BigInt((range.family === IAM_NETWORK_IPV4_FAMILY ? IAM_NETWORK_IPV4_BITS : IAM_NETWORK_IPV6_BITS) - range.prefix);

		return range.address >> hostBits === value.address >> hostBits;
	}

	/**
	 * Reads an address, or an address with a CIDR prefix length its family allows.
	 * @param {string} text - Text to read.
	 * @returns {IApiAuthorizationIamNetwork | undefined} The network, or undefined when the text is none.
	 */
	public static parse(text: string): IApiAuthorizationIamNetwork | undefined {
		const [addressText = "", prefixText, ...rest]: Array<string> = text.split("/");

		if (rest.length > 0 || (prefixText !== undefined && !IAM_NETWORK_PREFIX_PATTERN.test(prefixText))) {
			return undefined;
		}

		const family: number = addressText.includes(":") ? IAM_NETWORK_IPV6_FAMILY : IAM_NETWORK_IPV4_FAMILY;
		const bits: number = family === IAM_NETWORK_IPV4_FAMILY ? IAM_NETWORK_IPV4_BITS : IAM_NETWORK_IPV6_BITS;
		const prefix: number = prefixText === undefined ? bits : Number(prefixText);
		const address: bigint | undefined = family === IAM_NETWORK_IPV4_FAMILY ? ApiAuthorizationIamNetwork.readIpv4(addressText) : ApiAuthorizationIamNetwork.readIpv6(addressText);

		return address === undefined || prefix > bits ? undefined : { address, family, prefix, text };
	}

	/**
	 * Reads an IPv4-mapped IPv6 address as its IPv4 address, as a request behind an IPv6 socket reports it.
	 * @param {IApiAuthorizationIamNetwork} network - Address or network.
	 * @returns {IApiAuthorizationIamNetwork} The IPv4 network, or the network as it is when it is not IPv4-mapped.
	 */
	public static unmap(network: IApiAuthorizationIamNetwork): IApiAuthorizationIamNetwork {
		if (network.family !== IAM_NETWORK_IPV6_FAMILY || network.prefix < IAM_NETWORK_MAPPED_PREFIX || network.address >> BigInt(IAM_NETWORK_IPV4_BITS) !== IAM_NETWORK_MAPPED_MARK) {
			return network;
		}

		const address: bigint = network.address & IAM_NETWORK_IPV4_MASK;
		const prefix: number = network.prefix - IAM_NETWORK_MAPPED_PREFIX;
		const octets: Array<string> = Array.from({ length: IAM_NETWORK_IPV4_OCTETS }, (_value: unknown, index: number): string => ((address >> (BigInt(IAM_NETWORK_IPV4_OCTETS - 1 - index) * IAM_NETWORK_IPV4_OCTET_BITS)) & BigInt(IAM_NETWORK_MAX_OCTET)).toString());
		const text: string = octets.join(".");

		return { address, family: IAM_NETWORK_IPV4_FAMILY, prefix, text: prefix === IAM_NETWORK_IPV4_BITS ? text : `${text}/${String(prefix)}` };
	}

	/**
	 * Reads the hexadecimal groups of one side of an IPv6 address.
	 * @param {string} text - Groups separated by `:`, possibly none.
	 * @param {boolean} isLast - Whether the groups end the address, so the last one may be a dotted IPv4 address.
	 * @returns {Array<bigint> | undefined} The 16-bit groups, or undefined when one is malformed.
	 */
	private static readGroups(text: string, isLast: boolean): Array<bigint> | undefined {
		if (text.length === 0) {
			return [];
		}

		const groups: Array<bigint> = [];
		const parts: Array<string> = text.split(":");

		for (const [index, part] of parts.entries()) {
			if (isLast && index === parts.length - 1 && part.includes(".")) {
				const address: bigint | undefined = ApiAuthorizationIamNetwork.readIpv4(part);

				if (address === undefined) {
					return undefined;
				}

				groups.push(address >> IAM_NETWORK_IPV6_GROUP_BITS, address & IAM_NETWORK_IPV6_GROUP_MASK);
			} else if (IAM_NETWORK_GROUP_PATTERN.test(part)) {
				groups.push(BigInt(`0x${part}`));
			} else {
				return undefined;
			}
		}

		return groups;
	}

	/**
	 * Reads a dotted IPv4 address into its bits.
	 * @param {string} text - Address text.
	 * @returns {bigint | undefined} The bits, or undefined when the text is no address.
	 */
	private static readIpv4(text: string): bigint | undefined {
		const octets: Array<string> = text.split(".");

		if (octets.length !== IAM_NETWORK_IPV4_OCTETS || octets.some((octet: string): boolean => !IAM_NETWORK_OCTET_PATTERN.test(octet) || Number(octet) > IAM_NETWORK_MAX_OCTET)) {
			return undefined;
		}

		return octets.reduce((bits: bigint, octet: string): bigint => (bits << IAM_NETWORK_IPV4_OCTET_BITS) | BigInt(octet), IAM_NETWORK_NO_BITS);
	}

	/**
	 * Reads an IPv6 address into its bits: eight groups, or fewer around one `::`, with an optional dotted IPv4 address
	 * as its last 32 bits.
	 * @param {string} text - Address text.
	 * @returns {bigint | undefined} The bits, or undefined when the text is no address.
	 */
	private static readIpv6(text: string): bigint | undefined {
		const [head = "", tail, ...rest]: Array<string> = text.split("::");

		if (rest.length > 0) {
			return undefined;
		}

		const headGroups: Array<bigint> | undefined = ApiAuthorizationIamNetwork.readGroups(head, tail === undefined);
		const tailGroups: Array<bigint> | undefined = tail === undefined ? [] : ApiAuthorizationIamNetwork.readGroups(tail, true);

		if (!headGroups || !tailGroups) {
			return undefined;
		}

		const count: number = headGroups.length + tailGroups.length;

		if (tail === undefined ? count !== IAM_NETWORK_IPV6_GROUPS : count >= IAM_NETWORK_IPV6_GROUPS) {
			return undefined;
		}

		const groups: Array<bigint> = [...headGroups, ...Array.from({ length: IAM_NETWORK_IPV6_GROUPS - count }, (): bigint => IAM_NETWORK_NO_BITS), ...tailGroups];

		return groups.reduce((bits: bigint, group: bigint): bigint => (bits << IAM_NETWORK_IPV6_GROUP_BITS) | group, IAM_NETWORK_NO_BITS);
	}
}

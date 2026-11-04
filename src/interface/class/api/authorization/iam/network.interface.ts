/**
 * An IPv4 or IPv6 address or CIDR range an IAM IP operator compares.
 */
export interface IApiAuthorizationIamNetwork {
	// Bits of the address.
	address: bigint;
	// Address family: 4 or 6.
	family: number;
	// CIDR prefix length; a whole address has all the bits of its family.
	prefix: number;
	// The network as text PostgreSQL `inet` reads.
	text: string;
}

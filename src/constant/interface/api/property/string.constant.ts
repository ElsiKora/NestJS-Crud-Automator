import type { IsIpVersion } from "class-validator/types/decorator/string/IsIP";

const REGEX_PATTERN_INDEX: number = 1;
const REGEX_FLAGS_INDEX: number = 2;
const IP_VERSION: IsIpVersion = 4;

export const API_PROPERTY_STRING_INTERFACE_CONSTANT: {
	readonly IP_VERSION: IsIpVersion;
	readonly REGEX_FLAGS_INDEX: number;
	readonly REGEX_PATTERN_INDEX: number;
} = {
	IP_VERSION,
	REGEX_FLAGS_INDEX,
	REGEX_PATTERN_INDEX,
} as const;

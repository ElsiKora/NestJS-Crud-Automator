/* eslint-disable @elsikora/typescript/no-magic-numbers */
import type { TApiPropertyDefaultStringFormat, TApiPropertyDefaultStringFormatProperties } from "@type/decorator/api/property/default/string";

import { EApiPropertyStringType } from "@enum/decorator/api/property";

const BASE64: TApiPropertyDefaultStringFormatProperties = {
	description: "base64 encoded string",
	exampleValue: "SGVsbG8gV29ybGQ=",
	format: EApiPropertyStringType.BASE64,
	maxLength: 1_000_000,
	minLength: 4,
	pattern: String.raw`/^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/`,
};

const BCRYPT: TApiPropertyDefaultStringFormatProperties = {
	description: "bcrypt password hash",
	// eslint-disable-next-line @elsikora/no-secrets/no-secrets
	exampleValue: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
	format: EApiPropertyStringType.BCRYPT,
	maxLength: 60,
	minLength: 60,
	pattern: String.raw`/^\$2[aby]\$\d{1,2}\$[.\/A-Za-z0-9]{53}$/`,
};

const COUNTRY_CODE_ALPHA2: TApiPropertyDefaultStringFormatProperties = {
	description: "ISO 3166-1 alpha-2 country code",
	exampleValue: "US",
	format: EApiPropertyStringType.COUNTRY_CODE_ALPHA2,
	maxLength: 2,
	minLength: 2,
	pattern: String.raw`/^[A-Z]{2}$/`,
};

const CREDIT_CARD: TApiPropertyDefaultStringFormatProperties = {
	description: "credit card number",
	exampleValue: "4532015112830366",
	format: EApiPropertyStringType.CREDIT_CARD as EApiPropertyStringType,
	maxLength: 19,
	minLength: 13,
	pattern: String.raw`/^[0-9]{13,19}$/`,
};

const COUNTRY_CODE_ALPHA3: TApiPropertyDefaultStringFormatProperties = {
	description: "ISO 3166-1 alpha-3 country code",
	exampleValue: "USA",
	format: EApiPropertyStringType.COUNTRY_CODE_ALPHA3,
	maxLength: 3,
	minLength: 3,
	pattern: String.raw`/^[A-Z]{3}$/`,
};

const CURRENCY_CODE: TApiPropertyDefaultStringFormatProperties = {
	description: "ISO 4217 currency code",
	exampleValue: "USD",
	format: EApiPropertyStringType.CURRENCY_CODE,
	maxLength: 3,
	minLength: 3,
	pattern: String.raw`/^[A-Z]{3}$/`,
};

const DOMAIN: TApiPropertyDefaultStringFormatProperties = {
	description: "domain name",
	exampleValue: "example.com",
	format: EApiPropertyStringType.DOMAIN,
	maxLength: 253,
	minLength: 1,
	pattern: String.raw`/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/`,
};

const EMAIL: TApiPropertyDefaultStringFormatProperties = {
	description: "email",
	exampleValue: "user@example.com",
	format: EApiPropertyStringType.EMAIL,
	maxLength: 321,
	minLength: 5,
	pattern: String.raw`/^([a-zA-Z0-9_\-.+])+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/`,
};

const HASH_MD5: TApiPropertyDefaultStringFormatProperties = {
	description: "MD5 hash",
	exampleValue: "5d41402abc4b2a76b9719d911017c592",
	format: EApiPropertyStringType.HASH_MD5,
	maxLength: 32,
	minLength: 32,
	pattern: String.raw`/^[a-fA-F0-9]{32}$/`,
};

const HASH_SHA1: TApiPropertyDefaultStringFormatProperties = {
	description: "SHA-1 hash",
	exampleValue: "356a192b7913b04c54574d18c28d46e6395428ab",
	format: EApiPropertyStringType.HASH_SHA1,
	maxLength: 40,
	minLength: 40,
	pattern: String.raw`/^[a-fA-F0-9]{40}$/`,
};

const HASH_SHA256: TApiPropertyDefaultStringFormatProperties = {
	description: "SHA-256 hash",
	exampleValue: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
	format: EApiPropertyStringType.HASH_SHA256,
	maxLength: 64,
	minLength: 64,
	pattern: String.raw`/^[a-fA-F0-9]{64}$/`,
};

const HASH_SHA512: TApiPropertyDefaultStringFormatProperties = {
	description: "SHA-512 hash",
	exampleValue: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
	format: EApiPropertyStringType.HASH_SHA512,
	maxLength: 128,
	minLength: 128,
	pattern: String.raw`/^[a-fA-F0-9]{128}$/`,
};

const HEX_COLOR: TApiPropertyDefaultStringFormatProperties = {
	description: "hexadecimal color code",
	exampleValue: "#FF5733",
	format: EApiPropertyStringType.HEX_COLOR,
	maxLength: 7,
	minLength: 4,
	pattern: String.raw`/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/`,
};

const IBAN: TApiPropertyDefaultStringFormatProperties = {
	description: "International Bank Account Number",
	exampleValue: "GB82WEST12345698765432",
	format: EApiPropertyStringType.IBAN,
	maxLength: 34,
	minLength: 15,
	pattern: String.raw`/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/`,
};

const IPV4: TApiPropertyDefaultStringFormatProperties = {
	description: "IPv4 address",
	// eslint-disable-next-line @elsikora/sonar/no-hardcoded-ip
	exampleValue: "192.168.0.1",
	format: EApiPropertyStringType.IPV4,
	maxLength: 15,
	minLength: 7,
	pattern: String.raw`/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/`,
};

const IPV6: TApiPropertyDefaultStringFormatProperties = {
	description: "IPv6 address",
	// eslint-disable-next-line @elsikora/sonar/no-hardcoded-ip
	exampleValue: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
	format: EApiPropertyStringType.IPV6,
	maxLength: 45,
	minLength: 2,
	pattern: String.raw`/^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/`,
};

const ISBN: TApiPropertyDefaultStringFormatProperties = {
	description: "International Standard Book Number",
	exampleValue: "978-3-16-148410-0",
	format: EApiPropertyStringType.ISBN,
	maxLength: 17,
	minLength: 10,
	pattern: String.raw`/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/`,
};

const JWT: TApiPropertyDefaultStringFormatProperties = {
	description: "JSON Web Token",
	// eslint-disable-next-line @elsikora/no-secrets/no-secrets
	exampleValue: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
	format: EApiPropertyStringType.JWT,
	maxLength: 10_000,
	minLength: 100,
	pattern: String.raw`/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/`,
};

const LANGUAGE_CODE_ISO639: TApiPropertyDefaultStringFormatProperties = {
	description: "ISO 639-1 language code",
	exampleValue: "en",
	format: EApiPropertyStringType.LANGUAGE_CODE_ISO639,
	maxLength: 2,
	minLength: 2,
	pattern: String.raw`/^[a-z]{2}$/`,
};

const MAC_ADDRESS: TApiPropertyDefaultStringFormatProperties = {
	description: "MAC address",
	exampleValue: "00:1B:63:84:45:E6",
	format: EApiPropertyStringType.MAC_ADDRESS,
	maxLength: 17,
	minLength: 17,
	pattern: String.raw`/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/`,
};

const MIME_TYPE: TApiPropertyDefaultStringFormatProperties = {
	description: "MIME type",
	exampleValue: "application/json",
	format: EApiPropertyStringType.MIME_TYPE,
	maxLength: 255,
	minLength: 3,
	pattern: String.raw`/^[a-zA-Z0-9][a-zA-Z0-9!#$&^_+-]*(\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_+.-]*)+$/`,
};

const PHONE_NUMBER: TApiPropertyDefaultStringFormatProperties = {
	description: "E.164 phone number",
	exampleValue: "+14155552671",
	format: EApiPropertyStringType.PHONE_NUMBER,
	maxLength: 16,
	minLength: 8,
	pattern: String.raw`/^\+[1-9]\d{1,14}$/`,
};

const POSTAL_CODE: TApiPropertyDefaultStringFormatProperties = {
	description: "postal code",
	exampleValue: "12345",
	format: EApiPropertyStringType.POSTAL_CODE,
	maxLength: 10,
	minLength: 3,
	pattern: String.raw`/^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$/`,
};

const SEMVER: TApiPropertyDefaultStringFormatProperties = {
	description: "semantic version",
	exampleValue: "1.2.3",
	format: EApiPropertyStringType.SEMVER,
	maxLength: 50,
	minLength: 5,
	pattern: String.raw`/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/`,
};

const SLUG: TApiPropertyDefaultStringFormatProperties = {
	description: "URL slug",
	exampleValue: "my-blog-post",
	format: EApiPropertyStringType.SLUG,
	maxLength: 200,
	minLength: 1,
	pattern: String.raw`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`,
};

const TIMEZONE: TApiPropertyDefaultStringFormatProperties = {
	description: "IANA timezone identifier",
	exampleValue: "Europe/Kiev",
	format: EApiPropertyStringType.TIMEZONE,
	maxLength: 50,
	minLength: 3,
	pattern: String.raw`/^[A-Za-z]+(?:\/[A-Za-z_]+)+$/`,
};

const URL: TApiPropertyDefaultStringFormatProperties = {
	description: "URL",
	exampleValue: "https://example.com",
	format: EApiPropertyStringType.URL,
	maxLength: 2048,
	minLength: 3,
	pattern: String.raw`/^(https?):\/\/[\w\-]+(\.[\w\-]+)+([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?$/`,
};

// eslint-disable-next-line @elsikora/no-secrets/no-pattern-match
const API_KEY: TApiPropertyDefaultStringFormatProperties = {
	description: "API key",
	exampleValue: "sk_live_51HqT2xKz9pQr3sF8vN4hG2mL",
	format: EApiPropertyStringType.API_KEY,
	maxLength: 100,
	minLength: 20,
	pattern: String.raw`/^[a-zA-Z0-9_\-]{20,100}$/`,
};

const BITCOIN_ADDRESS: TApiPropertyDefaultStringFormatProperties = {
	description: "Bitcoin address",
	exampleValue: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
	format: EApiPropertyStringType.BITCOIN_ADDRESS,
	maxLength: 35,
	minLength: 26,
	pattern: String.raw`/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/`,
};

const COORDINATES: TApiPropertyDefaultStringFormatProperties = {
	description: "geographic coordinates (latitude,longitude)",
	exampleValue: "50.4501,30.5234",
	format: EApiPropertyStringType.COORDINATES,
	maxLength: 50,
	minLength: 3,
	pattern: String.raw`/^-?([1-8]?[0-9](\.\d+)?|90(\.0+)?),\s*-?(1[0-7][0-9](\.\d+)?|[1-9]?[0-9](\.\d+)?|180(\.0+)?)$/`,
};

const CRON: TApiPropertyDefaultStringFormatProperties = {
	description: "cron expression",
	exampleValue: "0 */6 * * *",
	format: EApiPropertyStringType.CRON,
	maxLength: 100,
	minLength: 9,
	pattern: String.raw`/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/`,
};

const DATA_URI: TApiPropertyDefaultStringFormatProperties = {
	description: "data URI",
	exampleValue: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
	format: EApiPropertyStringType.DATA_URI,
	maxLength: 1_000_000,
	minLength: 14,
	pattern: String.raw`/^data:[a-zA-Z0-9\/+\-]+;base64,[A-Za-z0-9+\/=]+$/`,
};

const ETHEREUM_ADDRESS: TApiPropertyDefaultStringFormatProperties = {
	description: "Ethereum address",
	exampleValue: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
	format: EApiPropertyStringType.ETHEREUM_ADDRESS,
	maxLength: 42,
	minLength: 42,
	pattern: String.raw`/^0x[a-fA-F0-9]{40}$/`,
};

const FILE_PATH: TApiPropertyDefaultStringFormatProperties = {
	description: "file path",
	exampleValue: "/home/user/documents/file.txt",
	format: EApiPropertyStringType.FILE_PATH,
	maxLength: 500,
	minLength: 1,
	pattern: String.raw`/^[^\0]+$/`,
};

const GIT_COMMIT_SHA: TApiPropertyDefaultStringFormatProperties = {
	description: "Git commit SHA",
	exampleValue: "a3c4f2b1e8d9c7a6b5e4d3c2b1a098765432",
	format: EApiPropertyStringType.GIT_COMMIT_SHA,
	maxLength: 40,
	minLength: 7,
	pattern: String.raw`/^[a-fA-F0-9]{7,40}$/`,
};

const HSL_COLOR: TApiPropertyDefaultStringFormatProperties = {
	description: "HSL color",
	exampleValue: "hsl(120, 100%, 50%)",
	format: EApiPropertyStringType.HSL_COLOR,
	maxLength: 30,
	minLength: 10,
	pattern: String.raw`/^hsl\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/`,
};

const HSLA_COLOR: TApiPropertyDefaultStringFormatProperties = {
	description: "HSLA color",
	exampleValue: "hsla(120, 100%, 50%, 0.5)",
	format: EApiPropertyStringType.HSLA_COLOR,
	maxLength: 40,
	minLength: 15,
	pattern: String.raw`/^hsla\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*,\s*(0|1|0?\.\d+)\s*\)$/`,
};

const LOCALE: TApiPropertyDefaultStringFormatProperties = {
	description: "locale identifier",
	exampleValue: "en-US",
	format: EApiPropertyStringType.LOCALE,
	maxLength: 8,
	minLength: 2,
	pattern: String.raw`/^[a-z]{2}(-[A-Z]{2})?$/`,
};

const MONGODB_OBJECT_ID: TApiPropertyDefaultStringFormatProperties = {
	description: "MongoDB ObjectId",
	exampleValue: "507f1f77bcf86cd799439011",
	format: EApiPropertyStringType.MONGODB_OBJECT_ID,
	maxLength: 24,
	minLength: 24,
	pattern: String.raw`/^[a-fA-F0-9]{24}$/`,
};

const NANOID: TApiPropertyDefaultStringFormatProperties = {
	description: "NanoID",
	exampleValue: "V1StGXR8_Z5jdHi6B-myT",
	format: EApiPropertyStringType.NANOID,
	maxLength: 21,
	minLength: 21,
	pattern: String.raw`/^[A-Za-z0-9_-]{21}$/`,
};

const OAUTH2_SCOPE: TApiPropertyDefaultStringFormatProperties = {
	description: "OAuth2 scope",
	exampleValue: "read:user write:repo",
	format: EApiPropertyStringType.OAUTH2_SCOPE,
	maxLength: 200,
	minLength: 1,
	pattern: String.raw`/^[a-zA-Z0-9_:\-]+(?: [a-zA-Z0-9_:\-]+)*$/`,
};

// eslint-disable-next-line @elsikora/no-secrets/no-pattern-match
const PASSWORD: TApiPropertyDefaultStringFormatProperties = {
	description: "password",
	exampleValue: "StrongP@ssw0rd!",
	format: EApiPropertyStringType.PASSWORD,
	maxLength: 128,
	minLength: 8,
	pattern: String.raw`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/`,
};

const RGB_COLOR: TApiPropertyDefaultStringFormatProperties = {
	description: "RGB color",
	exampleValue: "rgb(255, 128, 0)",
	format: EApiPropertyStringType.RGB_COLOR,
	maxLength: 20,
	minLength: 10,
	pattern: String.raw`/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/`,
};

const RGBA_COLOR: TApiPropertyDefaultStringFormatProperties = {
	description: "RGBA color",
	exampleValue: "rgba(255, 128, 0, 0.5)",
	format: EApiPropertyStringType.RGBA_COLOR,
	maxLength: 30,
	minLength: 15,
	pattern: String.raw`/^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0|1|0?\.\d+)\s*\)$/`,
};

const ULID: TApiPropertyDefaultStringFormatProperties = {
	description: "ULID",
	exampleValue: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
	format: EApiPropertyStringType.ULID,
	maxLength: 26,
	minLength: 26,
	pattern: String.raw`/^[0-9A-HJKMNP-TV-Z]{26}$/`,
};

const URL_PATH: TApiPropertyDefaultStringFormatProperties = {
	description: "URL path",
	exampleValue: "/api/v1/users/123",
	format: EApiPropertyStringType.URL_PATH,
	maxLength: 500,
	minLength: 1,
	pattern: String.raw`/^\/[a-zA-Z0-9\/_\-\.]*$/`,
};

const USERNAME: TApiPropertyDefaultStringFormatProperties = {
	description: "username",
	exampleValue: "john_doe123",
	format: EApiPropertyStringType.USERNAME,
	maxLength: 30,
	minLength: 3,
	pattern: String.raw`/^[a-zA-Z0-9_]{3,30}$/`,
};

const UUID: TApiPropertyDefaultStringFormatProperties = {
	description: "UUID",
	exampleValue: "123e4567-e89b-12d3-a456-426614174000",
	format: EApiPropertyStringType.UUID,
	maxLength: 36,
	minLength: 36,
	pattern: String.raw`/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/`,
};

export const DEFAULT_STRING_FORMAT_PROPERTY_API_INTERFACE_CONSTANT: {
	readonly DEFAULT_FORMAT_PROPERTIES: Record<TApiPropertyDefaultStringFormat, TApiPropertyDefaultStringFormatProperties>;
} = {
	DEFAULT_FORMAT_PROPERTIES: {
		[EApiPropertyStringType.API_KEY]: API_KEY,
		[EApiPropertyStringType.BASE64]: BASE64,
		[EApiPropertyStringType.BCRYPT]: BCRYPT,
		[EApiPropertyStringType.BITCOIN_ADDRESS]: BITCOIN_ADDRESS,
		[EApiPropertyStringType.COORDINATES]: COORDINATES,
		[EApiPropertyStringType.COUNTRY_CODE_ALPHA2]: COUNTRY_CODE_ALPHA2,
		[EApiPropertyStringType.COUNTRY_CODE_ALPHA3]: COUNTRY_CODE_ALPHA3,
		[EApiPropertyStringType.CREDIT_CARD]: CREDIT_CARD,
		[EApiPropertyStringType.CRON]: CRON,
		[EApiPropertyStringType.CURRENCY_CODE]: CURRENCY_CODE,
		[EApiPropertyStringType.DATA_URI]: DATA_URI,
		[EApiPropertyStringType.DOMAIN]: DOMAIN,
		[EApiPropertyStringType.EMAIL]: EMAIL,
		[EApiPropertyStringType.ETHEREUM_ADDRESS]: ETHEREUM_ADDRESS,
		[EApiPropertyStringType.FILE_PATH]: FILE_PATH,
		[EApiPropertyStringType.GIT_COMMIT_SHA]: GIT_COMMIT_SHA,
		[EApiPropertyStringType.HASH_MD5]: HASH_MD5,
		[EApiPropertyStringType.HASH_SHA1]: HASH_SHA1,
		[EApiPropertyStringType.HASH_SHA256]: HASH_SHA256,
		[EApiPropertyStringType.HASH_SHA512]: HASH_SHA512,
		[EApiPropertyStringType.HEX_COLOR]: HEX_COLOR,
		[EApiPropertyStringType.HSL_COLOR]: HSL_COLOR,
		[EApiPropertyStringType.HSLA_COLOR]: HSLA_COLOR,
		[EApiPropertyStringType.IBAN]: IBAN,
		[EApiPropertyStringType.IPV4]: IPV4,
		[EApiPropertyStringType.IPV6]: IPV6,
		[EApiPropertyStringType.ISBN]: ISBN,
		[EApiPropertyStringType.JWT]: JWT,
		[EApiPropertyStringType.LANGUAGE_CODE_ISO639]: LANGUAGE_CODE_ISO639,
		[EApiPropertyStringType.LOCALE]: LOCALE,
		[EApiPropertyStringType.MAC_ADDRESS]: MAC_ADDRESS,
		[EApiPropertyStringType.MIME_TYPE]: MIME_TYPE,
		[EApiPropertyStringType.MONGODB_OBJECT_ID]: MONGODB_OBJECT_ID,
		[EApiPropertyStringType.NANOID]: NANOID,
		[EApiPropertyStringType.OAUTH2_SCOPE]: OAUTH2_SCOPE,
		[EApiPropertyStringType.PASSWORD]: PASSWORD,
		[EApiPropertyStringType.PHONE_NUMBER]: PHONE_NUMBER,
		[EApiPropertyStringType.POSTAL_CODE]: POSTAL_CODE,
		[EApiPropertyStringType.RGB_COLOR]: RGB_COLOR,
		[EApiPropertyStringType.RGBA_COLOR]: RGBA_COLOR,
		[EApiPropertyStringType.SEMVER]: SEMVER,
		[EApiPropertyStringType.SLUG]: SLUG,
		[EApiPropertyStringType.TIMEZONE]: TIMEZONE,
		[EApiPropertyStringType.ULID]: ULID,
		[EApiPropertyStringType.URL]: URL,
		[EApiPropertyStringType.URL_PATH]: URL_PATH,
		[EApiPropertyStringType.USERNAME]: USERNAME,
		[EApiPropertyStringType.UUID]: UUID,
	},
} as const;

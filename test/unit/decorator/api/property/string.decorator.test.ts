import "reflect-metadata";

import type { TApiPropertyStringProperties } from "@type/decorator/api/property";

import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

class StringEntity {}

const buildStringDto = (format: EApiPropertyStringType, overrides: Partial<TApiPropertyStringProperties> = {}) => {
	class StringDto {
		@ApiPropertyString({
			description: "value",
			entity: StringEntity,
			exampleValue: "value",
			format,
			maxLength: 50,
			minLength: 1,
			pattern: "/^.+$/",
			isRequired: true,
			...overrides,
		} as TApiPropertyStringProperties)
		public value!: unknown;
	}

	return StringDto;
};

const stringFormats: Array<EApiPropertyStringType> = [
	EApiPropertyStringType.API_KEY,
	EApiPropertyStringType.BCRYPT,
	EApiPropertyStringType.COORDINATES,
	EApiPropertyStringType.CRON,
	EApiPropertyStringType.FILE_PATH,
	EApiPropertyStringType.GIT_COMMIT_SHA,
	EApiPropertyStringType.HSLA_COLOR,
	EApiPropertyStringType.LANGUAGE_CODE_ISO639,
	EApiPropertyStringType.NANOID,
	EApiPropertyStringType.OAUTH2_SCOPE,
	EApiPropertyStringType.RGBA_COLOR,
	EApiPropertyStringType.SLUG,
	EApiPropertyStringType.STRING,
	EApiPropertyStringType.ULID,
	EApiPropertyStringType.URL_PATH,
	EApiPropertyStringType.USERNAME,
];

const validatorFormats: Array<{ format: EApiPropertyStringType; valid: unknown; invalid: unknown }> = [
	{ format: EApiPropertyStringType.BASE64, valid: "dGVzdA==", invalid: "not-base64" },
	{ format: EApiPropertyStringType.BITCOIN_ADDRESS, valid: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", invalid: "not-btc" },
	{ format: EApiPropertyStringType.COUNTRY_CODE_ALPHA2, valid: "US", invalid: "USA" },
	{ format: EApiPropertyStringType.COUNTRY_CODE_ALPHA3, valid: "USA", invalid: "US" },
	{ format: EApiPropertyStringType.CREDIT_CARD, valid: "4111111111111111", invalid: "123" },
	{ format: EApiPropertyStringType.CURRENCY_CODE, valid: "USD", invalid: "US" },
	{ format: EApiPropertyStringType.DATA_URI, valid: "data:text/plain;base64,SGVsbG8=", invalid: "not-data-uri" },
	{ format: EApiPropertyStringType.DATE, valid: new Date(), invalid: "not-a-date" },
	{ format: EApiPropertyStringType.DOMAIN, valid: "example.com", invalid: "not a domain" },
	{ format: EApiPropertyStringType.EMAIL, valid: "user@example.com", invalid: "nope" },
	{ format: EApiPropertyStringType.ETHEREUM_ADDRESS, valid: "0x52908400098527886E0F7030069857D2E4169EE7", invalid: "0x123" },
	{ format: EApiPropertyStringType.HASH_MD5, valid: "5d41402abc4b2a76b9719d911017c592", invalid: "zz" },
	{ format: EApiPropertyStringType.HASH_SHA1, valid: "da39a3ee5e6b4b0d3255bfef95601890afd80709", invalid: "123" },
	{ format: EApiPropertyStringType.HASH_SHA256, valid: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", invalid: "123" },
	{
		format: EApiPropertyStringType.HASH_SHA512,
		valid: "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
		invalid: "123",
	},
	{ format: EApiPropertyStringType.HEX_COLOR, valid: "#ffffff", invalid: "not-color" },
	{ format: EApiPropertyStringType.HSL_COLOR, valid: "hsl(0, 100%, 50%)", invalid: "rgb(0,0,0)" },
	{ format: EApiPropertyStringType.IBAN, valid: "GB82WEST12345698765432", invalid: "GB00" },
	{ format: EApiPropertyStringType.IPV4, valid: "192.168.0.1", invalid: "999.999.999.999" },
	{ format: EApiPropertyStringType.IPV6, valid: "2001:0db8:85a3:0000:0000:8a2e:0370:7334", invalid: "not-ip" },
	{ format: EApiPropertyStringType.ISBN, valid: "9783161484100", invalid: "123" },
	{
		format: EApiPropertyStringType.JWT,
		valid: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
		invalid: "not.jwt",
	},
	{ format: EApiPropertyStringType.LOCALE, valid: "en_US", invalid: "123" },
	{ format: EApiPropertyStringType.LOWERCASE_STRING, valid: "lowercase", invalid: "Upper" },
	{ format: EApiPropertyStringType.MAC_ADDRESS, valid: "00:1A:2B:3C:4D:5E", invalid: "00:1A:2B:3C:4D" },
	{ format: EApiPropertyStringType.MIME_TYPE, valid: "text/plain", invalid: "text" },
	{ format: EApiPropertyStringType.MONGODB_OBJECT_ID, valid: "507f1f77bcf86cd799439011", invalid: "123" },
	{ format: EApiPropertyStringType.PASSWORD, valid: "Aa1!aaaa", invalid: "weak" },
	{ format: EApiPropertyStringType.PHONE_NUMBER, valid: "+12125551234", invalid: "123" },
	{ format: EApiPropertyStringType.POSTAL_CODE, valid: "12345", invalid: "not-postal" },
	{ format: EApiPropertyStringType.REGEXP, valid: "^[a-z]+$", invalid: "[a-" },
	{ format: EApiPropertyStringType.RGB_COLOR, valid: "rgb(255,0,0)", invalid: "rgb(255,0)" },
	{ format: EApiPropertyStringType.SEMVER, valid: "1.2.3", invalid: "1.2" },
	{ format: EApiPropertyStringType.TIMEZONE, valid: "Europe/Paris", invalid: "Not/AZone" },
	{ format: EApiPropertyStringType.UPPERCASE_STRING, valid: "UPPER", invalid: "Upper" },
	{ format: EApiPropertyStringType.URL, valid: "https://example.com", invalid: "example.com" },
	{ format: EApiPropertyStringType.UUID, valid: "550e8400-e29b-41d4-a716-446655440000", invalid: "not-uuid" },
];

describe("ApiPropertyString", () => {
	it("writes swagger metadata and trims pattern delimiters", () => {
		const StringDto = buildStringDto(EApiPropertyStringType.STRING);
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, StringDto.prototype, "value");

		expect(metadata?.pattern).toBe("^.+$");
		expect(metadata?.minLength).toBe(1);
		expect(metadata?.maxLength).toBe(50);
	});

	it.each(stringFormats)("applies IsString validation for %s", (format) => {
		const StringDto = buildStringDto(format);
		const errors = validateSync(Object.assign(new StringDto(), { value: 123 }));

		expect(errors[0]?.constraints?.isString).toBeDefined();
	});

	it.each(validatorFormats)("validates format %s", ({ format, valid, invalid }) => {
		const StringDto = buildStringDto(format);

		const validErrors = validateSync(Object.assign(new StringDto(), { value: valid }));
		expect(validErrors).toHaveLength(0);

		const invalidErrors = validateSync(Object.assign(new StringDto(), { value: invalid }));
		expect(invalidErrors.length).toBeGreaterThan(0);
	});

	it("transforms DATE format strings into Date objects", () => {
		const DateDto = buildStringDto(EApiPropertyStringType.DATE);
		const instance = plainToInstance(DateDto, { value: "2025-01-01T00:00:00.000Z" });

		expect(instance.value).toBeInstanceOf(Date);
		expect(validateSync(instance)).toHaveLength(0);
	});

	it("throws for invalid regex format", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyString({
				description: "regex",
				entity: StringEntity,
				exampleValue: "test",
				format: EApiPropertyStringType.STRING,
				maxLength: 10,
				minLength: 1,
				pattern: "^[a-z]+$",
				isRequired: true,
			});

			decorator({}, "regex");
		};

		expect(applyDecorator).toThrow("ApiPropertyString error: Invalid RegExp 'pattern' format: ^[a-z]+$");
	});

	it("throws when example does not match pattern", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyString({
				description: "name",
				entity: StringEntity,
				exampleValue: "def",
				format: EApiPropertyStringType.STRING,
				maxLength: 10,
				minLength: 1,
				pattern: "/^abc$/",
				isRequired: true,
			});

			decorator({}, "name");
		};

		expect(applyDecorator).toThrow("ApiPropertyString error: RegExp 'pattern' does not match 'exampleValue' string: def");
	});

	it("throws on invalid length bounds", () => {
		const applyDecorator = () => {
			const decorator = ApiPropertyString({
				description: "name",
				entity: StringEntity,
				exampleValue: "Test",
				format: EApiPropertyStringType.STRING,
				maxLength: 1,
				minLength: 5,
				pattern: "/^.+$/",
				isRequired: true,
			});

			decorator({}, "name");
		};

		expect(applyDecorator).toThrow("ApiPropertyString error: 'minLength' is greater than 'maxLength'");
	});
});

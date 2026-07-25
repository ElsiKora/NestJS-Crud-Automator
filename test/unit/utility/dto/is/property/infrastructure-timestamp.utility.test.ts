import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { DtoIsPropertyInfrastructureTimestamp } from "@utility/dto/is/property/infrastructure-timestamp.utility";
import { describe, expect, it } from "vitest";

const infrastructureIdentifiers: Array<EApiPropertyDateIdentifier> = [EApiPropertyDateIdentifier.CREATED_AT, EApiPropertyDateIdentifier.RECEIVED_AT, EApiPropertyDateIdentifier.UPDATED_AT];

const businessIdentifiers: Array<EApiPropertyDateIdentifier> = [EApiPropertyDateIdentifier.CREATED_AT_FROM, EApiPropertyDateIdentifier.CREATED_AT_TO, EApiPropertyDateIdentifier.DATE, EApiPropertyDateIdentifier.EXPIRES_IN, EApiPropertyDateIdentifier.RECEIVED_AT_FROM, EApiPropertyDateIdentifier.RECEIVED_AT_TO, EApiPropertyDateIdentifier.REFRESH_IN, EApiPropertyDateIdentifier.UPDATED_AT_FROM, EApiPropertyDateIdentifier.UPDATED_AT_TO];

describe("DtoIsPropertyInfrastructureTimestamp", () => {
	it.each(infrastructureIdentifiers)("recognizes the %s infrastructure identifier", (identifier: EApiPropertyDateIdentifier) => {
		const metadata = {
			format: EApiPropertyDateType.DATE_TIME,
			identifier,
			type: EApiPropertyDescribeType.DATE,
		} as TApiPropertyDescribeProperties;

		expect(DtoIsPropertyInfrastructureTimestamp(metadata)).toBe(true);
	});

	it.each(businessIdentifiers)("does not treat the %s business or filter identifier as infrastructure", (identifier: EApiPropertyDateIdentifier) => {
		const metadata = {
			format: EApiPropertyDateType.DATE_TIME,
			identifier,
			type: EApiPropertyDescribeType.DATE,
		} as TApiPropertyDescribeProperties;

		expect(DtoIsPropertyInfrastructureTimestamp(metadata)).toBe(false);
	});

	it("does not infer infrastructure ownership from a non-date property", () => {
		const metadata = {
			description: "createdAt",
			exampleValue: "client-value",
			format: EApiPropertyStringType.STRING,
			maxLength: 64,
			minLength: 1,
			pattern: "/^.+$/",
			type: EApiPropertyDescribeType.STRING,
		} as TApiPropertyDescribeProperties;

		expect(DtoIsPropertyInfrastructureTimestamp(metadata)).toBe(false);
	});
});

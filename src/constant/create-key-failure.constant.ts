export const CREATE_KEY_FAILURE_CONSTANT: { FINER_THAN_COLUMN_CONSTRAINT: string; NO_TIME_ZONE_CONSTRAINT: string; NOT_DATE_TIME_CONSTRAINT: string; REPEATED_HOUR_CONSTRAINT: string } = {
	FINER_THAN_COLUMN_CONSTRAINT: "createKeyFinerThanColumn",
	NO_TIME_ZONE_CONSTRAINT: "createKeyNoTimeZone",
	// The name `@ApiPropertyDate` gives its rule, so a host translates a key that is not a date and time as it does a body value.
	NOT_DATE_TIME_CONSTRAINT: "isDateFormatValue",
	REPEATED_HOUR_CONSTRAINT: "createKeyRepeatedHour",
} as const;

export enum EFilterOperation {
	BETWEEN = "between",
	CONT = "cont",
	CONTL = "contl",
	ENDS = "ends",
	ENDSL = "endsl",
	EQ = "eq",
	EQL = "eql",
	EXCL = "excl",
	EXCLL = "excll",
	GT = "gt",
	GTE = "gte",
	IN = "in",
	INL = "inl",
	ISNULL = "isnull",
	LT = "lt",
	LTE = "lte",
	NE = "ne",
	NEL = "nel",
	NOTIN = "notin",
	NOTINL = "notinl",
	NOTNULL = "notnull",
	STARTS = "starts",
	STARTSL = "startsl",
}

export enum EFilterOperationString {
	CONT = EFilterOperation.CONT,
	CONTL = EFilterOperation.CONTL,
	ENDS = EFilterOperation.ENDS,
	ENDSL = EFilterOperation.ENDSL,
	EQ = EFilterOperation.EQ,
	EQL = EFilterOperation.EQL,
	IN = EFilterOperation.IN,
	INL = EFilterOperation.INL,
	ISNULL = EFilterOperation.ISNULL,
	NE = EFilterOperation.NE,
	NEL = EFilterOperation.NEL,
	NOTIN = EFilterOperation.NOTIN,
	NOTINL = EFilterOperation.NOTINL,
	NOTNULL = EFilterOperation.NOTNULL,
	STARTS = EFilterOperation.STARTS,
	STARTSL = EFilterOperation.STARTSL,
}

export enum EFilterOperationNumber {
	BETWEEN = EFilterOperation.BETWEEN,
	EQ = EFilterOperation.EQ,
	GT = EFilterOperation.GT,
	GTE = EFilterOperation.GTE,
	IN = EFilterOperation.IN,
	ISNULL = EFilterOperation.ISNULL,
	LT = EFilterOperation.LT,
	LTE = EFilterOperation.LTE,
	NE = EFilterOperation.NE,
	NOTIN = EFilterOperation.NOTIN,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationEnum {
	EQ = EFilterOperation.EQ,
	IN = EFilterOperation.IN,
	ISNULL = EFilterOperation.ISNULL,
	NE = EFilterOperation.NE,
	NOTIN = EFilterOperation.NOTIN,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationArray {
	CONT = EFilterOperation.CONT,
	EXCL = EFilterOperation.EXCL,
	ISNULL = EFilterOperation.ISNULL,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationObject {
	EQ = EFilterOperation.EQ,
	ISNULL = EFilterOperation.ISNULL,
	NE = EFilterOperation.NE,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationDate {
	BETWEEN = EFilterOperation.BETWEEN,
	EQ = EFilterOperation.EQ,
	GT = EFilterOperation.GT,
	GTE = EFilterOperation.GTE,
	ISNULL = EFilterOperation.ISNULL,
	LT = EFilterOperation.LT,
	LTE = EFilterOperation.LTE,
	NE = EFilterOperation.NE,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationBoolean {
	EQ = EFilterOperation.EQ,
	EXCL = EFilterOperation.EXCL,
	IN = EFilterOperation.IN,
	ISNULL = EFilterOperation.ISNULL,
	NE = EFilterOperation.NE,
	NOTIN = EFilterOperation.NOTIN,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationRelation {
	EQ = EFilterOperation.EQ,
	ISNULL = EFilterOperation.ISNULL,
	NE = EFilterOperation.NE,
	NOTNULL = EFilterOperation.NOTNULL,
}

export enum EFilterOperationUuid {
	EQ = EFilterOperation.EQ,
	ISNULL = EFilterOperation.ISNULL,
	NE = EFilterOperation.NE,
	NOTNULL = EFilterOperation.NOTNULL,
}

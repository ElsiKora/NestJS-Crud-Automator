const MINIMUM_LIST_LENGTH: number = 1;
const MAXIMUM_LIST_LENGTH: number = 100;
const MINIMUM_LIST_PAGES_COUNT: number = 1;
const MAXIMUM_LIST_PAGES_COUNT: number = 100;

const GET_LIST_QUERY_DTO_FACTOR_CONSTANT: {
    readonly MAXIMUM_LIST_LENGTH: number;
    readonly MAXIMUM_LIST_PAGES_COUNT: number;
    readonly MINIMUM_LIST_LENGTH: number;
    readonly MINIMUM_LIST_PAGES_COUNT: number;
} = {
    MAXIMUM_LIST_LENGTH,
    MAXIMUM_LIST_PAGES_COUNT,
    MINIMUM_LIST_LENGTH,
    MINIMUM_LIST_PAGES_COUNT,
} as const;

export default GET_LIST_QUERY_DTO_FACTOR_CONSTANT;

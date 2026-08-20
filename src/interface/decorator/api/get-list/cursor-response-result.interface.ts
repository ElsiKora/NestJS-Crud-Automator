export interface IApiGetListCursorResponseResult<T> {
	items: Array<T>;
	nextCursor: null | string;
	previousCursor: null | string;
}

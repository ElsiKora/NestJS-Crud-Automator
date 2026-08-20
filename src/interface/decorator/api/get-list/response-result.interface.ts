export interface IApiGetListResponseResult<T> {
	count: number;
	currentPage: number;
	items: Array<T>;
	totalCount: number;
	totalPages: number;
}

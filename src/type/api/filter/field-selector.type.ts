export type TFilterFieldSelector<E> = {
    [K in keyof E]?: boolean;
};

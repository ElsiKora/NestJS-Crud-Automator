export class ApiServiceBase {
    create(properties) {
        void properties;
        return Promise.resolve({});
    }
    delete(criteria) {
        void criteria;
        return Promise.resolve();
    }
    get(properties) {
        void properties;
        return Promise.resolve({});
    }
    getList(properties) {
        void properties;
        return Promise.resolve({ items: [], total: 0 });
    }
    getMany(properties) {
        void properties;
        return Promise.resolve([]);
    }
    update(criteria, properties) {
        void criteria;
        void properties;
        return Promise.resolve({});
    }
}
//# sourceMappingURL=service-base.class.js.map
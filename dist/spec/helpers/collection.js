import fakeStorage from './fakeStorage';
export const createTestMoltenOptions = () => {
    return {
        storage: {
            testStorage: {
                connect: fakeStorage(),
                options: {
                    store: 'testStorage',
                    persist: true
                }
            },
            secondStorage: {
                connect: fakeStorage(),
                options: {
                    store: 'secondStorage',
                    persist: true
                }
            }
        },
        collectionsStorage: {
            storage: 'testStorage',
            table: 'collections'
        }
    };
};
export const testCollection = {
    name: 'test',
    label: 'Test Collection',
    storage: {
        default: {
            type: 'testStorage',
            name: 'test'
        }
    },
    fields: {
        _id: {
            label: 'ID',
            type: 'number'
        },
        field1: {
            label: 'Field 1',
            type: 'string'
        },
        field2: {
            label: 'Field 2',
            type: 'string'
        }
    }
};
export const testMultistoreCollection = {
    name: 'test',
    label: 'Test Collection',
    storage: {
        default: {
            type: 'testStorage',
            name: 'test'
        },
        second: {
            type: 'secondStorage',
            name: 'test'
        }
    },
    fields: {
        _id: {
            label: 'ID',
            type: 'number'
        },
        field1: {
            label: 'Field 1',
            type: 'string',
            storage: ['default']
        },
        field2: {
            label: 'Field 2',
            type: 'string',
            storage: ['default', 'second']
        }
    }
};
export const testData = [
    {
        _id: 1,
        field1: 'test1',
        field2: 'test2'
    },
    {
        _id: 2,
        field1: 'test2',
        field2: 'test3'
    }
];

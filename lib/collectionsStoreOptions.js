"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionsStoreOptions = {
    name: 'collections',
    storage: {
        default: {
            type: 'default'
        }
    },
    fields: {
        _id: {
            type: 'string',
            required: true
        },
        label: {
            type: 'string',
            multilingual: true,
            required: true
        },
        description: {
            type: 'string',
            multilingual: true,
        },
        storage: {
            type: 'group',
            multiple: true,
            fields: {
                type: {
                    type: 'string',
                    required: true
                },
                name: {
                    type: 'string',
                    required: true
                },
                options: {
                    type: 'TODO'
                }
            }
        },
        fields: {
            type: 'group',
            fields: {
                type: {
                    type: 'string',
                    required: true
                },
                label: {
                    type: 'string',
                    multilingual: true,
                    required: true
                },
                description: {
                    type: 'string',
                    multilingual: true,
                },
                storage: {
                    type: 'string',
                    multiple: true
                }
            }
        }
    }
};
exports.default = exports.collectionsStoreOptions;

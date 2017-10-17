"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var collectionsStoreOptions_1 = require("./lib/collectionsStoreOptions");
var molten_type_base_1 = require("molten-type-base");
/**
 * Create an instance of MoltenDB
 *
 * @param options Configuration options for MoltenDB
 */
exports.MoltenDB = function (options) {
    if (!options.storage) {
        return Promise.reject(new Error('Require atleast one configured storage'));
    }
    if (!options.collectionsStorage) {
        return Promise.reject(new Error('Need a collection to store the collection information'));
    }
    var connections = {};
    var collectionsStoreOptions;
    if (options.collectionsStorage.collection) {
        collectionsStoreOptions = Object.assign({}, collectionsStoreOptions_1.default, {
            name: options.collectionsStorage.collection
        });
    }
    else {
        collectionsStoreOptions = collectionsStoreOptions_1.default;
    }
    // Create the mdb library instance
    var mdb = {
        options: options,
        types: {},
        storageHasType: function (storage, type) {
            return options.storage[storage] && options.storage[storage].connect.types.indexOf(type) !== -1;
        },
        storageHasFeature: function (storage, feature) {
            return options.storage[storage] && options.storage[storage].connect.features.indexOf(feature) !== -1;
        }
    };
    // Create instances of types
    Object.keys(molten_type_base_1.default).forEach(function (baseType) {
        mdb.types[baseType] = molten_type_base_1.default[baseType](mdb);
    });
    /** @internal
     * Opens a connection to one of the given storage
     *
     * @param storage The string id of the storage to connect to
     *
     * @returns A promise resolving to the connection to the storage
     */
    var storageConnection = function (storage) {
        var storageOptions = options.storage[storage];
        if (!storageOptions) {
            return Promise.reject(new Error("Storage " + storage + " does not exist"));
        }
        if (!storageOptions.closeConnection && connections[storage]) {
            return Promise.resolve(connections[storage].connection);
        }
        else {
            var promise = storageOptions.connect(storageOptions.options);
            if (!storageOptions.closeConnection) {
                // Clear the timeout if it for some reason exists
                if (connections[storage] && typeof connections[storage].timeout !== 'undefined') {
                    clearTimeout(connections[storage].timeout);
                }
                promise = promise.then(function (connection) {
                    connections[storage] = {
                        connection: connection
                    };
                    if (storageOptions.connectionTimeout) {
                        connections[storage].timeout = setTimeout(function () {
                            delete connections[storage].connection;
                            delete connections[storage].timeout;
                        }, storageOptions.connectionTimeout * 1000);
                    }
                    return connection;
                });
            }
            return promise;
        }
    };
    /**
     * Get the stored collection options for the collection with the given name
     *
     * @param name Name of the collection to get the options for
     *
     * @returns A Promise resolving to the collection options if the collection
     *   exists or undefined if the collection does not exist
     */
    var getCollectionOptions = function (name) {
        if (typeof name !== 'string') {
            return Promise.reject(new Error('Invalid collection name'));
        }
        // Get the collection information
        return storageConnection(options.collectionsStorage.storage).then(function (connection) {
            return connection.getStore(collectionsStoreOptions);
        }).then(function (store) {
            return store.read({ _id: name });
        }).then(function (results) {
            if (!results.length) {
                return;
            }
            delete results[0]['_id'];
            return results[0];
        });
    };
    /**
     * Store the collection options in the collection table
     *
     * @param collectionOptions Options to store in the collection table
     *
     * @returns A promise resolving once the collection options have been stored
     */
    var storeCollectionOptions = function (collectionOptions) {
        return storageConnection(options.collectionsStorage.storage).then(function (connection) {
            return connection.getStore(collectionsStoreOptions);
        }).then(function (store) {
            return store.create(__assign({}, collectionOptions, { _id: collectionOptions.name }));
        });
    };
    /**
     * Create store options for the given storage of the given collection
     *
     * @param collectionOptions Collection options to create the storage options for
     * @param storage Storage key to create the storage options for
     */
    var createStoreOptions = function (collectionOptions, storageKey) {
        if (!collectionOptions.storage || !collectionOptions.storage[storageKey]) {
            return undefined;
        }
        var storage = collectionOptions.storage[storageKey];
        var fields = {};
        Object.keys(collectionOptions.fields).forEach(function (fieldName) {
            var field = collectionOptions.fields[fieldName];
            if ((typeof field.storage === 'undefined' && storageKey === 'default')
                || (typeof field.storage === 'string' && field.storage === storageKey)
                || field.storage instanceof Array && field.storage.indexOf(storageKey) !== -1) {
                var field_1 = collectionOptions.fields[fieldName];
                fields = Object.assign(fields, mdb.types[field_1.type].schema(fieldName, collectionOptions));
            }
        });
        if (Object.keys(fields).length) {
            return __assign({}, storage.options, { name: storage.name, fields: fields });
        }
    };
    /**
     * Cleans to given data to be saved into the given collection for each
     * individual store
     *
     * @param collectionOptions Collection options for the collecion that the
     *   data is for
     * @param data Data to store
     *
     * @returns An Object containing the data for each store in the given
     *   collection. The data for each store will be given in the same format
     *   as the given data (a single item object or an array of item objects)
     */
    var createDataForStores = function (collectionOptions, data) {
        var storageKeys = Object.keys(collectionOptions.storage);
        var cleanedData = {};
        var cleanedIds = [];
        if (data instanceof Array) {
            data.forEach(function (item) {
                // Stores an item object for each storage the item is stored in
                var cleanedItem = {};
                Object.keys(collectionOptions.fields).forEach(function (fieldKey) {
                    var field = collectionOptions.fields[fieldKey];
                    if (typeof item[fieldKey] !== 'undefined') {
                        var fieldData = void 0;
                        var storage = void 0;
                        if (field.storage) {
                            storage = field.storage;
                        }
                        else if (typeof collectionOptions.storage.default !== 'undefined') {
                            storage = 'default';
                        }
                        else {
                            storage = storageKeys[0];
                        }
                        if (typeof cleanedItem[storage] === 'undefined') {
                            cleanedItem[storage] = {};
                        }
                        Object.assign(cleanedItem[storage], mdb.types[field.type].store(fieldKey, collectionOptions, storage, item[fieldKey]));
                    }
                });
                cleanedIds.push(item._id);
                // Ensure the id is in each storage
                // Will need to generate one somehow if none is set
                // Could change this to be the "primary key field"
                var field = collectionOptions.fields._id;
                Object.keys(cleanedItem).forEach(function (storage) {
                    if (typeof cleanedItem[storage]._id === 'undefined') {
                        Object.assign(cleanedItem[storage], mdb.types[field.type].store(field.name, collectionOptions, storage, item[field.name]));
                    }
                    // Add to the cleaned data
                    if (typeof cleanedData[storage] === 'undefined') {
                        cleanedData[storage] = [];
                    }
                    cleanedData[storage].push(cleanedItem[storage]);
                });
            });
            return {
                cleanedIds: cleanedIds,
                cleanedData: cleanedData
            };
        }
    };
    /**
     * Creates a collection instance for the given collectionOptions
     *
     * @param collectionOptions Collection options to create a collection instance
     *   for
     *
     * @returns A collection instance
     */
    var createCollectionInstance = function (collectionOptions) {
        var storageKeys = Object.keys(collectionOptions.storage);
        /// TODO Need to build the options to pass to each store (as passing store options
        ///   to getStore so that we can differentiate between key-value and item stores
        //
        // As a collection instance will probably be short lived, should create the options
        // and get each store on creation of the collection instance.
        return {
            options: function () {
                /// TODO check if this is the best way
                return JSON.parse(JSON.stringify(collectionOptions));
            },
            create: function (data) {
                if (typeof data !== 'object') {
                    return Promise.reject(new Error('bad data given to create'));
                }
                var _a = createDataForStores(collectionOptions, data), cleanedIds = _a.cleanedIds, cleanedData = _a.cleanedData;
                var promises = [];
                Object.keys(cleanedData).forEach(function (storage) {
                    promises.push(storageConnection(collectionOptions.storage[storage].type)
                        .then(function (connection) { return connection.getStore(collectionOptions.storage[storage]); })
                        .then(function (store) { return store.create(cleanedData[storage]); }));
                });
                // TODO Need to handle failures to stop inconsistent states
                return Promise.all(promises).then(function () { return cleanedIds; });
            },
            read: function (filter, options) {
                if (['undefined', 'object'].indexOf(typeof filter) === -1) {
                    return Promise.reject(new Error('Invalid filter'));
                }
                /**
                 * Creates a ResultRow instance using the given data
                 *
                 * @param item Item for the ResultRow
                 *
                 * @returns ResultRow instance
                 */
                var createResultInstance = function (item) {
                    var resultInstance = {};
                    //TODO Should only return the fields that are included in the result
                    Object.keys(collectionOptions.fields).forEach(function (field) {
                        var fieldOptions = collectionOptions.fields[field];
                        resultInstance[field] = mdb.types[fieldOptions.type].instance(field, collectionOptions, resultInstance, item);
                    });
                    return resultInstance;
                };
                /**TODO If there are multiple storage engines, could run through the
                 * list of fields to get to determine which storage engine is the best
                 * to contact - it may be that one has everything needed in it.
                 *
                 * Will need to be able to go to each field and get the raw fields they
                 * are expecting back for the chosen storage so they can be returned
                 * properly
                 *
                 * Will need the collectionOptions if we are going to have a global
                 * multi-lingual option?
                 *
                 * TODO Make a list of the what actions the module is going to have
                 * done to it/by it and ensure that the functionality exists to do
                 * that, eg for types:
                 *   - create for storing a value of the type in the given storage
                 *   - returning what fields need to be retrieved to get the value
                 *   - validate a new value given the existing values of the other
                 *     fields
                 *   - create what needs to be stored in the given storage for a given
                 *     value
                 */
                if (storageKeys.length === 1) {
                    // TODO Need to create a storage configuration objec with name and type to pass to getStore
                    return storageConnection(collectionOptions.storage[storageKeys[0]].type)
                        .then(function (connection) { return connection.getStore(collectionOptions.storage[storageKeys[0]]); })
                        .then(function (store) {
                        return store.read(filter, options);
                    })
                        .then(function (results) {
                        var createResultRow = function (index) {
                            if (index < results.length) {
                                return createResultInstance(results[index]);
                            }
                            else {
                                return;
                            }
                        };
                        return {
                            length: results.length,
                            raw: function () {
                                var data = [];
                                var _loop_1 = function (i) {
                                    var item = {};
                                    var row = createResultRow(i);
                                    Object.keys(row).forEach(function (field) {
                                        item[field] = row[field].valueOf();
                                    });
                                    data.push(item);
                                };
                                for (var i = 0; i < results.length; i++) {
                                    _loop_1(i);
                                }
                                return data;
                            },
                            row: createResultRow,
                        };
                    });
                }
                else {
                    // TODO
                }
            },
            count: function (filter) {
                if (['undefined', 'object'].indexOf(typeof filter) === -1) {
                    return Promise.reject(new Error('Invalid filter'));
                }
                if (storageKeys.length === 1) {
                    return storageConnection(collectionOptions.storage[storageKeys[0]].type)
                        .then(function (connection) { return connection.getStore(collectionOptions.storage[storageKeys[0]]); })
                        .then(function (store) { return store.count(filter); });
                }
                else {
                    // TODO
                }
            },
            update: function (data, filter) {
                if (['undefined', 'object'].indexOf(typeof filter) === -1) {
                    return Promise.reject(new Error('Invalid filter'));
                }
                // Clean the data for storage
                var _a = createDataForStores(collectionOptions, data), cleanedIds = _a.cleanedIds, cleanedData = _a.cleanedData;
                // TODO Have to clean the filter data as well
                var promises = [];
                Object.keys(cleanedData).forEach(function (storage) {
                    promises.push(storageConnection(collectionOptions.storage[storage].type)
                        .then(function (connection) { return connection.getStore(collectionOptions.storage[storage]); })
                        .then(function (store) { return store.update(cleanedData[storage], filter); }));
                });
                return Promise.all(promises).then(function () { return cleanedIds; });
            },
            delete: function (filter) {
                if (['undefined', 'object'].indexOf(typeof filter) === -1) {
                    return Promise.reject(new Error('Invalid filter'));
                }
                if (storageKeys.length === 1) {
                    return storageConnection(collectionOptions.storage[storageKeys[0]].type)
                        .then(function (connection) { return connection.getStore(collectionOptions.storage[storageKeys[0]]); })
                        .then(function (store) { return store.delete(filter); });
                }
                else {
                    // TODO
                }
            }
        };
    };
    // Check that the collections storage and collection is set up
    return storageConnection(options.collectionsStorage.storage).then(function (connection) {
        return connection.checkStore(collectionsStoreOptions).then(function (checkResult) {
            if (checkResult) {
                return Promise.resolve();
            }
            else if (checkResult === false) {
                Promise.reject(new Error('Collections collection is not what it should be'));
            }
            else {
                // Create the collection
                return connection.createStore(collectionsStoreOptions)
                    .catch(function (error) {
                    return Promise.reject(new Error("Error creating collections collection: " + error.message));
                });
            }
        }).then(function () {
            var instance = {
                createCollection: function (collectionOptions) {
                    return getCollectionOptions(collectionOptions.name).then(function (currentOptions) {
                        if (typeof currentOptions !== 'undefined') {
                            return Promise.reject(new Error("Collection " + collectionOptions.name + " already exists"));
                        }
                        // Check field types are valid
                        var badFieldName;
                        if ((badFieldName = Object.keys(collectionOptions.fields).find(function (fieldName) {
                            var field = collectionOptions.fields[fieldName];
                            return typeof mdb.types[field.type] === 'undefined';
                        }))) {
                            var badField = collectionOptions.fields[badFieldName];
                            return Promise.reject(new Error(badFieldName + " has an unknown type " + badField.type));
                        }
                        // Create the stores for the collection
                        var creates = [];
                        var storageKeys = Object.keys(collectionOptions.storage);
                        storageKeys.forEach(function (name) {
                            var options = createStoreOptions(collectionOptions, name);
                            if (options) {
                                creates.push(storageConnection(collectionOptions.storage[name].type).then(function (connection) {
                                    return connection.createStore(options);
                                }).then(function () {
                                    return true;
                                }).catch(function (error) {
                                    return error;
                                }));
                            }
                        });
                        return Promise.all(creates).then(function (results) {
                            // Roll back the creation of the stores if any failed
                            var errors = [];
                            results.forEach(function (result) {
                                if (result !== true) {
                                    errors.push(result);
                                }
                            });
                            if (errors.length) {
                                var deletes_1 = [];
                                storageKeys.forEach(function (name, i) {
                                    if (results[i] === true) {
                                        deletes_1.push(storageConnection(collectionOptions.storage[name].type).then(function (connection) {
                                            return connection.deleteStore(collectionOptions.storage[name].name);
                                        }));
                                    }
                                });
                                return Promise.all(deletes_1).then(function () {
                                    var error = new Error("There were " + errors.length + " errors creating the collection");
                                    error.errors = errors;
                                    return Promise.reject(error);
                                });
                            }
                            // Store the collection information in the collections table
                            return storeCollectionOptions(collectionOptions).then(function () {
                                return createCollectionInstance(collectionOptions);
                            });
                        });
                    });
                },
                collection: function (name) {
                    return getCollectionOptions(name).then(function (collectionOptions) {
                        if (collectionOptions) {
                            return createCollectionInstance(collectionOptions);
                        }
                    });
                },
                collectionOptions: getCollectionOptions,
                checkCollection: function (name) {
                    return getCollectionOptions(name).then(function (collectionOptions) {
                        if (typeof collectionOptions === 'undefined') {
                            return;
                        }
                        var checks = [];
                        Object.keys(collectionOptions.storage).forEach(function (storageKey) {
                            var storage = collectionOptions.storage[storageKey];
                            var options = createStoreOptions(collectionOptions, storageKey);
                            if (options) {
                                checks.push(storageConnection(storage.type).then(function (connection) {
                                    return connection.checkStore(options);
                                }));
                            }
                        });
                        return Promise.all(checks).then(function (results) {
                            if (typeof results.find(function (result) { return result !== true; }) !== 'undefined') {
                                return false;
                            }
                            return true;
                        });
                    });
                },
                updateCollection: function (collectionOptions) {
                    // TODO
                },
                deleteCollection: function (name, deleteStores) {
                    return getCollectionOptions(name).then(function (collectionOptions) {
                        if (typeof collectionOptions === 'undefined') {
                            return Promise.resolve(false);
                        }
                        var deletes = [];
                        if (!deleteStores) {
                            return Promise.resolve(true);
                        }
                        Object.keys(collectionOptions.storage).forEach(function (storageKey) {
                            var storage = collectionOptions.storage[storageKey];
                            var options = createStoreOptions(collectionOptions, storageKey);
                            if (options) {
                                deletes.push(storageConnection(storage.type).then(function (connection) {
                                    return connection.deleteStore(options);
                                }).then(function () {
                                    return true;
                                }).catch(function (error) {
                                    return error;
                                }));
                            }
                        });
                        return Promise.all(deletes).then(function (results) {
                            // Roll back the creation of the stores if any failed
                            var errors = [];
                            results.forEach(function (result) {
                                if (result !== true) {
                                    errors.push(result);
                                }
                            });
                            if (errors.length) {
                                var error = new Error("There were " + errors.length + " errors deleting the collection");
                                error.errors = errors;
                                return Promise.reject(error);
                            }
                            return Promise.resolve(true);
                        });
                    });
                }
            };
            Object.defineProperty(instance, 'getInternal', {
                value: mdb,
                enumerable: false,
                writable: false
            });
            return instance;
        });
    });
};
exports.default = exports.MoltenDB;

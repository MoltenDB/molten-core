import * as MDB from '../typings/moltendb';

import baseCollectionsStoreOptions from './lib/collectionsStoreOptions';
import baseTypes from 'molten-type-base';

/**
 * Create an instance of MoltenDB
 *
 * @param options Configuration options for MoltenDB
 */
export const MoltenDB = (options: MDB.MoltenDBOptions): Promise<MDB.MoltenDBInstance> => {
  if (!options.storage) {
    return Promise.reject(new Error('Require atleast one configured storage'));
  }

  if (!options.collectionsStorage) {
    return Promise.reject(new Error('Need a collection to store the collection information'));
  }

  let connections = {};

  let collectionsStoreOptions;

  if (options.collectionsStorage.collection) {
    collectionsStoreOptions = Object.assign({}, baseCollectionsStoreOptions, {
      name: options.collectionsStorage.collection
    });
  } else {
    collectionsStoreOptions = baseCollectionsStoreOptions;
  }

  // Create the mdb library instance
  let mdb: MDB.MoltenInternalInstance = {
    options,
    types: {},
    storageHasType: (storage: string, types: string | Array<string>): boolean => {
      if (!options.storage[storage]) {
        return false;
      }
      if (types instanceof Array) {
        const storageTypes = options.storage[storage].connect.types;
        return typeof types.find((type) =>
            storageTypes.indexOf(type) === -1) === 'undefined';
      } else {
        return options.storage[storage].connect.types.indexOf(types) !== -1;
      }
    },
    storageHasFeature: (storage: string,
        features: MDB.StorageFeatures | Array<MDB.StorageFeatures>): boolean => {
      if (!options.storage[storage]) {
        return false;
      }
      if (features instanceof Array) {
        const storageFeatures = options.storage[storage].connect.features;
        return typeof features.find((feature) =>
            storageFeatures.indexOf(feature) === -1) === 'undefined';
      } else {
        return options.storage[storage].connect.features.indexOf(features) !== -1
      }
    }
  };

  // Create instances of types
  Object.keys(baseTypes).forEach((baseType) => {
    mdb.types[baseType] = baseTypes[baseType](mdb);
  });

  /** @internal
   * Opens a connection to one of the given storage
   *
   * @param storage The string id of the storage to connect to
   *
   * @returns A promise resolving to the connection to the storage
   */
  const storageConnection = (storage: string): Promise<MDB.StorageConnection> => {
    const storageOptions = options.storage[storage];

    if (!storageOptions) {
      return Promise.reject(new Error(`Storage ${storage} does not exist`));
    }

    if (!storageOptions.closeConnection && connections[storage]) {
      return Promise.resolve(connections[storage].connection);
    } else {
      let promise = storageOptions.connect(storageOptions.options);

      if (!storageOptions.closeConnection) {
        // Clear the timeout if it for some reason exists
        if (connections[storage] && typeof connections[storage].timeout !== 'undefined') {
          clearTimeout(connections[storage].timeout);
        }

        promise = promise.then((connection) => {
          connections[storage] = {
            connection
          };

          if (storageOptions.connectionTimeout) {
            connections[storage].timeout = setTimeout(() => {
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
  const getCollectionOptions = (name: string): Promise<MDB.CollectionOptions> => {
    if (typeof name !== 'string') {
      return Promise.reject(new Error('Invalid collection name'));
    }

    // Get the collection information
    return storageConnection(options.collectionsStorage.storage).then((connection) => {
      return connection.getStore(collectionsStoreOptions);
    }).then((store: MDB.StoreInstance) => {
      return store.read({ _id: name });
    }).then((results) => {
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
  const storeCollectionOptions = (collectionOptions: MDB.CollectionOptions): Promise<string> => {
    return storageConnection(options.collectionsStorage.storage).then((connection) => {
      return connection.getStore(collectionsStoreOptions);
    }).then((store) => {
      return store.create({
        ...collectionOptions,
        _id: collectionOptions.name
      });
    });
  };

  /**
   * Get the store instance for a store used by the collection with the given
   * collection options.
   *
   * @param collectionOptions Collection options for the collection to get the
   *   store for
   * @param storage ID of the storage to get the store from
   *
   * @returns The store instance
   */
  const getStore = (collectionOptions: MDB.CollectionOptions, storage: string)
      : Promise<MDB.StoreInstance> => {
    const storeOptions = createStoreOptions(collectionOptions, storage);
    return storageConnection(collectionOptions.storage[storage].type)
    .then((connection) => connection.getStore(storeOptions));
  };


  /**
   * Create store options for the given storage of the given collection
   *
   * @param collectionOptions Collection options to create the storage options for
   * @param storage Storage key to create the storage options for
   */
  const createStoreOptions = (collectionOptions: MDB.CollectionOptions, storageKey: string)
    : MDB.StoreOptions => {

    if (!collectionOptions.storage || !collectionOptions.storage[storageKey]) {
      return undefined;
    }

    const storage = collectionOptions.storage[storageKey];

    let fields = {};

    Object.keys(collectionOptions.fields).forEach((fieldName) => {
      const field = collectionOptions.fields[fieldName];
      if ((typeof field.storage === 'undefined' && storageKey === 'default')
          || (typeof field.storage === 'string' && field.storage === storageKey)
          || field.storage instanceof Array && field.storage.indexOf(storageKey) !== -1) {
        const field = collectionOptions.fields[fieldName];
        fields = Object.assign(fields, mdb.types[field.type].schema(fieldName, collectionOptions));
      }
    });

    if (Object.keys(fields).length) {
      return {
        ...storage.options,
        name: storage.collection,
        fields
      };
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
  const createDataForStores = (collectionOptions, data: MDB.Data | MDB.Data[]): { [store: string]: any } => {
    const storageKeys = Object.keys(collectionOptions.storage);

    let cleanedData = {};
    let cleanedIds = [];

    if (data instanceof Array) {
      data.forEach((item) => {
        // Stores an item object for each storage the item is stored in
        let cleanedItem = {};
        Object.keys(collectionOptions.fields).forEach((fieldKey) => {
          const field = collectionOptions.fields[fieldKey];
          if (typeof item[fieldKey] !== 'undefined') {
            let fieldData;
            let storage;
            if (field.storage) {
              storage = field.storage
            } else  if (typeof collectionOptions.storage.default !== 'undefined') {
              storage = 'default';
            } else {
              storage = storageKeys[0];
            }

            if (typeof cleanedItem[storage] === 'undefined') {
              cleanedItem[storage] = {};
            }
            Object.assign(cleanedItem[storage], mdb.types[field.type].store(fieldKey,
                collectionOptions, storage, item[fieldKey]));
          }
        });

        cleanedIds.push(item._id);

        // Ensure the id is in each storage
        // Will need to generate one somehow if none is set
        // Could change this to be the "primary key field"
        let field = collectionOptions.fields._id;
        Object.keys(cleanedItem).forEach((storage) => {
          if (typeof cleanedItem[storage]._id === 'undefined') {
            Object.assign(cleanedItem[storage], mdb.types[field.type].store(field.name,
                collectionOptions, storage, item[field.name]));
          }

          // Add to the cleaned data
          if (typeof cleanedData[storage] === 'undefined') {
            cleanedData[storage] = [];
          }
          cleanedData[storage].push(cleanedItem[storage]);
        });
      });

      return {
        cleanedIds,
        cleanedData
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
  const createCollectionInstance = (collectionOptions): MDB.CollectionInstance => {
    const storageKeys = Object.keys(collectionOptions.storage);

    /// TODO Need to build the options to pass to each store (as passing store options
    ///   to getStore so that we can differentiate between key-value and item stores
    //
    // As a collection instance will probably be short lived, should create the options
    // and get each store on creation of the collection instance.

    return {
      options: (): MDB.CollectionOptions => {
        /// TODO check if this is the best way
        return JSON.parse(JSON.stringify(collectionOptions));
      },
      create: (data: MDB.Data | MDB.Data[]): Promise<MDB.Id[]> => {
        if (typeof data !== 'object') {
          return Promise.reject(new Error('bad data given to create'));
        }

        const { cleanedIds, cleanedData } = createDataForStores(collectionOptions, data);
        let promises = [];

        Object.keys(cleanedData).forEach((storage) => {
          promises.push(getStore(collectionOptions, storage)
              .then((store) => store.create(cleanedData[storage])));
        });

        // TODO Need to handle failures to stop inconsistent states
        return Promise.all(promises).then(() => cleanedIds);
      },
      read: (filter?: MDB.Filter, options?: MDB.FilterOptions): Promise<MDB.Result> => {
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
        const createResultInstance = (item: MDB.Data): MDB.ResultRow => {
          let resultInstance = {};

          //TODO Should only return the fields that are included in the result
          Object.keys(collectionOptions.fields).forEach((field) => {
            const fieldOptions = collectionOptions.fields[field];
            resultInstance[field] = mdb.types[fieldOptions.type].instance(field,
                collectionOptions,
                (storageKeys.length === 1 ? storageKeys[0] : 'TODO'),
                resultInstance, item);
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
          return getStore(collectionOptions, storageKeys[0])
          .then((store) => {
            return store.read(filter, options); })
          .then((results) => {
            const createResultRow = (index: number): MDB.ResultRow => {
              if (index < results.length) {
                return createResultInstance(results[index]);
              } else {
                return;
              }
            };

            return {
              length: results.length,
              raw: (): MDB.Data[] => {
                let data = [];
                for (let i = 0; i < results.length; i++) {
                  let item = {};
                  const row = createResultRow(i);
                  Object.keys(row).forEach((field) => {
                    item[field] = row[field].valueOf();
                  });
                  data.push(item);
                }

                return data;
              },
              row: createResultRow,
            };
          });
        } else {
          // TODO
        }
      },
      count: (filter?: MDB.Filter): Promise<number> => {
        if (['undefined', 'object'].indexOf(typeof filter) === -1) {
          return Promise.reject(new Error('Invalid filter'));
        }
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]]))
          .then((store) => store.count(filter));
        } else {
          // TODO
        }
      },
      update: (data: MDB.Data | MDB.Data[], filter?: MDB.Filter) => {
        if (['undefined', 'object'].indexOf(typeof filter) === -1) {
          return Promise.reject(new Error('Invalid filter'));
        }
        // Clean the data for storage
        const { cleanedIds, cleanedData } = createDataForStores(collectionOptions, data);
        // TODO Have to clean the filter data as well
        let promises = [];

        Object.keys(cleanedData).forEach((storage) => {
          promises.push(storageConnection(collectionOptions.storage[storage].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storage]))
          .then((store) => store.update(cleanedData[storage], filter)));
        });

        return Promise.all(promises).then(() => cleanedIds);
      },
      delete: (filter?: MDB.Filter): Promise<number> => {
        if (['undefined', 'object'].indexOf(typeof filter) === -1) {
          return Promise.reject(new Error('Invalid filter'));
        }
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]]))
          .then((store) => store.delete(filter));
        } else {
          // TODO
        }
      }
    };
  };


  // Check that the collections storage and collection is set up
  return storageConnection(options.collectionsStorage.storage).then((connection) => {
    return connection.checkStore(collectionsStoreOptions).then((checkResult) => {
      if (checkResult) {
        return Promise.resolve();
      } else if (checkResult === false) {
        Promise.reject(new Error('Collections collection is not what it should be'));
      } else {
        // Create the collection
        return connection.createStore(collectionsStoreOptions)
        .catch((error) => {
          return Promise.reject(
              new Error(`Error creating collections collection: ${error.message}`));
        });
      }
    }).then(() => {
      let instance = {
        createCollection: (collectionOptions) => {
          return getCollectionOptions(collectionOptions.name).then((currentOptions) => {
            if (typeof currentOptions !== 'undefined') {
              return Promise.reject(new Error(`Collection ${collectionOptions.name} already exists`));
            }

            // Ensure that the _id field is present
            if (typeof collectionOptions.fields._id === 'undefined') {
              return Promise.reject(new Error(`Collection must have an '_id' field`));
            }

            // Check field types are valid
            let badFieldName;
            if ((badFieldName = Object.keys(collectionOptions.fields).find((fieldName) => {
              const field = collectionOptions.fields[fieldName];
              return typeof mdb.types[field.type] === 'undefined';
            }))) {
              const badField = collectionOptions.fields[badFieldName];
              return Promise.reject(new Error(`${badFieldName} has an unknown type ${badField.type}`));
            }

            // Create the stores for the collection
            let creates = [];

            const storageKeys = Object.keys(collectionOptions.storage);

            storageKeys.forEach((name) => {
              const options = createStoreOptions(collectionOptions, name);

              if (options) {
                creates.push(storageConnection(collectionOptions.storage[name].type).then((connection) => {
                  return connection.createStore(options);
                }).then(() => {
                  return true;
                }).catch((error) => {
                  return error;
                }));
              }
            });

            return Promise.all(creates).then((results) => {
              // Roll back the creation of the stores if any failed
              let errors = [];

              results.forEach((result) => {
                if (result !== true) {
                  errors.push(result);
                }
              });
              if (errors.length) {
                let deletes = [];

                storageKeys.forEach((name, i) => {
                  if (results[i] === true) {
                    deletes.push(storageConnection(collectionOptions.storage[name].type).then((connection) => {
                      return connection.deleteStore(collectionOptions.storage[name].name);
                    }));
                  }
                });

                return Promise.all(deletes).then(() => {
                  let error = new Error(`There were ${errors.length} errors creating the collection`);
                  error.errors = errors;
                  return Promise.reject(error);
                });
              }

              // Store the collection information in the collections table
              return storeCollectionOptions(collectionOptions).then(() => {
                return createCollectionInstance(collectionOptions);
              });
            });
          });
        },
        collection: (name) => {
          return getCollectionOptions(name).then((collectionOptions) => {
            if (collectionOptions) {
              return createCollectionInstance(collectionOptions);
            }
          });
        },
        collectionOptions: getCollectionOptions,
        checkCollection: (collection) => {
          let name;

          if (typeof collection === 'string') {
            name = collection;
          } else {
            name = collection.name;
          }

          return getCollectionOptions(name).then((collectionOptions) => {
            if (typeof collectionOptions === 'undefined') {
              return;
            }

            let checks = [];
            Object.keys(collectionOptions.storage).forEach((storageKey) => {
              const storage = collectionOptions.storage[storageKey];
              const options = createStoreOptions(collectionOptions, storageKey);

              if (options) {
                checks.push(storageConnection(storage.type).then((connection) => {
                  return connection.checkStore(options);
                }));
              }
            });

            return Promise.all(checks).then((results) => {
              if (typeof results.find((result) => result !== true) !== 'undefined') {
                return false;
              }

              return true;
            });
          });
        },
        updateCollection: (collectionOptions) => {
          // TODO
        },
        deleteCollection: (name: string, deleteStores: boolean) => {
          return getCollectionOptions(name).then((collectionOptions) => {
            if (typeof collectionOptions === 'undefined') {
              return Promise.resolve(false);
            }

            let deletes = [];

            if (!deleteStores) {
              return Promise.resolve(true);
            }

            Object.keys(collectionOptions.storage).forEach((storageKey) => {
              const storage = collectionOptions.storage[storageKey];
              const options = createStoreOptions(collectionOptions, storageKey);

              if (options) {
                deletes.push(storageConnection(storage.type).then((connection) => {
                  return connection.deleteStore(options);
                }).then(() => {
                  return true;
                }).catch((error) => {
                  return error;
                }));
              }
            });

            return Promise.all(deletes).then((results) => {
              // Roll back the creation of the stores if any failed
              let errors = [];

              results.forEach((result) => {
                if (result !== true) {
                  errors.push(result);
                }
              });
              if (errors.length) {
                let error = new Error(`There were ${errors.length} errors deleting the collection`);
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
export default MoltenDB;

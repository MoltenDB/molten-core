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
    types: {}
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
  const storageConnection = (storage: string): Promise<MDB.Storage.StorageConnection> => {
    const storageOptions = options.storage[storage];

    if (!storageOptions) {
      return Promise.reject(new Error(`Storage ${storage} does not exist`));
    }

    if (storageOptions.options.keepConnection && connections[storage].connection) {
      return Promise.resolve(connection[storage].connection);
    } else {
      let promise = storageOptions.connect(storageOptions.options);

      if (storageOptions.options.keepConnection) {
        // Clear the timeout if it for some reason exists
        if (typeof connections[storage].timeout !== 'undefined') {
          clearTimeout(connections[storage].timeout);
        }

        promise = promise.then((connection) => {
          connections[storage].connection = connection;

          if (storageOptions.options.connectionTimeout) {
            connections[storage].timeout = setTimeout(() => {
              delete connections[storage].connection;
              delete connections[storage].timeout;
            }, storageOptions.options.connectionTimeout * 1000);
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
    }).then((store) => {
      return store.read({ _id: name });
    }).then((results) => {
      if (!results.length) {
        return;
      }

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
   * Create store options for the given storage of the given collection
   *
   * @param collectionOptions Collection options to create the storage options for
   * @param storage Storage key to create the storage options for
   */
  const createStoreOptions = (collectionOptions: MDB.CollectionOptions, storageKey: string)
    : MDB.Storage.StoreOptions => {
    if (!collectionOptions.storage || !collectionOptions.storage[storageKey]) {
      return undefined;
    }

    const storage = collectionOptions.storage[storageKey];

    let fields = {};

    Object.keys(collectionOptions.fields).forEach((fieldName) => {
      const field = collectionOptions.fields[fieldName];
      if ((typeof field.storage === 'undefined' && storageKey === 'default')
          || (typeof field.storage === 'string' && field.storage === storageKey)
          || field.storage instanceof Array && field.storage.indexOf(storageKey !== -1)) {
        const field = collectionOptions.fields[fieldName];
        fields = Object.assign(fields, mdb.types[field.type].schema(fieldName, collectionOptions));
      }
    });

    if (Object.keys(fields).length) {
      return {
        ...storage.options,
        name: storage.name,
        fields
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
      create: (data: MDB.Data | MDB.Data[]): Promise<MDB.Id[]> => {
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]]))
          .then((store) => store.create(data));
        } else {
          // TODO
        }
      },
      read: (filter: MDB.Filter, options: MDB.FilterOptions): Promise<MDB.Result> => {
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]]))
          .then((store) => {
            return store.read(filter, options); })
          .then((results) => {
            return {
              length: results.length,
              row: (index: number): MDB.Data => {
                if (index < results.length) {
                  return createResultInstance(collectionOptions, results[index]);
                } else {
                  return;
                }
              },
            };
          });
        } else {
          // TODO
        }
      },
      count: (filter: MDB.Filter): Promise<number> => {
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]]))
          .then((store) => store.count(filter));
        } else {
          // TODO
        }
      },
      update: (data: Data | Data[], filter?: MDB.Filter | true) => {
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]].name))
          .then((store) => store.update(data, filter));
        } else {
          // TODO
        }
      },
      delete: (filter: MDB.Filter): Promise<number> => {
        if (storageKeys.length === 1) {
          return storageConnection(collectionOptions.storage[storageKeys[0]].type)
          .then((connection) => connection.getStore(collectionOptions.storage[storageKeys[0]].name))
          .then((store) => store.delete(filter));
        } else {
          // TODO
        }
      }
    };
  };

  const createResultInstance = (collectionOptions: MDB.CollectionOptions,
      item: MDB.Data): MDB.ResultRow => {
    let resultInstance = {};

    Object.defineProperty(resultInstance, 'collectionOptions', {
      value: collectionOptions,
      iterable: false
    });

    Object.keys(collectionOptions.fields).forEach((field) => {
      const fieldOptions = collectionOptions.fields[field];
      resultInstance[field] = mdb.types[fieldOptions.type].instance(field, resultInstance, item);
    });

    return resultInstance;
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
      return {
        createCollection: (collectionOptions) => {
          return getCollectionOptions(collectionOptions.name).then((currentOptions) => {
            if (typeof currentOptions !== 'undefined') {
              return Promise.reject(new Error(`Collection ${collectionOptions.name} already exists`));
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
        checkCollection: (name) => {
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
        deleteCollection: (name: string) => {
          return getCollectionOptions(name).then((collectionOptions) => {
            if (typeof collectionOptions === 'undefined') {
              return Promise.resolve(false);
            }

            let deletes = [];

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
    });
  });

};
export default MoltenDB;

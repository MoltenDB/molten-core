const fakeStorage = () => {
  let persist = {};

  let clearPersist = () => {
    console.log('FAKE clearing persistent data');
    persist = {};
  };

  let connect = (options: Object): Promise<MDB.storage.StorageConnection> => {
    let stores;

    if (options.persist) {
      console.log('fakeStorage will be persistent');
      console.log(persist);
      stores = persist;
    } else {
      stores = {};
    }

    const getStorePromise = (store: MDB.Data, storeOptions: MDB.Storage.StoreOptions)
        : Promise<MDB.Storage.StorageConnection> => {
      return Promise.resolve({
        create: (data: MDB.Data | MDB.Data[]): Promise<Id[]> => {
          console.log('FAKE storing data', data, 'in store', storeOptions.name);
          return new Promise((resolve, reject) => {
            let ids = [];

            if (typeof data === 'object' && !(data instanceof Array)) {
              data = [data];
            }

            if (!(data instanceof Array)) {
              return reject(new Error('bad data'));
            }

            console.log('entering data', data);

            data.forEach((item) => {
              console.log('FAKE adding item', item);
              if (!(item instanceof Object)) {
                ids.push(new Error('Bad item'));
              } else if (!item._id) {
                ids.push(new Error('No ID'));
              } else {
                store[item._id] = item;
                ids.push(item._id);
              }
            });

            resolve(ids);
          });
        },
        read: (filter: { [field: string]: any }): Promise<Data[]> => {
          console.log('FAKE got read', filter, 'on store', storeOptions.name);
          console.log('store is', store);
          return new Promise((resolve, reject) => {
            let result = [];

            if (typeof filter !== 'object' && typeof filter !== 'undefined') {
              return reject(new Error('bad query'));
            }

            console.log('running foreach?');
            Object.keys(store).forEach((itemKey) => {
              const item = store[itemKey];
              console.log('checking item', item);
              if (!filter || !Object.keys(filter).find((field) => {
                if (item[field] !== filter[field]) {
                  console.log('FAKE found', field, '!=', filter[field], 'in', item);
                  return true;
                }
              })) {
                console.log('adding', item, 'to results');
                result.push(item);
              }
            });

            console.log('FAKE resolving results to', result);
            resolve(result);
          });
        },
        count: (filter: { [field: string]: any }): Promise<Data[]> => {
          return new Promise((resolve, reject) => {
            let count = 0;
            console.log('!!!!counting', store, filter);

            if (typeof filter !== 'object' && typeof filter !== 'undefined') {
              return reject(new Error('bad query'));
            }

            Object.keys(store).forEach((itemKey) => {
              const item = store[itemKey];
              if (!filter || !Object.keys(filter).find((field) => {
                if (item[field] !== filter[field]) {
                  return true;
                }
              })) {
                count++;
              }
            });

            resolve(count);
          });
        }
      });
    };

    return Promise.resolve({
      getStore: (storeOptions) => {
        console.log('getting store', storeOptions.name, stores[storeOptions.name]);
        if (stores[storeOptions.name]) {
          return getStorePromise(stores[storeOptions.name].data, storeOptions);
        } else {
          return Promise.reject(new Error('Store ' + storeOptions.name + ' not created'));
        }
      },
      createStore: (storeOptions) => {
        if (stores[storeOptions.name]) {
          return Promise.reject(new Error('Store already created'));
        } else {
          stores[storeOptions.name] = {
            options: storeOptions,
            data: {}
          };

          return getStorePromise(stores[storeOptions.name].data, storeOptions);
        }
      },
      deleteStore: (storeOptions) => {
        if (stores[storeOptions.name]) {
          delete stores[storeOptions.name];
        }
        return Promise.resolve();
      },
      checkStore: (storeOptions) => {
        if (stores[storeOptions.name]) {
          const currentOptions = stores[storeOptions.name].options;

          let fields = Object.keys(currentOptions.fields);

          if (fields.length !== Object.keys(storeOptions.fields).length) {
            return Promise.resolve(false);
          }

          if (typeof fields.find((fieldName) => {
            return typeof storeOptions.fields[fieldName] === 'undefined'
                || currentOptions.fields[fieldName].type !== storeOptions.fields[fieldName].type;
          }) !== 'undefined') {
            return Promise.resolve(false);
          }

          return Promise.resolve(true);
        } else {
          return Promise.resolve();
        }
      },
      close: () => {
      }
    });
  };

  connect.store = persist;
  connect.types = ['string', 'number', 'array', 'object', 'boolean'];
  connect.features = [];
  connect.clearPersist = clearPersist;

  return connect;
};
export default fakeStorage;

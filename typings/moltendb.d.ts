//declare namespace MDB {
declare namespace MDB {
  export type MoltenDB = (options: MDB.MoltenDBOptions) => Promise<MoltenDBInstance>;

  /// Options to configure a MoltenDB instance
  export type MoltenDBOptions = {
    /// Configuration of what storage engines to use
    storage: {
      /// ID string of the storage
      [storageName: string]: {
        /// Function to call to connect to the storaget
        connect: MDB.connectToStorage,
        /// Options to pass to the storage connection function when connecting
        options: MDB.StorageOptions
      }
    },
    /**
     * Configuration for the collections collection, used to store information
     * about the collections in MoltenDB
     */
    collectionsStorage: {
      /// ID string of the storage to use to store the collections collection
      storage: string,
      /// Name of the collections collection
      collection: string
    }
  }

  export interface MoltenDBInstance {
    /**
     * Creates a new collection with the given options. If a collection with the
     * given name already exists, the returned Promise will reject.
     *
     * @params collectionOptions Options to use for the new collection,
     *
     * @returns A promise that will resolve to a connection to the new collection
     *   if successful
     */
    createCollection: (collectionOptions: CollectionOptions)
        => Promise<CollectionInstance>,

    /**
     * Get a collection instance to the specified connection
     *
     * @param name The name of the collection to get a collection instance to
     *
     * @returns A promise that will resolve to a collection instance of the
     *   specified collection, or `undefined` if the collection does not exist
     */
    collection: (name: string) => Promise<CollectionInstance>,

    /**
     * Get the options for the collection with the given name
     *
     * @param name Name of the collection to return the options for
     *
     * @returns A promise that will resolve to the options for the collection
     *   with the given name, or undefined if there is no collection with the
     *   given name
     */
    collectionOptions: (name: string) => Promise<CollectionOptions>,

    /**
     * Checks for the existence and the validity of the given collection
     *
     * @param collection The name or options of the collection to check
     *
     * @returns A promise that will resolve to true if the collection exists
     *   and is valid, false if the collection exists, but it not valid, and
     *   undefined if the collection does not exist
     */
    checkCollection: (collection: string | CollectionOptions) => Promise<boolean|undefined>,

    /**
     * Updates an existing collection
     *
     * @param collectionOptions Options to use to update the collection with
     *
     * @returns A Promise that will resolve to a collection instance of the
     *   update collection
     */
    updateCollection: (collectionOptions: CollectionOptions)
        => Promise<CollectionInstance>,

    /**
     * Deletes a connection
     *
     * @param collectionName The name of the collection to delete
     * @param deleteStores Whether or not to deleted the associated stores
     *
     * @returns A promise that resolves to true if a collection was deleted or
     *   false if the collection did not exist
     */
    deleteCollection: (collectionName: string, deleteStores: boolean) => Promise<boolean>
  }

  export interface MoltenInternalInstance {
    options: MDB.MoltenDBOptions,
    types: {
      [typeId: string]: MDB.Type
    },
    /**
     * Check if a storage has a field type or types
     *
     * @param storage ID of the storage engine to check
     * @param type Type(s) to check the storage for
     *
     * @returns Whether or not the storage has the given field type(s)
     */
    storageHasType: (storage: string, type: string | Array<string>) => boolean,
    /**
     * Check if a storage has a field feature or fetures
     *
     * @param storage ID of the storage engine to check
     * @param feature Feature(s) to check the storage for
     *
     * @returns Whether or not the storage has the given field features(s)
     */
    storageHasFeature: (storage: string, feature: string | Array<string>) => boolean
  }

  export type Data = { [key: string]: any };
  export type Id = string | number;

  export type FieldFilter =
    /// Matches values that are equal to a specified value.
    { $eq: any }
    /// Matches values that are greater than a specified value.
    | { $gt: any }
    /// Matches values that are greater than or equal to a specified value.
    | { $gte: any }
    /// Matches values that are less than a specified value.
    | { $lt: any }
    /// Matches values that are less than or equal to a specified value.
    | { $lte: any }
    /// Matches all values that are not equal to a specified value.
    | { $ne: any }
    /// Matches any of the values specified in an array.
    | { $in: any[] }
    /// Matches none of the values specified in an array.
    | { $nin: any[] };

  export interface Filter {
    [field: string]: FieldFilter | any,
    /// Logical AND
    $and?: Filter[],
    /// Logical OR
    $or?: Filter[],
    /// Logical NOT
    $not?: Filter
  }

  export interface FilterOptions {
    /// Fields to retrieve
    fields?: Array<string>
    /// Fields to sort the data on
    sort?: {
      [field: string]: 1 | -1
    },
    /// Number of items to return
    limit?: number
    /// First item to return (starting from 0)
    start?: number
  }

  export interface ResultField {
    /**
     * Return the value of the field
     *
     * @param index If multiple, return the value indexed by index (starting
     *   from 0)
     *
     * @returns The value
     */
    value: (index?: number) => any,
    /**
     * Returns the string value of the field
     *
     * @param index If multiple, return the value indexed by index (starting
     *   from 0)
     *
     * @returns The string representation of the value
     */
    toString: (index?: number) => string
  }

  export interface ResultRow {
    [field: string]: () => ResultField,
  }

  export interface Result {
    /// The number of items in the result
    length: number,
    /**
     * Get a raw values of the items from the returned results
     *
     * @returns An array containing the raw items
     */
    raw(): Array<Data>,
    /**
     * Get a raw item from the returned results
     *
     * @param index Index of the raw item to return
     *
     * @returns The single raw item
     */
    raw(index: number): Data,
    /**
     * Get the result row for the given result index
     *
     * @param index Result index to get the result row for
     *
     * @returns The result row
     */
    row(index: number): ResultRow,
    /**
     * Gets iterable to iterate through the results with
     *
     * @return An interable returning result rows
     */
    //@TODO rows: () => Iterable<ResultRow>
  }

  /// @TODO should be able to access collection options from instance
  export interface CollectionInstance {
    /**
     * Gets options for the collection
     *
     * @returns The options for the collection
     */
    options: () => CollectionOptions,
    /**
     * Creates a new item / new items in the storage
     *
     * @param data Data to insert into the storage. If data is an array, it
     *   is assumed that the array contains multiple items to create in the
     *   storage
     *
     * @returns A Promise that will resolve to an array of the items created
     *   once all the items have been created
     */
    create: (data: Data | Data[]) => Promise<Id[]>,

    /**
     * Retrieves items from the storage
     *
     * @param filter Filter to use for retrieving the items from the storage
     *
     * @returns A Promise that will resolve to the retrieved data
     */
    read: (filter?: Filter, options?: FilterOptions) => Promise<Result>,

    /**
     * Get the number of items that would be returned by a query
     *
     * @returns A Promise that resolves to the number of rows
     */
    count: (filter?: Filter) => Promise<number>,

    /**
     * Update an item in the storage
     *
     * @param store Store to update the data in
     * @param data Data to update in the items
     * @param filter Filter to use to determine what items should be updated.
     *   If an id is given in the `data`, if `filter` is true, the item with
     *   the id given will be replaced with the item given
     *
     * @returns A Promise that resolves once all the items have updated
     */
    update: (data: Data | Data[], filter?: Filter | true) => Promise<number>,

    /**
     * Deletes items from a storage that match the filter
     *
     *
     * @returns A Promise that resolves to the number of deleted items once
     *   all the items have been deleted
     */
    delete: (filter: true | Filter) => Promise<number>,
  }


  /// Type for storing a string that can have
  export type LangStringElement = string | string[] | { [multiple: number]: string };

  /// Type for storing a multi-lingual string
  export type LangString = LangStringElement | { [lang: string]: LangStringElement };

  export interface CollectionObject {
    label?: LangString,
    description?: LangString
  }

  /// Definition of a Field in a MoltenDB Collection
  export interface Field extends CollectionObject {
    /// The field type
    type: string,
    /// The storage to store the field in
    storage?: string | string[],
    /// Whether the field is required
    required?: boolean,
    /// If the field should accept multiple values
    multiple?: boolean,
    /// If the multiple values should be stored in a key/value map
    object?: boolean,
    [option: string]: any
  }

  /// Configuration for storage mechanism for a Collection to use
  export interface CollectionStorage extends CollectionObject {
    type: string,
    name?: string,
    closeConnection?: boolean,
    connectionTimeout?: number,
    options?: MDB.StorageOptions
  }

  /// Configuration object for a MoltenDB Collection
  export interface CollectionOptions extends CollectionObject {
    name: string,
    storage: {
      [id: string]: CollectionStorage
    },
    fields: {
      [fieldName: string]: Field
    }
  }

  export interface Options {
    [optionName: string]: {
      label: LangString,
      description: LangString,
      /// MoltenDB Field type
      type: string,
      [typeOption: string]: any
    }
  }
}

// Storage-related declarations
declare namespace MDB {
  /// Types that the Storage could support
  export type FieldTypes = string;

  /// Feature that the Storage could support
  export type StorageFeatures =
      /// Can generate a unique id for an item that doesn't have one
      'uniqueId'
      /// Can be used as a key-value store
      | 'keyValue'
      /// Database does not have a schema
      | 'schemaless';

  /// Store types
  export type StoreTypes =
      'store' /// Document/Tabular-type store
      | 'keyValue'; /// Key-value store

  export type connectToStorage = {
    /**
     * Opens (creates a connection to) a storage with the given options
     *
     * @params options Options to pass to the storage generator
     *
     * @returns A promise that resolves to the storage
     */
    (options: StorageOptions): Promise<StorageConnection>,
    /// Label for storage
    label: MDB.LangString,
    /// Description for storage
    description: MDB.LangString,
    /// Options for storage connection
    options: MDB.Options,
    /// Types that the storage supports
    types: FieldTypes[],
    /// Features that the storage supports
    features: StorageFeatures[]
  };

  /// Base options to be passed to connectStorage
  export interface StorageOptions {
    [option: string]: any
  }

  export interface StorageObject {
    label?: string,
    description?: string
  }

  /// Definition of a field in a store
  export interface StoreField extends StorageObject {
    type: string,
  }

  export interface FieldSchema {
    [field: string]: StoreField
  }

  export interface KeyValueStoreOptions extends StorageObject {
    name: string,
    type: 'keyValue'
  }

  /// Definition of a store in a storage
  export interface ItemStoreOptions extends StorageObject {
    name: string,
    type: 'store',
    fields: { [fieldId: string]: StoreField },
  }

  export type StoreOptions = ItemStoreOptions | KeyValueStoreOptions;

  export interface StorageConnection {
    /**
     * Get an Store instance of a store to complete operations on
     *
     * @param store Store specification
     *
     * @returns A Promise that resolves to the store instance
     */
    getStore: (store: StoreOptions) => Promise<StoreInstance|KeyValueStoreInstance>,

    /**
     * Creates a new store in the storage
     *
     * @param store Store specification
     *
     * @returns A Promise that resolves once the store has been created
     */
    createStore: (store: StoreOptions) => Promise<StoreInstance|KeyValueStoreInstance>,

    /**
     * Deletes a store from the storage
     *
     * @param store The store to delete
     *
     * @returns A Promise that resolves to:
     *   - `undefined` if the store didn't exist
     *   - `true` once the store has been deleted
     */
    deleteStore: (store: StoreOptions) => Promise<undefined>,

    /**
     * Checks that a store exists
     *
     * @returns A Promise that resolves to:
     *   - `undefined` if the store does't exist
     *   - `true` if the store matches the given options
     *   - `false` if the store doesn't match the given options
     */
    checkStore: (store: StoreOptions) => Promise<undefined>,

    /**
     * Closes the storage (connection)
     */
    close: () => void
  }

  ////// KeyValueStore
  export type Key = string | number;

  export interface KeyValueStoreInstance {
    /**
     * Get value of an existing key-value
     *
     * @param key Key of key-value value to return
     *
     * @returns Promise resolving to key-value value or null if
     *   id doesn't currently exist
     */
    getItem: (id: Key) => Promise<any>,

    /**
     * Set value of an key-value pair
     *
     * @param key Key of key-value pair to set
     * @param value Value of key-value pair to set
     *
     * @returns Promise that resolves once the key-value
     *   pair has been saved
     */
    setItem: (key: Key, value: any) => Promise<undefined>,

    /**
     * Removes a key-value pair
     *
     * @param key Key of key-value pair to remove
     *
     * @returns Promise that resolves once the key-value has been removed
     */
    removeItem: (key: Key) => Promise<undefined>
  }

  export interface ReadQuery {
    type: 'read',
    /// Filter for query
    filter: Filter,
    /// Number of rows to return
    limit: number,
    /// Row to return from
    offset: number
  }

  export interface CreateQuery {
    type: 'create',
    /// Data to insert into the storage
    data: any
  }

  export interface UpdateQuery {
    type: 'update',
    data: any,
    filter: Filter
  }

  export interface DeleteQuery {
    type: 'delete',
    filter: Filter
  }

  export type Query = ReadQuery | CreateQuery | UpdateQuery | DeleteQuery;

  export interface StoreResult {
    length: number,
    items: any[]
  }

  export interface StoreInstance {
    /**
     * Creates a new item / new items in the storage
     *
     * @param data Data to insert into the storage. If data is an array, it
     *   is assumed that the array contains multiple items to create in the
     *   storage
     *
     * @returns A Promise that will resolve to an array of the items created
     *   once all the items have been created
     */
    create: (data: Data | Data[])
        => Promise<any[]>,

    /**
     * Retrieves items from the storage
     *
     * @param store Store to retrieve the data from
     * @param filter Filter to use for retrieving the items from the storage
     *
     * @returns A Promise that will resolve to the retrieved data
     */
    read: (filter: Filter) => Promise<Data[]>,

    /**
     * Get the number of items that would be returned by a query
     *
     * @returns A Promise that resolves to the number of rows
     */
    count: (filter: Filter) => Promise<number>,

    /**
     * Update an item in the storage
     *
     * @param store Store to update the data in
     * @param data Data to update in the items
     * @param filter Filter to use to determine what items should be updated.
     *   If an id is given in the `data`, if `filter` is true, the item with
     *   the id given will be replaced with the item given
     *
     * @returns A Promise that resolves once all the items have updated
     */
    update: (data: Data | Data[], filter?: Filter | true) => Promise<number>,

    /**
     * Deletes items from a storage that match the filter
     *
     *
     * @returns A Promise that resolves to the number of deleted items once
     *   all the items have been deleted
     */
    delete: (filter: true | Filter) => Promise<number>,
  }
}

// Type-related definitions
declare namespace MDB {
  /**
   * An object containing the errors for a form or field
   */
  export interface FieldError {
    [fieldName: string]: Error | FieldError
  }

  /**
   * Function to create the type for a MoltenDB instance
   *
   * @param mdb MoltenDB Instance Library
   */
  export type createType = (mdb: MDB.MoltenInternalInstance) => Type;

  export interface Type {
    /**
     * Name of the type
     */
    label: MDB.LangString;

    /**
     * Description of the type
     */
    description: MDB.LangString;
    /**
     * Field type options to change the storage and behaviour of the field
     */
    options: MDB.Options;

    /**
     * Get an instance of a type in the given a collection and an item
     *
     * @param name Name of the field to create a type instance for
     * @param collectionOptions Options for the collection to create the type
     *   for
     * @param item Item to create the type instance for
     *
     * @returns The type instance
     */
    instance: (name: string, collectionOptions: MDB.CollectionOptions,
        resultRow: MDB.ResultRow, item: { [field: string]: any }) => ResultTypeInstance;

    /**
     * Validates the given value
     *
     * @param name Name of the field to validate the value for
     * @param collectionOptions Options for the collection to validate the
     *   value for.
     * @param value Value to validate
     * TODO Need the entire items value for dependencies lookup
     *
     * @return An error, an object containing the errors for the
     * sub-fields, or null if value is valid
     */
    validate: (name: string, collectionOptions: MDB.CollectionOptions,
        value: any) => Error | FieldError;

    /**
     * Create the schema required to store the type value in the storage for
     * given collection
     *
     * @param name Name of the field to create the schema for
     * @param collectionOptions Options for the collection to create the
     *   schema for
     * @param storage Identification of the storage that the field will be
     *   being retrieved from
     *
     * @returns An object containing the field schemas
     */
    schema: (name: string, collectionOptions: MDB.CollectionOptions,
        storage: string) => MDB.FieldSchema;

    /**
     * Returns the list of fields that need to be retrieved for this type from
     * given storage type
     *
     * @param name Name of the field to get list of fields for
     * @param collectionOptions Options for the collection to get the fields
     *   for
     * @param storage Identification of the storage that the field will be
     *   being retrieved from
     */
    fields: (name: string, collectionOptions: MDB.CollectionOptions,
        storage: string) => Array<string>;

    /**
     * Converts the given value into a value to be stored in the storage for
     * the given collection
     *
     * @param name Name of the field to convert the value for
     * @param collectionOptions Options for the collection to create the
     *   converted value for
     * @param value Value to convert for storage
     *
     * @returns Object contain key/value pairs to store
     */
    store: (name: string, collectionOptions: MDB.CollectionOptions,
      storage: string, value: any) => any;
  }

  export interface ResultTypeInstance {
    /**
     * Convert the value to a string
     *
     * @returns String value
     */
    toString: () => string;

    /**
     * Returns the raw value
     *
     * @returns Raw value
     */
    valueOf: () => any;
  }
}

export = MDB;

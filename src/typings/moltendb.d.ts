import * as MDB from './options';

declare namespace MDB {
  export type MoltenDB = (options: MDB.MoltenDBOptions) => Promise<MoltenDBInstance>;

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
     *   specified collection
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
     * @param name The name of the collection to check
     *
     * @returns A promise that will resolve to true if the collection exists
     *   and is valid, false if the collection exists, but it not valid, and
     *   undefined if the collection does not exist
     */
    checkCollection: (name: string) => Promise<boolean|undefined>,

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
  };

  export interface MoltenInternalInstance {
    options: MDB.MoltenDBOptions,
    types: {
      [typeId: string]: MDB.Type.Type
    },
    storage: {
      [storageId: string]: MDB.Storage.StorageInstance
    }
  };

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
    raw: () => { [field: string]: any },
    ///@internal
    collectionOptions: CollectionOptions
  }

  export interface Result {
    length: number,
    row: (index: number) => ResultRow,
    rows: () => Iterable<ResultRow>
  };

  /// @TODO should be able to access collection options from instance
  export interface CollectionInstance {
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
    label: LangString,
    description?: LangString
  }

  /// Definition of a Field in a MoltenDB Collection
  export interface Field extends CollectionObject {
    type: string,
    storage?: string | string[]
  }

  /// Configuration for storage mechanism for a Collection to use
  export interface CollectionStorage extends CollectionObject {
    type: string,
    name: string,
    closeConnection?: boolean,
    connectionTimeout?: number,
    options: MDB.Storage.StorageOptions
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
};

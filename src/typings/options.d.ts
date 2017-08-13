declare namespace MDB {
  /// Options to configure a MoltenDB instance
  export type MoltenDBOptions = {
    /// Configuration of what storage engines to use
    storage: {
      /// ID string of the storage
      [storageName: string]: {
        /// Function to call to connect to the storaget
        connect: MDB.Storage.connectStorage,
        /// Options to pass to the storage connection function when connecting
        options: MDB.Storage.StorageOptions
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
  };
};

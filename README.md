# molten-core
The MoltenDB core package

# About MoltenDB
MoltenDB is aiming to a database library allowing the creation of simple
databases, including web interfaces with no coding. It has designed to be as
modular as possible allowing the creation of additional modules if required.

MoltenDB is designed for simplicity, so complex database operations may not be
possible through MoltenDB, however the results should be able to be displayed
through MoltenDB, provided the storage module exists for the database being
used.

# MoltenDB Package Overview
- [molten-core](https://github.com/MoltenDB/molten-core) -
  The library package for interfacing with MoltenDB instances
- [molten-type](https://github.com/MoltenDB/molten-type) -
  The specification and tests for the MoltenDB Types
  - [molten-type-base](https://github.com/MoltenDB/molten-type-base) -
    The base types for MoltenDB
- [molten-storage](https://github.com/MoltenDB/molten-storage) -
  The specification and tests for the MoltenDB Storage API, used to connect
  storage mechanisms, such as databases, to MoltenDB
- ~molten-storage-\*~ - Packages implementing the MoltenDN Storage API
  - [molten-storage-json-crud](https://github.com/MoltenDB/molten-storage-json-crud) -
    An implementation of the MoltenDB API using
    [json-crud](https://github.com/MeldCE/json-crud)
- ~molten-web-\*~ - Packages providing a web interface to MoltenDB
  - [molten-web-react](https://github.com/MoltenDB/molten-web-react)
    React-based web interface for MoltenDB
- [molten-api](https://github.com/MoltenDB/molten-api) -
  The specification and tests for modules implementing a MoltenDB API interface
- ~molten-api-\*~ - Packages providing non-web-based interfaces to MoltenDB
  - [molten-api-websocket](https://github.com/MoltenDB/molten-api-websocket)
    An Web Socket (Socket.IO) API interface to interact with MoltenDB
    - [molten-api-websocket-admin](https://github.com/MoltenDB/molten-api-websocket-admin)
      A Web Socket message handler for MoltenDB administration messages
- [moltendb](https://github.com/MoltenDB/molten) -
  A bundle of MoltenDB packages to get started with. It uses:
  - [moltendb-web-react](https://github.com/MoltenDB/moltendb-web-react)
  for the web interface
  - [moltendb-storage-json-crud](https://github.com/MoltenDB/molten-storage-json-crud)
  for data storage

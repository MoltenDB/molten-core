import MoltenDB from '../';
import {createTestMoltenOptions, testCollection, testData} from './helpers/collection';

describe('MoltenDB()', function() {
  it('should return a promise that rejects given invalid options', function() {
    const promise = MoltenDB('bad');

    expect(promise).toEqual(jasmine.any(Promise));

    promise.then(() => fail('Promise resolved instead of rejecting bad options'),
      () => Promise.resolve());
  });

  it('should return Promise that resolves to an MoltenDBInstance', () => {
    const promise = MoltenDB(createTestMoltenOptions());

    expect(promise).toEqual(jasmine.any(Promise));

    promise.then((moltenDb) => {
      expect(moltenDb).toEqual(jasmine.any(Object));

      expect(moltenDb.createCollection).toEqual(jasmine.any(Function));
      expect(moltenDb.collection).toEqual(jasmine.any(Function));
      expect(moltenDb.updateCollection).toEqual(jasmine.any(Function));
      expect(moltenDb.deleteCollection).toEqual(jasmine.any(Function));
    });
  });
});

describe('MoltenDB instance', function() {
  beforeEach(() => {
    return MoltenDB(createTestMoltenOptions()).then((mdb) => {
      this.mdb = mdb;
    }, fail);
  });

  const checkCollectionInstance = (collection) => {
    expect(collection).toEqual(jasmine.any(Object));

    expect(collection.create).toEqual(jasmine.any(Function));
    expect(collection.read).toEqual(jasmine.any(Function));
    expect(collection.count).toEqual(jasmine.any(Function));
    expect(collection.update).toEqual(jasmine.any(Function));
    expect(collection.delete).toEqual(jasmine.any(Function));
  };

  describe('createCollection()', () => {
    it('should return a Promise that rejects on bad options', () => {
      const promise = this.mdb.createCollection('bad');

      expect(promise).toEqual(jasmine.any(Promise));

      return promise.then(
          () => fail('createCollection promise resolved instead of rejecting'),
          () => Promise.resolve());
    });

    it('should return a Promise that resolves when the collection has been created', () => {
      const promise =  this.mdb.createCollection(testCollection);

      return promise.then(checkCollectionInstance);
    });
  });

  describe('', () => {
    beforeEach(() => {
      return this.mdb.createCollection(testCollection).then((collection) => {
        this.collection = collection;
      }).catch(fail);
    });

    describe('collection()', () => {
      it('should return a promise that rejects on an invalid collection name',
          (done) => {
        this.mdb.collection({}).then(fail, done);
      });

      it('should return a promise that resolves to `undefined` if the table '
          + 'does not exist', () => {
        return this.mdb.collection('noexist').then((collection) => {
          expect(collection).toEqual(undefined);
        }).catch(fail);
      });

      it('should return a promise that resolves to the table object of the '
          + 'table given', (done) => {
        return this.mdb.collection('test').then(checkCollectionInstance);
      });
    });

    describe('checkCollection()', () => {
      it('should return a promise that rejects on bad collection options', () => {
        return this.mdb.checkCollection(false).then(
          () => fail('Promise should have rejected'),
          () => Promise.resolve()
        );
      });

      it('should return a Promise that resolves to undefined if the collection does not exist', () => {
        return this.mdb.checkCollection('bad').then((result) => {
          expect(result).not.toBeDefined();
        });
      });

      it('should return a Promise that resolves to true if the collection exists', () => {
        return this.mdb.checkCollection('test').then((result) => {
          expect(result).toEqual(true);
        });
      });

      xit('should return a Promise that resolves to false if the collection does not match', () => {
        return this.mdb.checkCollection('test').then((result) => {
          expect(result).toEqual(true);
        });
      });
    });

    xdescribe('updateCollection()', () => {
    });

    describe('deleteCollection()', () => {
      it('should return an error that rejects on an invalid collection name', () => {
        return this.mdb.deleteCollection({}).then(
          () => fail('promise should have rejected'),
          () => Promise.resolve()
        );
      });

      it('should return a promise that resolves to false if the collection did not exist', () => {
        return this.mdb.deleteCollection('noexitst').then((existed) => {
          expect(existed).toEqual(false);
        });
      });

      it('should return a promise that resolves to true if the collection did exist', () => {
        return this.mdb.deleteCollection(testCollection.name).then((existed) => {
          expect(existed).toEqual(true);
        });
      });
    });

    xdescribe('getInternal()', () => {
      it('should not be iterable on the Molten Instance', () => {
        expect(Object.keys(this.mdb).indexOf('getInternal')).toEqual(-1, 'appears in object keys');
      });

      it('should be a function', () => {
        expect(this.mdb.getInternal).toEqual(jasmine.any(Function));
      });

      xit('should return the internal instance', () => {
        const internal = this.mdb.getInternal();

        ///TODO
      });
    });
  });
});

import {createTestMoltenOptions, testCollection, testData} from './helpers/collection';
import MoltenDB from '../';

describe('Result', function() {
  beforeEach(() => {
    return MoltenDB(createTestMoltenOptions()).then((mdb) => {
      return mdb.createCollection(testCollection);
    }).then((collection) => {
      this.collection = collection;
      return this.collection.create(testData);
    }).then(() => {
      return this.collection.read();
    }).then((result) => {
      this.results = result;
    }).catch(fail);
  });

  describe('length', () => {
    it('should be the number of rows returned', () => {
      expect(this.results.length).toEqual(Object.keys(testData).length,
          'number of testData items');

      return this.collection.read({_id: 'notin'}).then((result) => {
        expect(result.length).toEqual(0, 'a zero length result');
      });
    });
  });

  describe('raw()', () => {
    it('should return an array of the raw results', () => {
      expect(this.results.raw()).toEqual(testData);
    });
  });

  describe('row()', () => {
    it('should return a result instance for the given row', () => {
      expect(this.results.row(0)).toBeDefined();
    });

    it('should return undefined when given an index above the number of rows returned', () => {
      expect(this.results.row(Object.keys(testData).length)).not.toBeDefined();
    });
  });

  xdescribe('rows()', () => {
    it('should return an interable of each row', () => {
    });
  });
});

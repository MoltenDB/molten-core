import { createTestMoltenOptions, testCollection, testData } from './helpers/collection';
import MoltenDB from '../';
describe('Result Row', function () {
    beforeEach(() => {
        return MoltenDB(createTestMoltenOptions()).then((mdb) => {
            return mdb.createCollection(testCollection);
        }).then((collection) => {
            this.collection = collection;
            return this.collection.create(testData);
        }).then(() => {
            return this.collection.read();
        }).then((result) => {
            //this.result = result;
            this.firstRow = result.row(0);
        }).catch(fail);
    });
    it('should have a ResultField for each field', () => {
        Object.keys(testCollection.fields).forEach((field) => {
            expect(this.firstRow[field]).toEqual(jasmine.any(Object), 'a value object');
            expect(this.firstRow[field].toString).toEqual(jasmine.any(Function), 'to string function');
            expect(this.firstRow[field].value).toEqual(jasmine.any(Function), 'raw value function');
        });
    });
});

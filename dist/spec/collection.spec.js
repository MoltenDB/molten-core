import { createTestMoltenOptions, testCollection, testData } from './helpers/collection';
import MoltenDB from '../';
describe('MoltenDB collection instance', function () {
    const instanceTests = (description, collectionOptions) => {
        describe(description, () => {
            beforeEach(() => {
                return MoltenDB(createTestMoltenOptions()).then((mdb) => {
                    return mdb.createCollection(testCollection);
                }).then((collection) => {
                    this.collection = collection;
                });
            });
            describe('options()', () => {
                it('should return the collection options', () => {
                    expect(this.collection.options()).toEqual(testCollection);
                });
                it('should not taint the collection options if the returned value is changed', () => {
                    let options = this.collection.options();
                    options.label = 'bad';
                    expect(this.collection.options().label).not.toEqual('bad', 'The tainted label');
                });
            });
            describe('create()', () => {
                it('should return a promise that rejects if given bad data', () => {
                    return this.collection.create('bad').then(() => fail('create with bad data resolved'), () => Promise.resolve());
                });
                it('should return a promise that resolves an array of the ids of the items created', () => {
                    return this.collection.create(testData).then((ids) => {
                        expect(ids).toEqual(jasmine.any(Array));
                        expect(ids.length).toEqual(testData.length);
                    });
                });
            });
            describe('read()', () => {
                beforeEach(() => {
                    return this.collection.create(testData);
                });
                it('should return a promise that rejects on an invalid query', () => {
                    return this.collection.read('bad').then(() => fail('Promise should have rejected on bad query'), () => Promise.resolve());
                });
                it('should return a promise that resolves to a result object', () => {
                    return this.collection.read().then((result) => {
                        expect(result).toEqual(jasmine.any(Object));
                        expect(result.length).toEqual(testData.length);
                        expect(result.row).toEqual(jasmine.any(Function));
                        //TODO expect(result.rows).toEqual(jasmine.any(Function));
                    });
                });
                it('should return a promise that resolves to an empty result object if '
                    + 'no matches are returned', () => {
                    return this.collection.read({ id: 'noexist' }).then((result) => {
                        expect(result).toEqual(jasmine.any(Object));
                        expect(result.length).toEqual(0);
                        expect(result.row).toEqual(jasmine.any(Function));
                        //TODO expect(result.rows).toEqual(jasmine.any(Function));
                    });
                });
            });
            describe('count()', () => {
                beforeEach(() => {
                    return this.collection.create(testData);
                });
                it('should return a promise that rejects on an invalid query', () => {
                    return this.collection.count('bad').then(() => fail('Promise with query should have rejected'), () => Promise.resolve());
                });
                it('should return a promise that resolves to 0 if no '
                    + 'matches are returned', () => {
                    return this.collection.count({ id: 'noexist' }).then((count) => {
                        expect(count).toEqual(0);
                    });
                });
                it('should return a promise that resolves to the number of returned '
                    + 'rows of the query', () => {
                    return this.collection.count().then((count) => {
                        expect(count).toEqual(testData.length);
                    });
                });
            });
        });
    };
    instanceTests('with a single store', testCollection);
    // instanceTests('with multiple stores', TODO);
});

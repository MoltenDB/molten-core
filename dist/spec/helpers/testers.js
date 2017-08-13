export const testLangString = (value, label) => {
    if (typeof value === 'string') {
    }
    else if (value instanceof Object) {
    }
    else {
        fail(label + ' is not of LangString');
    }
};

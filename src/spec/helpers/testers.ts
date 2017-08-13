export const testLangString = (value: MDB.LangString, label: string) => {
  if (typeof value === 'string') {
  } else if (value instanceof Object) {
  } else {
    fail(label + ' is not of LangString');
  }
};

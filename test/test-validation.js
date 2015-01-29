var validate = require('./../src/validate.js');

describe('validation', function () {
  it ('is a dummy', function () {
    expect(true).toBeTruthy();
  });

  it ('is validates integer', function () {
    expect(validate('array of integers', [2])).toEqual(true);
    expect(validate('integer', 2)).toEqual(true);
  });
});

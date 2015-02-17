define(['validate'], function (validate) {
  describe('validation', function () {
    it ('is validates integer', function () {
      expect(validate('integer', 2)).toEqual(true);
      expect(validate('integer', 2.3)).toEqual(false);
      expect(validate('integer', '2')).toEqual(false);
      expect(validate('array of integers', [2])).toEqual(true);
    });
  });
});

  var validate = require('../src/validate.js');
  describe('validation', function () {
    it ('validates integer', function () {
      expect(validate('integer', 2)).toEqual(true);
      expect(validate('integer', 2.3)).toEqual(false);
      expect(validate('integer', '2')).toEqual(false);
      expect(validate('array of integers', [2])).toEqual(true);
    });

    it ('validates an array of objects', function () {
      expect(validate('array of objects', [{}])).toEqual(true);
      expect(validate('array of objects', 2.3)).toEqual(false);
      expect(validate('array of objects', '2')).toEqual(false);
      expect(validate('array of integers', [2])).toEqual(true);
    });
    it ('validates an array of emails', function () {
      expect(validate('array of emails', ['herman@uxp.com', 'starikov@uxp.com'])).toEqual(true);
      expect(validate('array of emails', ['herman.uxp.com'])).toEqual(false);
    });
  });

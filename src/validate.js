  function validate (pattern, value) {
    return createAllValidations(pattern).some(function (validations) {
      return validations.every(function (validation) {
        return validation(value);
      });
    });
  }

  function createAllValidations (pattern) {
    return pattern.split(/\s+or\s+/).map(function (subpattern) {
      return createValidations(subpattern);
    });
  }

  function createValidations (pattern) {
    return [getTypeValidation(pattern)];
  }

  function getTypeValidation (pattern) {
    return typeChecks[pattern] || throwTypeUnknown(pattern);
  }

  function throwTypeUnknown (pattern) {
    throw new Error('Unknown type: ' + pattern);
  }

  var typeChecks = {
    'any': function () {
      return true;
    },
    'url': function (value) {
      return typeChecks.string(value);
    },
    'email': function (value) {
      return typeChecks.string(value) && value.indexOf('@') !== -1;
    },
    'phone number': function (value) {
      return typeChecks.string(value) && /^[0-9\(\)\-\s]+$/.test(value);
    },
    'array': function (value) {
      return Array.isArray(value);
    },
    'number': function (value) {
      return typeof value === 'number' && !isNaN(value);
    },
    'integer': function (value) {
      var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991,
      MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER || -MAX_SAFE_INTEGER;
      return typeChecks.number(value) && value === parseInt(value) &&
      value <= MAX_SAFE_INTEGER && value >= MIN_SAFE_INTEGER;
    }
  }, standardTypes = ['undefined', 'boolean', 'number', 'string', 'object'];

  defineStandardTypeChecks();
  defineTypeCheckOfArrayElements();

  function defineStandardTypeChecks () {
    standardTypes.forEach(function (type) {
      typeChecks[type] = function (value) {
        return typeof value === type;
      };
    });
  }

  function defineTypeCheckOfArrayElements () {
    Object.keys(typeChecks).forEach(function (type) {
      typeChecks['array of ' + type + 's'] = function (value) {
        return typeChecks.array(value) && value.every(function (item) {
          return typeChecks[type](item);
        });
      };
    });
  }
  
  module.exports = validate;

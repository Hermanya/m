!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.m=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var validate = require('./validate.js'),
ajax = require('./ajax.js');

var m = function (url, data) {
  var w = Object.create(m),
      method = getMethodFromString(url);
  w.url = url;
  w.data = data;
  if (method) {
    w.url = getUrlFromString(url.replace(method, ''));
    return w[method]();
  }
  return w;
};

function getUrlFromString (string) {
  string = string.split('of').reverse().join(' ');
  string = string.split('with id').join('');
  string = string.split(/\s+/).join(' ');
  string = string.replace(/\s/g, '/');
  return string;
}

m.methods = ['get', 'post', 'put', 'delete'];

m.initialize = function (maybeAPI) {
  var api = maybeAPI || {};
  supportMethods(api);
  supportMethodsWithSingularForms(api);
  supportPluralForms(api);
  supportSingularForms(api);
};

function supportSingularForms (api) {
  api.resources.forEach(function (resource) {
    m[resource] = function (data) {
      var id = data,
          url = this.url || '';
      url += '/' + resource;
      if (typeof data === 'object') {
        id = data.id;
      }
      if (id) {
        url += '/' + id;
      }
      return m(url, this.data || data);
    };
  });
}

function supportPluralForms (api) {
  api.resources.forEach(function (resource) {
    api.resources.map(function (resource) {
      return resource + 's';
    }).forEach(function (pluralFormOfResource) {
      m[pluralFormOfResource] = function (data) {
        return m((this.url || '') + '/' + pluralFormOfResource, this.data || data);
      };
    });
  });
}

function supportMethodsWithSingularForms (api) {
  m.methods.forEach(function (method) {
    api.resources.forEach(function (resource) {
      m[method + capitalize(resource)] = function (id) {
        m[method](m('/' + resource + '/' + id));
      };
    });
  });
}

function supportMethods (api) {
  m.methods.forEach(function (method) {
    m[method] = function (maybeRequest) {
      var request = maybeRequest || this,
      url = api.prefix + request.url,
      data = request.data || {};
      return ajax(method, url, data);
    };
  });
}

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.substring(1);
}

function getMethodFromString (string) {
  return m.methods.filter(function (method) {
    return string.indexOf(method) === 0;
  })[0];
}

},{"./ajax.js":2,"./validate.js":3}],2:[function(require,module,exports){
module.exports = function ajax (method, url, data) {
  data = serialize(data);
  if (method === 'get' && data) {
    url += '?' + data;
    data = undefined;
  }

  console.info(method.toUpperCase(), url, data);
  return new Promise(function (resolve, reject) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = onRequestUpdate.bind(undefined, resolve, reject, xmlhttp);
    xmlhttp.open(method, url, true);

    if (method !== 'get') {
      xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }

    xmlhttp.send(data);
  });
};

function serialize (object, prefix) {
  return Object.keys(object).map(function (key) {
    var value = object[key];
    if (prefix) {
      key = prefix + '[' + key + ']';
    }
    if (typeof value === 'object') {
      return serialize(value, key);
    }
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }).join('&');
}

function onRequestUpdate (resolve, reject, xmlhttp) {
  if (xmlhttp.readyState === 4) {
    onRequestComplete(xmlhttp, resolve, reject);
  }
}

function onRequestComplete (resolve, reject, xmlhttp) {
  if (xmlhttp.status === 200) {
    resolve(JSON.parse(xmlhttp.responseText));
  } else {
    reject(xmlhttp);
  }
}

},{}],3:[function(require,module,exports){
module.exports = function validate (pattern, value) {
  return createAllValidations(pattern).some(function (validations) {
    return validations.every(function (validation) {
      return validation(value);
    });
  });
};

function createAllValidations (pattern) {
  return pattern.split('or').map(function (subpattern) {
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

},{}]},{},[1])(1)
});
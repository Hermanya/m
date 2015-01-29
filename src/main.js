var validate = require('./validate.js'),
ajax = require('./ajax.js');

module.exports = function m (url, data) {
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

m.methods = ['get', 'post', 'put', 'delete'];
m.initialize = function (maybeAPI) {
  m.api = maybeAPI || {};
  defineMethods();
  defineMethodsWithSingularForms();
  definePluralForms();
  defineSingularForms();
};

function defineSingularForms () {
  m.api.resources.forEach(function (resource) {
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

function definePluralForms () {
  m.api.resources.forEach(function (resource) {
    m.api.resources.map(function (resource) {
      return resource + 's';
    }).forEach(function (pluralFormOfResource) {
      m[pluralFormOfResource] = function (data) {
        return m((this.url || '') + '/' + pluralFormOfResource, this.data || data);
      };
    });
  });
}

function defineMethodsWithSingularForms () {
  m.methods.forEach(function (method) {
    m.api.resources.forEach(function (resource) {
      m[method + capitalize(resource)] = function (id) {
        m[method](m('/' + resource + '/' + id));
      };
    });
  });
}

function definetMethods () {
  m.methods.forEach(function (method) {
    m[method] = function (maybeRequest) {
      var request = maybeRequest || this,
      url = m.api.prefix + request.url,
      data = request.data || {};
      return ajax(method, url, data);
    };
  });
}

function getMethodFromString (string) {
  return m.methods.filter(function (method) {
    return string.indexOf(method) === 0;
  })[0];
}

function getUrlFromString (string) {
  return string
  .split('of').reverse().join(' ')
  .split('with id').join('')
  .split(/\s+/).join(' ')
  .replace(/\s/g, '/');
}

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.substring(1);
}

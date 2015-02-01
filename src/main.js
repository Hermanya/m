var validate = require('./validate.js'),
ajax = require('./ajax.js');

function m (url, data) {
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
module.exports = m;

m.initialize = function (maybeAPI) {
  m.api = maybeAPI || {};
  Object.keys(m.api.resources).forEach(function (resource) {
    definePluralForm(resource);
    defineSingularForm(resource);
  });
};
m.init = m.initialize;

function defineSingularForm (resource) {
  m[resource] = function (data) {
    var id = data,
        url = this.url || '';
    url += '/' + resource;
    if (typeof data === 'object') {
      id = data.id;
    } else {
      data = undefined;
    }
    if (id) {
      url += '/' + id;
    }
    var model = m(url, this.data || data);
    decoratePluralForms(model);
    return model;
  };
  m[resource].url = '/' + resource;
  Object.keys(m).forEach(function (key) {
    m[resource][key] = m[key];
  });
}

function decoratePluralForms (request) {
  Object.keys(m.api.resources).forEach(function (resource) {
    var pluralForm = plural(resource);
    // Object.keys(m).forEach(function (key) {
    //   request[pluralForm] = m[key];
    // });
    request[pluralForm].url = request.url + '/' + pluralForm;
    request[pluralForm].data = request.data;
  });
}

function definePluralForm (resource) {
  var pluralForm = plural(resource);
  m[pluralForm] = function (data) {
    var url = (this.url || '') + '/' + pluralForm;
    return m(url, this.data || data);
  };
}

m.methods = ['get', 'post', 'put', 'delete'];
decorateWithMethods(m);

function decorateWithMethods (object) {
  m.methods.forEach(function (method) {
    object[method] = function (maybeRequest) {
      var request = maybeRequest || this,
      url = m.api.prefix + request.url,
      data = request.data || {};
  //  return ajax(method, url, data);
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

function plural (singularForm) {
  return singularForm + 's';
}

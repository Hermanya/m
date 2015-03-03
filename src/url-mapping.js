  var M = function (maybeAPI) {
    var m = Object.create(M);
    m.api = maybeAPI || {};
    m.cache = {};
    M.mapOverResourceTypes(function (resourceType) {
      decorateWithPluralFormMethods(resourceType, m);
      decorateWithSingularFormMethods(resourceType, m);
    }, m);
    M.initializationSubscribers.map(function (f) {f(m);});
    return m;
  };

  M.mapOverResourceTypes = function (callback, m) {
    m = m || this;
    return Object.keys(m.api.resources).map(callback);
  };
  M.initializationSubscribers = [];

  function decorateWithSingularFormMethods (resource, m) {
    m[resource] = function (maybeId) {
      var state = Object.create(m);

      state.urlFragments = (state.urlFragments || [m.api.prefix]).concat([resource]);
      state.resourceType = resource;

      function appendId (id) {
        state.id = id;
        state.urlFragments.push(id);
      }

      var strategy = {
        number: appendId,
        string: appendId,
        undefined: function () {/* fall through */}
      } [typeof maybeId] || throwInvalidArgument;

      strategy(maybeId);

      function throwInvalidArgument () {
        throw new Error('This function only accepts a string or a number id.');
      }

      return state;
    };
  }

  function decorateWithPluralFormMethods (resource, m) {
    var pluralForm = plural(resource);
    m[pluralForm] = function (maybeQuery) {
      var state = Object.create(this);

      state.urlFragments = (state.urlFragments || [m.api.prefix]).concat([pluralForm]);
      state.resourceType = resource;
      state.isPlural = true;

      var strategy = {
        object: function (query) {
          state.urlFragments.push('?' + serialize(query));
        },
        undefined: function () {/* fall through */}
      } [typeof maybeQuery] || throwInvalidArgument;

      strategy(maybeQuery);

      function throwInvalidArgument () {
        throw new Error('This function only accepts a plain old javascript query object.');
      }

      return state;
    };
  }

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

  function plural (singularForm) {
    return singularForm + 's';
  }
  module.exports = M;

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.M=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
  var Backbone = require('backbone');
  var M = require('./url-mapping.js');
  var modelConstructorsPerType = {};

  decorateWithBackboneMethods(M);

  function decorateWithBackboneMethods (M) {
    var key;
    for (key in new Backbone.Model()) {
      decorateWithKey(key, M);
    }
    for (key in new Backbone.Collection()) {
      decorateWithKey(key, M);
    }
    decorateWithKey('model', M);
    decorateWithKey('collection', M);
  }

  function decorateWithKey(key, M) {
    M[key] = M[key] || function proxy () {
      var model;
      this.url = this.urlFragments.join('/');
      if (key === 'model') {
        return getModel(this);
      } else if (key === 'collection') {
        return getCollection(this);
      } else if (this.isPlural) {
        model = getCollection(this);
      } else {
        model = getModel(this);
      }
      return model[key].apply(model, arguments);
    };
  }

  M.initializationSubscribers.push(function defineModels (m) {
    m.mapOverResourceTypes(function (resourceType) {
      modelConstructorsPerType[resourceType] = Backbone.Model.extend({
        validate: function (/* nextAttributes */) {
          if (false) {
            return 'an error';
          }
        },
        saveOwnAttributes: function (attributes) {
          var ownAttributes = attributes || Object.keys(this.attributes).reduce(function (attributes, key) {
            if (['displayName'].indexOf(key) !== -1) {
              attributes[key] = this.attributes[key];
            }
            return attributes;
          }.bind(this), {});
          return Backbone.ajax({
            type: 'PUT',
            url: this.url(),
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(ownAttributes)
          });
        },
        saveCustomAttributes: function () {
          return Backbone.ajax({
            type: 'POST',
            url: this.url() + '/attributes',
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(this.get('attributes'))
          });
        },
        saveEverything: function () {
          return Backbone.$.when(
            this.saveOwnAttributes(),
            this.saveCustomAttributes()
          );
        },
        modelsTiedWith: [],
        tieTo: function (otherModel) {
          otherModel.modelsTiedWith.forEach(function (indirectModel) {
            this.modelsTiedWith.push(indirectModel);
            indirectModel.modelsTiedWith.push(this);
          });
          this.modelsTiedWith.push(otherModel);
          otherModel.modelsTiedWith.push(this);
        },
        separateFromOthers: function () {
          this.modelsTiedWith.forEach(function (otherModel) {
            var indexOfThis = otherModel.modelsTiedWith.indexOf(this);
            otherModel.modelsTiedWith.splice(indexOfThis, 1);
          });
          this.modelsTiedWith = [];
        },
        get: function(key) {

          var _attributeMappings = m.api.resources[resourceType]._attributeMappings;
          if (_attributeMappings && _attributeMappings[key]) {
            var attribute = this.get('attributes').filter(function (attr) {
              return attr.name === _attributeMappings[key];
            })[0]
            var value;
            if (attribute) {
              try {
                value = JSON.parse(attribute.value);
              } catch (_) {
                value = attribute.value;
              }
            }
            return value;
          }

          var _shortcutMappings = m.api.resources[resourceType]._shortcutMappings;
          if (_shortcutMappings && _shortcutMappings[key]) {
            var value = _shortcutMappings[key].reduce(function(obj, key) {
              return obj[key];
            }, this.attributes);
              try {
                return JSON.parse(value);
              } catch (_) {
                return value;
              }
          }

          return Backbone.Model.prototype.get.call(this, key);
        },
        set: function(key, val, options) {
          var attrs, url, otherModel;
          if (!key) {
            return this;
          }
       // Handle both `"key", value` and `{key: value}` -style arguments.
          if (typeof key === 'object') {
            attrs = key;
            options = val;
          } else {
            (attrs = {})[key] = val;
          }
          options = options || {};



          var _attributeMappings = m.api.resources[resourceType]._attributeMappings;
          if (_attributeMappings) {
            Object.keys(_attributeMappings).forEach(function (attributeMapping) {
              var attributeName = _attributeMappings[attributeMapping];
              if (attrs[attributeMapping] !== undefined) {
                if (!this.has('attributes')) {
                  this.set('attributes', [], {silent: true})
                }
                var attributes = this.get('attributes').filter(function (attribute) {
                  return attribute.name !== attributeName;
                });

                var value = attrs[attributeMapping];
                if (typeof value !== 'string') {
                  value = JSON.stringify(value)
                }
                attributes.push({
                  name: attributeName,
                  value: value
                });
                delete attrs[attributeMapping]

                this.set('attributes', attributes);
              }
            }.bind(this));
          }



          var _shortcutMappings = m.api.resources[resourceType]._shortcutMappings;
          if (_shortcutMappings && _shortcutMappings[key]) {
            attrs = Object.keys(attrs).reduce(function(result, key) {
              if (_shortcutMappings[key]) {
                _shortcutMappings[key].reduce(function(parent, child, index) {
                  if (index === _shortcutMappings[key].length - 1) {
                    var value = attrs[key];
                    if (typeof value !== 'string') {
                      value = JSON.stringify(value)
                    }
                    parent[child] = value;
                  } else {
                    if (parent[child] === undefined) {
                      parent[child] = {};
                    }
                    return parent[child];
                  }
                }.bind(this), this.attributes);
              } else {
                result[key] = attrs[key]
              }
              return result;
            }.bind(this), {})
          }


      	  if (attrs.id && attrs.id !== this.get('id')) {
            this.separateFromOthers();
            url = m.api.prefix + '/' + resourceType + '/' + attrs.id;
      	    otherModel = m.cache[url];
            if (otherModel) {
              this.tieTo(otherModel);
            } else {
              m.cache[url] = this;
            }
          }
          if (!options.stopPropagationForM) {
            this.modelsTiedWith.forEach(function (model) {
              model.set(attrs, {stopPropagationForM: true});
            });
          }
          return Backbone.Model.prototype.set.call(this, attrs, options);
        }
      });
    });
  });

  function getModel (m) {
    return m.cache[m.url] || createModel(m);
  }

  function createModel (m) {
    m.cache[m.url] = new modelConstructorsPerType[m.resourceType]({
      id: m.id
    });
    m.cache[m.url].url = function () {
      return m.url;
    }
    return m.cache[m.url];
  }

  function getCollection (m) {
    return m.cache[m.url] || createCollection(m);
  }

  function createCollection (m) {
    m.cache[m.url] = new (Backbone.Collection.extend({
      url: function () {
        return m.url;
      },
      model: function (attributes) {
        var model, key = m.api.prefix + '/' + m.resourceType + '/' + attributes.id;
        if (attributes.id) {
          model = m.cache[key];
        }
        if (model) {
          model.set(attributes);
          return model;
        } else {
          model = new modelConstructorsPerType[m.resourceType](attributes);
          m.cache[key] = model;
          return model;
        }
      }
    }))();
    return m.cache[m.url];
  }
  module.exports = M;

},{"./url-mapping.js":2,"backbone":"backbone"}],2:[function(require,module,exports){
(function (global){
var myGlobal;
if (typeof window !== typeof undefined) {
  myGlobal = window;
} else if (typeof global !== typeof undefined) {
  myGlobal = global;
} else {
  throw 'global unknown '
}

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
    var state = Object.create(this === global ? m : this);

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
    var state = Object.create(this === global ? m : this);

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1iYWNrYm9uZS5qcyIsInNyYy91cmwtbWFwcGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUM1UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiAgdmFyIEJhY2tib25lID0gcmVxdWlyZSgnYmFja2JvbmUnKTtcbiAgdmFyIE0gPSByZXF1aXJlKCcuL3VybC1tYXBwaW5nLmpzJyk7XG4gIHZhciBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGUgPSB7fTtcblxuICBkZWNvcmF0ZVdpdGhCYWNrYm9uZU1ldGhvZHMoTSk7XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoQmFja2JvbmVNZXRob2RzIChNKSB7XG4gICAgdmFyIGtleTtcbiAgICBmb3IgKGtleSBpbiBuZXcgQmFja2JvbmUuTW9kZWwoKSkge1xuICAgICAgZGVjb3JhdGVXaXRoS2V5KGtleSwgTSk7XG4gICAgfVxuICAgIGZvciAoa2V5IGluIG5ldyBCYWNrYm9uZS5Db2xsZWN0aW9uKCkpIHtcbiAgICAgIGRlY29yYXRlV2l0aEtleShrZXksIE0pO1xuICAgIH1cbiAgICBkZWNvcmF0ZVdpdGhLZXkoJ21vZGVsJywgTSk7XG4gICAgZGVjb3JhdGVXaXRoS2V5KCdjb2xsZWN0aW9uJywgTSk7XG4gIH1cblxuICBmdW5jdGlvbiBkZWNvcmF0ZVdpdGhLZXkoa2V5LCBNKSB7XG4gICAgTVtrZXldID0gTVtrZXldIHx8IGZ1bmN0aW9uIHByb3h5ICgpIHtcbiAgICAgIHZhciBtb2RlbDtcbiAgICAgIHRoaXMudXJsID0gdGhpcy51cmxGcmFnbWVudHMuam9pbignLycpO1xuICAgICAgaWYgKGtleSA9PT0gJ21vZGVsJykge1xuICAgICAgICByZXR1cm4gZ2V0TW9kZWwodGhpcyk7XG4gICAgICB9IGVsc2UgaWYgKGtleSA9PT0gJ2NvbGxlY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBnZXRDb2xsZWN0aW9uKHRoaXMpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzUGx1cmFsKSB7XG4gICAgICAgIG1vZGVsID0gZ2V0Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vZGVsID0gZ2V0TW9kZWwodGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbW9kZWxba2V5XS5hcHBseShtb2RlbCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzLnB1c2goZnVuY3Rpb24gZGVmaW5lTW9kZWxzIChtKSB7XG4gICAgbS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgICBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGVbcmVzb3VyY2VUeXBlXSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgICAgIHZhbGlkYXRlOiBmdW5jdGlvbiAoLyogbmV4dEF0dHJpYnV0ZXMgKi8pIHtcbiAgICAgICAgICBpZiAoZmFsc2UpIHtcbiAgICAgICAgICAgIHJldHVybiAnYW4gZXJyb3InO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgc2F2ZU93bkF0dHJpYnV0ZXM6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgdmFyIG93bkF0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzIHx8IE9iamVjdC5rZXlzKHRoaXMuYXR0cmlidXRlcykucmVkdWNlKGZ1bmN0aW9uIChhdHRyaWJ1dGVzLCBrZXkpIHtcbiAgICAgICAgICAgIGlmIChbJ2Rpc3BsYXlOYW1lJ10uaW5kZXhPZihrZXkpICE9PSAtMSkge1xuICAgICAgICAgICAgICBhdHRyaWJ1dGVzW2tleV0gPSB0aGlzLmF0dHJpYnV0ZXNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGVzO1xuICAgICAgICAgIH0uYmluZCh0aGlzKSwge30pO1xuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5hamF4KHtcbiAgICAgICAgICAgIHR5cGU6ICdQVVQnLFxuICAgICAgICAgICAgdXJsOiB0aGlzLnVybCgpLFxuICAgICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShvd25BdHRyaWJ1dGVzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzYXZlQ3VzdG9tQXR0cmlidXRlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5hamF4KHtcbiAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIHVybDogdGhpcy51cmwoKSArICcvYXR0cmlidXRlcycsXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0KCdhdHRyaWJ1dGVzJykpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNhdmVFdmVyeXRoaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLiQud2hlbihcbiAgICAgICAgICAgIHRoaXMuc2F2ZU93bkF0dHJpYnV0ZXMoKSxcbiAgICAgICAgICAgIHRoaXMuc2F2ZUN1c3RvbUF0dHJpYnV0ZXMoKVxuICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIG1vZGVsc1RpZWRXaXRoOiBbXSxcbiAgICAgICAgdGllVG86IGZ1bmN0aW9uIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChpbmRpcmVjdE1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLnB1c2goaW5kaXJlY3RNb2RlbCk7XG4gICAgICAgICAgICBpbmRpcmVjdE1vZGVsLm1vZGVsc1RpZWRXaXRoLnB1c2godGhpcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5wdXNoKG90aGVyTW9kZWwpO1xuICAgICAgICAgIG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGgucHVzaCh0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VwYXJhdGVGcm9tT3RoZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhPZlRoaXMgPSBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLmluZGV4T2YodGhpcyk7XG4gICAgICAgICAgICBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLnNwbGljZShpbmRleE9mVGhpcywgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aCA9IFtdO1xuICAgICAgICB9LFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuXG4gICAgICAgICAgdmFyIF9hdHRyaWJ1dGVNYXBwaW5ncyA9IG0uYXBpLnJlc291cmNlc1tyZXNvdXJjZVR5cGVdLl9hdHRyaWJ1dGVNYXBwaW5ncztcbiAgICAgICAgICBpZiAoX2F0dHJpYnV0ZU1hcHBpbmdzICYmIF9hdHRyaWJ1dGVNYXBwaW5nc1trZXldKSB7XG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlID0gdGhpcy5nZXQoJ2F0dHJpYnV0ZXMnKS5maWx0ZXIoZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGF0dHIubmFtZSA9PT0gX2F0dHJpYnV0ZU1hcHBpbmdzW2tleV07XG4gICAgICAgICAgICB9KVswXVxuICAgICAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShhdHRyaWJ1dGUudmFsdWUpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBhdHRyaWJ1dGUudmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgX3Nob3J0Y3V0TWFwcGluZ3MgPSBtLmFwaS5yZXNvdXJjZXNbcmVzb3VyY2VUeXBlXS5fc2hvcnRjdXRNYXBwaW5ncztcbiAgICAgICAgICBpZiAoX3Nob3J0Y3V0TWFwcGluZ3MgJiYgX3Nob3J0Y3V0TWFwcGluZ3Nba2V5XSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gX3Nob3J0Y3V0TWFwcGluZ3Nba2V5XS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgICAgICAgICAgfSwgdGhpcy5hdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGtleSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgYXR0cnMsIHVybCwgb3RoZXJNb2RlbDtcbiAgICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfVxuICAgICAgIC8vIEhhbmRsZSBib3RoIGBcImtleVwiLCB2YWx1ZWAgYW5kIGB7a2V5OiB2YWx1ZX1gIC1zdHlsZSBhcmd1bWVudHMuXG4gICAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhdHRycyA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB2YWw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChhdHRycyA9IHt9KVtrZXldID0gdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXG5cbiAgICAgICAgICB2YXIgX2F0dHJpYnV0ZU1hcHBpbmdzID0gbS5hcGkucmVzb3VyY2VzW3Jlc291cmNlVHlwZV0uX2F0dHJpYnV0ZU1hcHBpbmdzO1xuICAgICAgICAgIGlmIChfYXR0cmlidXRlTWFwcGluZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKF9hdHRyaWJ1dGVNYXBwaW5ncykuZm9yRWFjaChmdW5jdGlvbiAoYXR0cmlidXRlTWFwcGluZykge1xuICAgICAgICAgICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IF9hdHRyaWJ1dGVNYXBwaW5nc1thdHRyaWJ1dGVNYXBwaW5nXTtcbiAgICAgICAgICAgICAgaWYgKGF0dHJzW2F0dHJpYnV0ZU1hcHBpbmddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzKCdhdHRyaWJ1dGVzJykpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdhdHRyaWJ1dGVzJywgW10sIHtzaWxlbnQ6IHRydWV9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0KCdhdHRyaWJ1dGVzJykuZmlsdGVyKGZ1bmN0aW9uIChhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUubmFtZSAhPT0gYXR0cmlidXRlTmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2F0dHJpYnV0ZU1hcHBpbmddO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgbmFtZTogYXR0cmlidXRlTmFtZSxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBhdHRyc1thdHRyaWJ1dGVNYXBwaW5nXVxuXG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2F0dHJpYnV0ZXMnLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgdmFyIF9zaG9ydGN1dE1hcHBpbmdzID0gbS5hcGkucmVzb3VyY2VzW3Jlc291cmNlVHlwZV0uX3Nob3J0Y3V0TWFwcGluZ3M7XG4gICAgICAgICAgaWYgKF9zaG9ydGN1dE1hcHBpbmdzICYmIF9zaG9ydGN1dE1hcHBpbmdzW2tleV0pIHtcbiAgICAgICAgICAgIGF0dHJzID0gT2JqZWN0LmtleXMoYXR0cnMpLnJlZHVjZShmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgICAgICAgICAgICBpZiAoX3Nob3J0Y3V0TWFwcGluZ3Nba2V5XSkge1xuICAgICAgICAgICAgICAgIF9zaG9ydGN1dE1hcHBpbmdzW2tleV0ucmVkdWNlKGZ1bmN0aW9uKHBhcmVudCwgY2hpbGQsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IF9zaG9ydGN1dE1hcHBpbmdzW2tleV0ubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyZW50W2NoaWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudFtjaGlsZF0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFtjaGlsZF0gPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGFyZW50W2NoaWxkXTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcyksIHRoaXMuYXR0cmlidXRlcyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBhdHRyc1trZXldXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSwge30pXG4gICAgICAgICAgfVxuXG5cbiAgICAgIFx0ICBpZiAoYXR0cnMuaWQgJiYgYXR0cnMuaWQgIT09IHRoaXMuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICB0aGlzLnNlcGFyYXRlRnJvbU90aGVycygpO1xuICAgICAgICAgICAgdXJsID0gbS5hcGkucHJlZml4ICsgJy8nICsgcmVzb3VyY2VUeXBlICsgJy8nICsgYXR0cnMuaWQ7XG4gICAgICBcdCAgICBvdGhlck1vZGVsID0gbS5jYWNoZVt1cmxdO1xuICAgICAgICAgICAgaWYgKG90aGVyTW9kZWwpIHtcbiAgICAgICAgICAgICAgdGhpcy50aWVUbyhvdGhlck1vZGVsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG0uY2FjaGVbdXJsXSA9IHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghb3B0aW9ucy5zdG9wUHJvcGFnYXRpb25Gb3JNKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLmZvckVhY2goZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgIG1vZGVsLnNldChhdHRycywge3N0b3BQcm9wYWdhdGlvbkZvck06IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldE1vZGVsIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZU1vZGVsKG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTW9kZWwgKG0pIHtcbiAgICBtLmNhY2hlW20udXJsXSA9IG5ldyBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGVbbS5yZXNvdXJjZVR5cGVdKHtcbiAgICAgIGlkOiBtLmlkXG4gICAgfSk7XG4gICAgbS5jYWNoZVttLnVybF0udXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG0udXJsO1xuICAgIH1cbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZUNvbGxlY3Rpb24obSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVDb2xsZWN0aW9uIChtKSB7XG4gICAgbS5jYWNoZVttLnVybF0gPSBuZXcgKEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICAgIHVybDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbS51cmw7XG4gICAgICB9LFxuICAgICAgbW9kZWw6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBtb2RlbCwga2V5ID0gbS5hcGkucHJlZml4ICsgJy8nICsgbS5yZXNvdXJjZVR5cGUgKyAnLycgKyBhdHRyaWJ1dGVzLmlkO1xuICAgICAgICBpZiAoYXR0cmlidXRlcy5pZCkge1xuICAgICAgICAgIG1vZGVsID0gbS5jYWNoZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgIG1vZGVsLnNldChhdHRyaWJ1dGVzKTtcbiAgICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbW9kZWwgPSBuZXcgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlW20ucmVzb3VyY2VUeXBlXShhdHRyaWJ1dGVzKTtcbiAgICAgICAgICBtLmNhY2hlW2tleV0gPSBtb2RlbDtcbiAgICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSkoKTtcbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cbiAgbW9kdWxlLmV4cG9ydHMgPSBNO1xuIiwidmFyIG15R2xvYmFsO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgbXlHbG9iYWwgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgbXlHbG9iYWwgPSBnbG9iYWw7XG59IGVsc2Uge1xuICB0aHJvdyAnZ2xvYmFsIHVua25vd24gJ1xufVxuXG52YXIgTSA9IGZ1bmN0aW9uIChtYXliZUFQSSkge1xuICB2YXIgbSA9IE9iamVjdC5jcmVhdGUoTSk7XG4gIG0uYXBpID0gbWF5YmVBUEkgfHwge307XG4gIG0uY2FjaGUgPSB7fTtcbiAgTS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMocmVzb3VyY2VUeXBlLCBtKTtcbiAgICBkZWNvcmF0ZVdpdGhTaW5ndWxhckZvcm1NZXRob2RzKHJlc291cmNlVHlwZSwgbSk7XG4gIH0sIG0pO1xuICBNLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMubWFwKGZ1bmN0aW9uIChmKSB7ZihtKTt9KTtcbiAgcmV0dXJuIG07XG59O1xuXG5NLm1hcE92ZXJSZXNvdXJjZVR5cGVzID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBtKSB7XG4gIG0gPSBtIHx8IHRoaXM7XG4gIHJldHVybiBPYmplY3Qua2V5cyhtLmFwaS5yZXNvdXJjZXMpLm1hcChjYWxsYmFjayk7XG59O1xuTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzID0gW107XG5cbmZ1bmN0aW9uIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gIG1bcmVzb3VyY2VdID0gZnVuY3Rpb24gKG1heWJlSWQpIHtcbiAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMgPT09IGdsb2JhbCA/IG0gOiB0aGlzKTtcblxuICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcmVzb3VyY2VdKTtcbiAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcblxuICAgIGZ1bmN0aW9uIGFwcGVuZElkIChpZCkge1xuICAgICAgc3RhdGUuaWQgPSBpZDtcbiAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKGlkKTtcbiAgICB9XG5cbiAgICB2YXIgc3RyYXRlZ3kgPSB7XG4gICAgICBudW1iZXI6IGFwcGVuZElkLFxuICAgICAgc3RyaW5nOiBhcHBlbmRJZCxcbiAgICAgIHVuZGVmaW5lZDogZnVuY3Rpb24gKCkgey8qIGZhbGwgdGhyb3VnaCAqL31cbiAgICB9IFt0eXBlb2YgbWF5YmVJZF0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICBzdHJhdGVneShtYXliZUlkKTtcblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZEFyZ3VtZW50ICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBzdHJpbmcgb3IgYSBudW1iZXIgaWQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgdmFyIHBsdXJhbEZvcm0gPSBwbHVyYWwocmVzb3VyY2UpO1xuICBtW3BsdXJhbEZvcm1dID0gZnVuY3Rpb24gKG1heWJlUXVlcnkpIHtcbiAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMgPT09IGdsb2JhbCA/IG0gOiB0aGlzKTtcblxuICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcGx1cmFsRm9ybV0pO1xuICAgIHN0YXRlLnJlc291cmNlVHlwZSA9IHJlc291cmNlO1xuICAgIHN0YXRlLmlzUGx1cmFsID0gdHJ1ZTtcblxuICAgIHZhciBzdHJhdGVneSA9IHtcbiAgICAgIG9iamVjdDogZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKCc/JyArIHNlcmlhbGl6ZShxdWVyeSkpO1xuICAgICAgfSxcbiAgICAgIHVuZGVmaW5lZDogZnVuY3Rpb24gKCkgey8qIGZhbGwgdGhyb3VnaCAqL31cbiAgICB9IFt0eXBlb2YgbWF5YmVRdWVyeV0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICBzdHJhdGVneShtYXliZVF1ZXJ5KTtcblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZEFyZ3VtZW50ICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBwbGFpbiBvbGQgamF2YXNjcmlwdCBxdWVyeSBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemUgKG9iamVjdCwgcHJlZml4KSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgaWYgKHByZWZpeCkge1xuICAgICAga2V5ID0gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZSh2YWx1ZSwga2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfSkuam9pbignJicpO1xufVxuXG5mdW5jdGlvbiBwbHVyYWwgKHNpbmd1bGFyRm9ybSkge1xuICByZXR1cm4gc2luZ3VsYXJGb3JtICsgJ3MnO1xufVxubW9kdWxlLmV4cG9ydHMgPSBNO1xuIl19

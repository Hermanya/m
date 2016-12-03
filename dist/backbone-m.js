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
        saveProperties: function (attributes) {
          var ownAttributes = attributes || this.attributes;
          return Backbone.ajax({
            type: 'PUT',
            url: this.url(),
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(ownAttributes)
          });
        },
        saveCustomAttributes: function () {
          var url = this.url();
          if (!/\d/.test(url.slice(-1))) {
            url += '/' + this.id;
          }
          return Backbone.ajax({
            type: 'POST',
            url: url + '/attributes',
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(this.get('attributes'))
          });
        },
        saveEverything: function () {
          return Backbone.$.when(
            this.saveProperties(),
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
            var attribute = this.get('attributes') && this.get('attributes').filter(function (attr) {
              return attr.name === _attributeMappings[key];
            })[0];
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

          if (attrs.cid) {
            attrs = attrs.attributes || {};
          }

          var _attributeMappings = m.api.resources[resourceType]._attributeMappings;
          if (_attributeMappings) {
            Object.keys(_attributeMappings).forEach(function (attributeMapping) {
              var attributeName = _attributeMappings[attributeMapping];
              if (attrs[attributeMapping] !== undefined) {
                if (!this.has('attributes')) {
                  this.set('attributes', [], {silent: true});
                }
                var attributes = this.get('attributes').filter(function (attribute) {
                  return attribute.name !== attributeName;
                });

                var value = attrs[attributeMapping];
                if (typeof value !== 'string') {
                  value = JSON.stringify(value);
                }
                attributes.push({
                  name: attributeName,
                  value: value,
                  scope: options.scope
                });
                delete attrs[attributeMapping];

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
                      value = JSON.stringify(value);
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
                result[key] = attrs[key];
              }
              return result;
            }.bind(this), {});
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
    var id = Number(m.urlFragments.slice(-1)[0]);
    if (isNaN(id)) {
      id = undefined;
    }
    m.cache[m.url] = new modelConstructorsPerType[m.resourceType]({
      id: id
    });
    m.cache[m.url].url = function () {
      if (this.id && this.urlRoot) {
        return this.urlRoot + '/' + this.id
      }
      return m.url;
    };
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
          model.urlRoot = m.api.prefix + '/' + m.resourceType;
          return model;
        } else {
          model = new modelConstructorsPerType[m.resourceType](attributes);
          model.urlRoot = m.api.prefix + '/' + m.resourceType;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1iYWNrYm9uZS5qcyIsInNyYy91cmwtbWFwcGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdlFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiICB2YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuICB2YXIgTSA9IHJlcXVpcmUoJy4vdXJsLW1hcHBpbmcuanMnKTtcbiAgdmFyIG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZSA9IHt9O1xuXG4gIGRlY29yYXRlV2l0aEJhY2tib25lTWV0aG9kcyhNKTtcblxuICBmdW5jdGlvbiBkZWNvcmF0ZVdpdGhCYWNrYm9uZU1ldGhvZHMgKE0pIHtcbiAgICB2YXIga2V5O1xuICAgIGZvciAoa2V5IGluIG5ldyBCYWNrYm9uZS5Nb2RlbCgpKSB7XG4gICAgICBkZWNvcmF0ZVdpdGhLZXkoa2V5LCBNKTtcbiAgICB9XG4gICAgZm9yIChrZXkgaW4gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKSkge1xuICAgICAgZGVjb3JhdGVXaXRoS2V5KGtleSwgTSk7XG4gICAgfVxuICAgIGRlY29yYXRlV2l0aEtleSgnbW9kZWwnLCBNKTtcbiAgICBkZWNvcmF0ZVdpdGhLZXkoJ2NvbGxlY3Rpb24nLCBNKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29yYXRlV2l0aEtleShrZXksIE0pIHtcbiAgICBNW2tleV0gPSBNW2tleV0gfHwgZnVuY3Rpb24gcHJveHkgKCkge1xuICAgICAgdmFyIG1vZGVsO1xuICAgICAgdGhpcy51cmwgPSB0aGlzLnVybEZyYWdtZW50cy5qb2luKCcvJyk7XG4gICAgICBpZiAoa2V5ID09PSAnbW9kZWwnKSB7XG4gICAgICAgIHJldHVybiBnZXRNb2RlbCh0aGlzKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnY29sbGVjdGlvbicpIHtcbiAgICAgICAgcmV0dXJuIGdldENvbGxlY3Rpb24odGhpcyk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuaXNQbHVyYWwpIHtcbiAgICAgICAgbW9kZWwgPSBnZXRDb2xsZWN0aW9uKHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9kZWwgPSBnZXRNb2RlbCh0aGlzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtb2RlbFtrZXldLmFwcGx5KG1vZGVsLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBNLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMucHVzaChmdW5jdGlvbiBkZWZpbmVNb2RlbHMgKG0pIHtcbiAgICBtLm1hcE92ZXJSZXNvdXJjZVR5cGVzKGZ1bmN0aW9uIChyZXNvdXJjZVR5cGUpIHtcbiAgICAgIG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZVtyZXNvdXJjZVR5cGVdID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcbiAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uICgvKiBuZXh0QXR0cmlidXRlcyAqLykge1xuICAgICAgICAgIGlmIChmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuICdhbiBlcnJvcic7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzYXZlUHJvcGVydGllczogZnVuY3Rpb24gKGF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICB2YXIgb3duQXR0cmlidXRlcyA9IGF0dHJpYnV0ZXMgfHwgdGhpcy5hdHRyaWJ1dGVzO1xuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5hamF4KHtcbiAgICAgICAgICAgIHR5cGU6ICdQVVQnLFxuICAgICAgICAgICAgdXJsOiB0aGlzLnVybCgpLFxuICAgICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShvd25BdHRyaWJ1dGVzKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzYXZlQ3VzdG9tQXR0cmlidXRlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciB1cmwgPSB0aGlzLnVybCgpO1xuICAgICAgICAgIGlmICghL1xcZC8udGVzdCh1cmwuc2xpY2UoLTEpKSkge1xuICAgICAgICAgICAgdXJsICs9ICcvJyArIHRoaXMuaWQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5hamF4KHtcbiAgICAgICAgICAgIHR5cGU6ICdQT1NUJyxcbiAgICAgICAgICAgIHVybDogdXJsICsgJy9hdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkodGhpcy5nZXQoJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2F2ZUV2ZXJ5dGhpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuJC53aGVuKFxuICAgICAgICAgICAgdGhpcy5zYXZlUHJvcGVydGllcygpLFxuICAgICAgICAgICAgdGhpcy5zYXZlQ3VzdG9tQXR0cmlidXRlcygpXG4gICAgICAgICAgKTtcbiAgICAgICAgfSxcbiAgICAgICAgbW9kZWxzVGllZFdpdGg6IFtdLFxuICAgICAgICB0aWVUbzogZnVuY3Rpb24gKG90aGVyTW9kZWwpIHtcbiAgICAgICAgICBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLmZvckVhY2goZnVuY3Rpb24gKGluZGlyZWN0TW9kZWwpIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGgucHVzaChpbmRpcmVjdE1vZGVsKTtcbiAgICAgICAgICAgIGluZGlyZWN0TW9kZWwubW9kZWxzVGllZFdpdGgucHVzaCh0aGlzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLnB1c2gob3RoZXJNb2RlbCk7XG4gICAgICAgICAgb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5wdXNoKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBzZXBhcmF0ZUZyb21PdGhlcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLmZvckVhY2goZnVuY3Rpb24gKG90aGVyTW9kZWwpIHtcbiAgICAgICAgICAgIHZhciBpbmRleE9mVGhpcyA9IG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGguaW5kZXhPZih0aGlzKTtcbiAgICAgICAgICAgIG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGguc3BsaWNlKGluZGV4T2ZUaGlzLCAxKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoID0gW107XG4gICAgICAgIH0sXG4gICAgICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG5cbiAgICAgICAgICB2YXIgX2F0dHJpYnV0ZU1hcHBpbmdzID0gbS5hcGkucmVzb3VyY2VzW3Jlc291cmNlVHlwZV0uX2F0dHJpYnV0ZU1hcHBpbmdzO1xuICAgICAgICAgIGlmIChfYXR0cmlidXRlTWFwcGluZ3MgJiYgX2F0dHJpYnV0ZU1hcHBpbmdzW2tleV0pIHtcbiAgICAgICAgICAgIHZhciBhdHRyaWJ1dGUgPSB0aGlzLmdldCgnYXR0cmlidXRlcycpICYmIHRoaXMuZ2V0KCdhdHRyaWJ1dGVzJykuZmlsdGVyKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgICAgIHJldHVybiBhdHRyLm5hbWUgPT09IF9hdHRyaWJ1dGVNYXBwaW5nc1trZXldO1xuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICB2YXIgdmFsdWU7XG4gICAgICAgICAgICBpZiAoYXR0cmlidXRlKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBKU09OLnBhcnNlKGF0dHJpYnV0ZS52YWx1ZSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGF0dHJpYnV0ZS52YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBfc2hvcnRjdXRNYXBwaW5ncyA9IG0uYXBpLnJlc291cmNlc1tyZXNvdXJjZVR5cGVdLl9zaG9ydGN1dE1hcHBpbmdzO1xuICAgICAgICAgIGlmIChfc2hvcnRjdXRNYXBwaW5ncyAmJiBfc2hvcnRjdXRNYXBwaW5nc1trZXldKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBfc2hvcnRjdXRNYXBwaW5nc1trZXldLnJlZHVjZShmdW5jdGlvbihvYmosIGtleSkge1xuICAgICAgICAgICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgICAgICAgICB9LCB0aGlzLmF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKHZhbHVlKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywga2V5KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbCwgb3B0aW9ucykge1xuICAgICAgICAgIHZhciBhdHRycywgdXJsLCBvdGhlck1vZGVsO1xuICAgICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9XG4gICAgICAgLy8gSGFuZGxlIGJvdGggYFwia2V5XCIsIHZhbHVlYCBhbmQgYHtrZXk6IHZhbHVlfWAgLXN0eWxlIGFyZ3VtZW50cy5cbiAgICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGF0dHJzID0ga2V5O1xuICAgICAgICAgICAgb3B0aW9ucyA9IHZhbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKGF0dHJzID0ge30pW2tleV0gPSB2YWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAgICAgaWYgKGF0dHJzLmNpZCkge1xuICAgICAgICAgICAgYXR0cnMgPSBhdHRycy5hdHRyaWJ1dGVzIHx8IHt9O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBfYXR0cmlidXRlTWFwcGluZ3MgPSBtLmFwaS5yZXNvdXJjZXNbcmVzb3VyY2VUeXBlXS5fYXR0cmlidXRlTWFwcGluZ3M7XG4gICAgICAgICAgaWYgKF9hdHRyaWJ1dGVNYXBwaW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoX2F0dHJpYnV0ZU1hcHBpbmdzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXBwaW5nKSB7XG4gICAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gX2F0dHJpYnV0ZU1hcHBpbmdzW2F0dHJpYnV0ZU1hcHBpbmddO1xuICAgICAgICAgICAgICBpZiAoYXR0cnNbYXR0cmlidXRlTWFwcGluZ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXMoJ2F0dHJpYnV0ZXMnKSkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2F0dHJpYnV0ZXMnLCBbXSwge3NpbGVudDogdHJ1ZX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0KCdhdHRyaWJ1dGVzJykuZmlsdGVyKGZ1bmN0aW9uIChhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUubmFtZSAhPT0gYXR0cmlidXRlTmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2F0dHJpYnV0ZU1hcHBpbmddO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXR0cmlidXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGF0dHJpYnV0ZU5hbWUsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgICAgICBzY29wZTogb3B0aW9ucy5zY29wZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBhdHRyc1thdHRyaWJ1dGVNYXBwaW5nXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdhdHRyaWJ1dGVzJywgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgfVxuXG5cblxuICAgICAgICAgIHZhciBfc2hvcnRjdXRNYXBwaW5ncyA9IG0uYXBpLnJlc291cmNlc1tyZXNvdXJjZVR5cGVdLl9zaG9ydGN1dE1hcHBpbmdzO1xuICAgICAgICAgIGlmIChfc2hvcnRjdXRNYXBwaW5ncyAmJiBfc2hvcnRjdXRNYXBwaW5nc1trZXldKSB7XG4gICAgICAgICAgICBhdHRycyA9IE9iamVjdC5rZXlzKGF0dHJzKS5yZWR1Y2UoZnVuY3Rpb24ocmVzdWx0LCBrZXkpIHtcbiAgICAgICAgICAgICAgaWYgKF9zaG9ydGN1dE1hcHBpbmdzW2tleV0pIHtcbiAgICAgICAgICAgICAgICBfc2hvcnRjdXRNYXBwaW5nc1trZXldLnJlZHVjZShmdW5jdGlvbihwYXJlbnQsIGNoaWxkLCBpbmRleCkge1xuICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBfc2hvcnRjdXRNYXBwaW5nc1trZXldLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gYXR0cnNba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRbY2hpbGRdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50W2NoaWxkXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcGFyZW50W2NoaWxkXSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwYXJlbnRbY2hpbGRdO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0uYmluZCh0aGlzKSwgdGhpcy5hdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IGF0dHJzW2tleV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSwge30pO1xuICAgICAgICAgIH1cblxuXG4gICAgICBcdCAgaWYgKGF0dHJzLmlkICYmIGF0dHJzLmlkICE9PSB0aGlzLmdldCgnaWQnKSkge1xuICAgICAgICAgICAgdGhpcy5zZXBhcmF0ZUZyb21PdGhlcnMoKTtcbiAgICAgICAgICAgIHVybCA9IG0uYXBpLnByZWZpeCArICcvJyArIHJlc291cmNlVHlwZSArICcvJyArIGF0dHJzLmlkO1xuICAgICAgXHQgICAgb3RoZXJNb2RlbCA9IG0uY2FjaGVbdXJsXTtcbiAgICAgICAgICAgIGlmIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgICAgIHRoaXMudGllVG8ob3RoZXJNb2RlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtLmNhY2hlW3VybF0gPSB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW9wdGlvbnMuc3RvcFByb3BhZ2F0aW9uRm9yTSkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICBtb2RlbC5zZXQoYXR0cnMsIHtzdG9wUHJvcGFnYXRpb25Gb3JNOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRNb2RlbCAobSkge1xuICAgIHJldHVybiBtLmNhY2hlW20udXJsXSB8fCBjcmVhdGVNb2RlbChtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU1vZGVsIChtKSB7XG4gICAgdmFyIGlkID0gTnVtYmVyKG0udXJsRnJhZ21lbnRzLnNsaWNlKC0xKVswXSk7XG4gICAgaWYgKGlzTmFOKGlkKSkge1xuICAgICAgaWQgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIG0uY2FjaGVbbS51cmxdID0gbmV3IG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZVttLnJlc291cmNlVHlwZV0oe1xuICAgICAgaWQ6IGlkXG4gICAgfSk7XG4gICAgbS5jYWNoZVttLnVybF0udXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHRoaXMuaWQgJiYgdGhpcy51cmxSb290KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFJvb3QgKyAnLycgKyB0aGlzLmlkXG4gICAgICB9XG4gICAgICByZXR1cm4gbS51cmw7XG4gICAgfTtcbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZUNvbGxlY3Rpb24obSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVDb2xsZWN0aW9uIChtKSB7XG4gICAgbS5jYWNoZVttLnVybF0gPSBuZXcgKEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICAgIHVybDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbS51cmw7XG4gICAgICB9LFxuICAgICAgbW9kZWw6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBtb2RlbCwga2V5ID0gbS5hcGkucHJlZml4ICsgJy8nICsgbS5yZXNvdXJjZVR5cGUgKyAnLycgKyBhdHRyaWJ1dGVzLmlkO1xuICAgICAgICBpZiAoYXR0cmlidXRlcy5pZCkge1xuICAgICAgICAgIG1vZGVsID0gbS5jYWNoZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgIG1vZGVsLnNldChhdHRyaWJ1dGVzKTtcbiAgICAgICAgICBtb2RlbC51cmxSb290ID0gbS5hcGkucHJlZml4ICsgJy8nICsgbS5yZXNvdXJjZVR5cGU7XG4gICAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1vZGVsID0gbmV3IG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZVttLnJlc291cmNlVHlwZV0oYXR0cmlidXRlcyk7XG4gICAgICAgICAgbW9kZWwudXJsUm9vdCA9IG0uYXBpLnByZWZpeCArICcvJyArIG0ucmVzb3VyY2VUeXBlO1xuICAgICAgICAgIG0uY2FjaGVba2V5XSA9IG1vZGVsO1xuICAgICAgICAgIHJldHVybiBtb2RlbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pKSgpO1xuICAgIHJldHVybiBtLmNhY2hlW20udXJsXTtcbiAgfVxuICBtb2R1bGUuZXhwb3J0cyA9IE07XG4iLCJ2YXIgbXlHbG9iYWw7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gdHlwZW9mIHVuZGVmaW5lZCkge1xuICBteUdsb2JhbCA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gdHlwZW9mIHVuZGVmaW5lZCkge1xuICBteUdsb2JhbCA9IGdsb2JhbDtcbn0gZWxzZSB7XG4gIHRocm93ICdnbG9iYWwgdW5rbm93biAnXG59XG5cbnZhciBNID0gZnVuY3Rpb24gKG1heWJlQVBJKSB7XG4gIHZhciBtID0gT2JqZWN0LmNyZWF0ZShNKTtcbiAgbS5hcGkgPSBtYXliZUFQSSB8fCB7fTtcbiAgbS5jYWNoZSA9IHt9O1xuICBNLm1hcE92ZXJSZXNvdXJjZVR5cGVzKGZ1bmN0aW9uIChyZXNvdXJjZVR5cGUpIHtcbiAgICBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyhyZXNvdXJjZVR5cGUsIG0pO1xuICAgIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMocmVzb3VyY2VUeXBlLCBtKTtcbiAgfSwgbSk7XG4gIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycy5tYXAoZnVuY3Rpb24gKGYpIHtmKG0pO30pO1xuICByZXR1cm4gbTtcbn07XG5cbk0ubWFwT3ZlclJlc291cmNlVHlwZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIG0pIHtcbiAgbSA9IG0gfHwgdGhpcztcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG0uYXBpLnJlc291cmNlcykubWFwKGNhbGxiYWNrKTtcbn07XG5NLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMgPSBbXTtcblxuZnVuY3Rpb24gZGVjb3JhdGVXaXRoU2luZ3VsYXJGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgbVtyZXNvdXJjZV0gPSBmdW5jdGlvbiAobWF5YmVJZCkge1xuICAgIHZhciBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcyA9PT0gZ2xvYmFsID8gbSA6IHRoaXMpO1xuXG4gICAgc3RhdGUudXJsRnJhZ21lbnRzID0gKHN0YXRlLnVybEZyYWdtZW50cyB8fCBbbS5hcGkucHJlZml4XSkuY29uY2F0KFtyZXNvdXJjZV0pO1xuICAgIHN0YXRlLnJlc291cmNlVHlwZSA9IHJlc291cmNlO1xuXG4gICAgZnVuY3Rpb24gYXBwZW5kSWQgKGlkKSB7XG4gICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaChpZCk7XG4gICAgfVxuXG4gICAgdmFyIHN0cmF0ZWd5ID0ge1xuICAgICAgbnVtYmVyOiBhcHBlbmRJZCxcbiAgICAgIHN0cmluZzogYXBwZW5kSWQsXG4gICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgfSBbdHlwZW9mIG1heWJlSWRdIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgc3RyYXRlZ3kobWF5YmVJZCk7XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgc3RyaW5nIG9yIGEgbnVtYmVyIGlkLicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gIHZhciBwbHVyYWxGb3JtID0gcGx1cmFsKHJlc291cmNlKTtcbiAgbVtwbHVyYWxGb3JtXSA9IGZ1bmN0aW9uIChtYXliZVF1ZXJ5KSB7XG4gICAgdmFyIHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzID09PSBnbG9iYWwgPyBtIDogdGhpcyk7XG5cbiAgICBzdGF0ZS51cmxGcmFnbWVudHMgPSAoc3RhdGUudXJsRnJhZ21lbnRzIHx8IFttLmFwaS5wcmVmaXhdKS5jb25jYXQoW3BsdXJhbEZvcm1dKTtcbiAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcbiAgICBzdGF0ZS5pc1BsdXJhbCA9IHRydWU7XG5cbiAgICB2YXIgc3RyYXRlZ3kgPSB7XG4gICAgICBvYmplY3Q6IGZ1bmN0aW9uIChxdWVyeSkge1xuICAgICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaCgnPycgKyBzZXJpYWxpemUocXVlcnkpKTtcbiAgICAgIH0sXG4gICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgfSBbdHlwZW9mIG1heWJlUXVlcnldIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgc3RyYXRlZ3kobWF5YmVRdWVyeSk7XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgcGxhaW4gb2xkIGphdmFzY3JpcHQgcXVlcnkgb2JqZWN0LicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplIChvYmplY3QsIHByZWZpeCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgIGlmIChwcmVmaXgpIHtcbiAgICAgIGtleSA9IHByZWZpeCArICdbJyArIGtleSArICddJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBzZXJpYWxpemUodmFsdWUsIGtleSk7XG4gICAgfVxuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pLmpvaW4oJyYnKTtcbn1cblxuZnVuY3Rpb24gcGx1cmFsIChzaW5ndWxhckZvcm0pIHtcbiAgcmV0dXJuIHNpbmd1bGFyRm9ybSArICdzJztcbn1cbm1vZHVsZS5leHBvcnRzID0gTTtcbiJdfQ==

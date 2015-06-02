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
        saveOwnAttributes: function () {
          var ownAttributes = Object.keys(this.attributes).reduce(function (attributes, key) {
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
        save: function () {
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
                  }
                  return parent[child];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1iYWNrYm9uZS5qcyIsInNyYy91cmwtbWFwcGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIgIHZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG4gIHZhciBNID0gcmVxdWlyZSgnLi91cmwtbWFwcGluZy5qcycpO1xuICB2YXIgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlID0ge307XG5cbiAgZGVjb3JhdGVXaXRoQmFja2JvbmVNZXRob2RzKE0pO1xuXG4gIGZ1bmN0aW9uIGRlY29yYXRlV2l0aEJhY2tib25lTWV0aG9kcyAoTSkge1xuICAgIHZhciBrZXk7XG4gICAgZm9yIChrZXkgaW4gbmV3IEJhY2tib25lLk1vZGVsKCkpIHtcbiAgICAgIGRlY29yYXRlV2l0aEtleShrZXksIE0pO1xuICAgIH1cbiAgICBmb3IgKGtleSBpbiBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpKSB7XG4gICAgICBkZWNvcmF0ZVdpdGhLZXkoa2V5LCBNKTtcbiAgICB9XG4gICAgZGVjb3JhdGVXaXRoS2V5KCdtb2RlbCcsIE0pO1xuICAgIGRlY29yYXRlV2l0aEtleSgnY29sbGVjdGlvbicsIE0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoS2V5KGtleSwgTSkge1xuICAgIE1ba2V5XSA9IE1ba2V5XSB8fCBmdW5jdGlvbiBwcm94eSAoKSB7XG4gICAgICB2YXIgbW9kZWw7XG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsRnJhZ21lbnRzLmpvaW4oJy8nKTtcbiAgICAgIGlmIChrZXkgPT09ICdtb2RlbCcpIHtcbiAgICAgICAgcmV0dXJuIGdldE1vZGVsKHRoaXMpO1xuICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICdjb2xsZWN0aW9uJykge1xuICAgICAgICByZXR1cm4gZ2V0Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1BsdXJhbCkge1xuICAgICAgICBtb2RlbCA9IGdldENvbGxlY3Rpb24odGhpcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtb2RlbCA9IGdldE1vZGVsKHRoaXMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1vZGVsW2tleV0uYXBwbHkobW9kZWwsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycy5wdXNoKGZ1bmN0aW9uIGRlZmluZU1vZGVscyAobSkge1xuICAgIG0ubWFwT3ZlclJlc291cmNlVHlwZXMoZnVuY3Rpb24gKHJlc291cmNlVHlwZSkge1xuICAgICAgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlW3Jlc291cmNlVHlwZV0gPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKC8qIG5leHRBdHRyaWJ1dGVzICovKSB7XG4gICAgICAgICAgaWYgKGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FuIGVycm9yJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNhdmVPd25BdHRyaWJ1dGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG93bkF0dHJpYnV0ZXMgPSBPYmplY3Qua2V5cyh0aGlzLmF0dHJpYnV0ZXMpLnJlZHVjZShmdW5jdGlvbiAoYXR0cmlidXRlcywga2V5KSB7XG4gICAgICAgICAgICBpZiAoWydkaXNwbGF5TmFtZSddLmluZGV4T2Yoa2V5KSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgYXR0cmlidXRlc1trZXldID0gdGhpcy5hdHRyaWJ1dGVzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcbiAgICAgICAgICB9LmJpbmQodGhpcyksIHt9KTtcbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuYWpheCh7XG4gICAgICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgICAgIHVybDogdGhpcy51cmwoKSxcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkob3duQXR0cmlidXRlcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2F2ZUN1c3RvbUF0dHJpYnV0ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuYWpheCh7XG4gICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB1cmw6IHRoaXMudXJsKCkgKyAnL2F0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh0aGlzLmdldCgnYXR0cmlidXRlcycpKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLiQud2hlbihcbiAgICAgICAgICAgIHRoaXMuc2F2ZU93bkF0dHJpYnV0ZXMoKSxcbiAgICAgICAgICAgIHRoaXMuc2F2ZUN1c3RvbUF0dHJpYnV0ZXMoKVxuICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIG1vZGVsc1RpZWRXaXRoOiBbXSxcbiAgICAgICAgdGllVG86IGZ1bmN0aW9uIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChpbmRpcmVjdE1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLnB1c2goaW5kaXJlY3RNb2RlbCk7XG4gICAgICAgICAgICBpbmRpcmVjdE1vZGVsLm1vZGVsc1RpZWRXaXRoLnB1c2godGhpcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5wdXNoKG90aGVyTW9kZWwpO1xuICAgICAgICAgIG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGgucHVzaCh0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VwYXJhdGVGcm9tT3RoZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhPZlRoaXMgPSBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLmluZGV4T2YodGhpcyk7XG4gICAgICAgICAgICBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLnNwbGljZShpbmRleE9mVGhpcywgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aCA9IFtdO1xuICAgICAgICB9LFxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuXG4gICAgICAgICAgdmFyIF9hdHRyaWJ1dGVNYXBwaW5ncyA9IG0uYXBpLnJlc291cmNlc1tyZXNvdXJjZVR5cGVdLl9hdHRyaWJ1dGVNYXBwaW5ncztcbiAgICAgICAgICBpZiAoX2F0dHJpYnV0ZU1hcHBpbmdzICYmIF9hdHRyaWJ1dGVNYXBwaW5nc1trZXldKSB7XG4gICAgICAgICAgICB2YXIgYXR0cmlidXRlID0gdGhpcy5nZXQoJ2F0dHJpYnV0ZXMnKS5maWx0ZXIoZnVuY3Rpb24gKGF0dHIpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGF0dHIubmFtZSA9PT0gX2F0dHJpYnV0ZU1hcHBpbmdzW2tleV07XG4gICAgICAgICAgICB9KVswXVxuICAgICAgICAgICAgdmFyIHZhbHVlO1xuICAgICAgICAgICAgaWYgKGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShhdHRyaWJ1dGUudmFsdWUpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSBhdHRyaWJ1dGUudmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgX3Nob3J0Y3V0TWFwcGluZ3MgPSBtLmFwaS5yZXNvdXJjZXNbcmVzb3VyY2VUeXBlXS5fc2hvcnRjdXRNYXBwaW5ncztcbiAgICAgICAgICBpZiAoX3Nob3J0Y3V0TWFwcGluZ3MgJiYgX3Nob3J0Y3V0TWFwcGluZ3Nba2V5XSkge1xuICAgICAgICAgICAgdmFyIHZhbHVlID0gX3Nob3J0Y3V0TWFwcGluZ3Nba2V5XS5yZWR1Y2UoZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgICAgICAgICAgfSwgdGhpcy5hdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh2YWx1ZSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGtleSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgYXR0cnMsIHVybCwgb3RoZXJNb2RlbDtcbiAgICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfVxuICAgICAgIC8vIEhhbmRsZSBib3RoIGBcImtleVwiLCB2YWx1ZWAgYW5kIGB7a2V5OiB2YWx1ZX1gIC1zdHlsZSBhcmd1bWVudHMuXG4gICAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhdHRycyA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB2YWw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChhdHRycyA9IHt9KVtrZXldID0gdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXG5cbiAgICAgICAgICB2YXIgX2F0dHJpYnV0ZU1hcHBpbmdzID0gbS5hcGkucmVzb3VyY2VzW3Jlc291cmNlVHlwZV0uX2F0dHJpYnV0ZU1hcHBpbmdzO1xuICAgICAgICAgIGlmIChfYXR0cmlidXRlTWFwcGluZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKF9hdHRyaWJ1dGVNYXBwaW5ncykuZm9yRWFjaChmdW5jdGlvbiAoYXR0cmlidXRlTWFwcGluZykge1xuICAgICAgICAgICAgICB2YXIgYXR0cmlidXRlTmFtZSA9IF9hdHRyaWJ1dGVNYXBwaW5nc1thdHRyaWJ1dGVNYXBwaW5nXTtcbiAgICAgICAgICAgICAgaWYgKGF0dHJzW2F0dHJpYnV0ZU1hcHBpbmddICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaGFzKCdhdHRyaWJ1dGVzJykpIHtcbiAgICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdhdHRyaWJ1dGVzJywgW10sIHtzaWxlbnQ6IHRydWV9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgYXR0cmlidXRlcyA9IHRoaXMuZ2V0KCdhdHRyaWJ1dGVzJykuZmlsdGVyKGZ1bmN0aW9uIChhdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhdHRyaWJ1dGUubmFtZSAhPT0gYXR0cmlidXRlTmFtZTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2F0dHJpYnV0ZU1hcHBpbmddO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICB2YWx1ZSA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgbmFtZTogYXR0cmlidXRlTmFtZSxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBhdHRyc1thdHRyaWJ1dGVNYXBwaW5nXVxuXG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2F0dHJpYnV0ZXMnLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgdmFyIF9zaG9ydGN1dE1hcHBpbmdzID0gbS5hcGkucmVzb3VyY2VzW3Jlc291cmNlVHlwZV0uX3Nob3J0Y3V0TWFwcGluZ3M7XG4gICAgICAgICAgaWYgKF9zaG9ydGN1dE1hcHBpbmdzICYmIF9zaG9ydGN1dE1hcHBpbmdzW2tleV0pIHtcbiAgICAgICAgICAgIGF0dHJzID0gT2JqZWN0LmtleXMoYXR0cnMpLnJlZHVjZShmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgICAgICAgICAgICBpZiAoX3Nob3J0Y3V0TWFwcGluZ3Nba2V5XSkge1xuICAgICAgICAgICAgICAgIF9zaG9ydGN1dE1hcHBpbmdzW2tleV0ucmVkdWNlKGZ1bmN0aW9uKHBhcmVudCwgY2hpbGQsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IF9zaG9ydGN1dE1hcHBpbmdzW2tleV0ubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1trZXldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyZW50W2NoaWxkXSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhcmVudFtjaGlsZF07XG4gICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpLCB0aGlzLmF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gYXR0cnNba2V5XVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9LmJpbmQodGhpcyksIHt9KVxuICAgICAgICAgIH1cblxuXG4gICAgICBcdCAgaWYgKGF0dHJzLmlkICYmIGF0dHJzLmlkICE9PSB0aGlzLmdldCgnaWQnKSkge1xuICAgICAgICAgICAgdGhpcy5zZXBhcmF0ZUZyb21PdGhlcnMoKTtcbiAgICAgICAgICAgIHVybCA9IG0uYXBpLnByZWZpeCArICcvJyArIHJlc291cmNlVHlwZSArICcvJyArIGF0dHJzLmlkO1xuICAgICAgXHQgICAgb3RoZXJNb2RlbCA9IG0uY2FjaGVbdXJsXTtcbiAgICAgICAgICAgIGlmIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgICAgIHRoaXMudGllVG8ob3RoZXJNb2RlbCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBtLmNhY2hlW3VybF0gPSB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIW9wdGlvbnMuc3RvcFByb3BhZ2F0aW9uRm9yTSkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChtb2RlbCkge1xuICAgICAgICAgICAgICBtb2RlbC5zZXQoYXR0cnMsIHtzdG9wUHJvcGFnYXRpb25Gb3JNOiB0cnVlfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRNb2RlbCAobSkge1xuICAgIHJldHVybiBtLmNhY2hlW20udXJsXSB8fCBjcmVhdGVNb2RlbChtKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU1vZGVsIChtKSB7XG4gICAgbS5jYWNoZVttLnVybF0gPSBuZXcgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlW20ucmVzb3VyY2VUeXBlXSh7XG4gICAgICBpZDogbS5pZFxuICAgIH0pO1xuICAgIG0uY2FjaGVbbS51cmxdLnVybCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBtLnVybDtcbiAgICB9XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29sbGVjdGlvbiAobSkge1xuICAgIHJldHVybiBtLmNhY2hlW20udXJsXSB8fCBjcmVhdGVDb2xsZWN0aW9uKG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQ29sbGVjdGlvbiAobSkge1xuICAgIG0uY2FjaGVbbS51cmxdID0gbmV3IChCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgICB1cmw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG0udXJsO1xuICAgICAgfSxcbiAgICAgIG1vZGVsOiBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgbW9kZWwsIGtleSA9IG0uYXBpLnByZWZpeCArICcvJyArIG0ucmVzb3VyY2VUeXBlICsgJy8nICsgYXR0cmlidXRlcy5pZDtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMuaWQpIHtcbiAgICAgICAgICBtb2RlbCA9IG0uY2FjaGVba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICBtb2RlbC5zZXQoYXR0cmlidXRlcyk7XG4gICAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1vZGVsID0gbmV3IG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZVttLnJlc291cmNlVHlwZV0oYXR0cmlidXRlcyk7XG4gICAgICAgICAgbS5jYWNoZVtrZXldID0gbW9kZWw7XG4gICAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpKCk7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdO1xuICB9XG4gIG1vZHVsZS5leHBvcnRzID0gTTtcbiIsInZhciBteUdsb2JhbDtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSB0eXBlb2YgdW5kZWZpbmVkKSB7XG4gIG15R2xvYmFsID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSB0eXBlb2YgdW5kZWZpbmVkKSB7XG4gIG15R2xvYmFsID0gZ2xvYmFsO1xufSBlbHNlIHtcbiAgdGhyb3cgJ2dsb2JhbCB1bmtub3duICdcbn1cblxudmFyIE0gPSBmdW5jdGlvbiAobWF5YmVBUEkpIHtcbiAgdmFyIG0gPSBPYmplY3QuY3JlYXRlKE0pO1xuICBtLmFwaSA9IG1heWJlQVBJIHx8IHt9O1xuICBtLmNhY2hlID0ge307XG4gIE0ubWFwT3ZlclJlc291cmNlVHlwZXMoZnVuY3Rpb24gKHJlc291cmNlVHlwZSkge1xuICAgIGRlY29yYXRlV2l0aFBsdXJhbEZvcm1NZXRob2RzKHJlc291cmNlVHlwZSwgbSk7XG4gICAgZGVjb3JhdGVXaXRoU2luZ3VsYXJGb3JtTWV0aG9kcyhyZXNvdXJjZVR5cGUsIG0pO1xuICB9LCBtKTtcbiAgTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzLm1hcChmdW5jdGlvbiAoZikge2YobSk7fSk7XG4gIHJldHVybiBtO1xufTtcblxuTS5tYXBPdmVyUmVzb3VyY2VUeXBlcyA9IGZ1bmN0aW9uIChjYWxsYmFjaywgbSkge1xuICBtID0gbSB8fCB0aGlzO1xuICByZXR1cm4gT2JqZWN0LmtleXMobS5hcGkucmVzb3VyY2VzKS5tYXAoY2FsbGJhY2spO1xufTtcbk0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycyA9IFtdO1xuXG5mdW5jdGlvbiBkZWNvcmF0ZVdpdGhTaW5ndWxhckZvcm1NZXRob2RzIChyZXNvdXJjZSwgbSkge1xuICBtW3Jlc291cmNlXSA9IGZ1bmN0aW9uIChtYXliZUlkKSB7XG4gICAgdmFyIHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzID09PSBnbG9iYWwgPyBtIDogdGhpcyk7XG5cbiAgICBzdGF0ZS51cmxGcmFnbWVudHMgPSAoc3RhdGUudXJsRnJhZ21lbnRzIHx8IFttLmFwaS5wcmVmaXhdKS5jb25jYXQoW3Jlc291cmNlXSk7XG4gICAgc3RhdGUucmVzb3VyY2VUeXBlID0gcmVzb3VyY2U7XG5cbiAgICBmdW5jdGlvbiBhcHBlbmRJZCAoaWQpIHtcbiAgICAgIHN0YXRlLmlkID0gaWQ7XG4gICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaChpZCk7XG4gICAgfVxuXG4gICAgdmFyIHN0cmF0ZWd5ID0ge1xuICAgICAgbnVtYmVyOiBhcHBlbmRJZCxcbiAgICAgIHN0cmluZzogYXBwZW5kSWQsXG4gICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgfSBbdHlwZW9mIG1heWJlSWRdIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgc3RyYXRlZ3kobWF5YmVJZCk7XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgc3RyaW5nIG9yIGEgbnVtYmVyIGlkLicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gIHZhciBwbHVyYWxGb3JtID0gcGx1cmFsKHJlc291cmNlKTtcbiAgbVtwbHVyYWxGb3JtXSA9IGZ1bmN0aW9uIChtYXliZVF1ZXJ5KSB7XG4gICAgdmFyIHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzID09PSBnbG9iYWwgPyBtIDogdGhpcyk7XG5cbiAgICBzdGF0ZS51cmxGcmFnbWVudHMgPSAoc3RhdGUudXJsRnJhZ21lbnRzIHx8IFttLmFwaS5wcmVmaXhdKS5jb25jYXQoW3BsdXJhbEZvcm1dKTtcbiAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcbiAgICBzdGF0ZS5pc1BsdXJhbCA9IHRydWU7XG5cbiAgICB2YXIgc3RyYXRlZ3kgPSB7XG4gICAgICBvYmplY3Q6IGZ1bmN0aW9uIChxdWVyeSkge1xuICAgICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaCgnPycgKyBzZXJpYWxpemUocXVlcnkpKTtcbiAgICAgIH0sXG4gICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgfSBbdHlwZW9mIG1heWJlUXVlcnldIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgc3RyYXRlZ3kobWF5YmVRdWVyeSk7XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgcGxhaW4gb2xkIGphdmFzY3JpcHQgcXVlcnkgb2JqZWN0LicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplIChvYmplY3QsIHByZWZpeCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgIGlmIChwcmVmaXgpIHtcbiAgICAgIGtleSA9IHByZWZpeCArICdbJyArIGtleSArICddJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBzZXJpYWxpemUodmFsdWUsIGtleSk7XG4gICAgfVxuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pLmpvaW4oJyYnKTtcbn1cblxuZnVuY3Rpb24gcGx1cmFsIChzaW5ndWxhckZvcm0pIHtcbiAgcmV0dXJuIHNpbmd1bGFyRm9ybSArICdzJztcbn1cbm1vZHVsZS5leHBvcnRzID0gTTtcbiJdfQ==

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
        set : function(key, val, options) {
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

                attributes.push({
                  name: attributeName,
                  value: attrs[attributeMapping]
                });

                this.set('attributes', attributes);
              }
            }.bind(this));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1iYWNrYm9uZS5qcyIsInNyYy91cmwtbWFwcGluZy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIgIHZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJyk7XG4gIHZhciBNID0gcmVxdWlyZSgnLi91cmwtbWFwcGluZy5qcycpO1xuICB2YXIgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlID0ge307XG5cbiAgZGVjb3JhdGVXaXRoQmFja2JvbmVNZXRob2RzKE0pO1xuXG4gIGZ1bmN0aW9uIGRlY29yYXRlV2l0aEJhY2tib25lTWV0aG9kcyAoTSkge1xuICAgIHZhciBrZXk7XG4gICAgZm9yIChrZXkgaW4gbmV3IEJhY2tib25lLk1vZGVsKCkpIHtcbiAgICAgIGRlY29yYXRlV2l0aEtleShrZXksIE0pO1xuICAgIH1cbiAgICBmb3IgKGtleSBpbiBuZXcgQmFja2JvbmUuQ29sbGVjdGlvbigpKSB7XG4gICAgICBkZWNvcmF0ZVdpdGhLZXkoa2V5LCBNKTtcbiAgICB9XG4gICAgZGVjb3JhdGVXaXRoS2V5KCdtb2RlbCcsIE0pO1xuICAgIGRlY29yYXRlV2l0aEtleSgnY29sbGVjdGlvbicsIE0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoS2V5KGtleSwgTSkge1xuICAgIE1ba2V5XSA9IE1ba2V5XSB8fCBmdW5jdGlvbiBwcm94eSAoKSB7XG4gICAgICB2YXIgbW9kZWw7XG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsRnJhZ21lbnRzLmpvaW4oJy8nKTtcbiAgICAgIGlmIChrZXkgPT09ICdtb2RlbCcpIHtcbiAgICAgICAgcmV0dXJuIGdldE1vZGVsKHRoaXMpO1xuICAgICAgfSBlbHNlIGlmIChrZXkgPT09ICdjb2xsZWN0aW9uJykge1xuICAgICAgICByZXR1cm4gZ2V0Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5pc1BsdXJhbCkge1xuICAgICAgICBtb2RlbCA9IGdldENvbGxlY3Rpb24odGhpcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtb2RlbCA9IGdldE1vZGVsKHRoaXMpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1vZGVsW2tleV0uYXBwbHkobW9kZWwsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycy5wdXNoKGZ1bmN0aW9uIGRlZmluZU1vZGVscyAobSkge1xuICAgIG0ubWFwT3ZlclJlc291cmNlVHlwZXMoZnVuY3Rpb24gKHJlc291cmNlVHlwZSkge1xuICAgICAgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlW3Jlc291cmNlVHlwZV0gPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuICAgICAgICB2YWxpZGF0ZTogZnVuY3Rpb24gKC8qIG5leHRBdHRyaWJ1dGVzICovKSB7XG4gICAgICAgICAgaWYgKGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2FuIGVycm9yJztcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHNhdmVPd25BdHRyaWJ1dGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG93bkF0dHJpYnV0ZXMgPSBPYmplY3Qua2V5cyh0aGlzLmF0dHJpYnV0ZXMpLnJlZHVjZShmdW5jdGlvbiAoYXR0cmlidXRlcywga2V5KSB7XG4gICAgICAgICAgICBpZiAoWydkaXNwbGF5TmFtZSddLmluZGV4T2Yoa2V5KSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgYXR0cmlidXRlc1trZXldID0gdGhpcy5hdHRyaWJ1dGVzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlcztcbiAgICAgICAgICB9LmJpbmQodGhpcyksIHt9KTtcbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuYWpheCh7XG4gICAgICAgICAgICB0eXBlOiAnUFVUJyxcbiAgICAgICAgICAgIHVybDogdGhpcy51cmwoKSxcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkob3duQXR0cmlidXRlcylcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2F2ZUN1c3RvbUF0dHJpYnV0ZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuYWpheCh7XG4gICAgICAgICAgICB0eXBlOiAnUE9TVCcsXG4gICAgICAgICAgICB1cmw6IHRoaXMudXJsKCkgKyAnL2F0dHJpYnV0ZXMnLFxuICAgICAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04XCIsXG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeSh0aGlzLmdldCgnYXR0cmlidXRlcycpKVxuICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBzYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLiQud2hlbihcbiAgICAgICAgICAgIHRoaXMuc2F2ZU93bkF0dHJpYnV0ZXMoKSxcbiAgICAgICAgICAgIHRoaXMuc2F2ZUN1c3RvbUF0dHJpYnV0ZXMoKVxuICAgICAgICAgICk7XG4gICAgICAgIH0sXG4gICAgICAgIG1vZGVsc1RpZWRXaXRoOiBbXSxcbiAgICAgICAgdGllVG86IGZ1bmN0aW9uIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChpbmRpcmVjdE1vZGVsKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLnB1c2goaW5kaXJlY3RNb2RlbCk7XG4gICAgICAgICAgICBpbmRpcmVjdE1vZGVsLm1vZGVsc1RpZWRXaXRoLnB1c2godGhpcyk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5wdXNoKG90aGVyTW9kZWwpO1xuICAgICAgICAgIG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGgucHVzaCh0aGlzKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2VwYXJhdGVGcm9tT3RoZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5mb3JFYWNoKGZ1bmN0aW9uIChvdGhlck1vZGVsKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXhPZlRoaXMgPSBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLmluZGV4T2YodGhpcyk7XG4gICAgICAgICAgICBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLnNwbGljZShpbmRleE9mVGhpcywgMSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aCA9IFtdO1xuICAgICAgICB9LFxuICAgICAgICBzZXQgOiBmdW5jdGlvbihrZXksIHZhbCwgb3B0aW9ucykge1xuICAgICAgICAgIHZhciBhdHRycywgdXJsLCBvdGhlck1vZGVsO1xuICAgICAgICAgIGlmICgha2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICB9XG4gICAgICAgLy8gSGFuZGxlIGJvdGggYFwia2V5XCIsIHZhbHVlYCBhbmQgYHtrZXk6IHZhbHVlfWAgLXN0eWxlIGFyZ3VtZW50cy5cbiAgICAgICAgICBpZiAodHlwZW9mIGtleSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIGF0dHJzID0ga2V5O1xuICAgICAgICAgICAgb3B0aW9ucyA9IHZhbDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgKGF0dHJzID0ge30pW2tleV0gPSB2YWw7XG4gICAgICAgICAgfVxuICAgICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cblxuICAgICAgICAgIHZhciBfYXR0cmlidXRlTWFwcGluZ3MgPSBtLmFwaS5yZXNvdXJjZXNbcmVzb3VyY2VUeXBlXS5fYXR0cmlidXRlTWFwcGluZ3M7XG4gICAgICAgICAgaWYgKF9hdHRyaWJ1dGVNYXBwaW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoX2F0dHJpYnV0ZU1hcHBpbmdzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXBwaW5nKSB7XG4gICAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gX2F0dHJpYnV0ZU1hcHBpbmdzW2F0dHJpYnV0ZU1hcHBpbmddO1xuICAgICAgICAgICAgICBpZiAoYXR0cnNbYXR0cmlidXRlTWFwcGluZ10gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5oYXMoJ2F0dHJpYnV0ZXMnKSkge1xuICAgICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2F0dHJpYnV0ZXMnLCBbXSwge3NpbGVudDogdHJ1ZX0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVzID0gdGhpcy5nZXQoJ2F0dHJpYnV0ZXMnKS5maWx0ZXIoZnVuY3Rpb24gKGF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZS5uYW1lICE9PSBhdHRyaWJ1dGVOYW1lO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYXR0cmlidXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGF0dHJpYnV0ZU5hbWUsXG4gICAgICAgICAgICAgICAgICB2YWx1ZTogYXR0cnNbYXR0cmlidXRlTWFwcGluZ11cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIHRoaXMuc2V0KCdhdHRyaWJ1dGVzJywgYXR0cmlidXRlcyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgICAgICAgfVxuXG5cblxuXG5cbiAgICAgIFx0ICBpZiAoYXR0cnMuaWQgJiYgYXR0cnMuaWQgIT09IHRoaXMuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICB0aGlzLnNlcGFyYXRlRnJvbU90aGVycygpO1xuICAgICAgICAgICAgdXJsID0gbS5hcGkucHJlZml4ICsgJy8nICsgcmVzb3VyY2VUeXBlICsgJy8nICsgYXR0cnMuaWQ7XG4gICAgICBcdCAgICBvdGhlck1vZGVsID0gbS5jYWNoZVt1cmxdO1xuICAgICAgICAgICAgaWYgKG90aGVyTW9kZWwpIHtcbiAgICAgICAgICAgICAgdGhpcy50aWVUbyhvdGhlck1vZGVsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG0uY2FjaGVbdXJsXSA9IHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghb3B0aW9ucy5zdG9wUHJvcGFnYXRpb25Gb3JNKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLmZvckVhY2goZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgIG1vZGVsLnNldChhdHRycywge3N0b3BQcm9wYWdhdGlvbkZvck06IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldE1vZGVsIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZU1vZGVsKG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTW9kZWwgKG0pIHtcbiAgICBtLmNhY2hlW20udXJsXSA9IG5ldyBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGVbbS5yZXNvdXJjZVR5cGVdKHtcbiAgICAgIGlkOiBtLmlkXG4gICAgfSk7XG4gICAgbS5jYWNoZVttLnVybF0udXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG0udXJsO1xuICAgIH1cbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZUNvbGxlY3Rpb24obSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVDb2xsZWN0aW9uIChtKSB7XG4gICAgbS5jYWNoZVttLnVybF0gPSBuZXcgKEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICAgIHVybDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbS51cmw7XG4gICAgICB9LFxuICAgICAgbW9kZWw6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBtb2RlbCwga2V5ID0gbS5hcGkucHJlZml4ICsgJy8nICsgbS5yZXNvdXJjZVR5cGUgKyAnLycgKyBhdHRyaWJ1dGVzLmlkO1xuICAgICAgICBpZiAoYXR0cmlidXRlcy5pZCkge1xuICAgICAgICAgIG1vZGVsID0gbS5jYWNoZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgIG1vZGVsLnNldChhdHRyaWJ1dGVzKTtcbiAgICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbW9kZWwgPSBuZXcgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlW20ucmVzb3VyY2VUeXBlXShhdHRyaWJ1dGVzKTtcbiAgICAgICAgICBtLmNhY2hlW2tleV0gPSBtb2RlbDtcbiAgICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSkoKTtcbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cbiAgbW9kdWxlLmV4cG9ydHMgPSBNO1xuIiwidmFyIG15R2xvYmFsO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgbXlHbG9iYWwgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgbXlHbG9iYWwgPSBnbG9iYWw7XG59IGVsc2Uge1xuICB0aHJvdyAnZ2xvYmFsIHVua25vd24gJ1xufVxuXG52YXIgTSA9IGZ1bmN0aW9uIChtYXliZUFQSSkge1xuICB2YXIgbSA9IE9iamVjdC5jcmVhdGUoTSk7XG4gIG0uYXBpID0gbWF5YmVBUEkgfHwge307XG4gIG0uY2FjaGUgPSB7fTtcbiAgTS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMocmVzb3VyY2VUeXBlLCBtKTtcbiAgICBkZWNvcmF0ZVdpdGhTaW5ndWxhckZvcm1NZXRob2RzKHJlc291cmNlVHlwZSwgbSk7XG4gIH0sIG0pO1xuICBNLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMubWFwKGZ1bmN0aW9uIChmKSB7ZihtKTt9KTtcbiAgcmV0dXJuIG07XG59O1xuXG5NLm1hcE92ZXJSZXNvdXJjZVR5cGVzID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBtKSB7XG4gIG0gPSBtIHx8IHRoaXM7XG4gIHJldHVybiBPYmplY3Qua2V5cyhtLmFwaS5yZXNvdXJjZXMpLm1hcChjYWxsYmFjayk7XG59O1xuTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzID0gW107XG5cbmZ1bmN0aW9uIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gIG1bcmVzb3VyY2VdID0gZnVuY3Rpb24gKG1heWJlSWQpIHtcbiAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMgPT09IGdsb2JhbCA/IG0gOiB0aGlzKTtcblxuICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcmVzb3VyY2VdKTtcbiAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcblxuICAgIGZ1bmN0aW9uIGFwcGVuZElkIChpZCkge1xuICAgICAgc3RhdGUuaWQgPSBpZDtcbiAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKGlkKTtcbiAgICB9XG5cbiAgICB2YXIgc3RyYXRlZ3kgPSB7XG4gICAgICBudW1iZXI6IGFwcGVuZElkLFxuICAgICAgc3RyaW5nOiBhcHBlbmRJZCxcbiAgICAgIHVuZGVmaW5lZDogZnVuY3Rpb24gKCkgey8qIGZhbGwgdGhyb3VnaCAqL31cbiAgICB9IFt0eXBlb2YgbWF5YmVJZF0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICBzdHJhdGVneShtYXliZUlkKTtcblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZEFyZ3VtZW50ICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBzdHJpbmcgb3IgYSBudW1iZXIgaWQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgdmFyIHBsdXJhbEZvcm0gPSBwbHVyYWwocmVzb3VyY2UpO1xuICBtW3BsdXJhbEZvcm1dID0gZnVuY3Rpb24gKG1heWJlUXVlcnkpIHtcbiAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMgPT09IGdsb2JhbCA/IG0gOiB0aGlzKTtcblxuICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcGx1cmFsRm9ybV0pO1xuICAgIHN0YXRlLnJlc291cmNlVHlwZSA9IHJlc291cmNlO1xuICAgIHN0YXRlLmlzUGx1cmFsID0gdHJ1ZTtcblxuICAgIHZhciBzdHJhdGVneSA9IHtcbiAgICAgIG9iamVjdDogZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKCc/JyArIHNlcmlhbGl6ZShxdWVyeSkpO1xuICAgICAgfSxcbiAgICAgIHVuZGVmaW5lZDogZnVuY3Rpb24gKCkgey8qIGZhbGwgdGhyb3VnaCAqL31cbiAgICB9IFt0eXBlb2YgbWF5YmVRdWVyeV0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICBzdHJhdGVneShtYXliZVF1ZXJ5KTtcblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZEFyZ3VtZW50ICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBwbGFpbiBvbGQgamF2YXNjcmlwdCBxdWVyeSBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemUgKG9iamVjdCwgcHJlZml4KSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgaWYgKHByZWZpeCkge1xuICAgICAga2V5ID0gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZSh2YWx1ZSwga2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfSkuam9pbignJicpO1xufVxuXG5mdW5jdGlvbiBwbHVyYWwgKHNpbmd1bGFyRm9ybSkge1xuICByZXR1cm4gc2luZ3VsYXJGb3JtICsgJ3MnO1xufVxubW9kdWxlLmV4cG9ydHMgPSBNO1xuIl19

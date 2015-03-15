(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.M = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/hstarikov/workspace/m/src/m-for-backbone.js":[function(require,module,exports){
  var Backbone = require('backbone') || window.Backbone;
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
    decorateWithKey('toBackboneModel', M);
    decorateWithKey('toBackboneCollection', M);
  }

  function decorateWithKey(key, M) {
    M[key] = M[key] || function proxy () {
      var model;
      this.url = this.urlFragments.join('/');
      if (key === 'toBackboneModel') {
        return getModel(this);
      } else if (key === 'toBackboneCollection') {
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
        urlRoot: m.api.prefix + '/' + resourceType,
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



          var attributeMappings = m.api.resources[resourceType].attributeMappings;
          if (attributeMappings) {
            Object.keys(attributeMappings).forEach(function (attributeMapping) {
              var attributeName = attributeMappings[attributeMapping];
              if (attrs[attributeMapping] !== undefined) {
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

},{"./url-mapping.js":"/Users/hstarikov/workspace/m/src/url-mapping.js","backbone":"backbone"}],"/Users/hstarikov/workspace/m/src/url-mapping.js":[function(require,module,exports){
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

},{}]},{},["/Users/hstarikov/workspace/m/src/m-for-backbone.js"])("/Users/hstarikov/workspace/m/src/m-for-backbone.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL20tZm9yLWJhY2tib25lLmpzIiwic3JjL3VybC1tYXBwaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIgIHZhciBCYWNrYm9uZSA9IHJlcXVpcmUoJ2JhY2tib25lJykgfHwgd2luZG93LkJhY2tib25lO1xuICB2YXIgTSA9IHJlcXVpcmUoJy4vdXJsLW1hcHBpbmcuanMnKTtcbiAgdmFyIG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZSA9IHt9O1xuXG4gIGRlY29yYXRlV2l0aEJhY2tib25lTWV0aG9kcyhNKTtcblxuICBmdW5jdGlvbiBkZWNvcmF0ZVdpdGhCYWNrYm9uZU1ldGhvZHMgKE0pIHtcbiAgICB2YXIga2V5O1xuICAgIGZvciAoa2V5IGluIG5ldyBCYWNrYm9uZS5Nb2RlbCgpKSB7XG4gICAgICBkZWNvcmF0ZVdpdGhLZXkoa2V5LCBNKTtcbiAgICB9XG4gICAgZm9yIChrZXkgaW4gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKSkge1xuICAgICAgZGVjb3JhdGVXaXRoS2V5KGtleSwgTSk7XG4gICAgfVxuICAgIGRlY29yYXRlV2l0aEtleSgndG9CYWNrYm9uZU1vZGVsJywgTSk7XG4gICAgZGVjb3JhdGVXaXRoS2V5KCd0b0JhY2tib25lQ29sbGVjdGlvbicsIE0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoS2V5KGtleSwgTSkge1xuICAgIE1ba2V5XSA9IE1ba2V5XSB8fCBmdW5jdGlvbiBwcm94eSAoKSB7XG4gICAgICB2YXIgbW9kZWw7XG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsRnJhZ21lbnRzLmpvaW4oJy8nKTtcbiAgICAgIGlmIChrZXkgPT09ICd0b0JhY2tib25lTW9kZWwnKSB7XG4gICAgICAgIHJldHVybiBnZXRNb2RlbCh0aGlzKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAndG9CYWNrYm9uZUNvbGxlY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBnZXRDb2xsZWN0aW9uKHRoaXMpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzUGx1cmFsKSB7XG4gICAgICAgIG1vZGVsID0gZ2V0Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vZGVsID0gZ2V0TW9kZWwodGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbW9kZWxba2V5XS5hcHBseShtb2RlbCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzLnB1c2goZnVuY3Rpb24gZGVmaW5lTW9kZWxzIChtKSB7XG4gICAgbS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgICBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGVbcmVzb3VyY2VUeXBlXSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgICAgIHVybFJvb3Q6IG0uYXBpLnByZWZpeCArICcvJyArIHJlc291cmNlVHlwZSxcbiAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uICgvKiBuZXh0QXR0cmlidXRlcyAqLykge1xuICAgICAgICAgIGlmIChmYWxzZSkge1xuICAgICAgICAgICAgcmV0dXJuICdhbiBlcnJvcic7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBzYXZlT3duQXR0cmlidXRlczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciBvd25BdHRyaWJ1dGVzID0gT2JqZWN0LmtleXModGhpcy5hdHRyaWJ1dGVzKS5yZWR1Y2UoZnVuY3Rpb24gKGF0dHJpYnV0ZXMsIGtleSkge1xuICAgICAgICAgICAgaWYgKFsnZGlzcGxheU5hbWUnXS5pbmRleE9mKGtleSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXNba2V5XSA9IHRoaXMuYXR0cmlidXRlc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZXM7XG4gICAgICAgICAgfS5iaW5kKHRoaXMpLCB7fSk7XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLmFqYXgoe1xuICAgICAgICAgICAgdHlwZTogJ1BVVCcsXG4gICAgICAgICAgICB1cmw6IHRoaXMudXJsKCksXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLThcIixcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KG93bkF0dHJpYnV0ZXMpXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIHNhdmVDdXN0b21BdHRyaWJ1dGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIEJhY2tib25lLmFqYXgoe1xuICAgICAgICAgICAgdHlwZTogJ1BPU1QnLFxuICAgICAgICAgICAgdXJsOiB0aGlzLnVybCgpICsgJy9hdHRyaWJ1dGVzJyxcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtOFwiLFxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkodGhpcy5nZXQoJ2F0dHJpYnV0ZXMnKSlcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS4kLndoZW4oXG4gICAgICAgICAgICB0aGlzLnNhdmVPd25BdHRyaWJ1dGVzKCksXG4gICAgICAgICAgICB0aGlzLnNhdmVDdXN0b21BdHRyaWJ1dGVzKClcbiAgICAgICAgICApO1xuICAgICAgICB9LFxuICAgICAgICBtb2RlbHNUaWVkV2l0aDogW10sXG4gICAgICAgIHRpZVRvOiBmdW5jdGlvbiAob3RoZXJNb2RlbCkge1xuICAgICAgICAgIG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGguZm9yRWFjaChmdW5jdGlvbiAoaW5kaXJlY3RNb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5wdXNoKGluZGlyZWN0TW9kZWwpO1xuICAgICAgICAgICAgaW5kaXJlY3RNb2RlbC5tb2RlbHNUaWVkV2l0aC5wdXNoKHRoaXMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGgucHVzaChvdGhlck1vZGVsKTtcbiAgICAgICAgICBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLnB1c2godGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlcGFyYXRlRnJvbU90aGVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGguZm9yRWFjaChmdW5jdGlvbiAob3RoZXJNb2RlbCkge1xuICAgICAgICAgICAgdmFyIGluZGV4T2ZUaGlzID0gb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5pbmRleE9mKHRoaXMpO1xuICAgICAgICAgICAgb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5zcGxpY2UoaW5kZXhPZlRoaXMsIDEpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGggPSBbXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgYXR0cnMsIHVybCwgb3RoZXJNb2RlbDtcbiAgICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfVxuICAgICAgIC8vIEhhbmRsZSBib3RoIGBcImtleVwiLCB2YWx1ZWAgYW5kIGB7a2V5OiB2YWx1ZX1gIC1zdHlsZSBhcmd1bWVudHMuXG4gICAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhdHRycyA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB2YWw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChhdHRycyA9IHt9KVtrZXldID0gdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXG5cbiAgICAgICAgICB2YXIgYXR0cmlidXRlTWFwcGluZ3MgPSBtLmFwaS5yZXNvdXJjZXNbcmVzb3VyY2VUeXBlXS5hdHRyaWJ1dGVNYXBwaW5ncztcbiAgICAgICAgICBpZiAoYXR0cmlidXRlTWFwcGluZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGF0dHJpYnV0ZU1hcHBpbmdzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyaWJ1dGVNYXBwaW5nKSB7XG4gICAgICAgICAgICAgIHZhciBhdHRyaWJ1dGVOYW1lID0gYXR0cmlidXRlTWFwcGluZ3NbYXR0cmlidXRlTWFwcGluZ107XG4gICAgICAgICAgICAgIGlmIChhdHRyc1thdHRyaWJ1dGVNYXBwaW5nXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSB0aGlzLmdldCgnYXR0cmlidXRlcycpLmZpbHRlcihmdW5jdGlvbiAoYXR0cmlidXRlKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gYXR0cmlidXRlLm5hbWUgIT09IGF0dHJpYnV0ZU5hbWU7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgbmFtZTogYXR0cmlidXRlTmFtZSxcbiAgICAgICAgICAgICAgICAgIHZhbHVlOiBhdHRyc1thdHRyaWJ1dGVNYXBwaW5nXVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5zZXQoJ2F0dHJpYnV0ZXMnLCBhdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICB9XG5cblxuXG5cblxuICAgICAgXHQgIGlmIChhdHRycy5pZCAmJiBhdHRycy5pZCAhPT0gdGhpcy5nZXQoJ2lkJykpIHtcbiAgICAgICAgICAgIHRoaXMuc2VwYXJhdGVGcm9tT3RoZXJzKCk7XG4gICAgICAgICAgICB1cmwgPSBtLmFwaS5wcmVmaXggKyAnLycgKyByZXNvdXJjZVR5cGUgKyAnLycgKyBhdHRycy5pZDtcbiAgICAgIFx0ICAgIG90aGVyTW9kZWwgPSBtLmNhY2hlW3VybF07XG4gICAgICAgICAgICBpZiAob3RoZXJNb2RlbCkge1xuICAgICAgICAgICAgICB0aGlzLnRpZVRvKG90aGVyTW9kZWwpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbS5jYWNoZVt1cmxdID0gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFvcHRpb25zLnN0b3BQcm9wYWdhdGlvbkZvck0pIHtcbiAgICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGguZm9yRWFjaChmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgICAgICAgbW9kZWwuc2V0KGF0dHJzLCB7c3RvcFByb3BhZ2F0aW9uRm9yTTogdHJ1ZX0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cnMsIG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gZ2V0TW9kZWwgKG0pIHtcbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF0gfHwgY3JlYXRlTW9kZWwobSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVNb2RlbCAobSkge1xuICAgIG0uY2FjaGVbbS51cmxdID0gbmV3IG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZVttLnJlc291cmNlVHlwZV0oe1xuICAgICAgaWQ6IG0uaWRcbiAgICB9KTtcbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2xsZWN0aW9uIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZUNvbGxlY3Rpb24obSk7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVDb2xsZWN0aW9uIChtKSB7XG4gICAgbS5jYWNoZVttLnVybF0gPSBuZXcgKEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcbiAgICAgIHVybDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbS51cmw7XG4gICAgICB9LFxuICAgICAgbW9kZWw6IGZ1bmN0aW9uIChhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBtb2RlbCwga2V5ID0gbS5hcGkucHJlZml4ICsgJy8nICsgbS5yZXNvdXJjZVR5cGUgKyAnLycgKyBhdHRyaWJ1dGVzLmlkO1xuICAgICAgICBpZiAoYXR0cmlidXRlcy5pZCkge1xuICAgICAgICAgIG1vZGVsID0gbS5jYWNoZVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgIG1vZGVsLnNldChhdHRyaWJ1dGVzKTtcbiAgICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbW9kZWwgPSBuZXcgbW9kZWxDb25zdHJ1Y3RvcnNQZXJUeXBlW20ucmVzb3VyY2VUeXBlXShhdHRyaWJ1dGVzKTtcbiAgICAgICAgICBtLmNhY2hlW2tleV0gPSBtb2RlbDtcbiAgICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSkoKTtcbiAgICByZXR1cm4gbS5jYWNoZVttLnVybF07XG4gIH1cbiAgbW9kdWxlLmV4cG9ydHMgPSBNO1xuIiwiICB2YXIgTSA9IGZ1bmN0aW9uIChtYXliZUFQSSkge1xuICAgIHZhciBtID0gT2JqZWN0LmNyZWF0ZShNKTtcbiAgICBtLmFwaSA9IG1heWJlQVBJIHx8IHt9O1xuICAgIG0uY2FjaGUgPSB7fTtcbiAgICBNLm1hcE92ZXJSZXNvdXJjZVR5cGVzKGZ1bmN0aW9uIChyZXNvdXJjZVR5cGUpIHtcbiAgICAgIGRlY29yYXRlV2l0aFBsdXJhbEZvcm1NZXRob2RzKHJlc291cmNlVHlwZSwgbSk7XG4gICAgICBkZWNvcmF0ZVdpdGhTaW5ndWxhckZvcm1NZXRob2RzKHJlc291cmNlVHlwZSwgbSk7XG4gICAgfSwgbSk7XG4gICAgTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzLm1hcChmdW5jdGlvbiAoZikge2YobSk7fSk7XG4gICAgcmV0dXJuIG07XG4gIH07XG5cbiAgTS5tYXBPdmVyUmVzb3VyY2VUeXBlcyA9IGZ1bmN0aW9uIChjYWxsYmFjaywgbSkge1xuICAgIG0gPSBtIHx8IHRoaXM7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKG0uYXBpLnJlc291cmNlcykubWFwKGNhbGxiYWNrKTtcbiAgfTtcbiAgTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzID0gW107XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoU2luZ3VsYXJGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgICBtW3Jlc291cmNlXSA9IGZ1bmN0aW9uIChtYXliZUlkKSB7XG4gICAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKG0pO1xuXG4gICAgICBzdGF0ZS51cmxGcmFnbWVudHMgPSAoc3RhdGUudXJsRnJhZ21lbnRzIHx8IFttLmFwaS5wcmVmaXhdKS5jb25jYXQoW3Jlc291cmNlXSk7XG4gICAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcblxuICAgICAgZnVuY3Rpb24gYXBwZW5kSWQgKGlkKSB7XG4gICAgICAgIHN0YXRlLmlkID0gaWQ7XG4gICAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKGlkKTtcbiAgICAgIH1cblxuICAgICAgdmFyIHN0cmF0ZWd5ID0ge1xuICAgICAgICBudW1iZXI6IGFwcGVuZElkLFxuICAgICAgICBzdHJpbmc6IGFwcGVuZElkLFxuICAgICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgICB9IFt0eXBlb2YgbWF5YmVJZF0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICAgIHN0cmF0ZWd5KG1heWJlSWQpO1xuXG4gICAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBzdHJpbmcgb3IgYSBudW1iZXIgaWQuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gICAgdmFyIHBsdXJhbEZvcm0gPSBwbHVyYWwocmVzb3VyY2UpO1xuICAgIG1bcGx1cmFsRm9ybV0gPSBmdW5jdGlvbiAobWF5YmVRdWVyeSkge1xuICAgICAgdmFyIHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzKTtcblxuICAgICAgc3RhdGUudXJsRnJhZ21lbnRzID0gKHN0YXRlLnVybEZyYWdtZW50cyB8fCBbbS5hcGkucHJlZml4XSkuY29uY2F0KFtwbHVyYWxGb3JtXSk7XG4gICAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcbiAgICAgIHN0YXRlLmlzUGx1cmFsID0gdHJ1ZTtcblxuICAgICAgdmFyIHN0cmF0ZWd5ID0ge1xuICAgICAgICBvYmplY3Q6IGZ1bmN0aW9uIChxdWVyeSkge1xuICAgICAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKCc/JyArIHNlcmlhbGl6ZShxdWVyeSkpO1xuICAgICAgICB9LFxuICAgICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgICB9IFt0eXBlb2YgbWF5YmVRdWVyeV0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICAgIHN0cmF0ZWd5KG1heWJlUXVlcnkpO1xuXG4gICAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBwbGFpbiBvbGQgamF2YXNjcmlwdCBxdWVyeSBvYmplY3QuJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdGF0ZTtcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2VyaWFsaXplIChvYmplY3QsIHByZWZpeCkge1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICAgIGlmIChwcmVmaXgpIHtcbiAgICAgICAga2V5ID0gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0dXJuIHNlcmlhbGl6ZSh2YWx1ZSwga2V5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gICAgfSkuam9pbignJicpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGx1cmFsIChzaW5ndWxhckZvcm0pIHtcbiAgICByZXR1cm4gc2luZ3VsYXJGb3JtICsgJ3MnO1xuICB9XG4gIG1vZHVsZS5leHBvcnRzID0gTTtcbiJdfQ==

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
          return true;
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
          
	  if (attrs.id !== this.get('id')) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwic3JjL20tZm9yLWJhY2tib25lLmpzIiwic3JjL3VybC1tYXBwaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiICB2YXIgQmFja2JvbmUgPSByZXF1aXJlKCdiYWNrYm9uZScpO1xuICB2YXIgTSA9IHJlcXVpcmUoJy4vdXJsLW1hcHBpbmcuanMnKTtcbiAgdmFyIG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZSA9IHt9O1xuXG4gIGRlY29yYXRlV2l0aEJhY2tib25lTWV0aG9kcyhNKTtcblxuICBmdW5jdGlvbiBkZWNvcmF0ZVdpdGhCYWNrYm9uZU1ldGhvZHMgKE0pIHtcbiAgICB2YXIga2V5O1xuICAgIGZvciAoa2V5IGluIG5ldyBCYWNrYm9uZS5Nb2RlbCgpKSB7XG4gICAgICBkZWNvcmF0ZVdpdGhLZXkoa2V5LCBNKTtcbiAgICB9XG4gICAgZm9yIChrZXkgaW4gbmV3IEJhY2tib25lLkNvbGxlY3Rpb24oKSkge1xuICAgICAgZGVjb3JhdGVXaXRoS2V5KGtleSwgTSk7XG4gICAgfVxuICAgIGRlY29yYXRlV2l0aEtleSgndG9CYWNrYm9uZU1vZGVsJywgTSk7XG4gICAgZGVjb3JhdGVXaXRoS2V5KCd0b0JhY2tib25lQ29sbGVjdGlvbicsIE0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVjb3JhdGVXaXRoS2V5KGtleSwgTSkge1xuICAgIE1ba2V5XSA9IE1ba2V5XSB8fCBmdW5jdGlvbiBwcm94eSAoKSB7XG4gICAgICB2YXIgbW9kZWw7XG4gICAgICB0aGlzLnVybCA9IHRoaXMudXJsRnJhZ21lbnRzLmpvaW4oJy8nKTtcbiAgICAgIGlmIChrZXkgPT09ICd0b0JhY2tib25lTW9kZWwnKSB7XG4gICAgICAgIHJldHVybiBnZXRNb2RlbCh0aGlzKTtcbiAgICAgIH0gZWxzZSBpZiAoa2V5ID09PSAndG9CYWNrYm9uZUNvbGxlY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBnZXRDb2xsZWN0aW9uKHRoaXMpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmlzUGx1cmFsKSB7XG4gICAgICAgIG1vZGVsID0gZ2V0Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1vZGVsID0gZ2V0TW9kZWwodGhpcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbW9kZWxba2V5XS5hcHBseShtb2RlbCwgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzLnB1c2goZnVuY3Rpb24gZGVmaW5lTW9kZWxzIChtKSB7XG4gICAgbS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgICBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGVbcmVzb3VyY2VUeXBlXSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG4gICAgICAgIHVybFJvb3Q6IG0uYXBpLnByZWZpeCArICcvJyArIHJlc291cmNlVHlwZSxcbiAgICAgICAgdmFsaWRhdGU6IGZ1bmN0aW9uICgvKiBuZXh0QXR0cmlidXRlcyAqLykge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICBtb2RlbHNUaWVkV2l0aDogW10sXG4gICAgICAgIHRpZVRvOiBmdW5jdGlvbiAob3RoZXJNb2RlbCkge1xuICAgICAgICAgIG90aGVyTW9kZWwubW9kZWxzVGllZFdpdGguZm9yRWFjaChmdW5jdGlvbiAoaW5kaXJlY3RNb2RlbCkge1xuICAgICAgICAgICAgdGhpcy5tb2RlbHNUaWVkV2l0aC5wdXNoKGluZGlyZWN0TW9kZWwpO1xuICAgICAgICAgICAgaW5kaXJlY3RNb2RlbC5tb2RlbHNUaWVkV2l0aC5wdXNoKHRoaXMpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGgucHVzaChvdGhlck1vZGVsKTtcbiAgICAgICAgICBvdGhlck1vZGVsLm1vZGVsc1RpZWRXaXRoLnB1c2godGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHNlcGFyYXRlRnJvbU90aGVyczogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGguZm9yRWFjaChmdW5jdGlvbiAob3RoZXJNb2RlbCkge1xuICAgICAgICAgICAgdmFyIGluZGV4T2ZUaGlzID0gb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5pbmRleE9mKHRoaXMpO1xuICAgICAgICAgICAgb3RoZXJNb2RlbC5tb2RlbHNUaWVkV2l0aC5zcGxpY2UoaW5kZXhPZlRoaXMsIDEpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMubW9kZWxzVGllZFdpdGggPSBbXTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0IDogZnVuY3Rpb24oa2V5LCB2YWwsIG9wdGlvbnMpIHtcbiAgICAgICAgICB2YXIgYXR0cnMsIHVybCwgb3RoZXJNb2RlbDtcbiAgICAgICAgICBpZiAoIWtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgfVxuICAgICAgIC8vIEhhbmRsZSBib3RoIGBcImtleVwiLCB2YWx1ZWAgYW5kIGB7a2V5OiB2YWx1ZX1gIC1zdHlsZSBhcmd1bWVudHMuXG4gICAgICAgICAgaWYgKHR5cGVvZiBrZXkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBhdHRycyA9IGtleTtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB2YWw7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIChhdHRycyA9IHt9KVtrZXldID0gdmFsO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgICBcblx0ICBpZiAoYXR0cnMuaWQgIT09IHRoaXMuZ2V0KCdpZCcpKSB7XG4gICAgICAgICAgICB0aGlzLnNlcGFyYXRlRnJvbU90aGVycygpO1xuICAgICAgICAgICAgdXJsID0gbS5hcGkucHJlZml4ICsgJy8nICsgcmVzb3VyY2VUeXBlICsgJy8nICsgYXR0cnMuaWQ7XG5cdCAgICBvdGhlck1vZGVsID0gbS5jYWNoZVt1cmxdO1xuICAgICAgICAgICAgaWYgKG90aGVyTW9kZWwpIHtcbiAgICAgICAgICAgICAgdGhpcy50aWVUbyhvdGhlck1vZGVsKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG0uY2FjaGVbdXJsXSA9IHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghb3B0aW9ucy5zdG9wUHJvcGFnYXRpb25Gb3JNKSB7XG4gICAgICAgICAgICB0aGlzLm1vZGVsc1RpZWRXaXRoLmZvckVhY2goZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgICAgICAgIG1vZGVsLnNldChhdHRycywge3N0b3BQcm9wYWdhdGlvbkZvck06IHRydWV9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJzLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldE1vZGVsIChtKSB7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdIHx8IGNyZWF0ZU1vZGVsKG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTW9kZWwgKG0pIHtcbiAgICBtLmNhY2hlW20udXJsXSA9IG5ldyBtb2RlbENvbnN0cnVjdG9yc1BlclR5cGVbbS5yZXNvdXJjZVR5cGVdKHtcbiAgICAgIGlkOiBtLmlkXG4gICAgfSk7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0Q29sbGVjdGlvbiAobSkge1xuICAgIHJldHVybiBtLmNhY2hlW20udXJsXSB8fCBjcmVhdGVDb2xsZWN0aW9uKG0pO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlQ29sbGVjdGlvbiAobSkge1xuICAgIG0uY2FjaGVbbS51cmxdID0gbmV3IChCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG4gICAgICB1cmw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG0udXJsO1xuICAgICAgfSxcbiAgICAgIG1vZGVsOiBmdW5jdGlvbiAoYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgbW9kZWwsIGtleSA9IG0uYXBpLnByZWZpeCArICcvJyArIG0ucmVzb3VyY2VUeXBlICsgJy8nICsgYXR0cmlidXRlcy5pZDtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMuaWQpIHtcbiAgICAgICAgICBtb2RlbCA9IG0uY2FjaGVba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobW9kZWwpIHtcbiAgICAgICAgICBtb2RlbC5zZXQoYXR0cmlidXRlcyk7XG4gICAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1vZGVsID0gbmV3IG1vZGVsQ29uc3RydWN0b3JzUGVyVHlwZVttLnJlc291cmNlVHlwZV0oYXR0cmlidXRlcyk7XG4gICAgICAgICAgbS5jYWNoZVtrZXldID0gbW9kZWw7XG4gICAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSkpKCk7XG4gICAgcmV0dXJuIG0uY2FjaGVbbS51cmxdO1xuICB9XG4gIG1vZHVsZS5leHBvcnRzID0gTTtcbiIsIiAgdmFyIE0gPSBmdW5jdGlvbiAobWF5YmVBUEkpIHtcbiAgICB2YXIgbSA9IE9iamVjdC5jcmVhdGUoTSk7XG4gICAgbS5hcGkgPSBtYXliZUFQSSB8fCB7fTtcbiAgICBtLmNhY2hlID0ge307XG4gICAgTS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgICBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyhyZXNvdXJjZVR5cGUsIG0pO1xuICAgICAgZGVjb3JhdGVXaXRoU2luZ3VsYXJGb3JtTWV0aG9kcyhyZXNvdXJjZVR5cGUsIG0pO1xuICAgIH0sIG0pO1xuICAgIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycy5tYXAoZnVuY3Rpb24gKGYpIHtmKG0pO30pO1xuICAgIHJldHVybiBtO1xuICB9O1xuXG4gIE0ubWFwT3ZlclJlc291cmNlVHlwZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIG0pIHtcbiAgICBtID0gbSB8fCB0aGlzO1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhtLmFwaS5yZXNvdXJjZXMpLm1hcChjYWxsYmFjayk7XG4gIH07XG4gIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gICAgbVtyZXNvdXJjZV0gPSBmdW5jdGlvbiAobWF5YmVJZCkge1xuICAgICAgdmFyIHN0YXRlID0gT2JqZWN0LmNyZWF0ZShtKTtcblxuICAgICAgc3RhdGUudXJsRnJhZ21lbnRzID0gKHN0YXRlLnVybEZyYWdtZW50cyB8fCBbbS5hcGkucHJlZml4XSkuY29uY2F0KFtyZXNvdXJjZV0pO1xuICAgICAgc3RhdGUucmVzb3VyY2VUeXBlID0gcmVzb3VyY2U7XG5cbiAgICAgIGZ1bmN0aW9uIGFwcGVuZElkIChpZCkge1xuICAgICAgICBzdGF0ZS5pZCA9IGlkO1xuICAgICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaChpZCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBzdHJhdGVneSA9IHtcbiAgICAgICAgbnVtYmVyOiBhcHBlbmRJZCxcbiAgICAgICAgc3RyaW5nOiBhcHBlbmRJZCxcbiAgICAgICAgdW5kZWZpbmVkOiBmdW5jdGlvbiAoKSB7LyogZmFsbCB0aHJvdWdoICovfVxuICAgICAgfSBbdHlwZW9mIG1heWJlSWRdIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgICBzdHJhdGVneShtYXliZUlkKTtcblxuICAgICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkQXJndW1lbnQgKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgc3RyaW5nIG9yIGEgbnVtYmVyIGlkLicpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3RhdGU7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlY29yYXRlV2l0aFBsdXJhbEZvcm1NZXRob2RzIChyZXNvdXJjZSwgbSkge1xuICAgIHZhciBwbHVyYWxGb3JtID0gcGx1cmFsKHJlc291cmNlKTtcbiAgICBtW3BsdXJhbEZvcm1dID0gZnVuY3Rpb24gKG1heWJlUXVlcnkpIHtcbiAgICAgIHZhciBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcyk7XG5cbiAgICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcGx1cmFsRm9ybV0pO1xuICAgICAgc3RhdGUucmVzb3VyY2VUeXBlID0gcmVzb3VyY2U7XG4gICAgICBzdGF0ZS5pc1BsdXJhbCA9IHRydWU7XG5cbiAgICAgIHZhciBzdHJhdGVneSA9IHtcbiAgICAgICAgb2JqZWN0OiBmdW5jdGlvbiAocXVlcnkpIHtcbiAgICAgICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaCgnPycgKyBzZXJpYWxpemUocXVlcnkpKTtcbiAgICAgICAgfSxcbiAgICAgICAgdW5kZWZpbmVkOiBmdW5jdGlvbiAoKSB7LyogZmFsbCB0aHJvdWdoICovfVxuICAgICAgfSBbdHlwZW9mIG1heWJlUXVlcnldIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgICBzdHJhdGVneShtYXliZVF1ZXJ5KTtcblxuICAgICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkQXJndW1lbnQgKCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgcGxhaW4gb2xkIGphdmFzY3JpcHQgcXVlcnkgb2JqZWN0LicpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3RhdGU7XG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZSAob2JqZWN0LCBwcmVmaXgpIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgICBpZiAocHJlZml4KSB7XG4gICAgICAgIGtleSA9IHByZWZpeCArICdbJyArIGtleSArICddJztcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHJldHVybiBzZXJpYWxpemUodmFsdWUsIGtleSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICAgIH0pLmpvaW4oJyYnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBsdXJhbCAoc2luZ3VsYXJGb3JtKSB7XG4gICAgcmV0dXJuIHNpbmd1bGFyRm9ybSArICdzJztcbiAgfVxuICBtb2R1bGUuZXhwb3J0cyA9IE07XG4iXX0=

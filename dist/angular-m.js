!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.M=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var M = require('./url-mapping.js');

window.angular.module('mmodule', []).factory('mfactory', ['$resource', function ($resource) {
  M.buildResource = function () {
    var resource = $resource(this.urlFragments.join('/'), null, {
      'update': { method:'PUT' },
      'save': {
        method: 'POST',
        headers: {'Content-Type': 'application/json'}
      }
    }), m = this;

    resource.prototype.prop = function (name) {
      var defenition = m.api.resources[m.resourceType];
      if (defenition._attributeMappings[name]) {
        return (this.attributes.filter(function (attribute) {
          return attribute.name === defenition._attributeMappings[name];
        })[0] || {}).value;
      }
      if (defenition._shortcutMappings[name]) {
        return defenition._shortcutMappings[name].reduce(function (path, prop) {
          return path[prop];
        }, this);
      }
    };

    return resource;
  };
  return M;
}]);

module.exports = M;

},{"./url-mapping.js":2}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1hbmd1bGFyLmpzIiwic3JjL3VybC1tYXBwaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgTSA9IHJlcXVpcmUoJy4vdXJsLW1hcHBpbmcuanMnKTtcblxud2luZG93LmFuZ3VsYXIubW9kdWxlKCdtbW9kdWxlJywgW10pLmZhY3RvcnkoJ21mYWN0b3J5JywgWyckcmVzb3VyY2UnLCBmdW5jdGlvbiAoJHJlc291cmNlKSB7XG4gIE0uYnVpbGRSZXNvdXJjZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcmVzb3VyY2UgPSAkcmVzb3VyY2UodGhpcy51cmxGcmFnbWVudHMuam9pbignLycpLCBudWxsLCB7XG4gICAgICAndXBkYXRlJzogeyBtZXRob2Q6J1BVVCcgfSxcbiAgICAgICdzYXZlJzoge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogeydDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbid9XG4gICAgICB9XG4gICAgfSksIG0gPSB0aGlzO1xuXG4gICAgcmVzb3VyY2UucHJvdG90eXBlLnByb3AgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgdmFyIGRlZmVuaXRpb24gPSBtLmFwaS5yZXNvdXJjZXNbbS5yZXNvdXJjZVR5cGVdO1xuICAgICAgaWYgKGRlZmVuaXRpb24uX2F0dHJpYnV0ZU1hcHBpbmdzW25hbWVdKSB7XG4gICAgICAgIHJldHVybiAodGhpcy5hdHRyaWJ1dGVzLmZpbHRlcihmdW5jdGlvbiAoYXR0cmlidXRlKSB7XG4gICAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZS5uYW1lID09PSBkZWZlbml0aW9uLl9hdHRyaWJ1dGVNYXBwaW5nc1tuYW1lXTtcbiAgICAgICAgfSlbMF0gfHwge30pLnZhbHVlO1xuICAgICAgfVxuICAgICAgaWYgKGRlZmVuaXRpb24uX3Nob3J0Y3V0TWFwcGluZ3NbbmFtZV0pIHtcbiAgICAgICAgcmV0dXJuIGRlZmVuaXRpb24uX3Nob3J0Y3V0TWFwcGluZ3NbbmFtZV0ucmVkdWNlKGZ1bmN0aW9uIChwYXRoLCBwcm9wKSB7XG4gICAgICAgICAgcmV0dXJuIHBhdGhbcHJvcF07XG4gICAgICAgIH0sIHRoaXMpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gcmVzb3VyY2U7XG4gIH07XG4gIHJldHVybiBNO1xufV0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE07XG4iLCJ2YXIgbXlHbG9iYWw7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gdHlwZW9mIHVuZGVmaW5lZCkge1xuICBteUdsb2JhbCA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gdHlwZW9mIHVuZGVmaW5lZCkge1xuICBteUdsb2JhbCA9IGdsb2JhbDtcbn0gZWxzZSB7XG4gIHRocm93ICdnbG9iYWwgdW5rbm93biAnXG59XG5cbnZhciBNID0gZnVuY3Rpb24gKG1heWJlQVBJKSB7XG4gIHZhciBtID0gT2JqZWN0LmNyZWF0ZShNKTtcbiAgbS5hcGkgPSBtYXliZUFQSSB8fCB7fTtcbiAgbS5jYWNoZSA9IHt9O1xuICBNLm1hcE92ZXJSZXNvdXJjZVR5cGVzKGZ1bmN0aW9uIChyZXNvdXJjZVR5cGUpIHtcbiAgICBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyhyZXNvdXJjZVR5cGUsIG0pO1xuICAgIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMocmVzb3VyY2VUeXBlLCBtKTtcbiAgfSwgbSk7XG4gIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycy5tYXAoZnVuY3Rpb24gKGYpIHtmKG0pO30pO1xuICByZXR1cm4gbTtcbn07XG5cbk0ubWFwT3ZlclJlc291cmNlVHlwZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIG0pIHtcbiAgbSA9IG0gfHwgdGhpcztcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG0uYXBpLnJlc291cmNlcykubWFwKGNhbGxiYWNrKTtcbn07XG5NLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMgPSBbXTtcblxuZnVuY3Rpb24gZGVjb3JhdGVXaXRoU2luZ3VsYXJGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgbVtyZXNvdXJjZV0gPSBmdW5jdGlvbiAobWF5YmVJZCkge1xuICAgIHZhciBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcyA9PT0gZ2xvYmFsID8gbSA6IHRoaXMpO1xuXG4gICAgc3RhdGUudXJsRnJhZ21lbnRzID0gKHN0YXRlLnVybEZyYWdtZW50cyB8fCBbbS5hcGkucHJlZml4XSkuY29uY2F0KFtyZXNvdXJjZV0pO1xuICAgIHN0YXRlLnJlc291cmNlVHlwZSA9IHJlc291cmNlO1xuXG4gICAgZnVuY3Rpb24gYXBwZW5kSWQgKGlkKSB7XG4gICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaChpZCk7XG4gICAgfVxuXG4gICAgdmFyIHN0cmF0ZWd5ID0ge1xuICAgICAgbnVtYmVyOiBhcHBlbmRJZCxcbiAgICAgIHN0cmluZzogYXBwZW5kSWQsXG4gICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgfSBbdHlwZW9mIG1heWJlSWRdIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgc3RyYXRlZ3kobWF5YmVJZCk7XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgc3RyaW5nIG9yIGEgbnVtYmVyIGlkLicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gIHZhciBwbHVyYWxGb3JtID0gcGx1cmFsKHJlc291cmNlKTtcbiAgbVtwbHVyYWxGb3JtXSA9IGZ1bmN0aW9uIChtYXliZVF1ZXJ5KSB7XG4gICAgdmFyIHN0YXRlID0gT2JqZWN0LmNyZWF0ZSh0aGlzID09PSBnbG9iYWwgPyBtIDogdGhpcyk7XG5cbiAgICBzdGF0ZS51cmxGcmFnbWVudHMgPSAoc3RhdGUudXJsRnJhZ21lbnRzIHx8IFttLmFwaS5wcmVmaXhdKS5jb25jYXQoW3BsdXJhbEZvcm1dKTtcbiAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcbiAgICBzdGF0ZS5pc1BsdXJhbCA9IHRydWU7XG5cbiAgICB2YXIgc3RyYXRlZ3kgPSB7XG4gICAgICBvYmplY3Q6IGZ1bmN0aW9uIChxdWVyeSkge1xuICAgICAgICBzdGF0ZS51cmxGcmFnbWVudHMucHVzaCgnPycgKyBzZXJpYWxpemUocXVlcnkpKTtcbiAgICAgIH0sXG4gICAgICB1bmRlZmluZWQ6IGZ1bmN0aW9uICgpIHsvKiBmYWxsIHRocm91Z2ggKi99XG4gICAgfSBbdHlwZW9mIG1heWJlUXVlcnldIHx8IHRocm93SW52YWxpZEFyZ3VtZW50O1xuXG4gICAgc3RyYXRlZ3kobWF5YmVRdWVyeSk7XG5cbiAgICBmdW5jdGlvbiB0aHJvd0ludmFsaWRBcmd1bWVudCAoKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoaXMgZnVuY3Rpb24gb25seSBhY2NlcHRzIGEgcGxhaW4gb2xkIGphdmFzY3JpcHQgcXVlcnkgb2JqZWN0LicpO1xuICAgIH1cblxuICAgIHJldHVybiBzdGF0ZTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gc2VyaWFsaXplIChvYmplY3QsIHByZWZpeCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMob2JqZWN0KS5tYXAoZnVuY3Rpb24gKGtleSkge1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtrZXldO1xuICAgIGlmIChwcmVmaXgpIHtcbiAgICAgIGtleSA9IHByZWZpeCArICdbJyArIGtleSArICddJztcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJldHVybiBzZXJpYWxpemUodmFsdWUsIGtleSk7XG4gICAgfVxuICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG4gIH0pLmpvaW4oJyYnKTtcbn1cblxuZnVuY3Rpb24gcGx1cmFsIChzaW5ndWxhckZvcm0pIHtcbiAgcmV0dXJuIHNpbmd1bGFyRm9ybSArICdzJztcbn1cbm1vZHVsZS5leHBvcnRzID0gTTtcbiJdfQ==

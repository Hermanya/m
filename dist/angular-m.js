!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.M=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var M = require('./url-mapping.js');

window.angular.module('mmodule', []).factory('mfactory', ['$resource', function ($resource) {
  M.buildResource = function () {
    return $resource(this.urlFragments.join('/'), null, {
        'update': { method:'PUT' }
    });
    // extend get to make singletons
  }
  return M;
}])

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1hbmd1bGFyLmpzIiwic3JjL3VybC1tYXBwaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBNID0gcmVxdWlyZSgnLi91cmwtbWFwcGluZy5qcycpO1xuXG53aW5kb3cuYW5ndWxhci5tb2R1bGUoJ21tb2R1bGUnLCBbXSkuZmFjdG9yeSgnbWZhY3RvcnknLCBbJyRyZXNvdXJjZScsIGZ1bmN0aW9uICgkcmVzb3VyY2UpIHtcbiAgTS5idWlsZFJlc291cmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAkcmVzb3VyY2UodGhpcy51cmxGcmFnbWVudHMuam9pbignLycpLCBudWxsLCB7XG4gICAgICAgICd1cGRhdGUnOiB7IG1ldGhvZDonUFVUJyB9XG4gICAgfSk7XG4gICAgLy8gZXh0ZW5kIGdldCB0byBtYWtlIHNpbmdsZXRvbnNcbiAgfVxuICByZXR1cm4gTTtcbn1dKVxuXG5tb2R1bGUuZXhwb3J0cyA9IE07XG4iLCJ2YXIgbXlHbG9iYWw7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gdHlwZW9mIHVuZGVmaW5lZCkge1xuICBteUdsb2JhbCA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gdHlwZW9mIHVuZGVmaW5lZCkge1xuICBteUdsb2JhbCA9IGdsb2JhbDtcbn0gZWxzZSB7XG4gIHRocm93ICdnbG9iYWwgdW5rbm93biAnXG59XG5cbnZhciBNID0gZnVuY3Rpb24gKG1heWJlQVBJKSB7XG4gIHZhciBtID0gT2JqZWN0LmNyZWF0ZShNKTtcbiAgbS5hcGkgPSBtYXliZUFQSSB8fCB7fTtcbiAgbS5jYWNoZSA9IHt9O1xuICBNLm1hcE92ZXJSZXNvdXJjZVR5cGVzKGZ1bmN0aW9uIChyZXNvdXJjZVR5cGUpIHtcbiAgICBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyhyZXNvdXJjZVR5cGUsIG0pO1xuICAgIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMocmVzb3VyY2VUeXBlLCBtKTtcbiAgfSwgbSk7XG4gIE0uaW5pdGlhbGl6YXRpb25TdWJzY3JpYmVycy5tYXAoZnVuY3Rpb24gKGYpIHtmKG0pO30pO1xuICByZXR1cm4gbTtcbn07XG5cbk0ubWFwT3ZlclJlc291cmNlVHlwZXMgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIG0pIHtcbiAgbSA9IG0gfHwgdGhpcztcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG0uYXBpLnJlc291cmNlcykubWFwKGNhbGxiYWNrKTtcbn07XG5NLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMgPSBbXTtcblxuZnVuY3Rpb24gZGVjb3JhdGVXaXRoU2luZ3VsYXJGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgbVtyZXNvdXJjZV0gPSBmdW5jdGlvbiAobWF5YmVJZCkge1xuICAgIHZhciBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcyA9PT0gZ2xvYmFsID8gbSA6IHRoaXMpO1xuXG4gICAgc3RhdGUudXJsRnJhZ21lbnRzID0gKHN0YXRlLnVybEZyYWdtZW50cyB8fCBbbS5hcGkucHJlZml4XSkuY29uY2F0KFtyZXNvdXJjZV0pO1xuICAgIHN0YXRlLnJlc291cmNlVHlwZSA9IHJlc291cmNlO1xuXG4gICAgZnVuY3Rpb24gYXBwZW5kSWQgKGlkKSB7XG4gICAgICBzdGF0ZS5pZCA9IGlkO1xuICAgICAgc3RhdGUudXJsRnJhZ21lbnRzLnB1c2goaWQpO1xuICAgIH1cblxuICAgIHZhciBzdHJhdGVneSA9IHtcbiAgICAgIG51bWJlcjogYXBwZW5kSWQsXG4gICAgICBzdHJpbmc6IGFwcGVuZElkLFxuICAgICAgdW5kZWZpbmVkOiBmdW5jdGlvbiAoKSB7LyogZmFsbCB0aHJvdWdoICovfVxuICAgIH0gW3R5cGVvZiBtYXliZUlkXSB8fCB0aHJvd0ludmFsaWRBcmd1bWVudDtcblxuICAgIHN0cmF0ZWd5KG1heWJlSWQpO1xuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkQXJndW1lbnQgKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIGZ1bmN0aW9uIG9ubHkgYWNjZXB0cyBhIHN0cmluZyBvciBhIG51bWJlciBpZC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGRlY29yYXRlV2l0aFBsdXJhbEZvcm1NZXRob2RzIChyZXNvdXJjZSwgbSkge1xuICB2YXIgcGx1cmFsRm9ybSA9IHBsdXJhbChyZXNvdXJjZSk7XG4gIG1bcGx1cmFsRm9ybV0gPSBmdW5jdGlvbiAobWF5YmVRdWVyeSkge1xuICAgIHZhciBzdGF0ZSA9IE9iamVjdC5jcmVhdGUodGhpcyA9PT0gZ2xvYmFsID8gbSA6IHRoaXMpO1xuXG4gICAgc3RhdGUudXJsRnJhZ21lbnRzID0gKHN0YXRlLnVybEZyYWdtZW50cyB8fCBbbS5hcGkucHJlZml4XSkuY29uY2F0KFtwbHVyYWxGb3JtXSk7XG4gICAgc3RhdGUucmVzb3VyY2VUeXBlID0gcmVzb3VyY2U7XG4gICAgc3RhdGUuaXNQbHVyYWwgPSB0cnVlO1xuXG4gICAgdmFyIHN0cmF0ZWd5ID0ge1xuICAgICAgb2JqZWN0OiBmdW5jdGlvbiAocXVlcnkpIHtcbiAgICAgICAgc3RhdGUudXJsRnJhZ21lbnRzLnB1c2goJz8nICsgc2VyaWFsaXplKHF1ZXJ5KSk7XG4gICAgICB9LFxuICAgICAgdW5kZWZpbmVkOiBmdW5jdGlvbiAoKSB7LyogZmFsbCB0aHJvdWdoICovfVxuICAgIH0gW3R5cGVvZiBtYXliZVF1ZXJ5XSB8fCB0aHJvd0ludmFsaWRBcmd1bWVudDtcblxuICAgIHN0cmF0ZWd5KG1heWJlUXVlcnkpO1xuXG4gICAgZnVuY3Rpb24gdGhyb3dJbnZhbGlkQXJndW1lbnQgKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIGZ1bmN0aW9uIG9ubHkgYWNjZXB0cyBhIHBsYWluIG9sZCBqYXZhc2NyaXB0IHF1ZXJ5IG9iamVjdC4nKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RhdGU7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZSAob2JqZWN0LCBwcmVmaXgpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKG9iamVjdCkubWFwKGZ1bmN0aW9uIChrZXkpIHtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3Rba2V5XTtcbiAgICBpZiAocHJlZml4KSB7XG4gICAgICBrZXkgPSBwcmVmaXggKyAnWycgKyBrZXkgKyAnXSc7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gc2VyaWFsaXplKHZhbHVlLCBrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuICB9KS5qb2luKCcmJyk7XG59XG5cbmZ1bmN0aW9uIHBsdXJhbCAoc2luZ3VsYXJGb3JtKSB7XG4gIHJldHVybiBzaW5ndWxhckZvcm0gKyAncyc7XG59XG5tb2R1bGUuZXhwb3J0cyA9IE07XG4iXX0=

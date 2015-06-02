!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.M=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var M = require('./url-mapping.js');

window.angular.module('mmodule', []).factory('mfactory', ['$resource', function ($resource) {
  M.buildResource = function () {
    return $resource(this.urlFragments.join('/'), null, {
        'update': { method:'PUT' },
        'save': {
          method: 'POST',
          headers: {'Content-Type': 'application/json'}
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvaHN0YXJpa292L3dvcmtzcGFjZS9tL3NyYy9tLWZvci1hbmd1bGFyLmpzIiwic3JjL3VybC1tYXBwaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBNID0gcmVxdWlyZSgnLi91cmwtbWFwcGluZy5qcycpO1xuXG53aW5kb3cuYW5ndWxhci5tb2R1bGUoJ21tb2R1bGUnLCBbXSkuZmFjdG9yeSgnbWZhY3RvcnknLCBbJyRyZXNvdXJjZScsIGZ1bmN0aW9uICgkcmVzb3VyY2UpIHtcbiAgTS5idWlsZFJlc291cmNlID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiAkcmVzb3VyY2UodGhpcy51cmxGcmFnbWVudHMuam9pbignLycpLCBudWxsLCB7XG4gICAgICAgICd1cGRhdGUnOiB7IG1ldGhvZDonUFVUJyB9LFxuICAgICAgICAnc2F2ZSc6IHtcbiAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICBoZWFkZXJzOiB7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ31cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8vIGV4dGVuZCBnZXQgdG8gbWFrZSBzaW5nbGV0b25zXG4gIH1cbiAgcmV0dXJuIE07XG59XSlcblxubW9kdWxlLmV4cG9ydHMgPSBNO1xuIiwidmFyIG15R2xvYmFsO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgbXlHbG9iYWwgPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IHR5cGVvZiB1bmRlZmluZWQpIHtcbiAgbXlHbG9iYWwgPSBnbG9iYWw7XG59IGVsc2Uge1xuICB0aHJvdyAnZ2xvYmFsIHVua25vd24gJ1xufVxuXG52YXIgTSA9IGZ1bmN0aW9uIChtYXliZUFQSSkge1xuICB2YXIgbSA9IE9iamVjdC5jcmVhdGUoTSk7XG4gIG0uYXBpID0gbWF5YmVBUEkgfHwge307XG4gIG0uY2FjaGUgPSB7fTtcbiAgTS5tYXBPdmVyUmVzb3VyY2VUeXBlcyhmdW5jdGlvbiAocmVzb3VyY2VUeXBlKSB7XG4gICAgZGVjb3JhdGVXaXRoUGx1cmFsRm9ybU1ldGhvZHMocmVzb3VyY2VUeXBlLCBtKTtcbiAgICBkZWNvcmF0ZVdpdGhTaW5ndWxhckZvcm1NZXRob2RzKHJlc291cmNlVHlwZSwgbSk7XG4gIH0sIG0pO1xuICBNLmluaXRpYWxpemF0aW9uU3Vic2NyaWJlcnMubWFwKGZ1bmN0aW9uIChmKSB7ZihtKTt9KTtcbiAgcmV0dXJuIG07XG59O1xuXG5NLm1hcE92ZXJSZXNvdXJjZVR5cGVzID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBtKSB7XG4gIG0gPSBtIHx8IHRoaXM7XG4gIHJldHVybiBPYmplY3Qua2V5cyhtLmFwaS5yZXNvdXJjZXMpLm1hcChjYWxsYmFjayk7XG59O1xuTS5pbml0aWFsaXphdGlvblN1YnNjcmliZXJzID0gW107XG5cbmZ1bmN0aW9uIGRlY29yYXRlV2l0aFNpbmd1bGFyRm9ybU1ldGhvZHMgKHJlc291cmNlLCBtKSB7XG4gIG1bcmVzb3VyY2VdID0gZnVuY3Rpb24gKG1heWJlSWQpIHtcbiAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMgPT09IGdsb2JhbCA/IG0gOiB0aGlzKTtcblxuICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcmVzb3VyY2VdKTtcbiAgICBzdGF0ZS5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZTtcblxuICAgIGZ1bmN0aW9uIGFwcGVuZElkIChpZCkge1xuICAgICAgc3RhdGUuaWQgPSBpZDtcbiAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKGlkKTtcbiAgICB9XG5cbiAgICB2YXIgc3RyYXRlZ3kgPSB7XG4gICAgICBudW1iZXI6IGFwcGVuZElkLFxuICAgICAgc3RyaW5nOiBhcHBlbmRJZCxcbiAgICAgIHVuZGVmaW5lZDogZnVuY3Rpb24gKCkgey8qIGZhbGwgdGhyb3VnaCAqL31cbiAgICB9IFt0eXBlb2YgbWF5YmVJZF0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICBzdHJhdGVneShtYXliZUlkKTtcblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZEFyZ3VtZW50ICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBzdHJpbmcgb3IgYSBudW1iZXIgaWQuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBkZWNvcmF0ZVdpdGhQbHVyYWxGb3JtTWV0aG9kcyAocmVzb3VyY2UsIG0pIHtcbiAgdmFyIHBsdXJhbEZvcm0gPSBwbHVyYWwocmVzb3VyY2UpO1xuICBtW3BsdXJhbEZvcm1dID0gZnVuY3Rpb24gKG1heWJlUXVlcnkpIHtcbiAgICB2YXIgc3RhdGUgPSBPYmplY3QuY3JlYXRlKHRoaXMgPT09IGdsb2JhbCA/IG0gOiB0aGlzKTtcblxuICAgIHN0YXRlLnVybEZyYWdtZW50cyA9IChzdGF0ZS51cmxGcmFnbWVudHMgfHwgW20uYXBpLnByZWZpeF0pLmNvbmNhdChbcGx1cmFsRm9ybV0pO1xuICAgIHN0YXRlLnJlc291cmNlVHlwZSA9IHJlc291cmNlO1xuICAgIHN0YXRlLmlzUGx1cmFsID0gdHJ1ZTtcblxuICAgIHZhciBzdHJhdGVneSA9IHtcbiAgICAgIG9iamVjdDogZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgICAgIHN0YXRlLnVybEZyYWdtZW50cy5wdXNoKCc/JyArIHNlcmlhbGl6ZShxdWVyeSkpO1xuICAgICAgfSxcbiAgICAgIHVuZGVmaW5lZDogZnVuY3Rpb24gKCkgey8qIGZhbGwgdGhyb3VnaCAqL31cbiAgICB9IFt0eXBlb2YgbWF5YmVRdWVyeV0gfHwgdGhyb3dJbnZhbGlkQXJndW1lbnQ7XG5cbiAgICBzdHJhdGVneShtYXliZVF1ZXJ5KTtcblxuICAgIGZ1bmN0aW9uIHRocm93SW52YWxpZEFyZ3VtZW50ICgpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVGhpcyBmdW5jdGlvbiBvbmx5IGFjY2VwdHMgYSBwbGFpbiBvbGQgamF2YXNjcmlwdCBxdWVyeSBvYmplY3QuJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0YXRlO1xuICB9O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemUgKG9iamVjdCwgcHJlZml4KSB7XG4gIHJldHVybiBPYmplY3Qua2V5cyhvYmplY3QpLm1hcChmdW5jdGlvbiAoa2V5KSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W2tleV07XG4gICAgaWYgKHByZWZpeCkge1xuICAgICAga2V5ID0gcHJlZml4ICsgJ1snICsga2V5ICsgJ10nO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnb2JqZWN0Jykge1xuICAgICAgcmV0dXJuIHNlcmlhbGl6ZSh2YWx1ZSwga2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcbiAgfSkuam9pbignJicpO1xufVxuXG5mdW5jdGlvbiBwbHVyYWwgKHNpbmd1bGFyRm9ybSkge1xuICByZXR1cm4gc2luZ3VsYXJGb3JtICsgJ3MnO1xufVxubW9kdWxlLmV4cG9ydHMgPSBNO1xuIl19

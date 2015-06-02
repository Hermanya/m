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

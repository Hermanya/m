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

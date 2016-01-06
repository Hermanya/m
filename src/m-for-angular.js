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

var Backbone = require('../vendor/backbone.js');
var M = require('./main.js');

var cache = {},
typeToModel = {};

module.exports = M;

decorateWithBackboneMethods(M);

function decorateWithBackboneMethods (M) {
  var key;
  for (key in new Backbone.Model()) {
    decorateWithKey(key, M);
  }
  for (key in new Backbone.Collection()) {
    decorateWithKey(key, M);
  }
}

function decorateWithKey(key, M) {
  if (M[key]) {
    return;
  }

  M[key] = function proxy () {
    var model;
    this.url = this.urlFragments.join('/');
    if (!this.isPlural) {
      model = getModel(this);
    } else {
      model = getCollection(this);
    }
    return model[key].apply(model, arguments);
  };
}

var prefix; // TODO somehow get rid of this, currently used in createCollection

M.apiListeners.push(function defineModels (m) {
  prefix = m.api.prefix;
  m.mapOverResourceTypes(function (resourceType) {
    typeToModel[resourceType] = Backbone.Model.extend({
      urlRoot: m.api.prefix + '/' + resourceType,
      validate: function (/* nextAttributes */) {
        return true;
      }
    });
  });
});

function getModel (base) {
  return cache[base.url] || createModel(base);
}

function createModel (base) {
  cache[base.url] = new typeToModel[base.resourceType]({
    id: base.id
  });
  return cache[base.url];
}

function getCollection (base) {
  return cache[base.url] || createCollection(base);
}

function createCollection (base) {
  cache[base.url] = new (Backbone.Collection.extend({
    url: function () {
      return base.url;
    },
    model: function (attributes) {
      var model, key = prefix + '/' + base.resourceType + '/' + attributes.id; 
      if (attributes.id) {
        model = cache[key];
      }
      if (model) {
        return model;
      } else {
        model = typeToModel[base.resourceType](attributes);
        cache[key] = model;
        return model;
      }
    }
  }))();
  return cache[base.url];
}

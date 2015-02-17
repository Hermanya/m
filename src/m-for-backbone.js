define([
  'backbone',
  'url-mapping'
], function (Backbone, M) {
  var typeToModel = {};

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
      if (key === 'toBackboneModel') {
        return model;
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
          var attrs;
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

            var otherModel = m.cache[m.api.prefix + '/' + resourceType + '/' + attrs.id];
            if (otherModel) {
              this.tieTo(otherModel);
            } else {
              m.cache[m.api.prefix + '/' + resourceType + '/' + attrs.id] = this;
            }
          }

          if (!options.stopMyPropagation) {
            this.modelsTiedWith.forEach(function (model) {
              model.set(attrs, {stopMyPropagation: true});
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
    m.cache[m.url] = new typeToModel[m.resourceType]({
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
        var model, key = prefix + '/' + m.resourceType + '/' + attributes.id;
        if (attributes.id) {
          model = m.cache[key];
        }
        if (model) {
          model.set(attributes);
          return model;
        } else {
          model = new typeToModel[m.resourceType](attributes);
          m.cache[key] = model;
          return model;
        }
      }
    }))();
    return m.cache[m.url];
  }
  return M;
});

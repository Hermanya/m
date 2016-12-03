  var Backbone = require('backbone');
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
    decorateWithKey('model', M);
    decorateWithKey('collection', M);
  }

  function decorateWithKey(key, M) {
    M[key] = M[key] || function proxy () {
      var model;
      this.url = this.urlFragments.join('/');
      if (key === 'model') {
        return getModel(this);
      } else if (key === 'collection') {
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
        validate: function (/* nextAttributes */) {
          if (false) {
            return 'an error';
          }
        },
        saveProperties: function (attributes) {
          var ownAttributes = attributes || this.attributes;
          return Backbone.ajax({
            type: 'PUT',
            url: this.url(),
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(ownAttributes)
          });
        },
        saveCustomAttributes: function () {
          var url = this.url();
          if (!/\d/.test(url.slice(-1))) {
            url += '/' + this.id;
          }
          return Backbone.ajax({
            type: 'POST',
            url: url + '/attributes',
            contentType: "application/json;charset=utf-8",
            data: JSON.stringify(this.get('attributes'))
          });
        },
        saveEverything: function () {
          return Backbone.$.when(
            this.saveProperties(),
            this.saveCustomAttributes()
          );
        },
        modelsTiedWith: [],
        tieTo: function (otherModel) {
          otherModel.modelsTiedWith.forEach(function (indirectModel) {
            this.modelsTiedWith.push(indirectModel);
            indirectModel.modelsTiedWith.push(this);
          }.bind(this));
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
        get: function(key) {

          var _attributeMappings = m.api.resources[resourceType]._attributeMappings;
          if (_attributeMappings && _attributeMappings[key]) {
            var attribute = this.get('attributes') && this.get('attributes').filter(function (attr) {
              return attr.name === _attributeMappings[key];
            })[0];
            var value;
            if (attribute) {
              try {
                value = JSON.parse(attribute.value);
              } catch (_) {
                value = attribute.value;
              }
            }
            return value;
          }

          var _shortcutMappings = m.api.resources[resourceType]._shortcutMappings;
          if (_shortcutMappings && _shortcutMappings[key]) {
            var value = _shortcutMappings[key].reduce(function(obj, key) {
              return obj[key];
            }, this.attributes);
              try {
                return JSON.parse(value);
              } catch (_) {
                return value;
              }
          }

          return Backbone.Model.prototype.get.call(this, key);
        },
        set: function(key, val, options) {
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

          if (attrs.cid) {
            attrs = attrs.attributes || {};
          }

          var _attributeMappings = m.api.resources[resourceType]._attributeMappings;
          if (_attributeMappings) {
            Object.keys(_attributeMappings).forEach(function (attributeMapping) {
              var attributeName = _attributeMappings[attributeMapping];
              if (attrs[attributeMapping] !== undefined) {
                if (!this.has('attributes')) {
                  this.set('attributes', [], {silent: true});
                }
                var attributes = this.get('attributes').filter(function (attribute) {
                  return attribute.name !== attributeName;
                });

                var value = attrs[attributeMapping];
                if (typeof value !== 'string') {
                  value = JSON.stringify(value);
                }
                attributes.push({
                  name: attributeName,
                  value: value,
                  scope: options.scope
                });
                delete attrs[attributeMapping];

                this.set('attributes', attributes);
              }
            }.bind(this));
          }



          var _shortcutMappings = m.api.resources[resourceType]._shortcutMappings;
          if (_shortcutMappings && _shortcutMappings[key]) {
            attrs = Object.keys(attrs).reduce(function(result, key) {
              if (_shortcutMappings[key]) {
                _shortcutMappings[key].reduce(function(parent, child, index) {
                  if (index === _shortcutMappings[key].length - 1) {
                    var value = attrs[key];
                    if (typeof value !== 'string') {
                      value = JSON.stringify(value);
                    }
                    parent[child] = value;
                  } else {
                    if (parent[child] === undefined) {
                      parent[child] = {};
                    }
                    return parent[child];
                  }
                }.bind(this), this.attributes);
              } else {
                result[key] = attrs[key];
              }
              return result;
            }.bind(this), {});
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
    var id = Number(m.urlFragments.slice(-1)[0]);
    if (isNaN(id)) {
      id = undefined;
    }
    m.cache[m.url] = new modelConstructorsPerType[m.resourceType]({
      id: id
    });
    m.cache[m.url].url = function () {
      return m.url;
    };
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
          model.urlRoot = m.api.prefix + '/' + m.resourceType;
          m.cache[key] = model;
          return model;
        }
      }
    }))();
    return m.cache[m.url];
  }
  module.exports = M;

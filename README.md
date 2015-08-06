Request for Comments
----

###This project solves problems of
###### boilerplate
```javascript
// for example you have collection/users.js
return Backbone.Collection.extend({
  url: '/api/users',
});

// and collection/things.js
return Backbone.Collection.extend({
  url: '/api/things'
});

// and model/thing.js
return Backbone.Model.extend({
  url: '/api/thing'
});

// file-that-uses-things.js
var Things = require('./collection/things.js'),
  things = new Things();
  
// file-that-uses-thing.js
var Things = require('./model/things.js'),
  things = new Thing({
    id: maybeId
  });
```
You get the idea, this is called boilerplate. This project simplifies your model layer at the cost of flexibility in terms of custom code.
```javascript
// api.js
return new M({
  prefix: '/api',
  resources: {
    user: 'any',
    thing: 'any' // model/collection defenition
  }
})

// file-that-uses-things.js
var api = require('./api.js'),
  things = api.things().collection(); // returns an instance

// file-that-uses-thing.js
var api = require('./api.js'),
  things = api.thing(maybeId).model();

```
###### synchronisation and singleton management
```javascript
// usually you would have a manager kind of thing, that would keep track of your instances
// manager.js
var Things = require('./collection/things.js'),
  things = new Things();
return {
  things: things
};
// file-that-uses-things.js
var manager = require('./manager.js'),
  things = manager.things;
// file-that-uses-thing.js
var manager = require('./manager.js'),
  things = manager.things,
  thing = things.find(function (thing) {
    return thing.id === maybeId;
  }); 
```
Regarding that last part, `things` may not be up to date and have no such item. If you create a separate model, but then there is again the sync question. It's a slippery slope. This project manages sigletons for you.
```javascript
// file-that-uses-things.js
var api = require('./api.js'),
  things = api.things().collection();

// file-that-uses-thing.js
var api = require('./api.js'),
  thing = api.thing(maybeId).model();
```
If `things` has an item with such id, then it would be the same reference. If `things` would then be fetched, and got the new thing, it would be the same reference. 
###### schema mappings
If you are uncofortable with your schema, because it involves
- odd to javascript naming conventions `like_this` or
- `it.is.very.unnecessary.deeply.nested` or
- `it['com.this.like.gems.has']` or
- it has `abbrs` instead of readable `abbreviations`
```json
GET /api/things/1
[{
  "id": 1,
  "integrated_services": [],
  "details": {
    "fullName": "thingie",
    "prc": 0.99
  }
}]
```
in Backbone you would
```javascript
// and model/thing.js
return Backbone.Model.extend({
  url: '/api/thing',
  parse: function (object) {
    return {
      price: object.details.prc,
      name: object.details.fullName,
      integratedServices: object.integrated_services;
    };
  } // yet it does not solve the problem of converting it backwards for update
});

// and collection/things.js
var Thing = require('./model/thing.js');
return Backbone.Collection.extend({
  url: '/api/things',
  model: Thing
}); // now you have to mention your custom model, because it's not generic
```
Or you could just
```javascript
// api.js
return new M({
  prefix: '/api',
  resources: {
    user: {
      _shortcutMappings: {
        price: ['details', 'prc'],
        name: ['details', 'name'],
        integratedServices: ['integrated_services']
      }
    },
    thing: 'any'
  }
})
```
This will intercept all `get`s/`set`s and correct the keys.

###Features

- models with defined ids are singletons
- once id changes (ex. *current* user is fetched) the model will be tied to an existing model with same id
- collections also point to singleton models, thus sync is free
- sort of type validation
- adaptation to other (than backbone) framework's models is possible

###How to Use

```javascript
// m-for-my-api.js
define(['m-for-backbone'], function (m) {
  return M({
    prefix: '/rest/v37',
    resources: {
      account: 'any',
      group: 'array of users',
      user: {
        id: 'number',
        name: 'string',
        email: 'email',
        attributes: 'array of objects',
        _attributeMappings: {
          language: 'com.m.lang'
        },
        _shortcutMappings: {
          isAdmin: ['association', 'flags', 'com.m.administrator']
        }
      }

    }
  });
});

```
```javascript
// current-group-mvwhaterver.js
var m = require('m-for-my-api.js');
var usersInMyGroup = m.group().users({limit: 10}).collection();
```
```javascript
// selected-user-mvwhaterver.js
var m = require('m-for-my-api.js');
var user = m.user(selectedId).model();
```
```javascript
// current-user-mvwhaterver.js
var m = require('m-for-my-api.js');
var me = m.user().model();
me.set('language', 'ru')
me.set('isAdmin', true)
//  {
//    id: 1,
//    name: 'Herman Starikov',
//    attributes: [{
//      name: 'com.m.lang',
//      value: 'ru'
//    }],
//    association: {
//      flags: {
//        'com.m.administrator': 'true'
//      }
//    }
//  }
```

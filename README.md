Request for Comments
----

###Features

- models with defined ids are singletons
- once id for the *current* model is defined (ex. on fetch), the model will be tied to the model with same id, if it's defined
- collections also point to singleton models, thus sync is free
- sort of type validation
- adaptation to other framework's model is posible

###How to Use

```javascript 
// m-for-my-api.js
define(['m-for-backbone'], function (m) {
  return M({
    user: {
      id: 'number',
      name: 'string',
      attributes: 'array of objects',
      prototype: 'uxp-entity-with-attributes'
    },
    group: 'any'
  });
});

```
```javascript
// current-user-mvwhaterver.js
var m = require('m-for-my-api.js');
var me = m.user().toBackboneModel();
```
```javascript
// current-group-mvwhaterver.js
var m = require('m-for-my-api.js');
var usersInMyGroup = m.group().users({limit: 10}).toBackboneCollection();
```
```javascript
// selected-user-mvwhaterver.js
var m = require('m-for-my-api.js');
var user = m.user(selectedId).toBackboneModel();
```

Request For Comments
----

##Features
- models with defined ids are singletons
- once id for the *current* model is defined (ex. on fetch), the model will be tied to the model with same id, if it's defined
- collections also point to singleton models, thus sync is free
- sort of type validation
- adaptation to other framework's model is posible

##How to use

m-for-my-api.js
```javascript 
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

current-user-mvwhaterver.js
```javascript
var m = require('m-for-my-api.js');
var me = m.user().toBackboneModel();
```

current-group-mvwhaterver.js
```javascript
var m = require('m-for-my-api.js');
var usersInMyGroup = m.group().users({limit: 10}).toBackboneCollection();
```

selected-user-mvwhaterver.js
```javascript
var m = require('m-for-my-api.js');
var user = m.user(selectedId).toBackboneModel();
```

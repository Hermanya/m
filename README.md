Request for Comments
----

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
        attributes: 'array of objects'
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
//  {
//    id: 1,
//    name: 'Herman Starikov',
//    attributes: [{
//      name: 'com.m.lang',
//      value: 'ru'
//    }],
//    language: 'ru'
//  }
```

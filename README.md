Request For Comments
----

> the M of Model View Controller

> the S of Store View Action Dispatcher

> when it's all RESTful 

#Client
```javascript

var m = require('m.js')

m.user.id(2).groups.get().then(/**/)
m('get user ' + 2 + ' groups').then(/**/)
m(`get user #{2} groups`).then(/**/) // ES6
m.get('user', 2, 'groups').then(/**/)
m.user.id(2).groups.whenUpdated(/**/)
m.get(m.user.id(2, 'groups')).thenAndWhenUpdated(/**/)
```
- is lazy (makes request only when `get` or others called)
- returns a promise
- supports currying
- *offline second*: hoodie-style `localStorage` or `WebSQL` fallback

--------------------------------------

##Looks even nicer with local variables
```javascript
import {get, user, users, groups} from 'm.js'

get( user.id(2).groups ).then(/**/)
get( users({email: 'herman@uxp'}) ).then(/**/) // any execution by `get` of whatever triggers `whenUpdated`
users({email: 'herman@uxp'}).whenUpdated(/**/) // listen to update events
get( users({email: 'herman@uxp'}) ).thenAndFromNowOnWhenUpdated(/**/) // or you can do both
```

And in the perfect world it would be `get $ user {email: 'herman@uxp'}`

#How would the client know about all these entities?
##Either hardcode on the client
```javascript
import m from 'm.js';
function main () {
  m.collections = ['users' /*implied singular user*/, {singular: 'group', plural: 'groups'}]
  m.urlPrefix = 'platform/rest/37/'
  m.isBackendSupported = false // true by default, otherwise local persistance only 
  // rest of your program
}
```
##Or support on the backend
*If only JSON supported comments*
>`GET` /api
```json
{
  "urlPrefix": "platform/rest/37/",
  "type": ["json", "xml", "yaml"],
  "collections": [{
    "name": "users", // or "plural": "users"
    "singular": "user", // or "singular": implied name.slice(0,-1)
    "properties": {
      "favoriteFood": "array of strings", // "[string]"
      "age": "number", // or  "0 < integer < 100"
      "email": "email", // validate known datatypes
      "avatar": "image url 100x100", // size is good for mocking
      "map": { "key": "string < 20", "anotherKey": "boolean"}
    },
    "relations" : {
      "users": [] // for example they follow users from this list
    },
    "restrictions": {
      "write": "self",
      "request for friendship": "everybody"
      "read": {
        "users": [1, 2, 3]
      }
    }
  }, "account", // optional scheme
  "data/groups.json"] // import definition from json
}
```

#Speaking of the backend

It would be weird if you would not want to generate your backend based on a configuration like that.

- generating boilerplate handlers and validators
- generating mocks for known datatypes (like email) for development
- support new datatypes (simply provide your mock function)
- client side validation based on the same scheme

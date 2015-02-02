var M = require('../src/backbone-m-for-uxp.js');

describe('Model', function () {

  var m,
    api = {
      prefix: '/rest/v1',
      resources: {
        user: {
          id: 'integer',
          displayName: 'string',
          attributes: 'array of objects'
        },
        group: 'any'
      }
    },
    query = {limit: 2, offset: 4};

  beforeEach(function () {
    m = M.create(api);
  });

  it ('user object', function () {
    expect(m.user().url()).toEqual(api.prefix + '/user');
    expect(m.user(2).url()).toEqual(api.prefix + '/user/2');
  });

  it ('all groups related to user with certain id', function () {
    expect(m.user(2).groups().url()).toEqual(api.prefix + '/user/2/groups');
  });

  it ('limited number of groups related to user with certain id', function () {

    expect(m.user(2).groups(query).url()).toEqual(api.prefix + '/user/2/groups/?limit=2&offset=4');
  });

  it ('summons the devil', function () {
    expect(m.user().fetch).toBeTruthy();
    expect(m.user(2).groups({}).url()).toEqual(api.prefix + '/user/2/groups/?');
  });
});

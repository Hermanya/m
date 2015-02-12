var M = require('../src/backbone-m-for-uxp.js');

describe('Model', function () {

  var m,
    api = {
      prefix: 'http://localhost:8000/csr/rest/v37/runas/0',
      resources: {
        user: {
          id: 'integer',
          displayName: 'string',
          attributes: 'array of objects'
        },
        group: 'any',
        account: 'any'
      }
    },
    query = {limit: 2, offset: 4};

  beforeEach(function () {
    m = new M(api);
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

  it ('creates model', function () {
    var klaus = m.user(1101).toBackboneModel();
    console.log(klaus.url())
    klaus.fetch().then(function () {
      expect(klaus.get('displayName')).toEqual('Klaus Kesseler');
    });
  });
});

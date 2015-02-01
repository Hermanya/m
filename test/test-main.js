var m = require('./../src/main.js');

describe('validation', function () {
  beforeEach(function () {
    m.init({
      prefix: '/rest/v1',
      resources: {
        user: {
          id: 'integer',
          name: 'string',
          age: 'integer'
        }
      }
    });
  });

  it ('user with certain id', function () {
    expect(m.user(2).url).toEqual('/user/2');
  });
  it ('me', function () {
    expect(m.user.url).toEqual('/user');
    expect(m.user.get).toBeTruthy();
  });
  it ('my users', function () {
    expect(m.user.users.url).toEqual('/user/users');
    expect(m.user.users({limit: 2}).get).toBeTruthy();
  });
  it ('limited number of users related to user with certain id', function () {
    var query = {limit: 2};
    expect(m.user(2).users(query).url).toEqual('/user/2/users');
    expect(m.user(2).users(query).data).toEqual(query);
  });
  it ('all users related to user with certain id', function () {
    expect(m.user(2).users.url).toEqual('/user/2/users');
    expect(m.user(2).users.data).toEqual(undefined);
  });
  it ('user object', function () {
    var me = {
      id: 2,
      name: 'Herman',
      age: 19
    };
    expect(m.user(me).url).toEqual('/user/2');
    expect(m.user(me).data).toEqual(me);
  });
});

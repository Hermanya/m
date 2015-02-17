define(['m-for-backbone'], function (M) {
  describe('Url mapping', function () {
    var m,
    api = {
      prefix: '/rest/v37',
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
  });
});

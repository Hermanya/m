  var M = require('../src/m-for-backbone.js');
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
        account: 'any',
        association: 'any',
        discovery: 'any'
      }
    },
    query = {limit: 2, offset: 4};

    beforeEach(function () {
      m = new M(api);
    });

    it ('maps user object', function () {
      expect(m.user().model().url()).toEqual(api.prefix + '/user');
      expect(m.user(2).url()).toEqual(api.prefix + '/user/2');
    });

    it ('maps association discovery', function () {
      var socialNetworks = m.association().discovery().collection();
      expect(socialNetworks.url()).toEqual(api.prefix + '/association/discovery');
      socialNetworks.set([
        {name: 'twi'},
        {name: 'faceboo'}
      ]);
      expect(m.cache[api.prefix + '/discovery/undefined'].get('name')).toEqual('faceboo');
      expect(socialNetworks.at(0).get('name')).toEqual('twi');
      expect(socialNetworks.at(1).get('name')).toEqual('faceboo');
    });

    it ('maps all groups related to user with certain id', function () {
      expect(m.user(2).groups().url()).toEqual(api.prefix + '/user/2/groups');
    });

    it ('maps limited number of groups related to user with certain id', function () {
      expect(m.user(2).groups(query).url()).toEqual(api.prefix + '/user/2/groups/?limit=2&offset=4');
    });

    it ('maps proper ids ', function () {
      var association = m.user(2).account(1).association().model();
      expect(association.get('id')).toEqual(undefined);
      var account = m.account(34).model();
      expect(account.get('id')).toEqual(34);
    });

    it ('maps user accounts properly ', function () {
      var accounts = m.user(2).accounts().collection();
      accounts.push({
        name: 'test account',
        id: 34
      });
      expect(accounts.at(0).url()).toEqual(api.prefix + '/account/34');
    });
  });

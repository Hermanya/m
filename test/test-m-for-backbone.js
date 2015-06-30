  var M = require('../src/m-for-backbone.js');
  describe('Backbone model integration', function () {
    var m, me, myHousehold,
    api = {
      prefix: '/rest/v37',
      resources: {
        user: {
          id: 'integer',
          displayName: 'string',
          _attributeMappings: {
            language: 'com.m.lang',
            age: 'com.m.age'
          },
          _shortcutMappings: {
            isAdmin: ['association', 'flags', 'com.m.write']
          }
        },
        group: 'any',
        account: 'any'
      }
    };

    beforeEach(function () {
      m = new M(api);

      me = m.user().model();
      me.set({
        id: 1,
        name: 'Herman',
        attributes: [{
          name: 'com.m.age',
          value: '12'
        }],
        association: {
          flags: {
            'com.m.write': 'true'
          }
        }
      });

      myHousehold = m.group(1).users().collection();
      myHousehold.set({
        id: 1,
        name: 'Herman Starikov'
      }, {
        id: 2,
        name: 'Other Herman'
      });
    });

    it ('with m extends default backbone\'s methods', function () {
      expect(m.user().fetch).toBeTruthy();
      expect(m.user().groups().reset).toBeTruthy();
    });

    it ('collections take url params', function () {
      expect(m.user(2).groups({}).url()).toEqual(api.prefix + '/user/2/groups/?');
      expect(m.user(2).groups({
        limit: 5
      }).url()).toEqual(api.prefix + '/user/2/groups/?limit=5');
    });

    it('creates model', function () {
      expect(me).toBeDefined();
      expect(myHousehold).toBeDefined();
      expect(me).toEqual(myHousehold.at(0));
      expect(me.get('name')).toEqual('Herman Starikov');
      var myProfile = m.user(1).model();
      expect(me).toEqual(myProfile);
      myProfile.set('name', 'HeRmAn');
    });

    it('emits on change', function () {
      var wasEmited = false;
      myHousehold.on('change', function () {
        wasEmited = true;
      });
      me.set('name', 'Emited herman');
      expect(wasEmited).toBe(true);
    });

    it('set attribute', function () {
      expect(me.get('language')).toEqual(undefined)
      me.set('language', 'en')
      expect(me.get('language')).toEqual('en')

      expect(me.get('age')).toEqual(12)
      me.set('age', me.get('age') + 3)
      expect(me.get('age')).toEqual(15)
    });

    it('get shortcut', function () {
      expect(me.get('isAdmin')).toEqual(true)
      me.set('isAdmin', false)
      expect(me.get('isAdmin')).toEqual(false)
      me.set('isAdmin', 99)
      expect(me.attributes.isAdmin).toEqual(undefined)
      expect(me.attributes.association.flags['com.m.write']).toEqual('99')
    });

    it('get shortcut', function () {
      var jim = m.user(3).model();
      expect(jim.attributes.association).toEqual(undefined);
      jim.set('isAdmin', true);
      expect(jim.attributes.association.flags['com.m.write']).toEqual('true');
    });

  });

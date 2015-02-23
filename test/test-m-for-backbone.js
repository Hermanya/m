define(['m-for-backbone'], function (M) {
  describe('Backbone model integration', function () {
    var m, me, myHousehold,
    api = {
      prefix: '/rest/v37',
      resources: {
        user: {
          id: 'integer',
          displayName: 'string'
        },
        group: 'any',
        account: 'any'
      }
    };

    beforeEach(function () {
      m = new M(api);

      me = m.user().toBackboneModel();
      me.set({
        id: 1,
        name: 'Herman'
      });

      myHousehold = m.group(1).users().toBackboneCollection();
      myHousehold.set({
        id: 1,
        name: 'Herman Starikov'
      }, {
        id: 2,
        name: 'Other Herman'
      });
    });

    it ('summons the devil', function () {
      expect(m.user().fetch).toBeTruthy();
      expect(m.user(2).groups({}).url()).toEqual(api.prefix + '/user/2/groups/?');
    });

    it('creates model', function () {
      expect(me).toBeDefined();
      expect(myHousehold).toBeDefined();
      expect(me).toEqual(myHousehold.at(0));
      expect(me.get('name')).toEqual('Herman Starikov');
      var myProfile = m.user(1).toBackboneModel();
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
  });

});

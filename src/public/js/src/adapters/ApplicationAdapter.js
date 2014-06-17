/*
App.ApplicationAdapter = DS.Adapter.extend({
  createRecord: function () {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      reject();
    });
  },
  deleteRecord: function () {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      reject();
    });
  },
  find: function (store, type, id) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:find-' + type, id, function (user) {
        resolve(user);
      });
    });
  },
  findMany: function (store, type, ids) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:find-many-' + type, ids, function (users) {
        resolve(users);
      });
    });
  },
  findQuery: function (store, type, query) {
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:query-' + type, query, function (users) {
        resolve(users);
      });
    });
  },
  
  updateRecord: function (store, type, record) {
    var data = this.serialize(record, { includeId: true }),
        id = record.get('id');
    return new Ember.RSVP.Promise(function (resolve, reject) {
      socket.emit('api:update-' + type, id, data, function (ok) {
        reject(ok);
      });
    });
  }
});
*/
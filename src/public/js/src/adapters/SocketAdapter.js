var Promise = Ember.RSVP.Promise
  , debugS = debug('aocmulti:adapter:socket')

/**
  `DS.SocketAdapter` is an adapter that loads records from a socket api.

  @class SocketAdapter
  @namespace DS
  @extends DS.Adapter
*/
DS.SocketAdapter = DS.Adapter.extend({
  socket: null
  
  /**
    @method find
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} id
    @return {Promise} promise
  */
, find: function(store, type, id) {
    var socket = this.get('socket')
    return new Promise(function (resolve, reject) {
      debugS('store:find', type.typeKey, id)
      socket.emit('store:find', type.typeKey, id, function (err, obj) {
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

  /**
    @method findMany
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Array} ids
    @return {Promise} promise
  */
, findMany: function(store, type, ids) {
    var socket = this.get('socket')
    return new Promise(function (resolve, reject) {
      debugS('store:findMany', type.typeKey, ids)
      socket.emit('store:findMany', type.typeKey, ids, function (err, obj) {
        debugS('store:foundMany', obj)
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

  /**
    @private
    @method findAll
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} sinceToken
    @return {Promise} promise
  */
, findAll: function(store, type, sinceToken) {
    var socket = this.get('socket')
      , query

    if (sinceToken) {
      query = { since: sinceToken }
    }
    
    return new Promise(function (resolve, reject) {
      debugS('store:findAll', type.typeKey, query)
      socket.emit('store:findAll', type.typeKey, query, function (err, obj) {
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

  /**
    @private
    @method findQuery
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} query
    @param {DS.AdapterPopulatedRecordArray} recordArray
    @return {Promise} promise
  */
, findQuery: function(store, type, query, array) {
    return new Promise(function (resolve, reject) {
      debugS('store:findQuery', type.typeKey, query)
      socket.emit('store:findQuery', type.typeKey, query, function (err, obj) {
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

  /**
    @method createRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @return {Promise} promise
  */
, createRecord: function(store, type, record) {
    var socket = this.get('socket')
    return new Promise(function (resolve, reject) {
      debugS('store:createRecord', type.typeKey, record)
      socket.emit('store:createRecord', type.typeKey, record, function (err, obj) {
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

  /**
    @method updateRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @return {Promise} promise
  */
, updateRecord: function(store, type, record) {
    var socket = this.get('socket')
    return new Promise(function (resolve, reject) {
      debugS('store:updateRecord', type.typeKey, record)
      socket.emit('store:updateRecord', type.typeKey, record, function (err, obj) {
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

  /**
    @method deleteRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @return {Promise} promise
  */
, deleteRecord: function(store, type, record) {
    var socket = this.get('socket')
    return new Promise(function (resolve, reject) {
      debugS('store:deleteRecord', type.typeKey, record)
      socket.emit('store:deleteRecord', type.typeKey, record, function (err, obj) {
        if (err) reject(err)
        else resolve(obj)
      })
    })
  }

})
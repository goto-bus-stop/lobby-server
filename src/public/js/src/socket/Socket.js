var Ember = require('ember')
  , io = require('socket.io')
  , Subscription = require('./Subscription')

module.exports = Ember.Object.extend(Ember.Evented, {
  sock: null
, subscriptions: {}

, connect: function () {
    this.set('sock', io.connect(this.get('url')))
  }

, emit: function () {
    var sock = this.get('sock')
    sock.emit.apply(sock, arguments)
    return this
  }
, on: function () {
    var sock = this.get('sock')
    sock.on.apply(sock, arguments)
    return this
  }
, off: function () {
    var sock = this.get('sock')
    sock.off.apply(sock, arguments)
    return this
  }
  
, subscribe: function (channel, subCb) {
    var subscriptions = this.get('subscriptions')
      , sock = this.get('sock')
      , subscription = Subscription.create({
          sock: sock
        , channel: channel
        , subscribed: subCb || Ember.K
        , terminated: function () {
            if (--subscriptions[channel] <= 0) {
              sock.emit('unsubscribe', channel)
            }
          }
        })
    if (!subscriptions[channel]) {
      subscriptions[channel] = 1
      sock.emit('subscribe', channel, subscription.onSubscribed.bind(subscription))
    }
    else {
      subscriptions[channel]++
      subscription.onSubscribed()
    }
    return subscription
  }
})

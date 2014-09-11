var debugA = debug('aocmulti:app')
  , debugS = debug('aocmulti:socket')

var App = window.App = Ember.Application.create({
  LOG_TRANSITIONS: true          // basic logging of successful transitions
, LOG_TRANSITIONS_INTERNAL: true // detailed logging of all routing steps
})
App.set('ladders', [])

App.initializer({
  name: 'injectStoreIntoComponent'
, after: 'store'

, initialize: function (container, application) {
    container.typeInjection('component', 'store', 'store:main')
  }
})

App.PROTOCOL = 'DPRun';

App.reopen({
  // current page
  page: 'application'
, sidebarOpen: false
  
  // some sound management
, soundsCache: {}
, playSound: function (s) {
    return
    if (!this.soundsCache[s]) {
      this.soundsCache[s] = $('<audio>').attr('src', 'sound/' + s + '.wav').appendTo('body')[0]
    }
    this.soundsCache[s].play()
  }
  
, prompt: function (title, msg, type) {
    type = type || 'text';
    var inp = $.Element('input').attr('type', type)
      , ok = $.Element('button.btn.btn-primary').text('OK')
      , modal = $.Element('div.modal')
      , modalDialog = $.Element('div.modal-dialog')
      , modalContent = $.Element('<div.modal-content')
      , modalHeader = $.Element('<header.modal-header')
      , modalTitle = $.Element('<h4.modal-title').text(title)
      , modalBody = $.Element('<div.modal-body').append(msg, inp)
      , modalFooter = $.Element('<footer.modal-footer').append(ok)
    
    return new Ember.RSVP.Promise(function (resolve, reject) {
      ok.on('click', function () {
        resolve(inp.val())
        modal.remove()
      })

      modal.append(
        modalDialog.append(
          modalContent.append(
            modalHeader.append(modalTitle),
            modalBody,
            modalFooter
          )
        )
      ).appendTo('body').modal({ backdrop: false })
    })
  }
  
, notify: function (o) {
    console[o.type === 'error' ? 'error' : 'log'](o.message)
  }
  
, DPRun: function (x) {
    debugA('DPRun', x)
    var iframe = $.Element('iframe.hide').attr('src', App.PROTOCOL + '://' + x)
    iframe.appendTo('body')
    iframe.on('load', function () { iframe.remove() })
  }
  
, promisify: function (resolve, reject) {
    return function (e, val) {
      if (e) reject(e)
      else resolve(val)
    }
  }
})

// These things are going to be customizable at some point
App.SettingsController = Ember.Controller.extend({
  defaultLadder: 1
})

var Subscription = Ember.Object.extend({
  sock: null
, channel: null
, evts: []
, subscribed: function () { debugS('default subscribed callback') }
, terminated: function () { debugS('default termination callback') }
  
, init: function () {
    debugS('subscribing to ', this.get('channel'))
//    this.get('sock').emit('subscribe', this.get('channel'), this.onSubscribed.bind(this))
  }
, on: function (evt, cb) {
    debugS('subscription ' + this.get('channel') + ' event', evt)
    this.get('evts').push([ evt, cb ])
    this.get('sock').on(this.get('channel') + ':' + evt, cb)
    return this
  }
, off: function (evt, cb) {
    debugS('subscription ' + this.get('channel') + ' event removal', evt)
    var evts = this.get('evts')
      , i = evts.length
    while (i--) {
      if (evts[i][0] === evt && (!cb || evts[i][1] === cb)) {
        evts.splice(i, 1)
      }
    }
    this.get('sock').off(this.get('channel') + ':' + evt, cb)
  }
, onSubscribed: function () {
    debugS('subscribed to ', this.get('channel'))
    var sub = this.get('subscribed')
    sub && sub()
  }
, terminate: function (cb) {
    debugS('subscription termination', this.get('channel'))
    var channel = this.get('channel')
      , sock = this.get('sock')
    this.get('evts').forEach(function (evt) {
      sock.off(channel + ':' + evt[0], evt[1])
    }, this)
    var term = this.get('terminated')
    term && term()
  }
})
App.Socket = Ember.Object.extend(Ember.Evented, {
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

// socket.io
var socket = window.socket = App.Socket.create({ url: 'http://' + location.hostname + ':' + location.port })
socket.connect()

socket.on('error', function (e) {
  debugS(e.stack, e.description.stack)
})

setInterval(function reloadStyles() {
  var s = document.getElementById('mainStyle')
    , ns = document.createElement('link')
  ns.type = 'text/css'
  ns.href = s.href.replace(/\.css(\?.*)?$/, '.css?' + Math.random())
  ns.rel = 'stylesheet'
  $(ns).appendTo('head')
  setTimeout(function () {
    ns.id = 'mainStyle'
    $(s).remove()
  }, 500)
}, 5000)
define(function (require, exports, module) {

  var Ember = require('ember')
    , $ = require('jquery')
    , debug = require('debug')('aocmulti:app')
    , Socket = require('socket/Socket')

  require('helpers/jquery')
  require('helpers/helpers')

  var App = window.App = Ember.Application.create({
    LOG_TRANSITIONS: true          // basic logging of successful transitions
  , LOG_TRANSITIONS_INTERNAL: true // detailed logging of all routing steps

  , run: function () {
      this.advanceReadiness()
    }

  , Router: require('router')

  , ApplicationAdapter: require('adapters/ApplicationAdapter')

  , User: require('models/User')
  , Room: require('models/Room')
  , Mod: require('models/Mod')
  , Ladder: require('models/Ladder')
  , ChatMessage: require('models/ChatMessage')

  , ApplicationController: require('controllers/ApplicationController')
  , ChatBoxController: require('controllers/ChatBoxController')
  , GameListController: require('controllers/GameListController')
  , IndexController: require('controllers/IndexController')
  , LadderController: require('controllers/LadderController')
  , ModsController: require('controllers/ModsController')
  , OnlinePlayersController: require('controllers/OnlinePlayersController')
  , RoomController: require('controllers/RoomController')
  , SettingsController: require('controllers/SettingsController')
  , UserItemController: require('controllers/UserItemController')

  , ApplicationRoute: require('routes/ApplicationRoute')
  , IndexRoute: require('routes/IndexRoute')
  , LadderRoute: require('routes/LadderRoute')
  , ModsRoute: require('routes/ModsRoute')
  , RoomRoute: require('routes/RoomRoute')
  , LogoutRoute: require('routes/LogoutRoute')

  , ChatMessageView: require('views/ChatMessageView')
  , NumberField: require('views/NumberField')
  , RoomSummary: require('views/RoomSummary')
  , RoomView: require('views/RoomView')
  , Select: require('views/Select')
  , TextArea: require('views/TextArea')
  , TextField: require('views/TextField')
  , UserItemView: require('views/UserItemView')
  , UsernameView: require('views/UsernameView')
  , UserTooltipView: require('views/UserTooltipView')

  , ChatBoxComponent: require('components/ChatBoxComponent')
  , FilterQueryComponent: require('components/FilterQueryComponent')
  , OnlinePlayersComponent: require('components/OnlinePlayersComponent')

  })

  module.exports = App

  App.deferReadiness()

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
    
  , DPRun: function (key) {
      debug('DPRun', key)
      var iframe = $.Element('iframe.hide').attr('src', App.PROTOCOL + '://' + key)
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

  // socket.io
  var socket = window.socket = Socket.create({ url: 'http://' + location.hostname + ':' + location.port })
  socket.connect()

  socket.on('error', function (e) {
    debug('socket', e.stack, e.description.stack)
  })

  false && setInterval(function reloadStyles() {
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

})

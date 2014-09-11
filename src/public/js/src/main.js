debug.enable('*')

function require(p) {
  var x = new XMLHttpRequest()
  x.open('GET', '/js/src/' + p + '.js', false)
  x.send()
  $('<script>').html('(function(){' + x.responseText + '\n\n}())').appendTo('head')
}

[ 'app'
, 'router'
, 'adapters/SocketAdapter'
, 'adapters/ApplicationAdapter'
, 'helpers/helpers'
, 'helpers/jquery'
, 'models/User'
, 'models/Ladder'
, 'models/GameRoom'
, 'models/ChatMessage'
, 'models/Mod'
, 'routes/ApplicationRoute'
, 'routes/GameRoomRoute'
, 'routes/IndexRoute'
, 'routes/ModsRoute'
, 'controllers/ApplicationController'
, 'controllers/ChatBoxController'
, 'controllers/IndexController'
, 'controllers/GameListController'
, 'controllers/ModsController'
, 'controllers/OnlinePlayersController'
, 'controllers/GameRoomController'
, 'components/BsPanelComponent'
, 'components/ChatBoxComponent'
, 'components/OnlinePlayersComponent'
, 'views/ChatMessageView'
, 'views/GameRoomSummary'
, 'views/GameRoomView'
, 'views/NumberField'
, 'views/Select'
, 'views/TextArea'
, 'views/TextField'
, 'views/UserItemView'
, 'views/UsernameView'
, 'views/UserTooltipView'
].map(require)
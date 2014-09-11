App.Router.map(function () {
  this.route('game-room', { path: '/room/:room_id' })
  this.route('profile', { path: '/profile/:user_id' })
  this.route('mods')
  this.route('mod', { path: '/mods/:mod_id' })
  this.route('mod-install', { path: '/mods/:mod_id/install' })
  this.route('ladder', { path: '/ladders/:ladder_id' })
})

App.Router.reopen({
  location: 'auto'
})
const Steam = require('steam-web')
    , OpenIDStrategy = require('passport-openid').Strategy
    , util = require('util')

module.exports = SteamStrategy

function SteamStrategy(options, cb) {
  const steam = new Steam({ apiKey: options.apiKey, format: 'json' })
  options = merge(options, { stateless: true, providerURL: 'http://steamcommunity.com/openid' })
  OpenIDStrategy.call(this, options, function (id, profile, done) {
    steam.getPlayerSummaries({
      steamids: [ id ],
      callback: function (err, result) {
        var profile = result.response.players[0]
        var user = { username: profile.personaname }
        if (profile.loccountrycode) {
          user.country = profile.loccountrycode.toLowerCase()
        }
        cb(id, user, done)
      }
    })
  })
  this.name = 'steam'
}
util.inherits(SteamStrategy, OpenIDStrategy)

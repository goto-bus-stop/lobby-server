const Steam = require('steam-web')
    , OpenIDStrategy = require('passport-openid').Strategy
    , { inherits } = require('util')
    , assign = require('object-assign')

export default function SteamStrategy(options, cb) {
  const steam = new Steam({ apiKey: options.apiKey, format: 'json' })
  options = assign(options, { stateless: true, providerURL: 'http://steamcommunity.com/openid' })

  OpenIDStrategy.call(this, options, (id, profile, done) => {
    steam.getPlayerSummaries({
      steamids: [ id ],
      callback: (err, result) => {
        let profile = result.response.players[0]
        let user = { username: profile.personaname }
        if (profile.loccountrycode) {
          user.country = profile.loccountrycode.toLowerCase()
        }
        cb(id, user, done)
      }
    })
  })
  this.name = 'steam'
}

inherits(SteamStrategy, OpenIDStrategy)

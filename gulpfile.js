var gulp = require('gulp')
  , concat = require('gulp-concat')
  , wrap = require('gulp-wrap')
  , uglify = require('gulp-uglify')
  , rename = require('gulp-rename')

var jsBuildDir = 'src/public/js/build/'
  , jsLibDir = 'src/public/js/lib/'
  , jsSourceDir = 'src/public/js/src/'

var jsFiles = [ 'app'
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
              , 'routes/LadderRoute'
              , 'controllers/ApplicationController'
              , 'controllers/ChatBoxController'
              , 'controllers/IndexController'
              , 'controllers/GameListController'
              , 'controllers/ModsController'
              , 'controllers/OnlinePlayersController'
              , 'controllers/GameRoomController'
              , 'controllers/LadderController'
              , 'components/BsPanelComponent'
              , 'components/ChatBoxComponent'
              , 'components/OnlinePlayersComponent'
              , 'components/FilterQueryComponent'
              , 'components/UserItemComponent'
              , 'views/ChatMessageView'
              , 'views/GameRoomSummary'
              , 'views/GameRoomView'
              , 'views/NumberField'
              , 'views/Select'
              , 'views/TextArea'
              , 'views/TextField'
              , 'views/UserItemView'
              , 'views/UsernameView'
              , 'views/UserTooltipView' ].map(function (x) { return jsSourceDir + x + '.js' })

var jsLibFiles = [ 'es5-shim/es5-shim'
                 , 'debug/dist/debug'
                 , 'jquery/dist/jquery.js'
                 , 'handlebars/handlebars'
                 , 'ember/ember'
                 , 'ember-data/ember-data'
                 , 'moment/moment'
                 , 'bootstrap/dist/js/bootstrap'
                 , 'lodash/dist/lodash' ].map(function (x) { return jsLibDir + x + '.js' })

gulp.task('js:concat', function () {
  return gulp.src(jsFiles)
    .pipe(wrap('!function () {\n\n<%= contents %>\n\n}();'))
    .pipe(concat('app.js'))
    .pipe(gulp.dest(jsBuildDir))
})

gulp.task('js:package', [ 'js:concat' ], function () {
  return gulp.src(jsLibFiles.concat([ jsBuildDir + 'app.js' ]))
    .pipe(concat('app.all.js'))
    .pipe(gulp.dest(jsBuildDir))
})

gulp.task('js:ugly', [ 'js:package' ], function () {
  return gulp.src(jsBuildDir + 'app.all.js')
    .pipe(uglify())
    .pipe(rename('app.min.js'))
    .pipe(gulp.dest(jsBuildDir))
})

gulp.task('watch', function () {
  gulp.watch(jsFiles, [ 'js:concat' ])
})

gulp.task('default', ['js:concat'], function () {
  // place code for your default task here
})

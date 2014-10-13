var gulp = require('gulp')
  , amdOptimize = require('amd-optimize')
  , esnext = require('gulp-esnext')
  , concat = require('gulp-concat')
  , wrap = require('gulp-wrap')
  , uglify = require('gulp-uglify')
  , rename = require('gulp-rename')

var serverJsFiles = [ 'src/*.js', 'src/model/*.js', 'src/socket/*.js', 'src/routes/*.js' ]
  , clientJsFiles = [ 'src/public/js/src/**/*.js' ]

var serverBuildDir = 'build/'
  , clientBuildDir = 'build/public/js/'

gulp.task('es6:server', function () {
  return gulp.src(serverJsFiles)
    .pipe(esnext())
    .pipe(gulp.dest(serverBuildDir))
})

gulp.task('js:amd', function () {
  return gulp.src('src/public/js/src/**/*.js')
    .pipe(esnext())
    .pipe(wrap('define(function (require, exports, module) {\n<%= contents %>\n});\n'))
    .pipe(gulp.dest(clientBuildDir + 'amd/'))
    .on('error', console.error.bind(console))
})
gulp.task('js:concat', [ 'js:amd' ], function () {
  
})

gulp.task('js:package', [ 'js:concat' ], function () {
  return gulp.src(clientBuildDir + 'amd/**/*.js')
    .pipe(concat('app.all.js'))
    .pipe(gulp.dest(clientBuildDir))
})

gulp.task('js:ugly', [ 'js:package' ], function () {
  return gulp.src(clientBuildDir + 'app.all.js')
    .pipe(uglify())
    .pipe(rename('app.min.js'))
    .pipe(gulp.dest(clientBuildDir))
})

gulp.task('watch', function () {
  gulp.watch('src/public/js/src/**/*.js', [ 'js:amd' ])
})

gulp.task('default', ['js:concat'], function () {
  // place code for your default task here
})

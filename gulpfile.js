return /* No need right now, seems like a lot of work to get running properly :D */

var gulp = require('gulp')
  , amdOptimize = require('amd-optimize')
  , concat = require('gulp-concat')
  , wrap = require('gulp-wrap')
  , uglify = require('gulp-uglify')
  , rename = require('gulp-rename')

gulp.task('js:amd', function () {
  return gulp.src('src/public/js/**/*.js')
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

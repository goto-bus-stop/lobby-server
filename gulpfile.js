var gulp = require('gulp'),
    concat = require('gulp-concat');

var jsPaths = [ 'src/public/js/src/app.js', 'src/public/js/src/router.js', 'src/public/js/src/*/*.js' ];

gulp.task('js:concat', function () {
  return gulp.src(jsPaths)
    .pipe(concat('app.js'))
    .pipe(gulp.dest('src/public/js/build/'));
});

gulp.task('watch', function () {
  gulp.watch(jsPaths, [ 'js:concat' ]);
});

gulp.task('default', ['js:concat'], function () {
  // place code for your default task here
});
var gulp = require('gulp');
var clean = require('gulp-clean');
var jasmine = require('gulp-jasmine');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var path = {
  sources: './src/**/*.js',
  tests: './test/**/test-*.js',
  dist: './dist'
};

gulp.task('default', ['watch']);

gulp.task('clean', function() {
  return gulp.src(path.dist, {
      read: false
    })
    .pipe(clean());
});

gulp.task('bundle', ['clean'], function() {
  return browserify({
    entries: ['./src/backbone-m-for-uxp.js'],
    standalone: 'm'
  })
  .bundle()
  .pipe(source('m.js'))
  .pipe(gulp.dest(path.dist));
});

gulp.task('test', ['bundle'], function() {
  return gulp.src(path.tests)
    .pipe(jasmine({
      includeStackTrace: true
    }));
});

gulp.task('watch', ['test'], function() {
  gulp.watch(path.sources, ['test']);
  gulp.watch(path.tests, ['test']);
});

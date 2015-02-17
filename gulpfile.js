var gulp = require('gulp');
var clean = require('gulp-clean');
var path = {
  sources: './src/**/*.js',
  tests: './test/**/test-*.js',
  dist: './dist'
};

gulp.task('default', ['clean']);

gulp.task('clean', function() {
  return gulp.src(path.dist, {
      read: false
    })
    .pipe(clean());
});

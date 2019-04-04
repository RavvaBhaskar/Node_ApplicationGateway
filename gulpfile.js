const jshint = require('gulp-jshint');


gulp.task('lint', function() {
  return gulp
    .src(['gulpfile.js', 'microservices/**/*.js', 'routes/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

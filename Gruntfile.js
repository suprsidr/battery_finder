module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      dist: {
        options: {
          outputStyle: 'compressed'
        },
        files: {
          'build/js/battery-finder.min.js': 'js/main.js',
          'build/js/jquery.dataTables.min.js': 'js/vendor/jquery.dataTables.stripped.js',
         'build/js/jquery.qtip.min.js': 'js/vendor/jquery.qtip.stripped.js',
          'build/js/app.min.js': 'build/js/app.js'
        }
      }
    },

    sass: {
      options: {
        includePaths: ['css/scss/foundation']
      },
      dev: {
        files: {
          'css/main.css': 'css/scss/main.scss'
        }
      },
      dist: {
        options: {
          outputStyle: 'compressed'
        },
        files: {
          'css/main.min.css': 'css/scss/main.scss',
          'build/css/battery-finder.min.css': 'css/scss/_battery-finder.scss'
        }
      }
    },

    browserify: {
      dist: {
        files: {
          'build/js/app.js': ['js/app.js'],
        },
        options: {
        }
      }
    },

    watch: {
      grunt: { files: ['Gruntfile.js'] },

      browserify: {
        files: ['js/app.js'],
        tasks: ['browserify'],
        options: {
          livereload: true,
        }
      },

      uglify: {
        files: ['js/main.js', 'build/js/app.js'],
        tasks: ['uglify'],
        options: {
          livereload: true,
        }
      },

      sass: {
        files: 'css/scss/**/*.scss',
        tasks: ['sass'],
        options: {
          livereload: true,
        }
      },

      html: {
        files: '*.html',
        options: {
          livereload: true,
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', ['browserify', 'sass', 'uglify']);
  grunt.registerTask('default', ['build','watch']);
}
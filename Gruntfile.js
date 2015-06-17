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
          'build/js/jquery.dataTables.min.js': 'js/vendor/jquery.dataTables.js',
          'build/js/jquery.qtip.min.js': 'js/vendor/jquery.qtip.js'
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

    watch: {
      grunt: { files: ['Gruntfile.js'] },
      
      uglify: {
        files: ['js/main.js'],
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
  
  grunt.registerTask('build', ['sass', 'uglify']);
  grunt.registerTask('default', ['build','watch']);
}
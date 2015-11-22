module.exports = function(grunt) {

    var build = grunt.file.readJSON('build.json');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        build: build,
        // testing stuff
        startup: {

        },
        // emscripten build script
        emscripten: {
            test: {
                files:build.sourceFiles,
                //files:[{
                //        src: ['<%= build.sourcePath %>u3d/main.cpp']
                //    }
                //],
                target: '<%= build.outputPath %>',
                /*preJsSrcs: ['<%= build.sourcePath %>test/preInit.js'],
                postJsSrcs: ['<%= build.sourcePath %>test/postInit.js'],*/
                preloadDirectory: '<%= build.dataPath %>',
                options: {
                    home: '<%= build.emscriptenHome %>',
                    //llvm: '/usr/local/bin/',
                    includePaths: build.includePathes,
                    embind: true,
                    closure: false,
                    o: undefined,
                    g: 4, // debug level
                    llvmOpts: undefined,
                    llvmLto: undefined,
                    jcache: false,
                    memoryInitFile: false,
                    totalMemory: 256, // in MB -s TOTAL_MEMORY=X
                    memoryGrowth: false,
                    compilerOptions: { "NO_EXIT_RUNTIME":1 },
                    defines: build.compilerDefines,
                    targetExt: '.js'
                },
            }
        },
        // sass compile
        sass: {
            dist: {
                files: [{
                    expand: true,
                    cwd: '<%= build.sassSourcePath %>',
                    src: ['*.sass'],
                    dest: '<%= build.cssOutputPath %>',
                    ext: '.css'
                }
                ]
            }
        },
        // concat js files
        concat: {
            options: {
                stripBanners: true,
                banner: '/*! <%= build.project %> - v<%= build.version %> - ' +
                        '<%= grunt.template.today("yyyy-mm-dd") %> */',
                },
            dist: {
                src: [  '<%= build.sourcePath %>test/preInit.js',
                        '<%= build.outputPath %>test_data.js',
                        '<%= build.outputPath %>test.js',
                        '<%= build.sourcePath %>test/postInit.js',
                        '<%= build.sourcePath %>test/app.js'],
                dest: '<%= build.outputPath %><%= build.project %>.js',
            },
        },
        // watching changes
        watch: {
            options: {
                dateFormat: function(time) {
                    grunt.log.writeln('The watch finished in ' + time + 'ms at ' + (new Date()).toString());
                    grunt.log.writeln('Waiting for more changes...');
                },
            },
            scripts: {
                files: ['<%= build.sourcePath %>**/*.js',
                        '<%= build.sourcePath %>**/*.cpp',
                        '<%= build.sassSourcePath %>**/*.sass'],
                tasks: 'build_dev',
            },
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');

    // load custom tasks
    grunt.loadTasks('tasks');

    // Default task(s).
    grunt.registerTask('default', ['emscripten:test']);

    grunt.registerTask('deploy', ['sass:dist', 'emscripten:test', 'concat']);
    grunt.registerTask('build_dev', ['sass:dist', 'emscripten:test', 'concat']);

    grunt.registerTask('develop', ['sass:dist', 'emscripten:test', 'concat', 'watch']);
};

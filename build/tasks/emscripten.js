/*
 * grunt-emscripten
 * https://github.com/benvanik/grunt-emscripten
 *
 * Copyright (c) 2013 Ben Vanik
 * Licensed under the MIT license.
 */

'use strict';

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var temp = require('temp');
var util = require('util');

module.exports = function(grunt) {

    // execute process helper function
    function exec(command, env, callback) {
        if (typeof command != 'string') {
            command = command.join(' ');
        }
        //env = env || {};
        var exitCode = 0;
        grunt.verbose.subhead(command);
        grunt.verbose.writeln(util.format('Expecting exit code %d', exitCode));
        var child = child_process.exec(command, {
            env: env
        });
        child.stdout.on('data', function (d) { grunt.log.write(d); });
        child.stderr.on('data', function (d) { grunt.log.error(d); });
        child.on('exit', function(code) {
            if (code !== exitCode) {
                grunt.log.error(util.format('Exited with code: %d.', code));
                return callback(false);
            }
            grunt.verbose.ok(util.format('Exited with code: %d.', code));
            callback(true);
        });
    };

    // Copy files into their final locations.
    function copyIfExists(source, target, opt_options) {
        if (grunt.file.exists(source)) {
            // Source found, overwrite.
            grunt.file.copy(source, target, opt_options);
            // Delete temp file.
            fs.unlinkSync(source);
        } else if (grunt.file.exists(target)) {
            // Source not found, so delete target.
            grunt.file.delete(target);
        }
    };


    grunt.registerMultiTask('emscripten', 'Emscripten build task.', function() {
        grunt.log.writeln("starting emscripten build");

        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            home: '',
            emcc: 'emcc',
            //llvm: '/usr/local/bin/',
            llvm: undefined,
            includePaths: '',
            embind: false,
            closure: false,
            o: undefined,
            g: undefined,
            llvmOpts: undefined,
            llvmLto: undefined,
            jcache: false,
            memoryInitFile: true,
            totalMemory: 0, // in MB -s TOTAL_MEMORY=X
            memoryGrowth: false,
            compilerOptions: {},
            defines: {},
            targetExt: '.js'
        });
        //console.log(options);
        //console.log(this);

        // grab inputs and outputs.
        console.log(options.includePaths);
        var includePaths = options.includePaths || [];
        console.log(includePaths);
        var sourceFiles = [];
        this.files.forEach(function(filePair) {
            //console.log(filePair);
            grunt.log.writeln('Processing ' + filePair.src.length + ' source files.');
            var isExpandedPair = filePair.orig.expand || false;
            filePair.src.forEach(function(src) {
                //console.log(src);
                sourceFiles.push(src);
            });
        });

        var preJsFiles = grunt.file.expand(this.data.preJsSrcs || []);
        var postJsFiles = grunt.file.expand(this.data.postJsSrcs || []);
        var preloadDirectory = this.data.preloadDirectory || '';
        var embedDirectory = this.data.embedDirectory || '';
        var targetPath = this.data.target || '';
        var targetFilePrefix = path.join(targetPath, this.target);

        //TODO: add support for other output formats!! (html, bitcode etc)
        // emcc requires a '.js' on the target.
        // We spit out things side-by-side with the real target so we can swap
        // at a time.
        var tempDir = temp.path() + '/';
        fs.mkdirSync(tempDir);
        var outputFilePrefix = path.join(tempDir, path.basename(targetFilePrefix));
        grunt.log.writeln('Temporary Directory: ' + tempDir);
        grunt.log.writeln('Temporary File: ' + outputFilePrefix);

        // Construct command line.
        var cmd = [];
        cmd.push(options.emcc);
        //cmd.push('-Wno-warn-absolute-paths');
        cmd.push('-o ' + path.resolve(outputFilePrefix + options.targetExt));
        cmd.push('--save-bc ' + path.resolve(targetFilePrefix + '.bc'));
        if(options.targetExt === '.bc') {
            cmd.push('-c');
        }
        if (options.closure) {
            cmd.push('--closure 1');
        }
        if (options.g !== undefined) {
            if (typeof options.g == 'number') {
                cmd.push('-g' + options.g);
            } else if (options.g) {
                cmd.push('-g');
            }
        }
        // optimization
        if (options.o !== undefined) {
            cmd.push('-O' + options.o);
        }
        if (options.llvmOpts !== undefined) {
            cmd.push('--llvm-opts ' + options.llvmOpts);
        }
        if (options.llvmLto !== undefined) {
            cmd.push('--llvm-lto ' + options.llvmLto);
        }
        // emscripten js specific
        if (options.jcache) {
            cmd.push('--jcache');
        }
        if (options.memoryInitFile) {
            cmd.push('--memory-init-file 1');
        }
        if(options.embind) {
            cmd.push('--bind');
        }
        if(preloadDirectory.length > 0) {
            //file_packager.py does this
            //cmd.push('--preload-file ' + preloadDirectory);
        }
        if(embedDirectory.length > 0) {
            cmd.push('--embed-file ' + embedDirectory);
        }
        // pre and post javascript include
        preJsFiles.forEach(function(file) {
            cmd.push('--pre-js ' + file);
        });
        postJsFiles.forEach(function(file) {
            cmd.push('--post-js ' + file);
        });

        cmd.push('-s DEMANGLE_SUPPORT=1');

        if(options.memoryGrowth) {
            cmd.push('-s ALLOW_MEMORY_GROWTH');
        }
        if(options.totalMemory > 0) {
            cmd.push('-s TOTAL_MEMORY=' + (options.totalMemory * 1024*1024));
        }

        for (var key in options.compilerOptions) {
            var value = options.compilerOptions[key];
            var safeValue = JSON.stringify(value).replace(/"/g, '\\"');
            cmd.push('-s "' + key + '=' + safeValue + '"');
        }
        cmd.push('-DEMSCRIPTEN=1');
        cmd.push('-D__EMSCRIPTEN_=1');
        for (var key in options.defines) {
            var value = options.defines[key];
            cmd.push('-D' + key + '=' + value);
        }
        if(includePaths) {
            includePaths.forEach(function(includePath) {
                //cmd.push('-I' + path.resolve(includePath) + "/");
                cmd.push('-I' + includePath);
            });
        }
        sourceFiles.forEach(function(sourceFile) {
            cmd.push(path.resolve(sourceFile));
        });
        //cmd.push('-E');
        //cmd.push('-dM');
        console.log(cmd);

        // Setup environment.
        //TODO: add emscripten environment
        var env = null;
        if (options.llvm) {
            env = {};
            env['LLVM'] = path.resolve(options.llvm);
            grunt.log.writeln("Building: setting environment variables", env);
        }

        var done = this.async();
        if(sourceFiles.length == 0) {
            done(false);
            grunt.log.writeln("No source files");
            return;
        }

        // Execute.
        grunt.log.writeln('Running emcc to build ' + this.target + '...');
        exec(cmd, env, function(success) {


            grunt.file.mkdir(targetPath);
            copyIfExists(outputFilePrefix + options.targetExt, targetFilePrefix + options.targetExt, {
                process: function(source) {
                    grunt.log.writeln("Writing: " + targetFilePrefix + options.targetExt);
                    // Rewrite paths in the js file to be relative.
                    //var prefix = process.cwd() + '/';
                    var prefix = outputFilePrefix + '/';
                    var prefixExp = new RegExp(prefix, 'g');
                    var result = source.replace(prefixExp, '');
                    // Remove /tmp/ prefix.
                    var tempExp = new RegExp(tempDir, 'g');
                    result = result.replace(tempExp, '');
                    return result;
                }
            });
            // also copy js for html output
            if(options.targetExt === '.html') {
                copyIfExists(outputFilePrefix + '.js', targetFilePrefix + '.js', {
                    process: function(source) {
                        grunt.log.writeln("Writing: " + targetFilePrefix + '.js');
                        // Rewrite paths in the js file to be relative.
                        var prefix = process.cwd() + '/';
                        var prefixExp = new RegExp(prefix, 'g');
                        var result = source.replace(prefixExp, '');
                        return result;
                    }
                });
            }

            if(options.memoryInitFile) {
                grunt.log.writeln("Writing: " + targetFilePrefix + ".js.mem");
                copyIfExists(outputFilePrefix + '.js.mem', targetFilePrefix + '.js.mem');
            }
/*
            //FIXME: try to copy bitcode
            if(options.targetExt !== '.bc') {
                copyIfExists(outputFilePrefix + '.bc', targetFilePrefix + '.bc');
            }
*/
            if(options.targetExt === '.js') {
                copyIfExists(outputFilePrefix + '.js.map', targetFilePrefix + '.js.map', {
                    process: function(source) {
                        grunt.log.writeln("Writing: " + targetFilePrefix + ".js.map");
                        // Rewrite paths in the map file to be relative.
                        var prefix = process.cwd();
                        var prefixExp = new RegExp(prefix, 'g');
                        var result = source.replace(prefixExp, '');
                        // Remove /tmp/ prefix.
                        var tempExp = new RegExp(tempDir, 'g');
                        result = result.replace(tempExp, '');
                        return result;
                    }
                });
            }

            //copyIfExists(outputFilePrefix + '.data', targetFilePrefix + '.data');

            // Cleanup temp dir.
            fs.rmdirSync(tempDir);

            done(success);
        });

        // data file
        var dataCmd = [];
        dataCmd.push('python');
        if(options.home && options.home.length > 0) {
            dataCmd.push(options.home + 'tools/file_packager.py');
        } else {
            dataCmd.push('file_packager.py');
        }
        dataCmd.push(outputFilePrefix + '.data');
        dataCmd.push('--preload ' + preloadDirectory);
        dataCmd.push('--js-output=' + outputFilePrefix + '_data.js');
        //TODO: add closure stuff

        exec(dataCmd, null, function(success) {

            if(!success) {
                grunt.log.writeln('adsd');
            }

            copyIfExists(outputFilePrefix + '.data', targetFilePrefix + '.data');
            copyIfExists(outputFilePrefix + '_data.js', targetFilePrefix + '_data.js', {
                process: function(source) {
                    // Rewrite paths in the js file to be relative.
                    var prefix = process.cwd() + '/';
                    //var prefix = outputFilePrefix + '/';
                    var prefixExp = new RegExp(prefix, 'g');
                    var result = source.replace(prefixExp, '');
                    // Remove /tmp/ prefix.
                    var tempExp = new RegExp(tempDir, 'g');
                    result = result.replace(tempExp, '');
                    return result;
                }
            });

        });

    });
};

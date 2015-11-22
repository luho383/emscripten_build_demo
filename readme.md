# Emscripten Build Demo
Example build showing C++ and JS Interopability.  
Uses Node.JS and Express as demo server and Grunt as build system.

## Build Files:
- build/build.json: Filenames
- build/gruntfile.js: Build settings

## Compile and Run

### Install
Run
	npm install
in ./ and build/
### Build
Run 
	./build.sh
or 
	cd build
	grunt develop
### Run
Run 
	./server.sh
or
	node src/server/server.js

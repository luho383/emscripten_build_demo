/*! preInit.js - v0.0.1 - 2015-11-13 */

// emscripten configuration
var statusElement = document.getElementById('status');
var progressElement = document.getElementById('progress');
var spinnerElement = document.getElementById('spinner');

if (typeof Module === 'undefined') Module = {};

//Module['preRun'] = [];
//Module['postRun'] = [];

// runtime total memory
Module['TOTAL_MEMORY'] = 512 * (1024*1024);

Module['print'] = (function() {
      var element = document.getElementById('output');
      if (element) element.value = ''; // clear browser cache
      return function(text) {
        if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
        // These replacements are necessary if you render to raw HTML
        //text = text.replace(/&/g, "&amp;");
        //text = text.replace(/</g, "&lt;");
        //text = text.replace(/>/g, "&gt;");
        //text = text.replace('\n', '<br>', 'g');
        console.log(text);

        if(text.indexOf('Critical:') >= 0) {
            text = text + "\nStacktrace:\n"+Module.stackTrace();
        }

        if (element) {
            element.value += text + "\n";
            element.scrollTop = element.scrollHeight; // focus on bottom
        }
      };
})();

Module['printErr'] = function(text) {
      if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
      if (0) { // XXX disabled for safety typeof dump == 'function') {
        dump(text + '\n'); // fast, straight to the real console
        //stackTrace();
      } else {
        console.error(text);
      }
};

Module['canvas'] = (function() {
      var canvas = document.getElementById('canvas');

      // As a default initial behavior, pop up an alert when webgl context is lost. To make your
      // application robust, you may want to override this behavior before shipping!
      // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
      canvas.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);

      return canvas;
})();

Module['setStatus'] = function(text) {
      if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
      if (text === Module.setStatus.text) return;
      var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
      var now = Date.now();
      if (m && now - Date.now() < 30) return; // if this is a progress update, skip it if too soon
      if (m) {
        text = m[1];
        progressElement.value = parseInt(m[2])*100;
        progressElement.max = parseInt(m[4])*100;
        progressElement.hidden = false;
        spinnerElement.hidden = false;
      } else {
        progressElement.value = null;
        progressElement.max = null;
        progressElement.hidden = true;
        text = "Running";
        //if (!text) spinnerElement.style.display = 'none';
      }
      statusElement.innerHTML = text;
};

Module['totalDependencies'] = 0;

Module['monitorRunDependencies'] = function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
};

// callback when runtime is initialized (Module object)
Module['onRuntimeInitialized'] = function() {
    // load u3d modules
    for(var i = 0; i < _initCallbacks.length; ++i) {
        _initCallbacks[i]();
    }
    _initCallbacks = [];
};

/*
Module['locateFile'] = function(file) {
    return 'http://localhost:1337/js/'+file;
};
*/
Module['filePackagePrefixURL'] = 'js/';

// debug settings (chrome)
Error.stackTraceLimit = 20;

Module.setStatus('Starting (downloading...)');

window.onerror = function(event) {
    // TODO: do not warn on ok events like simulating an infinite loop or exitStatus
    Module.setStatus('Exception thrown, see JavaScript console');
    //spinnerElement.style.display = 'none';
    Module.setStatus = function(text) {
        if (text) Module.printErr('[post-exception status] ' + text);
    };
};

//JS entry points
(function() {
    //PRE INIT

})();

// namespace init
var test = {
    appInit:null,
    appTick:null,
    appExit:null
};

// private states
var _testRunning = false;
var _testInitialized = false;

var _initCallbacks = [];

// low level entry point
function _testInit() {
    console.log("_testInit()");

    for(var i = 0; i < _initCallbacks.length; ++i) {
        _initCallbacks[i]();
    }
    _initCallbacks = [];

    if(test.appInit) {
        test.appInit();
        _testInitialized = true;
    }

    if(_testInitialized) {
        _testRunning = true;
        _testLoop();
    }
}

function _testLoop() {
    if(!_testInitialized) {
        throw "fatal error";
    }

    if(Module['_nativeTick']) {
        Module['_nativeTick']();
    }

    if(test.appTick) {
        test.appTick();
    }

    if(_testRunning) {
        requestAnimationFrame(_testLoop);
    } else {
        _testExit();
    }
}

function _testForceExit() {
    _testRunning = false;
}

function _testExit() {
    console.log("_testExit()");

    if(Module['_nativeExit']) {
        Module['_nativeExit']();
    }

    if(test.appExit) {
        test.appExit();
    }
    _testInitialized = false;
}


function _testModule(callback) {
    if(_testInitialized) {
        callback();
    } else {
        _initCallbacks.push(callback);
    }
}

/*! postInit.js - v0.0.1 - 2015-11-13 */

/** global app variable */
test.app = null;

// low level application init code
test.appInit = function() {
    //TODO: init custom user application class
    Module.MyOutputFunc("Testing Binding");


}

// low level ticking
test.appTick = function() {

}

test.appExit = function() {

}

// close function
test.appClose = function() {
    _testForceExit();
}

/*! app.js - v0.0.1 - 2015-11-13 */
_testModule(function(){

    console.log(Module.TestClass);

    test.Application = Module.TestClass.extend("TestClass", {
        // __construct and __destruct are optional.  They are included
        // in this example for illustration purposes.
        // If you override __construct or __destruct, don't forget to
        // call the parent implementation!
        __construct: function() {
            this.__parent.__construct.call(this);
        },
        __destruct: function() {
            this.__parent.__destruct.call(this);
        },
        invoke: function() {
            // your code goes here
        },
    });

});


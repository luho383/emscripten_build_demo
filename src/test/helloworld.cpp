#include <iostream>
#include <initializer_list>
using namespace std;

#include <GLES2/gl2.h>
#include <GLES2/gl2ext.h>

#include <iostream>
#include <string>
#include <sstream>
#include <algorithm>
#include <iterator>
#include <vector>

#include <stdio.h>
#include <string.h>
#include <assert.h>
#include <emscripten/html5.h>
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>


// exported functions
extern "C" {
    void MyOutputFunc(const std::string output) {
        cout << output << endl;
    }

    void _nativeExit() {

    }

    void _nativeForceExit() {
        EM_ASM(_testPreExit(););
    }
}

// TestClass
struct TestClass {

    TestClass() : x(0), y("tst") {
    }

    TestClass(int x, std::string y) : x(x), y(y) {
    }

    void incrementX() {
        ++x;
    }

    int getX() const { return x; }
    void setX(int x_) { x = x_; }

    static std::string getStringFromInstance(const TestClass& instance) {
        return instance.y;
    }

    virtual void invoke(const std::string& str) {
        // default implementation
    }
private:
  int x;
  std::string y;
};




std::vector<std::string> &split(const std::string &s, char delim, std::vector<std::string> &elems) {
    std::stringstream ss(s);
    std::string item;
    while (std::getline(ss, item, delim)) {
        elems.push_back(item);
    }
    return elems;
}

std::vector<std::string> split(const std::string &s, char delim) {
    std::vector<std::string> elems;
    split(s, delim, elems);
    return elems;
}

GLint GetInt(GLenum param) {
  GLint value;
  glGetIntegerv(param, &value);
  return value;
}

// WebGL init (OpenGL ES2.0)
EMSCRIPTEN_WEBGL_CONTEXT_HANDLE context;

// native webgl context
//taken from emscripten test
int initWebGL() {
    int depth = 1;
    int stencil = 1;
    int antialias = 1;
    bool first = true;
    EmscriptenWebGLContextAttributes attrs;
    emscripten_webgl_init_context_attributes(&attrs);
    attrs.depth = 1;
    attrs.stencil = 1;
    attrs.antialias = 1;
    printf("Requesting depth: %d, stencil: %d, antialias: %d\n", depth, stencil, antialias);

    assert(emscripten_webgl_get_current_context() == 0);
    context = emscripten_webgl_create_context(0, &attrs);
    assert(context > 0); // Must have received a valid context.
    EMSCRIPTEN_RESULT res = emscripten_webgl_make_context_current(context);
    assert(res == EMSCRIPTEN_RESULT_SUCCESS);
    assert(emscripten_webgl_get_current_context() == context);

    // Let's try enabling all extensions.
    const char *extensions = (const char*)glGetString(GL_EXTENSIONS);
    std::vector<std::string> exts = split(extensions, ' ');
    for(size_t i = 0; i < exts.size(); ++i) {
        EM_BOOL supported = emscripten_webgl_enable_extension(context, exts[i].c_str());
        assert(supported);
    }

    // Try with a simple glClear() that we got a context.
    glClearColor(1.f, 0.f, 0.f, 1.f);
    glClear(GL_COLOR_BUFFER_BIT);
    unsigned char pixels[4];
    glReadPixels(0, 0, 1, 1, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
    assert(pixels[0] == 0xFF);
    assert(pixels[1] == 0);
    assert(pixels[2] == 0);
    assert(pixels[3] == 0xFF);

    int numDepthBits = GetInt(GL_DEPTH_BITS);
    int numStencilBits = GetInt(GL_STENCIL_BITS);
    int numSamples = GetInt(GL_SAMPLES);
    printf("RGBA: %d%d%d%d, Depth: %d, Stencil: %d, Samples: %d\n",
      GetInt(GL_RED_BITS), GetInt(GL_GREEN_BITS), GetInt(GL_BLUE_BITS), GetInt(GL_ALPHA_BITS),
      numDepthBits, numStencilBits, numSamples);

    if (!depth && stencil && numDepthBits && numStencilBits &&
            EM_ASM_INT_V(navigator.userAgent.toLowerCase().indexOf('firefox')) > -1) {
      numDepthBits = 0;
      cout << "Applying workaround to ignore Firefox bug https://bugzilla.mozilla.org/show_bug.cgi?id=982477" << endl;
    }
    assert(!!numDepthBits == !!depth);
    assert(!!numStencilBits == !!stencil);
    assert(!!numSamples == !!antialias);

    return 0;
}

// webgl destroy context
void destroyWebGL() {
    // Test that deleting the context works.
    EMSCRIPTEN_RESULT res = emscripten_webgl_destroy_context(context);
    assert(res == 0);
    assert(emscripten_webgl_get_current_context() == 0);
}

// exit code
void mainExit() {
    cout << "u3d native exit" << endl;

    EMSCRIPTEN_RESULT res = emscripten_webgl_make_context_current(context);
    assert(res == EMSCRIPTEN_RESULT_SUCCESS);
    assert(emscripten_webgl_get_current_context() == context);
    glClearColor(0.f, 0.f, 1.f, 1.f);
    glClear(GL_COLOR_BUFFER_BIT);


    destroyWebGL();

    emscripten_force_exit(0);
}

// callback tick from js
void mainTick() {
    EMSCRIPTEN_RESULT res = emscripten_webgl_make_context_current(context);
    assert(res == EMSCRIPTEN_RESULT_SUCCESS);
    assert(emscripten_webgl_get_current_context() == context);

    glClearColor(1.f, 0.f, 1.f, 1.f);
    glClear(GL_COLOR_BUFFER_BIT);

}

// used as init
int main(int argc, char **argv) {
	cout << "Hi!! " << endl;

    initWebGL();

    emscripten_run_script("_testInit();");

	return 0;
}

namespace emscripten {

    EMSCRIPTEN_BINDINGS(my_module) {
        function("MyOutputFunc", &MyOutputFunc);
        function("_nativeExit", &mainExit);
        function("_nativeTick", &mainTick);
    }

    struct TestWrapper : public wrapper<TestClass> {
        EMSCRIPTEN_WRAPPER(TestWrapper);

        void invoke(const std::string& str) {
            return call<void>("invoke", str);
        }
    };

    // Binding code
    EMSCRIPTEN_BINDINGS(my_class_example) {
      class_<TestClass>("TestClass")
        .allow_subclass<TestWrapper>("TestWrapper")
        .constructor<int, std::string>()
        .function("incrementX", &TestClass::incrementX)
        .property("x", &TestClass::getX, &TestClass::setX)
        .class_function("getStringFromInstance", &TestClass::getStringFromInstance)
        ;
    }
}

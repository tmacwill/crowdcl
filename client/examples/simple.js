var Simple = (function() {
    var kernel, n, tmcl;

    // kernel for adding two vectors
    var source = "__kernel void clIdentity(__global unsigned int* a, unsigned int width) { \
         unsigned int x = get_global_id(0); \
         if (x >= width) \
           return; \
        a[x] = a[x]; \
    }";

    /**
     * Constructor
     *
     */
    function Simple = function(length) {
        n = length;
        tmcl = new TMCL;
        kernel = tmcl.compile(source, 'clIdentity');
    };

    /**
     * Interrupt the addition
     *
     */
    Simple.prototype.interrupt = function() {
        alert('Interrupted!');
    };

    /**
     * Run a single iteration of the problem
     *
     */
    Simple.prototype.run = function(callback) {
        var array = new Uint32Array(n);
        var arrayHandle = tmcl.toGPU(array);

        // run kernel
        var local = 8;
        var global = Math.ceil(n / local) * local;
        vectorKernel({
            local: local,
            global: global
        }, arrayHandle, new Uint32(n));

        tmcl.fromGPU(arrayHandle, array);

        callback({
            score: n
        });
    };

    /**
     * Save results
     *
     */
    Simple.prototype.sync = function(result, crowdcl) {
        console.log(result);
    };

    return Simple;
})();

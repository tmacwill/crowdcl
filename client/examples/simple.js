var Simple = (function() {
    var kernel, n, context;

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
        context = new KernelContext;
        kernel = context.compile(source, 'clIdentity');
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
        // populate array
        var array = new Uint32Array(n);
        for (var i = 0; i < n; i++)
            array[i] = i;

        // send data to gpu
        var arrayHandle = context.toGPU(array);

        // run kernel
        var local = 8;
        var global = Math.ceil(n / local) * local;
        vectorKernel({
            local: local,
            global: global
        }, arrayHandle, new Uint32(n));

        // get data from gpu
        context.fromGPU(arrayHandle, array);

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

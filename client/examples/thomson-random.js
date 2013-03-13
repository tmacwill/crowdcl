var Thomson = (function() {
    var crowdcl, energyKernel, n, points, result, resultHandle, context;
    var energies = [];
    var min = Number.MAX_VALUE;

    // kernel for computing the energy on the sphere
    var energyKernelSource = "__kernel void clEnergyKernel(__global float* points, __global float* result, int n) { \
        unsigned int i = get_global_id(0); \
        if (i >= n * 3) \
            return; \
\
        float total = 0.0; \
        for (int j = 0; j < n; j++) \
            if (i != j) \
                total += 1.0 / sqrt(pow(points[3*i] - points[3*j], 2) + pow(points[3*i+1] - points[3*j+1], 2) + pow(points[3*i+2] - points[3*j+ 2], 2)); \
        result[i] = total / 2.0; \
    }";

    /**
     * Generate random points on a sphere
     *
     */
    var generate = function(points, n) {
        for (var i = 0; i < n; i++) {
            // generate random points in polar coordinates
            var theta = Math.random() * 2 * Math.PI;
            var u = (Math.random() * 2) - 1;

            // save x, y, and z values
            points[3 * i] = Math.sqrt(1 - u * u) * Math.cos(theta);
            points[3 * i + 1] = Math.sqrt(1 - u * u) * Math.sin(theta);
            points[3 * i + 2] = u;
        }
    };

    /**
     * Compute the total energy from a result array
     *
     */
    var energy = function(result, n) {
        var total = 0.0;
        for (var i = 0; i < n; i++)
            total += result[i];

        return total;
    };

    /**
     * Constructor
     *
     */
    var Thomson = function(nPoints) {
        n = nPoints;
        points = new Float32Array(n * 3);
        result = new Float32Array(n);

        // connect to gpu
        context = new KernelContext;
        crowdcl = new CrowdCL({
            id: 'thomson',
            server: 'http://172.16.214.139:3000',
            onBest: function(best) {
                alert('New high score! ' + best.score);
            }
        });

        // compile kernel from source
        energyKernel = context.compile(energyKernelSource, 'clEnergyKernel');
        resultHandle = context.toGPU(result);
    };

    /**
     * Display output that we have computed so far
     *
     */
    Thomson.prototype.finish = function() {
        // commit remaining changes to server
        crowdcl.commit();

        // display results
        var html = '';
        for (var i = 0; i < energies.length; i++)
            html += energies[i] + '<br />';
        html += '<br />Minimum: ' + min;
        $('#output').html(html);
    };

    /**
     * Perform on iteration by generating a random set of points
     *
     */
    Thomson.prototype.run = function() {
        // generate a new, random set of points
        generate(points, n);

        // send data to gpu
        var pointsHandle = context.toGPU(points);

        // compute energies for this configuraton
        var local = n / 2;
        var global = n;
        energyKernel({
            local: local,
            global: global
        }, pointsHandle, resultHandle, new Int32(n));

        // get energies from GPU, and check if we found a better configuration
        context.fromGPU(resultHandle, result);
        var e = energy(result, n);
        if (e < min)
            min = e;

        // remember all energies
        energies.push(e);
        crowdcl.save({
            points: points,
            score: e
        });
    };

    return Thomson;
})();

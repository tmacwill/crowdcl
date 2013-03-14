var Thomson = (function() {
    var dt, energyKernel, forceKernel, n, points, forceResult, energyResult, forceResultHandle, energyResultHandle, context;
    var energies = [];
    var min = Number.MAX_VALUE;

    // kernel for computing the energy on the sphere
    var energyKernelSource = "__kernel void clEnergyKernel(__global float* points, __global float* result, int n) { \
        unsigned int i = get_global_id(0); \
        if (i > n) \
            return; \
\
        float total = 0.0; \
        for (int j = 0; j < n; j++) \
            if (i != j) \
                total += 1.0 / sqrt(pow(points[3*i] - points[3*j], 2) + pow(points[3*i+1] - points[3*j+1], 2) + pow(points[3*i+2] - points[3*j+ 2], 2)); \
        result[i] = total / 2.0; \
    }";

    // kernel for computing the energy on the sphere
    var forceKernelSource = "__kernel void clForceKernel(__global float* points, __global float* result, int n) { \
        unsigned int i = get_global_id(0); \
        if (i > n) \
            return; \
\
        float total_x = 0.0; \
        float total_y = 0.0; \
        float total_z = 0.0; \
        for (int j = 0; j < n; j++) { \
            if (i != j) { \
                float cubed_length = pow(sqrt(pow(points[3*i] - points[3*j], 2) + pow(points[3*i+1] - points[3*j+1], 2) + pow(points[3*i+2] - points[3*j+2], 2)), 3); \
                total_x += (points[3*i] - points[3*j]) / cubed_length; \
                total_y += (points[3*i+1] - points[3*j+1]) / cubed_length; \
                total_z += (points[3*i+2] - points[3*j+2]) / cubed_length; \
            } \
        } \
\
        result[3*i] = total_x / 2.0; \
        result[3*i+1] = total_y / 2.0; \
        result[3*i+2] = total_z / 2.0; \
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
        forceResult = new Float32Array(n * 3);
        energyResult = new Float32Array(n);

        // connect to gpu
        try {
            context = new KernelContext;

            // compile kernel from source
            energyKernel = context.compile(energyKernelSource, 'clEnergyKernel');
            forceKernel = context.compile(forceKernelSource, 'clForceKernel');
            energyResultHandle = context.toGPU(energyResult);
            forceResultHandle = context.toGPU(forceResult);

            // generate an initial set of random points
            dt = 0.01;
            generate(points, n);
        }
        catch (e) { }
    };

    /**
     * Display output that we have computed so far
     *
     */
    Thomson.prototype.interrupt = function() {
        $('#output').append('<li>Minimum: ' + min + '</li>');
    };

    /**
     * Perform on iteration by generating a random set of points
     *
     */
    Thomson.prototype.run = function(callback) {
        // send data to gpu
        var pointsHandle = context.toGPU(points);

        // compute energies for this configuraton
        var local = 126;
        var global = Math.ceil(n / 126);
        energyKernel({
            local: local,
            global: global
        }, pointsHandle, energyResultHandle, new Int32(n));

        // get energies from GPU, and check if we found a better configuration
        context.fromGPU(energyResultHandle, energyResult);
        var e = energy(energyResult, n);
        if (e < min)
            min = e;

        // remember all energies
        energies.push(e);

        // compute forces for update step
        forceKernel({
            local: local,
            global: global
        }, pointsHandle, forceResultHandle, new Int32(n));

        // compute new locations for points
        context.fromGPU(forceResultHandle, forceResult);

        // update points based on forces
        for (var j = 0; j < n; j++) {
            // shift each point by the product of force and time step
            points[3 * j] += forceResult[3 * j] * dt;
            points[3 * j + 1] += forceResult[3 * j + 1] * dt
            points[3 * j + 2] += forceResult[3 * j + 2] * dt;

            // re-normalize coordinates
            var length = Math.sqrt(Math.pow(points[3 * j], 2) + Math.pow(points[3 * j + 1], 2) + Math.pow(points[3 * j + 2], 2));
            points[3 * j] = points[3 * j] / length;
            points[3 * j + 1] = points[3 * j + 1] / length;
            points[3 * j + 2] = points[3 * j + 2] / length;
        }

        // return points and energy
        callback({
            points: points,
            score: e
        });
    };

    return Thomson;
})();

var Thomson = (function() {
    var energyKernel, forceKernel, updateKernel, maxCrossKernel, maxCrossReductionKernel;
    var n, points, force, part_energy, d_force, d_energy, context, start, end, d_points;
    var energyTime = 0, forceTime = 0, maxCrossTime = 0, reductionTime = 0, updateTime = 0, iterations = 0;
    var energies = [];
    var dt = 1.0;
    var dtLimit = 0.00006;
    var min = Number.MAX_VALUE;
    var lastMeasure = Number.MAX_VALUE;
    var lastEnergy = -Number.MAX_VALUE;
    var lastFell = true;
    var oscillating = false;
    var energyTest = false;

    // TODO: Parameterize on float/double and use whatever the device supports?

    // kernel for computing the energy on the sphere
    var energyKernelSource = "__kernel void clEnergyKernel(__global float* points, __global float* result, int n) { \
        unsigned int i = get_global_id(0); \
        if (i > n) \
            return; \
\
        float total = 0.0; \
        for (int j = 0; j < n; ++j) \
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
        for (int j = 0; j < n; ++j) { \
            if (i != j) { \
                float cubed_length = pow(sqrt(pow(points[3*i] - points[3*j], 2) + pow(points[3*i+1] - points[3*j+1], 2) + pow(points[3*i+2] - points[3*j+2], 2)), 3); \
                total_x += (points[3*i  ] - points[3*j  ]) / cubed_length; \
                total_y += (points[3*i+1] - points[3*j+1]) / cubed_length; \
                total_z += (points[3*i+2] - points[3*j+2]) / cubed_length; \
            } \
        } \
\
        result[3*i  ] = total_x / 2.0; \
        result[3*i+1] = total_y / 2.0; \
        result[3*i+2] = total_z / 2.0; \
    }";

    var updateKernelSource = "__kernel void clUpdateKernel(__global float* points, __global float* force, float step_size, unsigned int n) { \
         unsigned int i = get_global_id(0); \
         if (i > n) \
            return; \
\
         /* shift each point by the product of force and time step */ \
         points[3*i    ] += force[3*i    ] * step_size; \
         points[3*i + 1] += force[3*i + 1] * step_size; \
         points[3*i + 2] += force[3*i + 2] * step_size; \
\
         /* Normalize coordinates */ \
         float length = sqrt(pow(points[3*i    ], 2) + \
                             pow(points[3*i + 1], 2) + \
                             pow(points[3*i + 2], 2)); \
         points[3*i    ] /= length; \
         points[3*i + 1] /= length; \
         points[3*i + 2] /= length; \
    }";

    var maxCrossSource = "__kernel void clMaxCrossKernel(__global float* points, __global float* force, __global float* result, unsigned int n) { \
        unsigned int i = get_global_id(0); \
        if (i > n) \
            return; \
\
        float a = points[3*i+1] * force[3*i+2] - points[3*i+2] * force[3*i+1]; \
        float b = points[3*i+2] * force[3*i+0] - points[3*i+0] * force[3*i+2]; \
        float c = points[3*i+0] * force[3*i+1] - points[3*i+1] * force[3*i+0]; \
 \
        result[i] = a*a + b*b + c*c; \
    }";

    /**
     * Generate random points on a sphere
     *
     */
    var generate = function(points, n) {
        for (var i = 0; i < n; ++i) {
            // generate random points in polar coordinates
            var theta = Math.random() * 2 * Math.PI;
            var u = (Math.random() * 2) - 1;

            // save x, y, and z values
            points[3*i    ] = Math.sqrt(1 - u*u) * Math.cos(theta);
            points[3*i + 1] = Math.sqrt(1 - u*u) * Math.sin(theta);
            points[3*i + 2] = u;
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
        force = new Float32Array(n * 3);
        part_energy = new Float32Array(n);
        maxCrossResult = new Float32Array(n);

        // connect to gpu
        try {
            context = new KernelContext;
            utils = new KernelUtils(context);

            // compile kernel from source
            energyKernel = context.compile(energyKernelSource, 'clEnergyKernel');
            forceKernel = context.compile(forceKernelSource, 'clForceKernel');
            updateKernel = context.compile(updateKernelSource, 'clUpdateKernel');
            maxCrossKernel = context.compile(maxCrossSource, 'clMaxCrossKernel');
            maxCrossReductionKernel = utils.reductionKernel(Float32Array, '(a > b) ? a : b');

            d_energy = context.toGPU(part_energy);
            d_force = context.toGPU(force);
            d_maxCrossResult = context.toGPU(maxCrossResult);
            d_points = context.toGPU(points);

            // generate an initial set of random points
            generate(points, n);
        } catch (e) {}
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
        // compute energies for this configuraton
        var local = Math.min(64, n);
        var global = n;
        start = new Date;
        energyKernel({
            local: local,
            global: global
        }, d_points, d_energy, new Int32(n));
        energyTime += (new Date) - start;

        // get energies from GPU, and check if we found a better configuration
        // context.fromGPU(d_energy, part_energy);
        // var e = energy(part_energy, n);
        // min = Math.min(min, e);
        // console.log(e);

        // compute forces for update step
        start = new Date;
        forceKernel({
            local: local,
            global: global
        }, d_points, d_force, new Int32(n));
        forceTime += (new Date) - start;

        // compute the step size
        start = new Date;
        maxCrossKernel({
            local: local,
            global: global
        }, d_points, d_force, d_maxCrossResult, new Uint32(n));
        maxCrossTime += (new Date) - start;

        // compute step size
        start = new Date;
        var maxcrossSq = maxCrossReductionKernel(d_maxCrossResult, n);
        reductionTime += (new Date) - start;
        var step_size = dt / (n * Math.pow(maxcrossSq, 0.4));

        // update points based on forces
        start = new Date;
        updateKernel({
            local: local,
            global: global
        }, d_points, d_force, new Float(step_size), new Uint32(n));
        updateTime += (new Date) - start;

        // update value for dt
        var currentMeasure = maxcrossSq;

        if (dt > dtLimit) {
            // if maxCrossSq is oscillating, decrease dt
            if (((currentMeasure < lastMeasure) != lastFell) && oscillating) {
                dt *= .90;
                oscillating = false;
            }
            else if ((currentMeasure < lastMeasure) != lastFell) {
                oscillating = true;
            }
            // if maxCrossSq is falling, increase dt
            else if (lastFell) {
                dt *= 1.01;
                oscillating = false;
            }
            else if (!energyTest) {
                lastEnergy = energy;
                energyTest = true;
            }
            // if energy is rising, drop tStep quickly
            else if (energy > lastEnergy) {
                dt *= .5;
                oscillating = false;
                energyTest = false;
            }
            // if energy is falling, increase tStep
            else {
                dt *= 1.1;
                oscillating = false;
                energyTest = false;
            }
        }

        // remember results for this run
        lastFell = currentMeasure < lastMeasure;
        lastMeasure = currentMeasure;
        ++iterations;

        if (iterations % 25 == 0) {
            console.log('Energy time: ' + (energyTime / iterations));
            console.log('Force time: ' + (forceTime / iterations));
            console.log('Max Cross time: ' + (maxCrossTime / iterations));
            console.log('Reduction time: ' + (reductionTime / iterations));
            console.log('Update time: ' + (updateTime / iterations));
        }

        // TODO: Only sync when we hit our stopping condition for the relaxation

        // return points and energy
        callback({
            //points: points,
            score: 0
        });
    };

    /**
     * Verify that an input is valid
     *
     */
    Thomson.verify = function(input) {
        return true;
    };

    return Thomson;
})();

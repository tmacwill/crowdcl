var CrowdCLient = (function() {
    // problem instance
    var crowdcl, problem, options;
    var interrupted = false;

    /**
     * Constructor
     *
     */
    var CrowdCLient = function(_problem, _options) {
        // required parameters
        if (_options.id === undefined)
            throw 'ID is not defined';
        if (_options.server === undefined)
            throw 'Server is not defined';

        // optional parameters
        if (_options.onBest === undefined)
            _options.onBest = function() {};
        if (_options.stage === undefined)
            _options.stage = 100;
        if (_options.timeout === undefined)
            _options.timeout = 300;

        // save problem and instantiate crowdcl api
        problem = _problem;
        options = _options;
        crowdcl = new CrowdCL({
            id: options.id,
            server: options.server,
            stage: options.stage,
            onBest: options.onBest
        });

        // start the first problem run
        this.resume();
    };

    /**
     * Callback to be executed when run finishes
     *
     * @param {Object} result Result of run
     *
     */
    var runCallback = function(result) {
        // allow problems to define a custom sync method
        if (problem.sync !== undefined)
            problem.sync(result, crowdcl);
        else
            crowdcl.save(result);

        // if user specified result callback, inform of result
        if (options.onResult !== undefined)
            options.onResult(result);

        // start a new run if we haven't been interrupted
        if (!interrupted)
            setTimeout(function() {
                problem.run(runCallback);
            }, options.timeout);
    };

    /**
     * Pause the execution of the problem
     *
     */
    CrowdCLient.prototype.interrupt = function() {
        // pass interrupt message to problem if applicable
        if (problem.interrupt !== undefined)
            problem.interrupt(arguments);

        interrupted = true;
    };

    /**
     * Resume the execution of the problem
     *
     */
    CrowdCLient.prototype.resume = function() {
        interrupted = false;

        // resume execution of problem
        setTimeout(function() {
            problem.run(runCallback);
        }, options.timeout);
    };

    return CrowdCLient;
})();

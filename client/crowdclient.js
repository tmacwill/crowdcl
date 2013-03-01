var CrowdCLient = (function() {
    // problem instance
    var crowdcl, idle, problem, options;
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

        // register idle timer events
        document.addEventListener('click', resetIdleTimer);
        document.addEventListener('mousemove', resetIdleTimer);
        document.addEventListener('keypress', resetIdleTimer);
        setInterval(function() {
            ++idle;
        }, 1000);

        // register close listener
        var self = this;
        window.addEventListener('beforeunload', function() {
            self.interrupt();
        });

        // start the first problem run
        this.resume();
    };

    /**
     * Reset the idle timer
     *
     */
    var resetIdleTimer = function() {
        idle = 0;
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

        // exponentially decrease the time between runs if the user remains idle
        var timeout = Math.max(100, options.timeout - Math.pow(1.2, idle));

        // start a new run if we haven't been interrupted
        if (!interrupted)
            setTimeout(function() {
                problem.run(runCallback);
            }, timeout);
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
     * Check whether or not the problem is currently interrupted
     *
     */
    CrowdCLient.prototype.interrupted = function() {
        return interrupted;
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


    /**
     * Pause the problem for a number of milliseconds, then resume
     *
     * @param {Number} milliseconds Number of milliseconds to sleep for
     *
     */
    CrowdCLient.prototype.sleep = function(milliseconds) {
        // stop the problem
        this.interrupt();

        // resume the problem after given amount of time
        var self = this;
        setTimeout(function() {
            self.resume();
        }, milliseconds);
    };

    return CrowdCLient;
})();

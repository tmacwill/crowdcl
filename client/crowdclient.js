var CrowdCLient = (function() {
    // problem instance
    var problem;

    /**
     * Constructor
     *
     */
    var CrowdCLient = function(p, maxRuns) {
        if (maxRuns === undefined)
            maxRuns = 10;
        problem = p;

        // TODO: web worker API
        for (var i = 0; i < maxRuns; i++)
            problem.run()
        problem.finish();
    };

    return CrowdCLient;
})();

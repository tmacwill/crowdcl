var CrowdCL = (function() {
    // list of states that have been saved but not committed
    var stage = [];

    /**
     * Constructor
     * @param {Object} options CrowdCL parameters, which include:
     *  - server (required): URL of the CrowdCL server to send results to
     *  - stage (optional): Size of the stage before changes will be automatically committed
     *
     */
    var CrowdCL = function(options) {
        if (options.server === undefined)
            throw 'Server is not defined';
        if (options.id === undefined)
            throw 'ID is not defined';

        this.options = options;
    };

    /**
     * Commit saved changes to the server
     *
     */
    CrowdCL.prototype.commit = function() {
        // post all results to crowdcl server
        var self = this;
        $.ajax({
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            type: 'POST',
            url: this.options.server + '/commit/' + this.options.id,
            data: JSON.stringify({ results: stage }),
            success: function(response) {
                console.log(response);
                if (response.best !== false && self.options.onBest !== undefined)
                    self.options.onBest(response.best);
            }
        });
    };

    /**
     * Save a state to the server
     *
     * @param {Object} state State to be transferred to CrowdCL server
     *
     */
    CrowdCL.prototype.save = function(state) {
        // stage this state
        stage.push(state);

        // if size of stage exceeds limit, then commit changes now
        if (this.options.stage !== undefined && stage.length >= this.options.stage)
            this.commit();
    };

    return CrowdCL;
})();

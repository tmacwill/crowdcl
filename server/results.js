var _ = require('underscore');

/**
 * Module for keeping track of the results of computations
 *
 * @param {Object} app ExpressJS app
 * @param {Object} db MongoDB connection
 *
 */
module.exports = function(app, db) {
    // receive a new result
    app.post('/commit/:id', function(request, response) {
        // get collection for results
        var collection = db.collection(request.params.id);

        // insert each result
        _.map(request.body.results, function(result) {
            collection.insert(result, {w: 1}, function(error, result) {
                if (error)
                    response.json(500, { success: false });
                else
                    response.json({ success: true });
            });
        });
    });
};

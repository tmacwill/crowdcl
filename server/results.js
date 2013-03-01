var _ = require('underscore');
var ObjectID = require('mongodb').ObjectID;

/**
 * Module for keeping track of the results of computations
 *
 * @param {Object} app ExpressJS app
 * @param {Object} db MongoDB connection
 *
 */
module.exports = function(app, db) {
    // receive a new result
    app.post('/commit/:collection', function(request, response) {
        // get collection for results
        var collection = db.collection(request.params.collection);

        // get the current best score, so we can notify client if they submitted a new best score
        var newBest = false;
        bestScore(collection, 1, function(best) {
            // insert each result
            _.map(request.body.results, function(result) {
                result.__verified = false;
                collection.insert(result, {w: 1}, function(error, r) {
                    if (error)
                        response.json(500, { success: false });
                });

                // we have found a better score, so keep track
                if (compareScores(best, result, true)) {
                    best = _.clone(result);
                    newBest = best;
                }
            });

            response.json({ success: true, best: newBest });
        }, false);
    });

    // get the best result so far
    app.get('/best/:collection', function(request, response) {
        bestScore(db.collection(request.params.collection), 1, function(best) {
            response.json(best);
        });
    });

    // view all results in a collection
    app.get('/results/:collection', function(request, response) {
        db.collection(request.params.collection).find().sort({ score: 1 }).toArray(function(error, items) {
            response.json(items);
        });
    });

    // get a single result in a collection
    app.get('/results/:collection/:id', function(request, response) {
        db.collection(request.params.collection).find({ _id: ObjectID(request.params.id) }).limit(1).toArray(function(error, items) {
            response.json(items.pop());
        });
    });
};

/**
 * Get the best score in a collection, verifying that it is valid
 *
 * @param {Object} collection Collection to search over
 * @param {Number} sort Positive if lower is better, higher is better otherwise
 * @param {Function} callback Callback function to execute with best answer
 * @param {Boolean} verify Whether or not to verify the score is best
 *
 */
var bestScore = function(collection, sort, callback, verify) {
    // verify scores by default
    if (verify == undefined)
        verify = true;

    // get minimum (or maximum) score
    collection.find().sort({ score: sort }).limit(1).toArray(function(error, items) {
        console.log(items);

        // no scores exist yet
        if (items.length == 0) {
            callback(false);
            return false;
        }

        // this score hasn't been verified yet, so do so
        var best = items.pop();
        if ((_.isUndefined(best.__verified) || !best.__verified) && verify) {
            var valid = verifyScore(best);

            // if result is invalid, then remove it and try again
            if (!valid) {
                collection.remove({ _id: ObjectID(best._id.toString()) }, {w: 1}, function(error, result) {
                    bestScore(collection, sort, callback, verify);
                });
            }

            // mark result as verified
            else {
                collection.update({ 
                    _id: ObjectID(best._id.toString()) 
                }, { $set: { __verified: true }}, {w: 1}, function(error, result) {
                    best.__verified = true;
                    callback(best);
                });
            }
        }

        else
            callback(best);
    });
};

/**
 * Compare two scores
 *
 * @param {Number} current Current best score
 * @param {Number} compare Score to compare
 * @param {Number} sort Positive if lower is better, higher is better otherwise
 * @return {Boolean} If the new score compare is better than the current best
 *
 */
var compareScores = function(current, compare, sort) {
    if (current === false)
        return true;

    if (sort)
        return (parseFloat(compare.score) < parseFloat(current.score));
    else
        return (parseFloat(compare.score) > parseFloat(current.score));
};

// TODO: abstraction for score verification
var verifyScore = function(result) {
    return true;
};

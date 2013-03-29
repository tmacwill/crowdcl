var mongo = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var _ = require('underscore');

/**
 * Constructor
 *
 */
var MongoEngine = function(host, port, database, callback) {
    var self = this;

    // connect to database
    mongo.connect('mongodb://' + host + ':' + port + '/' + database, function(error, db) {
        self.db = db;
        callback(null, self);
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
MongoEngine.prototype.best = function(collection, sort, callback, verify) {
    // verify scores by default
    var self = this;
    if (verify == undefined)
        verify = true;

    // get minimum (or maximum) score
    var dbCollection = this.db.collection(collection);
    dbCollection.find().sort({ score: sort }).limit(1).toArray(function(error, items) {
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
                dbCollection.remove({ _id: ObjectID(best._id.toString()) }, {w: 1}, function(error, result) {
                    self.best(name, sort, callback, verify);
                });
            }

            // mark result as verified
            else {
                dbCollection.update({
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
 * Insert a new row into a collection
 *
 * @param {String} collection Name of collection
 * @param {Object} row Row to insert
 *
 */
MongoEngine.prototype.insert = function(collection, row) {
    // insert into collection
    this.db.collection(collection).insert(row, {w: 1}, function(error, r) {
    });
};

/**
 * Get a single result from the database
 *
 * @param {String} collection Name of collection to fetch from
 * @param {String} id ID of row to fetch
 * @param {Function} callback Callback function to pass result to
 *
 */
MongoEngine.prototype.result = function(collection, id, callback) {
    // get single result from database
    this.db.collection(collection).find({ _id: ObjectID(id) }).limit(1).toArray(function(error, items) {
        callback(items.pop());
    });
};

/**
 * Get all results in a collection
 *
 * @param {String} collection Name of collection to fetch from
 * @param {Function} callback Callback function to pass results to
 *
 */
MongoEngine.prototype.results = function(collection, callback) {
    // get all results from collection
    this.db.collection(collection).find().sort({ score: 1 }).toArray(function(error, items) {
        callback(items);
    });
};

var verifyScore = function(score) {
    return true;
};

module.exports = MongoEngine;

var mysql = require('mysql');
var _ = require('underscore');

/**
 * Constructor
 *
 */
var MySQLEngine = function(host, user, password, database, callback) {
    this.db = mysql.createConnection({
        host: host,
        user: user,
        password: password,
        database: database
    });
    this.db.connect();

    // even though mysql isn't technically async here
    callback(null, this);
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
MySQLEngine.prototype.best = function(collection, sort, callback, verify) {
    // verify scores by default
    var self = this;
    if (verify == undefined)
        verify = true;

    // get minimum (or maximum) score
    this.db.query('select * from ' + collection + ' order by score ' + (sort ? 'asc' : 'desc') + ' limit 1', function(error, items, fields) {
        // no scores exist yet
        if (items === undefined || items.length == 0) {
            callback(false);
            return false;
        }

        // this score hasn't been verified yet, so do so
        var best = items.pop();
        if ((_.isUndefined(best.__verified) || !best.__verified) && verify) {
            var valid = verifyScore(best);

            // if result is invalid, then remove it and try again
            if (!valid) {
                self.db.query('delete from ' + collection + ' where id = ' + best.id, function(error, result) {
                    self.best(name, sort, callback, verify);
                });
            }

            // mark result as verified
            else {
                self.db.query('update ' + collection + ' set __verified = 1 where id = ' + best.id, function(error, result) {
                    best.__verified = 1;
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
MySQLEngine.prototype.insert = function(collection, row) {
    var data = JSON.stringify(row);
    this.db.query('insert into ' + collection + ' (score, data, __verified) values (' + row.score + ", '" + data + "', 0)");
};

/**
 * Get a single result from the database
 *
 * @param {String} collection Name of collection to fetch from
 * @param {String} id ID of row to fetch
 * @param {Function} callback Callback function to pass result to
 *
 */
MySQLEngine.prototype.result = function(collection, id, callback) {
    // get single result from database
    this.db.query('select * from ' + collection + ' where id = ' + id + ' limit 1', function(error, rows, fields) {
        callback(rows.pop());
    });
};

/**
 * Get all results in a collection
 *
 * @param {String} collection Name of collection to fetch from
 * @param {Function} callback Callback function to pass results to
 *
 */
MySQLEngine.prototype.results = function(collection, callback) {
    // get all results from collection
    this.db.query('select * from ' + collection + ' order by score asc', function(error, rows, fields) {
        callback(rows);
    });
};

var verifyScore = function(score) {
    return true;
};

module.exports = MySQLEngine;

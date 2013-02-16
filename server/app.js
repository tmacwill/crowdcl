var async = require('async');
var express = require('express');
var app = express();
var mongo = require('mongodb').MongoClient;
var _ = require('underscore');

// configure express
app.configure(function() {
    app.use(express.bodyParser());

    app.use(function(req, res, next) {
        // enable CORS
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'content-type, accept, x-requested-with')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        if (!_.isUndefined(req.headers.origin))
            res.header('Access-Control-Allow-Origin', req.headers.origin);
        else
            res.header('Access-Control-Allow-Origin', '*');

        // intercept OPTIONS method
        if (req.method == 'OPTIONS')
            res.send(200);

        // remove powered by header for security
        else {
            res.removeHeader('X-Powered-By');
            next();
        }
    }); 
});

// initialize server
async.waterfall([
    // connect to database
    function(callback) { 
        mongo.connect('mongodb://localhost:27017/crowdcl', callback);
    },

    // load modules
    function(db, callback) {
        require('./results.js')(app, db);
        callback();
    },
], function(error, result) {
    // start server
    app.listen(3000);
    console.log('Running on port 3000');
});

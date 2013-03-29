var async = require('async');
var config = require('./config');
var express = require('express');
var app = express();
var MongoEngine = require('./mongoengine');
var mongo = require('mongodb').MongoClient;
var mysql = require('mysql');
var _ = require('underscore');

// configure express
app.configure(function() {
    app.use(express.bodyParser());

    app.use(function(req, res, next) {
        // remove powered by header for security
        res.removeHeader('X-Powered-By');

        // enable CORS
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'content-type, accept, x-requested-with')
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        if (!_.isUndefined(req.headers.origin))
            res.header('Access-Control-Allow-Origin', req.headers.origin);
        else
            res.header('Access-Control-Allow-Origin', '*');

        // special-case preflight options method
        if (req.method == 'OPTIONS')
            res.send(200);
        else
            next();
    });
});

// initialize server
async.waterfall([
    // connect to mongo
    function(callback) {
        new MongoEngine(config.mongo.host, config.mongo.port, config.mongo.database, callback);

        //var db = mysql.createConnection(config.mysql);
        //db.connect();
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

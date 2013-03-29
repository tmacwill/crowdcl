var fs = require('fs');
var util = require('util');
var vm = require('vm');

/**
 * Constructor
 *
 * @param {String} problem Filename of javascript to verify
 *
 */
var Verifier = function(problem) {
    this.source = fs.readFileSync(problem);
};

/**
 * Verify an input using a problem-defined verification method
 *
 * @param {Object} input Input to be verified
 * @return {Boolean} True iff input is valid
 *
 */
Verifier.prototype.verify = function(input) {
    // create a new sandbox
    var context = vm.createContext({});

    // evaluate the problem code in the sandbox
    vm.runInContext(this.source, context);

    // instantiate the problem from the sandbox
    return context[Object.keys(context).pop()].verify(input);
};

module.exports = Verifier;

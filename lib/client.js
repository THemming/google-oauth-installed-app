var AuthenticatedHttpRequest = require('./authenticated-http-request');

/**
 * Wraps up the authenticated http request object for repeated calls.
 *
 * @param {ApplicationAuth} applicationAuth Handles application-based authorization
 * @constructor
 */
function Client(applicationAuth) {
    this._applicationAuth = applicationAuth;
}

Client.prototype = {
    /**
     * Returns a standard https request, wrapped in a promise, that handles authorisation internally. Includes the ability
     * to repeat requests upon authorisation failure.
     *
     * @param {(object|string)} options configuration for the https request or a url string
     * @param {function} callback takes the response object as an argument
     * @returns {Q.promise.<https.request>} a promise that resolves to an https request object
     */
    request: function (options, callback) {
        // Create a Request instance so that it can keep track of individual request state.
        var request = new AuthenticatedHttpRequest(this._applicationAuth, options, callback);
        return request.send();
    }
};

module.exports = Client;
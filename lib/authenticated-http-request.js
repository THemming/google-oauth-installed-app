var https = require('https');
var url = require('url');

var HTTP_UNAUTHORIZED = 401;
var HTTP_FORBIDDEN = 403;
// Maximum number of attempts to authorize a request
var MAX_ATTEMPTS = 2;

/**
 * An authenticated http request. Will retry authentication a set number of times.
 *
 * @param {ApplicationAuth} applicationAuth Handles application-based authorization
 * @param {(object|string)} options Configuration for the https request or a url string
 * @param {function} callback Takes the response object as an argument
 * @constructor
 */
function AuthenticatedHttpRequest(applicationAuth, options, callback) {
    this._applicationAuth = applicationAuth;
    this._options = typeof options === 'string' ?
        url.parse(options) :
        options;
    this._callback = callback;
    this._attempt = 0;
}

AuthenticatedHttpRequest.prototype = {
    /**
     * Send the http request. Should only be called once.
     *
     * @returns {Q.promise.<https.request>} a promise that resolves to an https request object
     */
    send: function () {
        var self = this;
        return self._applicationAuth.authorise().then(function (accessTokenData) {
            return self._buildAuthenticatedRequest(self._options, self._callback, accessTokenData);
        });
    },

    _buildAuthenticatedRequest: function (options, callback, accessTokenData) {
        var self = this;
        var request;

        options.headers = options.headers || {};
        options.headers['Authorization'] = accessTokenData['bearer'] + ' ' + accessTokenData['accessToken'];

        function wrappedCallback(response) {
            if ((response.statusCode === HTTP_UNAUTHORIZED || response.statusCode === HTTP_FORBIDDEN) && self._attempt < MAX_ATTEMPTS) {
                console.log('Access forbidden. Will attempt to refresh access token and try again.');
                self._applicationAuth.refreshAccessToken().done(function () {
                    // Options will include the added authorization header, but that is ok as it will be overwritten in the next call.
                    self.send().done(function (newRequest) {
                        newRequest.end(request.data);
                    });
                });
            } else {
                if (self._attempt > MAX_ATTEMPTS) {
                    console.error('Maximum number of attempts reached ' + self._attempt);
                }
                self._attempt = 0;
                callback(response);
            }
        }

        self._attempt++;
        request = https.request(options, wrappedCallback);
        return request;
    }
};

module.exports = AuthenticatedHttpRequest;
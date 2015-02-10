var open = require('open');

/**
 *
 * @param {(string,string[])} scope One or more scope urls, as defined by the Google API documentation
 * @param {googleapis.auth.OAuth2} auth
 * @param {HttpReceiver} receiver
 * @param {AuthStore} authStore
 * @constructor
 */
function Authoriser(scope, auth, receiver, authStore) {
    this._scope = scope;
    this._auth = auth;
    this._receiver = receiver;
    this._authStore = authStore;
    this._requetsSent = 0;
}

Authoriser.prototype = {
    MAX_REQUESTS: 3,

    /**
     * Submit an authorisation request for the client, triggering a callback when complete.
     *
     * @param {function} onCompleted Called when the authorisation process has completed. If successful then the first
     *  argument will be null, otherwise it will be passed an error message
     */
    authorise: function (onCompleted) {
        if (this._authStore.hasTokens()) {
            this._auth.setCredentials(this._authStore.getTokens());
            onCompleted(null);
            return;
        }

        if (this._requetsSent >= this.MAX_REQUESTS) {
            onCompleted(new Error('Exceeded the maximum number of authorisation requests. Cannot authorise'));
            return;
        }

        this._receiver.setCallback(this._receiverCallback.bind(this, onCompleted));
        this._receiver.start();
        var url = this._auth.generateAuthUrl({
            // 'online' (default) or 'offline' (gets refresh_token)
            access_type: 'offline',
            scope: this._scope
        });

        console.log('opening authorization request url: ' + url);
        open(url);
        this._requetsSent++;
    },

    /**
     * Clear any existing authorisation tokens from the AuthStore.
     */
    clearTokens: function () {
        this._authStore.clearTokens();
    },

    /**
     * Captures the authorisation code once the user has completed the task. Then calls through to the Google OAuth2
     * API to get the access tokens. Once access tokens have been received the onCompleted callback will be called.
     *
     * @param {function} onCompleted To be called once the tokens have been stored and set on the Google API
     * @param {string} authorizationCode The authorisation code received from Google
     * @private
     */
    _receiverCallback: function (onCompleted, authorizationCode) {
        var self = this;
        console.log('new authorization code: ' + authorizationCode);

        self._auth.getToken(authorizationCode, function (err, tokens) {
            if (err) {
                return onCompleted(err);
            }
            // Now tokens contains an access_token and an optional refresh_token. Save them.
            console.log('new authentication tokens: ' + JSON.stringify(tokens));
            self._authStore.setTokens(tokens);
            self._auth.setCredentials(self._authStore.getTokens());
            // Reset the request count upon successful authorisation
            self._requetsSent = 0;
            onCompleted(null);
        });
    }
};

module.exports = Authoriser;
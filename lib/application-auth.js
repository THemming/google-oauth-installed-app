var querystring = require('querystring');
var https = require('https');
var Q = require('q');
var url = require('url');
var open = require('open');
var Logger = require('./logger');

var AUTH_URI = 'https://accounts.google.com/o/oauth2/auth';
var TOKEN_URI = 'https://accounts.google.com/o/oauth2/token';
var EXPIRES_SHORTEN_SECONDS = 5;

var log = Logger.createLogger('application-auth');

/**
 * Represents the application when authenticating the http client.
 *
 * @param id The application id
 * @param secret The application secret
 * @param scope The application scope to authorise. Can be set after instantiation
 * @constructor
 */
function ApplicationAuth(id, secret, scope) {
    this._id = id;
    this._secret = secret;
    this._scope = scope;
    this._receivers = [];
}

ApplicationAuth.prototype = {
    authorise: function () {
        var deferred = Q.defer();

        // TODO check if expired
        if (this._store.hasAccessToken()) {
            deferred.resolve(this._store.getAccessToken());
            return deferred.promise;
        }


        if (this._store.hasRefreshToken()) {
            return this.refreshAccessToken();
        }

        return this.requestAuthorisationCode()
            .then(this.requestTokens.bind(this));
    },

    refreshAccessToken: function () {
        var self = this;

        if (!this._store.hasRefreshToken()) {
            throw new Error('You must request a refresh token before refreshing an access token.');
        }

        log('Refreshing access token');

        var deferred = Q.defer();

        var urlParts = url.parse(TOKEN_URI);

        var contentType = 'application/x-www-form-urlencoded';

        var queryParams = {
            client_id: this._id,
            client_secret: this._secret,
            refresh_token: this._store.getRefreshToken(),
            grant_type: 'refresh_token'
        };

        var postOptions = {
            host: urlParts.host,
            path: urlParts.path,
            method: 'POST',
            headers: {
                'Content-Type': contentType
            }
        };

        var req = https.request(postOptions, function (res) {
            var error = !!(res.statusCode >= 400 && res.statusCode < 500);
            var buffer = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                buffer += chunk;
            });
            res.on('end', function () {
                if (error) {
                    deferred.reject(buffer);
                } else {
                    try {
                        var data = JSON.parse(buffer);
                        var expires = Date.now() + data['expires_in'] - EXPIRES_SHORTEN_SECONDS;
                        self._store.setAccessToken(data['access_token'], data['token_type'], expires);
                        deferred.resolve(data);
                    } catch (e) {
                        deferred.reject('Could not parse returned data from refreshAccessToken: ' + buffer);
                    }
                }
            });
        });

        // post the data
        req.write(querystring.encode(queryParams));
        req.end();
        return deferred.promise;
    },

    requestTokens: function (authorisationCode) {
        if (!authorisationCode) {
            throw new Error('You must request an authorisation code before exchanging for access tokens.');
        }

        var deferred = Q.defer();

        var urlParts = url.parse(TOKEN_URI);

        var contentType = 'application/x-www-form-urlencoded';

        var queryParams = {
            code: authorisationCode,
            client_id: this._id,
            client_secret: this._secret,
            redirect_uri: this._activeReceiver.redirectUri,
            grant_type: 'authorization_code'
        };

        var postOptions = {
            host: urlParts.host,
            path: urlParts.path,
            method: 'POST',
            headers: {
                'Content-Type': contentType
            }
        };

        var self = this;

        var req = https.request(postOptions, function (res) {
            var error = !!(res.statusCode >= 400 && res.statusCode < 500);
            var buffer = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                buffer += chunk;
            });
            res.on('end', function () {
                if (error) {
                    deferred.reject(buffer);
                } else {
                    try {
                        var data = JSON.parse(buffer);
                        self._store.setRefreshToken(data['refresh_token']);
                        var expires = Date.now() + data['expires_in'] - EXPIRES_SHORTEN_SECONDS;
                        self._store.setAccessToken(data['access_token'], data['token_type'], expires);
                        deferred.resolve(self._store.getAccessToken());
                    } catch (e) {
                        deferred.reject('Could not parse returned data from requestToken: ' + buffer);
                    }
                }
            });
        });

        // post the data
        req.write(querystring.encode(queryParams));
        req.end();
        return deferred.promise;
    },

    setStore: function (store) {
        this._store = store;
    },

    requestAuthorisationCode: function () {
        log('Requesting authorisation code');

        var codeReceived = this._startAuthorisationReceiver();

        var urlParts = url.parse(AUTH_URI);
        urlParts.query = {
            response_type: 'code',
            client_id: this._id,
            redirect_uri: this._activeReceiver.redirectUri,
            scope: this._scope
        };
        var formattedUrl = url.format(urlParts);
        log(formattedUrl);
        open(formattedUrl);

        return codeReceived;
    },

    /**
     * Either an array of receivers or a single receiver.
     *
     * @type {(Array.<Object>|Object)}
     */
    setAuthorisationReceivers: function (receivers) {
        if (!Array.isArray(receivers)) {
            receivers = [receivers];
        }
        this._receivers = receivers;
    },

    _startAuthorisationReceiver: function () {
        var self = this;
        self._activeReceiver = null;
        var deferred = Q.defer();

        self._receivers.forEach(function (receiver) {
            try {
                receiver.callback = deferred.resolve;
                receiver.start();
                self._activeReceiver = receiver;
            } catch (e) {
                log('Could not start receiver: ' + e.message);
            }
        });

        if (!self._activeReceiver) {
            throw new Error('Could not start any authentication key receivers. Cannot proceed, exiting.');
        }

        return deferred.promise;
    }

};


module.exports = ApplicationAuth;
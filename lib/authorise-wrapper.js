var HTTP_CODE_FORBIDDEN = 403;
var RESPONSE_TYPE_INVALID_GRANT = 'invalid_grant';

/**
 * Take a GoogleApis module and wrap all public methods with a pre-configured Authoriser object.
 */
var AuthoriseWrapper = {
    /**
     * API methods do not start or end with an underscore. Has to be two or more characters to match.
     * @type {RegExp}
     */
    _PUBLIC_API_METHOD_PATTERN: /^[^_].*[^_]$/,

    /**
     * API methods are functions that take in the parameters: params, callback
     * @type {RegExp}
     */
    _API_METHOD_SIGNATURE_PATTERN: /^function\s*\(\s*params\s*,\s*callback\s*\)/,

    /**
     * Look for all public methods on a googleapis module and apply the authoriser handler.
     *
     * @param {object} api A GoogleApis module object
     * @param {Authoriser} authoriser An Authoriser instance configured to handler requests for the api calls
     */
    wrapApiMethods: function (api, authoriser) {
        var self = this;

        this._findApiMethods(api).forEach(function (method) {
            method.parent[method.property] = self._applyAuthoriseHandler(method.parent[method.property], authoriser);
            console.log('applied authorization retry wrapper to api method: ' + method.path + '()');
        });
    },

    /**
     * Take a function and return a new function wrapping the original and calling the authoriser.
     *
     * @param {function} originalFunction The public api method to wrap with the authorisation handler
     * @param {Authoriser} authoriser The authoriser instance to use
     * @returns {function} The original function wrapped in a call to the authoriser
     * @private
     */
    _applyAuthoriseHandler: function (originalFunction, authoriser) {
        var self = this;

        return function (params, callback) {
            authoriser.authorise(function (err) {
                if (err) {
                    callback(new Error('could not authorise'));
                    return;
                }

                originalFunction(params, function (err, data, response) {
                    // Forbidden HTTP response code or 400 Bad request, invalid grant tokens (when access token has
                    // expired and refresh token has been revoked)
                    var reauthorise = (response && response.statusCode === HTTP_CODE_FORBIDDEN) ||
                        (err && err.type === RESPONSE_TYPE_INVALID_GRANT);
                    if (reauthorise) {
                        console.log('Authorisation revoked. Going to reauthorise and try again');
                        authoriser.clearTokens();
                        self._applyAuthoriseHandler(originalFunction, authoriser)(params, callback);
                        return;
                    }

                    callback(err, data, response);
                });
            });

        };
    },

    /**
     * Iterates over a GoogleApis object and finds all the public api methods, returning information on them.
     *
     * @param api
     * @returns {Object.<{path: string, parent: object, property: string}>}
     */
    _findApiMethods: function (api) {
        var self = this;

        function pathFrom(object, path) {
            Object.getOwnPropertyNames(object)
                .filter(function (property) {
                    return property.search(self._PUBLIC_API_METHOD_PATTERN) !== -1 &&
                        object[property].constructor.name !== 'GoogleApis';
                })
                .forEach(function (property) {
                    var branch = path.slice();
                    branch.push(property);
                    if (typeof object[property] === 'object') {
                        pathFrom(object[property], branch);
                    } else if (typeof object[property] === 'function') {
                        var signature = object[property].toString().split('\n')[0];

                        if (signature.search(self._API_METHOD_SIGNATURE_PATTERN) !== -1) {
                            matches.push({
                                path: branch,
                                parent: object,
                                property: property
                            });
                        }
                    }
                });
        }

        var apiName = api.constructor.name;
        var matches = [];
        pathFrom(api, []);

        return matches.map(function (method) {
            method.path = apiName + '.' + method.path.join('.');
            return method;
        });
    }
};

module.exports = AuthoriseWrapper;
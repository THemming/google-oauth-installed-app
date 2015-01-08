var http = require('http');
var url = require('url');
var querystring = require('querystring');

var DEFAULT_HTTP_PORT = 10887;
var REDIRECT_URI = 'http://localhost';
var HTTP_SERVER_HOSTNAME = 'localhost';

/**
 * @param {int} [port]
 * @constructor
 */
function LocalServer(port) {
    this.port = port || DEFAULT_HTTP_PORT;
}

LocalServer.prototype = {
    start: function () {
        if (typeof this._callback !== 'function') {
            throw new Error('You must set a callback to receive the authentication key, before starting.');
        }

        var self = this;

        var server = http.createServer(function (req, res) {
            req.on('data', function () {
            });

            var parsedUrl = url.parse(req.url);

            switch (parsedUrl.pathname) {
                case '/':
                    var code = querystring.parse(parsedUrl.query).code;
                    self._callback(code);
                    req.on('end', function () {
                        res.statusCode = 200;
                        res.end('<html><body>Application authenticated. You may now close this window.</body></html>');
                        req.connection.end();
                        server.close();
                    });
                    break;
                default:
                    req.on('end', function () {
                        res.statusCode = 404;
                        res.end();
                    });
                    break;
            }
        });

        server.listen(this.port, HTTP_SERVER_HOSTNAME);
        console.log('http server listening, host: ' + HTTP_SERVER_HOSTNAME + ', port: ' + this.port);
    },

    /**
     * @param {function} callback
     */
    set callback(callback) {
        this._callback = callback;
    },

    /**
     * @returns {string}
     */
    get redirectUri() {
        var redirectUri = REDIRECT_URI;

        if (this.port !== 80) {
            redirectUri += ':' + this.port;
        }

        return redirectUri;
    }
};

module.exports = LocalServer;
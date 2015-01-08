var url = require('url');

var utils = {
    /**
     *
     * @param {string} originalUrl
     * @param {Object.<string, string>} params
     * @returns {string}
     */
    addQueryParams: function (originalUrl, params) {
        var parsedUrl = url.parse(originalUrl, true);
        for (var key in params) {
            if (params.hasOwnProperty(key)) {
                parsedUrl.query[key] = params[key];
            }
        }
        try {
            delete parsedUrl.search;
        } catch (e) {
        }
        return url.format(parsedUrl);
    }
};

module.exports = utils;
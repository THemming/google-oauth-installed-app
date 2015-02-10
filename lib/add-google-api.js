var fs = require('fs');
var path = require('path');
var util = require('util');
var google = require('googleapis');

/**
 * Return a Function that requires an API from the disk. This is copied directly from the googleapis project as they don't
 * export it.
 *
 * @param  {string} filename Filename of API
 * @return {function} function used to require the API from disk
 * @private
 */
function requireAPI(filename) {
    return function (options) {
        var type = typeof options;
        var version;
        if (type === 'string') {
            version = options;
            options = {};
        } else if (type === 'object') {
            version = options.version;
            delete options.version;
        } else {
            throw new Error('Argument error: Accepts only string or object');
        }
        try {
            var endpointPath = path.join(filename, path.basename(version));
            var Endpoint = require(endpointPath);
            var ep = new Endpoint(options);
            ep.google = this; // for drive.google.transporter
            return Object.freeze(ep); // create new & freeze
        } catch (e) {
            throw new Error(util.format('Unable to load endpoint %s("%s"): %s',
                filename, version, e.message));
        }
    };
}

/**
 * Add a new, loadable, API module to the GoogleApis library. Note, this uses a private method from the googleapis library.
 *
 * @param {string} name The API reference name
 * @param {string} path The absolute path to the API directory
 */
module.exports = function (name, path) {
    if (!fs.existsSync(path) || !fs.statSync(path).isDirectory()) {
        throw new Error('cannot add google api "' + name + '". Path does not exist "' + path + '"');
    }

    var api = {};
    api[name] = requireAPI(path);
    google.addAPIs(api);
};
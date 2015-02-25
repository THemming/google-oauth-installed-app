function GoogleAuthConfig(configFile) {
    var config = require(configFile);
    if (!config.installed) {
        throw new Error('Google Auth Config file, ' + configFile + ', must be a json file with the top level property "installed".');
    }

    this._config = config.installed;
}

GoogleAuthConfig.prototype = {
    getClientId: function () {
        return this._config.client_id;
    },

    getClientSecret: function () {
        return this._config.client_secret;
    }
};

module.exports = GoogleAuthConfig;

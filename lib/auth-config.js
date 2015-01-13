function GoogleAuthConfig(configFile) {
    var config = require(configFile);
    if (!config.installed) {
        throw new Error('Google Auth Config file, ' + configFile + ', must be a json file with the top level property "installed".');
    }

    this._config = config.installed;
}

GoogleAuthConfig.prototype = {
    get clientId() {
        return this._config.client_id;
    },

    get clientSecret() {
        return this._config.client_secret;
    }
};

module.exports = GoogleAuthConfig;

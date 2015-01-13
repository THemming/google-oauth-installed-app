var fs = require('fs');

/**
 * Authentication store DAO.
 *
 * @constructor
 */
function AuthStore(storeFile) {
    this._storeFile = storeFile;
    this._data = {};
    this._loadData();
}

AuthStore.prototype = {
    /**
     * Load data from file.
     *
     * @private
     */
    _loadData: function () {
        if (!fs.existsSync(this._storeFile)) {
            return;
        }

        var rawData = fs.readFileSync(this._storeFile);
        console.log('Loaded data from file, data: ' + rawData);
        var data = JSON.parse(rawData);
        if (typeof data === 'object') {
            this._data = data;
        }
    },

    /**
     * Save data to file.
     *
     * @private
     */
    _saveData: function () {
        var rawData = JSON.stringify(this._data);
        console.log('Saving data to file: ' + this._storeFile + ', data: ' + rawData);
        fs.writeFileSync(this._storeFile, rawData);
    },

    /**
     * Is the refresh token stored.
     *
     * @returns {boolean}
     */
    hasRefreshToken: function () {
        return !!(this._data['refresh-token']);
    },

    getRefreshToken: function () {
        return this._data['refresh-token'];
    },

    setRefreshToken: function (token) {
        console.log('Setting refresh token: ' + token);
        this._data['refresh-token'] = token;
        this._saveData();
    },

    hasAccessToken: function () {
        return this._data['access-token'] && this._data['bearer'] && this._data['expires'];
    },

    getAccessToken: function () {
        if (!this.hasAccessToken()) {
            return null;
        }

        return {
            accessToken: this._data['access-token'],
            bearer: this._data['bearer'],
            expires: this._data['expires']
        };
    },

    clearAccessToken: function() {
        if(!this.hasAccessToken()) {
            return;
        }

        delete this._data['access-token'];
        delete this._data['bearer'];
        delete this._data['expires'];

        this._saveData();
    },

    setAccessToken: function (accessToken, bearer, expires) {
        console.log('Setting access token: accessToken: ' + accessToken + ', bearer: ' + bearer + ', expires: ' + expires);
        this._data['access-token'] = accessToken;
        this._data['bearer'] = bearer;
        this._data['expires'] = expires;
        this._saveData();
    }
};

module.exports = AuthStore;
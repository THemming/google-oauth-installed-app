var fs = require('fs');

/**
 * Authentication store DAO.
 *
 * @constructor
 */
function AuthStore(storeFile) {
    this._storeFile = storeFile;
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

        try {
            var rawData = fs.readFileSync(this._storeFile);
            var data = JSON.parse(rawData);
            if (typeof data === 'object') {
                this._data = data;
                console.log('Loaded auth store data from file, data: ' + rawData);
            }
        } catch (error) {
            this._data = {};
            console.log('Could not read the data from the auth store file.');
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
    hasTokens: function () {
        return this._data && this._data.hasOwnProperty('access_token') && this._data.hasOwnProperty('refresh_token');
    },

    clearTokens: function () {
        if (!this.hasTokens()) {
            return;
        }

        this._data = {};

        this._saveData();
    },

    setTokens: function (tokensResponse) {
        this._data = tokensResponse;
        this._saveData();
    },

    getTokens: function () {
        return this._data;
    }
};

module.exports = AuthStore;
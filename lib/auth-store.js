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
    hasTokens: function () {
        return !!(this._data);
    },

    clearTokens: function () {
        if (!this.hasTokens()) {
            return;
        }

        delete this._data;

        this._saveData();
    },

    set tokens(tokensResponse) {
        this._data = tokensResponse;
        this._saveData();
    },

    get tokens() {
        return this._data;
    }
};

module.exports = AuthStore;
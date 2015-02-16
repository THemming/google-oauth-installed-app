var assert = require('chai').assert;
var sinon = require('sinon');

var MODULE_UNDER_TEST = '../../lib/authorise-wrapper';

function noop() {
}

// noinspection JSHint
function expectedSignature(params, callback) {
    console.log('expected signature');
}

describe('Google API authorise wrapper', function () {
    var AuthoriseWrapper;

    beforeEach(function () {
        AuthoriseWrapper = require(MODULE_UNDER_TEST);
    });

    describe('calling findApiMethods', function () {
        describe('when the API object does not have any valid public methods', function () {
            var api = {
                _private: noop,
                publicNoMatchingSignature: noop,
                _privateWithExpectedSignature: expectedSignature,
                privateWithExpectedSignature_: expectedSignature
            };
            var result;

            beforeEach(function () {
                result = AuthoriseWrapper.findApiMethods(api);
            });

            it('returns an empty array', function () {
                assert.lengthOf(result, 0);
            });
        });

        describe('when the API object has valid public methods', function () {
            var MockApi = function MockApi() {
                this.public1 = expectedSignature;
                this._private1 = noop;
                this.public2 = expectedSignature;
                this.path1 = {
                    public3: expectedSignature
                };
                this._private2 = noop;
                this.private3_ = expectedSignature;
                this.nonApiSignature = noop;
                this.path2 = {
                    path3: {
                        path4: {
                            public4: expectedSignature
                        }
                    }
                };
            };
            var api;
            var result;

            beforeEach(function () {
                api = new MockApi();
                result = AuthoriseWrapper.findApiMethods(api);
            });

            it('returns an array of objects describing the public methods', function () {
                assert.lengthOf(result, 4);
                assert.strictEqual(result[0].parent, api);
                assert.equal(result[0].path, 'MockApi.public1');
                assert.equal(result[0].name, 'public1');

                assert.strictEqual(result[1].parent, api);
                assert.equal(result[1].path, 'MockApi.public2');
                assert.equal(result[1].name, 'public2');

                assert.strictEqual(result[2].parent, api.path1);
                assert.equal(result[2].path, 'MockApi.path1.public3');
                assert.equal(result[2].name, 'public3');

                assert.strictEqual(result[3].parent, api.path2.path3.path4);
                assert.equal(result[3].path, 'MockApi.path2.path3.path4.public4');
                assert.equal(result[3].name, 'public4');
            });
        });
    });

    describe('when api methods are wrapped', function () {
        var MockApi = function MockApi() {
            this.public1 = expectedSignature;
            this.nonApiSignature = noop;
            this._private1 = noop;
            this.private2_ = expectedSignature;
        };
        var api;
        var authStub;

        beforeEach(function () {
            api = new MockApi();
            authStub = sinon.stub({
                authorise: noop,
                clearTokens: noop
            });
        });

        it('calling a public api method calls through to Authoriser#authorise', function () {
            AuthoriseWrapper.wrapApiMethods(api, authStub);

            api.public1();
            sinon.assert.calledOnce(authStub.authorise);
        });

        it('calling a private method does not called through to Authoriser#authorise', function () {
            AuthoriseWrapper.wrapApiMethods(api, authStub);

            api._private1();
            sinon.assert.notCalled(authStub.authorise);
        });

        it('calling a non api method does not called through to Authoriser#authorise', function () {
            AuthoriseWrapper.wrapApiMethods(api, authStub);

            api.nonApiSignature();
            sinon.assert.notCalled(authStub.authorise);
        });

        describe('and the authoriser returns with success', function () {
            var authSuccess = {
                authorise: function (callback) {
                    callback(null);
                }
            };

            it('calls the original callback with null', function (done) {
                var api = {
                    public1: function (params, callback) {
                        callback();
                    }
                };

                AuthoriseWrapper.wrapApiMethods(api, authSuccess);

                var callback = function (err) {
                    assert.isUndefined(err);
                    done();
                };

                api.public1({}, callback);
            });
        });

        describe('and the api call receives FORBIDDEN error code', function () {
            var expectedErrorMessage = 'Insufficient Permissions';
            var api = {
                public1: function (params, callback) {
                    callback({code: 403, message: expectedErrorMessage}, null);
                }
            };

            it('clears authoriser tokens and calls back the api consumer with the error information', function (done) {
                var responseCallback = function (err) {
                    sinon.assert.calledOnce(authoriserStub.clearTokens);
                    assert.equal(403, err.code);
                    assert.equal(expectedErrorMessage, err.message);
                    done();
                };

                var authoriserStub = {
                    authorise: function (callback) {
                        callback(null);
                    },
                    clearTokens: sinon.spy()
                };

                AuthoriseWrapper.wrapApiMethods(api, authoriserStub);
                api.public1({}, responseCallback);
            });
        });

        describe('and the api call receives UNAUTHORISED error code', function () {
            var api = {
                public1: function (params, callback) {
                    callback({code: 401}, null);
                }
            };

            it('clears authoriser tokens and does not call back the api consumer', function (done) {
                var authoriseCount = 0;
                var responseCallback = sinon.spy();

                var authoriserStub = {
                    authorise: function (callback) {
                        if (authoriseCount === 0) {
                            authoriseCount++;
                            callback(null);
                        } else {
                            sinon.assert.calledOnce(this.clearTokens);
                            sinon.assert.notCalled(responseCallback);
                            done();
                        }
                    },
                    clearTokens: sinon.spy()
                };

                AuthoriseWrapper.wrapApiMethods(api, authoriserStub);
                api.public1({}, responseCallback);
            });
        });

        describe('and the authoriser returns an error', function () {
            var expectedError = new Error('this is a mock authorise error');
            var authError = {
                authorise: function (callback) {
                    callback(expectedError);
                }
            };

            it('passes the error on to the original callback passed into the api call', function (done) {
                AuthoriseWrapper.wrapApiMethods(api, authError);

                var callback = function (err) {
                    assert.strictEqual(expectedError, err);
                    done();
                };
                api.public1({}, callback);
            });
        });
    });
});
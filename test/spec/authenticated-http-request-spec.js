var assert = require('chai').assert;
var mockery = require('mockery');
var sinon = require('sinon');
var https = require('https');
var url = require('url');
var Q = require('q');

var MODULE_UNDER_TEST = '../../lib/authenticated-http-request';
var AuthenticatedHttpRequest;

describe('Google auth client', function () {

    beforeEach(function () {
        sinon.stub(https, 'request');
        mockery.enable();
        mockery.registerMock('https', https);
        mockery.registerMock('url', url);
        mockery.registerAllowable(MODULE_UNDER_TEST);
        AuthenticatedHttpRequest = require(MODULE_UNDER_TEST);
    });

    afterEach(function () {
        AuthenticatedHttpRequest = null;
        https.request.restore();
        mockery.deregisterMock('url');
        mockery.deregisterMock('https');
        mockery.disable();
    });

    it('should be able to construct instances', function () {
        var client = new AuthenticatedHttpRequest({}, 'url', function () {
        });
        assert.isFunction(client.send, 'has the send method');
    });

    describe('request with valid access token', function () {
        var authenticatedRequest;
        var authoriseSpy;
        var expectedRequest;
        var responseCallback;
        var requestPromise;
        var expectedAccessToken = 'expected-token-123';
        var expectedBearer = 'expected-bearer-abc';

        beforeEach(function () {
            authoriseSpy = sinon.spy(function () {
                var defer = Q.defer();
                defer.resolve({
                    'bearer': expectedBearer,
                    'accessToken': expectedAccessToken
                });
                return defer.promise;
            });

            responseCallback = sinon.spy();

            authenticatedRequest = new AuthenticatedHttpRequest({
                authorise: authoriseSpy
            }, {}, responseCallback);

            expectedRequest = sinon.spy();
            https.request.returns(expectedRequest);

            requestPromise = authenticatedRequest.send();
        });

        it('has the expected authorization header', function (done) {
            requestPromise.done(function (request) {
                assert.equal(request, expectedRequest);
                assert.isTrue(https.request.called, 'https.request to have been called');
                var requestArgs = https.request.getCall(0).args;
                assert.equal(requestArgs[0].headers['Authorization'], expectedBearer + ' ' + expectedAccessToken);

                // Finish test case
                done();
            });
        });

        it('fetched authorise details only once', function (done) {
            requestPromise.done(function () {
                assert.isTrue(authoriseSpy.calledOnce);
                done();
            });
        });

        it('invokes callback with http response object on success', function (done) {
            var fakeRequest = {
                end: function () {
                    https.request.firstCall.args[1]({
                        statusCode: 200
                    });
                }
            };
            https.request.returns(fakeRequest);

            requestPromise.done(function (request) {
                request.end();
                assert.isTrue(responseCallback.called, 'response callback should have been called');
                done();
            });
        });

        it('invokes callback with http response object on server error', function (done) {
            var fakeRequest = {
                end: function () {
                    https.request.firstCall.args[1]({
                        statusCode: 500
                    });
                }
            };
            https.request.returns(fakeRequest);

            requestPromise.done(function (request) {
                request.end();
                assert.isTrue(responseCallback.called);
                assert.equal(responseCallback.firstCall.args[0].statusCode, 500);
                done();
            });
        });

        it('invokes callback with http response object on client error', function (done) {
            var fakeRequest = {
                end: function () {
                    https.request.firstCall.args[1]({
                        statusCode: 404
                    });
                }
            };
            https.request.returns(fakeRequest);

            requestPromise.done(function (request) {
                request.end();
                assert.isTrue(responseCallback.called);
                assert.equal(responseCallback.firstCall.args[0].statusCode, 404);
                done();
            });
        });
    });

    describe('request with expired access token', function () {
        var authenticatedRequest;
        var authoriseSpy;
        var refreshAccessTokenSpy;
        var responseCallback;
        var requestPromise;
        var expectedAccessToken = 'expected-token-123';
        var expectedRefreshedAccessToken = 'expected-refreshed-token-123';
        var expectedBearer = 'expected-bearer-abc';

        beforeEach(function (done) {
            authoriseSpy = sinon.spy(function () {
                var defer = Q.defer();
                defer.resolve({
                    'bearer': expectedBearer,
                    'accessToken': expectedAccessToken
                });
                return defer.promise;
            });

            refreshAccessTokenSpy = sinon.spy(function () {
                var defer = Q.defer();
                defer.resolve({
                    'bearer': expectedBearer,
                    'accessToken': expectedRefreshedAccessToken
                });
                return defer.promise;
            });

            responseCallback = sinon.spy(function () {
                done();
            });

            authenticatedRequest = new AuthenticatedHttpRequest({
                authorise: authoriseSpy,
                refreshAccessToken: refreshAccessTokenSpy
            }, {}, responseCallback);

            var unauthorizedRequest = {
                end: function () {
                    https.request.firstCall.args[1]({
                        statusCode: 401
                    });
                },
                data: function (data) {
                    this.data = data;
                }
            };
            var authorizedRequest = {
                end: function () {
                    https.request.secondCall.args[1]({
                        statusCode: 200,
                        data: 'second attempt response'
                    });
                }
            };
            https.request.onFirstCall().returns(unauthorizedRequest);
            https.request.onSecondCall().returns(authorizedRequest);

            requestPromise = authenticatedRequest.send();
            requestPromise.done(function (request) {
                request.data('some data');
                request.end();
            });
        });

        it('calls for re-authorization', function (done) {
            assert.isTrue(refreshAccessTokenSpy.called);
            done();
        });

        it('sends a second request with the new authorization', function (done) {
            assert.equal(https.request.callCount, 2);
            done();
        });

        it('invokes callback with response on second successful attempt', function () {
            assert.isTrue(responseCallback.called);
            assert.equal(responseCallback.firstCall.args[0].statusCode, 200);
            assert.equal(responseCallback.firstCall.args[0].data, 'second attempt response');
        });

    });

    describe('request cannot be authorized', function () {
        var authenticatedRequest;
        var authoriseSpy;
        var responseCallback;
        var requestPromise;
        var expectedAccessToken = 'expected-token-123';
        var expectedBearer = 'expected-bearer-abc';

        beforeEach(function (done) {
            authoriseSpy = sinon.spy(function () {
                var defer = Q.defer();
                defer.resolve({
                    'bearer': expectedBearer,
                    'accessToken': expectedAccessToken
                });
                return defer.promise;
            });

            responseCallback = sinon.spy(function () {
                done();
            });

            authenticatedRequest = new AuthenticatedHttpRequest({
                authorise: authoriseSpy,
                refreshAccessToken: authoriseSpy
            }, {}, responseCallback);

            var unauthorizedRequest = {
                end: function () {
                    https.request.firstCall.args[1]({
                        statusCode: 401
                    });
                },
                data: function (data) {
                    this.data = data;
                }
            };
            https.request.returns(unauthorizedRequest);

            requestPromise = authenticatedRequest.send();
            requestPromise.done(function (request) {
                request.data('some data');
                request.end();
            });
        });

        it('invokes callback with unauthorized response', function () {
            assert.isTrue(responseCallback.called);
            assert.equal(responseCallback.firstCall.args[0].statusCode, 401);
        });

        it('should only attempted the request twice', function () {
            assert.equal(https.request.callCount, 2);
        });
    });

});

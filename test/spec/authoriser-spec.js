var mockery = require('mockery');
var sinon = require('sinon');
var Auth = require('googleapis').auth.OAuth2;
var Receiver = require('../../lib/http-receiver');
var AuthStore = require('../../lib/auth-store');

var MODULE_UNDER_TEST = '../../lib/authoriser';

describe('Authoriser module', function () {

    var Authoriser;
    var openStub;
    var authStub;
    var receiverStub;
    var authStoreStub;

    beforeEach(function () {
        mockery.enable();
        openStub = sinon.stub();
        mockery.registerMock('open', openStub);
        mockery.registerAllowable(MODULE_UNDER_TEST);
        Authoriser = require(MODULE_UNDER_TEST);
        authStub = sinon.createStubInstance(Auth);
        receiverStub = sinon.createStubInstance(Receiver);
        authStoreStub = sinon.createStubInstance(AuthStore);
    });

    afterEach(function () {
        // Reset environment
        Authoriser = null;
        mockery.deregisterMock('open');
        mockery.disable();
    });

    describe('when authorisation tokens are already stored', function () {
        var storedTokens = {};
        var onCompletedStub;
        var authoriser;

        beforeEach(function () {
            authStoreStub.hasTokens.returns(true);
            authStoreStub.getTokens.returns(storedTokens);
            onCompletedStub = sinon.stub();

            authoriser = new Authoriser('scope', authStub, receiverStub, authStoreStub);
        });

        it('set the credentials on the google api', function () {
            authoriser.authorise(onCompletedStub);
            sinon.assert.calledWith(authStub.setCredentials, storedTokens);
        });

        it('call the onCompleted callback with no errors', function () {
            authoriser.authorise(onCompletedStub);
            sinon.assert.calledWith(onCompletedStub, null);
        });
    });

    describe('when no stored authorisation tokens', function () {
        var authoriser;
        var onCompletedStub;
        var MOCK_AUTH_URL = 'http://someurl.net';
        var EXPECTED_SCOPE = 'app_scope';

        beforeEach(function () {
            authStoreStub.hasTokens.returns(false);
            onCompletedStub = sinon.stub();
            authStub.generateAuthUrl.returns(MOCK_AUTH_URL);
            authoriser = new Authoriser(EXPECTED_SCOPE, authStub, receiverStub, authStoreStub);
        });

        it('sets up and starts the authorisation receiver', function () {
            authoriser.authorise(onCompletedStub);
            sinon.assert.notCalled(authStoreStub.getTokens);
            sinon.assert.calledWith(receiverStub.setCallback, sinon.match.func);
            sinon.assert.calledOnce(receiverStub.start);
        });

        it('calls open to navigate to the url provided by the auth object', function () {
            authoriser.authorise(onCompletedStub);
            sinon.assert.notCalled(authStoreStub.getTokens);
            openStub.calledWith(MOCK_AUTH_URL);
        });

        describe('and the maximum number of authorisation attempts has been exceeded', function () {
            beforeEach(function () {
                for (var i = 0; i < authoriser.MAX_REQUESTS; i++) {
                    authoriser.authorise(sinon.spy());
                }
                authoriser.authorise(onCompletedStub);
            });

            it('will call the onCompleted callback with an Error', function () {
                sinon.assert.calledWith(onCompletedStub, sinon.match.instanceOf(Error));
            });
        });

        describe('when the receiver is called back with the authorisation code', function () {
            var mockAuthorisationCode = 'mock-authorisation-code';

            beforeEach(function () {
                authoriser.authorise(onCompletedStub);
                var authorisationCallback = receiverStub.setCallback.getCall(0).args[0];
                authorisationCallback(mockAuthorisationCode);
            });

            it('it sends a request swap the code with authorisation tokens', function () {
                sinon.assert.calledWith(authStub.getToken, mockAuthorisationCode);
            });

            describe('and if the authorisation tokens could not be fetched', function () {
                var mockAuthEror = 'mock-auth-error';

                beforeEach(function () {
                    var getTokenCallback = authStub.getToken.getCall(0).args[1];
                    getTokenCallback(mockAuthEror);
                });

                it('will call the onCompleted callback with an error argument', function () {
                    sinon.assert.calledWith(onCompletedStub, mockAuthEror);
                });

                it('will not store any tokens in the auth store', function () {
                    sinon.assert.notCalled(authStoreStub.setTokens);
                });

                it('will not set the credentials on the google api', function () {
                    sinon.assert.notCalled(authStub.setCredentials);
                });
            });

            describe('and the authorisation tokens were fetched successfully', function () {
                var mockTokens = sinon.spy();
                var mockAuthStoreTokens = sinon.spy();

                beforeEach(function () {
                    authStoreStub.getTokens.returns(mockAuthStoreTokens);
                    var getTokenCallback = authStub.getToken.getCall(0).args[1];
                    getTokenCallback(null, mockTokens);
                });

                it('will store the tokens in authStore', function () {
                    sinon.assert.calledWith(authStoreStub.setTokens, mockTokens);
                });

                it('will set the tokens on the google api from the AuthStore tokens', function () {
                    sinon.assert.calledWith(authStub.setCredentials, mockAuthStoreTokens);
                });

                it('will call the onCompleted callback with no errors', function () {
                    sinon.assert.calledWith(onCompletedStub, null);
                });
            });
        });
    });

});
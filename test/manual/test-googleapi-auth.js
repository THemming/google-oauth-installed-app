var AuthConfig = require('../../lib/auth-config');
var AuthStore = require('../../lib/auth-store');
var Receiver = require('../../lib/http-receiver');
var google = require('googleapis');
var open = require('open');

var authConfig = new AuthConfig(__dirname + '/_google-auth-config.json');
var authStore = new AuthStore(__dirname + '/_auth-store.json');

var receiver = new Receiver();

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(authConfig.clientId, authConfig.clientSecret, receiver.redirectUri);

if (!authStore.hasTokens()) {
    receiver.callback = function (authorizationCode) {
        console.log('new authorization code: ' + authorizationCode);

        oauth2Client.getToken(authorizationCode, function (err, tokens) {
            if (!err) {
                // Now tokens contains an access_token and an optional refresh_token. Save them.
                console.log('new authentication tokens: ' + JSON.stringify(tokens));

                authStore.tokens = tokens;

                startApiClient();
            }
        });
    };
    receiver.start();

    var url = oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        scope: 'https://picasaweb.google.com/data'
    });

    console.log('opening authorization request url: ' + url);

    open(url);
} else {
    startApiClient();
}


function startApiClient() {
    oauth2Client.setCredentials(authStore.tokens);
}
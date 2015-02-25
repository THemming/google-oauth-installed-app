/**
 * A manual end-to-end test for google-oauth-installed-app.
 *
 * Using the calendar v3 api as a target to test against.
 * "config/google-auth-config.json" needs to be setup with the developer's api credentials and the developer's api
 * account needs to have Calendar API access enabled in the "Google Developers Console".
 */
var google = require('googleapis');
var oauthInstalledApp = require('../../index.js');

// Uncomment for verbose http request debugging
//require('request').debug = true;

var authConfig = new oauthInstalledApp.GoogleAuthConfig(__dirname + '/config/google-auth-config.json');
var authStore = new oauthInstalledApp.AuthStore(__dirname + '/config/_auth-store.json');

var receiver = new oauthInstalledApp.HttpReceiver();

var oauth2Client = new google.auth.OAuth2(authConfig.getClientId(), authConfig.getClientSecret(), receiver.getRedirectUri());

// set auth as a global default
google.options({auth: oauth2Client});

var calendar = google.calendar('v3');

var authoriser = new oauthInstalledApp.Authoriser('https://www.googleapis.com/auth/calendar', oauth2Client, receiver, authStore);

oauthInstalledApp.AuthoriseWrapper.wrapApiMethods(calendar, authoriser);

calendar.calendarList.list({}, function (err, response) {
    if (err) {
        console.log(JSON.stringify(err));
        return;
    }
    console.log(response);
});

const KEY = 'EA5QAQEAABEBF1EEAQH/x80lxnnjecgAQAMxCSIBAAH/aHR0cHM6Ly8DcG9sLmlzL2FwaS92My9jb252ZXJzYXRpB29ucw==';

function open() {

window.parent.postMessage({
    powerboxRequest: {
        rpcId: 1,
        query: [
            "EAtQAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCYIAAf9odHRwczovLwFwb2wuaXMvAA==" // pol.is
            , "EAxQAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCaIAAf9odHRwOi8vdwF3dy5kbW0uYwdvbS8=" // www.dmm.com
            , "EAxQAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCbIAAf9odHRwczovLwF0dy55YWhvbx8uY29tLw==" // tw.yahoo.com
        ],
        saveLabel: {defaultText: "your calendar, for adding events"},
    }
}, "*");

window.addEventListener("message", function (event) {
    if (event.source !== window.parent) {
        // SECURITY: ignore postMessages that didn't come from the parent frame.
        return;
    }

    var response = event.data;

    if (response.rpcId !== 1) {
        // Ignore RPC ID that dosen't match our request. (In real code you'd
        // probably have a table of outstanding RPCs so that you don't have to
        // register a separate handler for each one.)
        return;
    }

    if (response.error) {
        // Oops, something went wrong.
        alert(response.error);
        return;
    }

    if (response.canceled) {
        // The user closed the Powerbox without making a selection.
        return;
    }

    // We now have a claim token. We need to send this to our server
    // where we can exchange it for access to the remote API!
    doClaimToken(response.token);
});

function doClaimToken(token) {
    $('#message').load('/claimToken',
        {"requestToken": token, "requiredPermissions": ["read"]},
        function (response) {},
        "x-www-form-urlencoded"
    );
}
}

open();

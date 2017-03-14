window.parent.postMessage({
    powerboxRequest: {
        rpcId: 1,
        query: [
            "EAtQAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCYIAAf9odHRwOi8vZAFtbS5jb20vAA=="
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
    $.post('/claimToken',
        {"requestToken": token, "requiredPermissions": ["read"]},
        function (response) {
            console.log("resp:" + response);
        },
        "x-www-form-urlencoded"
    );
    // console.log("proxy=" + HTTP_PROXY);
}
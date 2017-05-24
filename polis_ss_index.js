const KEY =
    'EAtQAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCXoAAf9odHRwczovLwA/cG9sLmlz'

function open() {
    window.parent.postMessage({
        powerboxRequest: {
            rpcId: 1, query: [
                KEY,
                "EAxQAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCboAAf9odHRwczovLwFwcmVwcm9kLj9wb2wuaXM=", // prepod.polis.is
                "EA1QAQEAABEBF1EEAQH/x80lxnnjecgAQAMRCfIAAf9odHRwOi8vMQIwNC4xOTkuMTQ0LjIwOS54H2lwLmlvn" // 104.xip
            ], saveLabel: {defaultText: "your calendar, for adding events"},
        }
    }, "*");

    window.addEventListener("message", function (event) {
        if (event.source
            !== window.parent) {
            // SECURITY: ignore postMessages that didn't come from the parent
            // frame.
            return;
        }

        var response = event.data;

        if (response.rpcId !== 1) {
            // Ignore RPC ID that dosen't match our request. (In real code
            // you'd probably have a table of outstanding RPCs so that you
            // don't have to register a separate handler for each one.)
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
}

function doClaimToken(token) {
    $.ajax('/claimToken', {
        method: 'POST',
        data: {"requestToken": token, "requiredPermissions": ["read"]},
        success: function () {
            // var mode = $('#mode').val();
            // var path = $('#path').val();
            // switch (mode) {
            //     case "redirect":
            //         location.href = path;
            //         break;
            //     case "get":
            //         $('#response').load(path);
            //         break;
            //     case "post":
            //         $.ajax(path, {
            //             method: mode,
            //             data: $('#data').val()
            //         }).done(function (resp) {
            //             $('#response').html(resp);
            //         });
            //         break;
            // }
        }
    });
}

function createConversation() {
    $('body').html('Creating conversation...');
    $.ajax({
        method: 'POST',
        url: '/api/v3/conversations',
        headers: {
            "accept": "application/json",
            "content-type": "application/json"
        },
        dataType: 'json'
    })
        .done(function (resp) {
            var conversationId = resp.conversation_id;
            if (!conversationId) {
                $('body').html(resp);
                return;
            }
            openConversation(conversationId);
        });
}

function openConversation(conversationId) {
    if (!conversationId) {
        conversationId = $('#cid').val();
    }
    $('body').html('Opening conversation...');
    var requestUrl;
    requestUrl = '/open_polis_conversation?conversation_id=' + conversationId;
    $.ajax(requestUrl)
        .done(function (resp) {
            location.href = resp;
        });
}

open();

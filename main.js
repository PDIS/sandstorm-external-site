var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    doRequest = require('request'),
    port = 8000;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

var gToken;
var gUserId;
//var gAdminKey = null;

var API_KEY = 'pkey_fhd7wkT3s9e8tw56J3H32dFa7s9';
const conversationIdPath = '/var/conversation_id';
//const adminKeyPath = '/var/admin_key';
const tokenPath = '/var/token';

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get('/', start);
app.get(/^\/lib/, sendLocalFile);
app.get('/polis_ss_index.js', sendLocalFile);
app.get('/polis_require_login.html', sendLocalFile);
app.post('/claimToken', claimToken);
app.get('/open_polis_conversation', openConversation);
app.all('*', pipe);

app.listen(port, function () {
    console.log("Server running.");
});

function start(request, response) {
    if (!fs.existsSync(tokenPath)) {
        sendLocalFile(request, response);
    } else {
        fs.readFile(tokenPath, function (err, data) {
            if (err) {
                return console.log(err);
            }
            gToken = data;
            gUserId = request.headers["x-sandstorm-user-id"];
            if (typeof gUserId === 'undefined') {
                // Anonymous user
                response.redirect('/polis_require_login.html');
                return;
            }

            fs.readFile(conversationIdPath, function (err, data) {
                if (err) {
                    return console.log(err);
                }
                response.redirect(getConversationPath(request, data));
            });
        });
    }
}

function claimToken(request, response) {
    gUserId = request.headers["x-sandstorm-user-id"];

    var post = request.body;
    var claimToken = post.requestToken;
    var sessionId = request.headers["x-sandstorm-session-id"];

    doRequest({
        proxy: process.env.HTTP_PROXY,
        method: "POST",
        url: "http://http-bridge/session/" + sessionId + "/claim",
        json: {
            requestToken: claimToken,
            requiredPermissions: ["read"]
        }
    }, function (err, httpResponse, body) {
        if (err) {
            console.error(err);
        } else {
            saveAccessToken(body.cap, response);
        }
    });
}

function saveAccessToken(token, response) {
    gToken = token;
    fs.writeFile(tokenPath, token, function(err) {
        if(err) {
            return console.log(err);
        }
    });
    response.send('OK');
}

function pipe(request, response) {
    var method = request.method;
    var url = request.url;
//    console.log('pipe ' + method + ' ' + url);
    if (method === "GET" || method === "DELETE") {
        // Add user id
        if (url.indexOf('?') >= 0) {
            url += "&xid=" + gUserId + '&polisApiKey=' + API_KEY;
        } else {
            url += "?xid=" + gUserId + '&polisApiKey=' + API_KEY;
        }
/*        if (gAdminKey) {      
            url += '&adminKey=' + gAdminKey;
        }*/
    }
    var headers = {};
    headers.Authorization = "Bearer " + gToken;
    headers['content-type'] = request.headers['content-type'];
    headers['accept'] = request.headers['accept'];
    var config = {
        proxy: process.env.HTTP_PROXY,
        method: method,
        headers: headers,
        url: "http://hostname" + url
    };
    if (method === "POST" || method === "PUT") {
        var body = request.body;
        body.polisApiKey = API_KEY;
        if (request.url == '/api/v3/conversations') {
            body.ownerXid = gUserId;
        } else {
            body.xid = gUserId;
        }
/*        if (gAdminKey) {
            body.adminKey = gAdminKey;
        }*/
        body.agid = 1;
        config.body = JSON.stringify(body);
        pipeRequest(config, response);
    } else {
        pipeRequest(config, response);
    }
}

function pipeRequest(config, response) {
    console.log('pipe ' + config.method + ' ' + config.url);
    var body = [];
    var contentType;
    doRequest(config).pipe(response);
}

function sendLocalFile(request, response) {
    var uri = url.parse(request.url).pathname
        , filename = path.join(process.cwd(), uri);

    fs.exists(filename, function (exists) {
        if (!exists) {
            console.log("File not found");
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) filename += '/polis_ss_index.html';

        fs.readFile(filename, "binary", function (err, file) {
            if (err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }

            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
}

function openConversation(request, response) {
    var conversationId = request.query.conversation_id;
/*    var adminKey = request.query.admin_key;
    if (adminKey) {
        if (!fs.existsSync(adminKeyPath)) {
            gAdminKey = adminKey;
            fs.writeFile(adminKeyPath, adminKey, function(err) {
                 if(err) {
                         return console.log(err);
                        }
                 });
        }
    }*/
    fs.writeFile(conversationIdPath, conversationId, function(err) {
        if(err) {
            return console.log(err);
        }
    });
    response.send(getConversationPath(request, conversationId));
}

function getConversationPath(request, conversationId) {
    var permissions = request.headers['x-sandstorm-permissions'];
    if (permissions.indexOf('admin') >= 0) {
/*        fs.readFile(adminKeyPath, function (err, data) {
            if (err) {
                return console.log(err);
            }
            gAdminKey = data;
            console.log('Read admin key as ' + gAdminKey);
        });*/
        return '/m/' + conversationId;
    } else {
        return '/' + conversationId;
    }
}


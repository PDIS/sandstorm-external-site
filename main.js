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

const conversationIdPath = '/var/conversation_id';
const tokenPath = '/var/token';

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.get('/', start);
app.get(/^\/lib/, sendLocalFile);
app.get('/polis_ss_index.js', sendLocalFile);
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
    console.log('pipe ' + method + ' ' + url);
    if (method === "GET") {
        // Add user id
        if (url.indexOf('?') >= 0) {
            url += "&xid=" + gUserId;
        } else {
            url += "?xid=" + gUserId;
        }
    }
    var headers = {};
    if (!headers) headers = {};
    headers.Authorization = "Bearer " + gToken;
    headers['content-type'] = request.headers['content-type'];
    headers['accept'] = request.headers['accept'];
    var config = {
        proxy: process.env.HTTP_PROXY,
        method: method,
        headers: headers,
        url: "http://hostname" + url
    };
    if (method === "POST") {
        var body = request.body;
        if (body.ownerXid) {
            body.ownerXid = gUserId;
        } else {
            body.xid = gUserId;
        }
        config.body = JSON.stringify(body);
        pipeRequest(config, response);
    } else {
        pipeRequest(config, response);
    }
}

function pipeRequest(config, response) {
    var body = [];
    var contentType;
    doRequest(config)
        .on('response', function (resp) {
            // console.log("Responded " + resp.statusCode);
            contentType = resp.headers['content-type'];
        })
        .on('error', function (err) {
            // for (var key in err) {
            //     if (typeof  err[key] !== "function") {
            //         console.log(key + ": " + err[key]);
            //     }
            // }
            response.writeHead(500, {"Content-Type": contentType});
            response.write("Error:<br>" + err);
            response.end();
        })
        .on('data', function (chunk) {
            body.push(chunk);
        })
        .on('end', function () {
            body = Buffer.concat(body).toString();
            // console.log("Body: " + body);
            response.writeHead(200);
            response.write(body);
            response.end();
        });
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
        return '/m/' + conversationId;
    } else {
        return '/' + conversationId;
    }
}

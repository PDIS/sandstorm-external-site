var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    doRequest = require('request'),
    qs = require('querystring'),
    port = 8000;

http.createServer(function (request, response) {

    console.log(request.method + " " + request.url);

    if (request.url === '/claimToken') {
        claimToken(request, response);
        return;
    }

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

        if (fs.statSync(filename).isDirectory()) filename += '/index.html';

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
}).listen(port);

console.log("Server running.");

function claimToken(request, response) {
    var body = '';

    request.on('data', function (data) {
        body += data;
        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6)
            request.connection.destroy();
    });
    request.on('end', function () {
        var post = qs.parse(body);
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
    });

}

function saveAccessToken(token, response) {
    var body = [];
    doRequest({
            proxy: process.env.HTTP_PROXY,
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token
            },
            url: "http://pol.is/api/v3/conversations"
            // url: "http://tw.yahoo.com/"
        }
    ).on('response', function (resp) {
        // console.log("resp=" + resp);
        // for (var key in resp) {
        //     if (typeof  resp[key] !== "function") {
        //         console.log(key + ": " + resp[key]);
        //     }
        // }
    }).on('error', function (err) {
        // console.log("error=" + err);
        response.writeHead(200, {"Content-Type": "text/html"});
        // response.writeHead(500, {"Content-Type": "text/html"});
        response.write("Error:<br>" + err);
        response.end();
    }).on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {
        body = Buffer.concat(body).toString();
        // console.log("Body: " + body);
        response.writeHead(200, {"Content-Type": "text/html"});
        response.write(body);
        response.end();
    });
}
var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    doRequest = require('request'),
    qs = require('querystring'),
    port = 8000;
var bodyParser = require('body-parser');
var express = require('express');
var app = express();

var gToken;
var gUserId;

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

http.createServer(function (request, response) {
  console.log(request.method + " " + request.url);

  if (request.url === '/claimToken') {
    claimToken(request, response);
    return;
  }
  if (request.url === '/'
	|| request.url === '/polis_ss_index.js'
	|| request.url === '/lib/jquery-3.1.1.min.js') {
    sendLocalFile(request, response);
    return;
  }
  pipe(request.method, request.url, request, response);
}).listen(port);

console.log("Server running.");

function claimToken(request, response) {
    var body = '';
    gUserId = request.headers["x-sandstorm-user-id"];

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
    gToken = token;
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.write('OK');
    response.end();
}

function saveAccessTokenDeprecated(token, response) {
    gToken = token;
    var body = [];
    doRequest({
            proxy: process.env.HTTP_PROXY,
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
            },
	      url: "http://pol.is/2rieydnb3k"
//            url: "http://pol.is/api/v3/conversations?polisApiKey=pkey_fhd7wkT3s9e8tw56J3H32dFa7s9"
//	    uri: "http://pol.is/m/5kssnrx6mc?polisApiKey=pkey_fhd7wkT3s9e8tw56J3H32dFa7s9"
            // url: "http://hostname/api/v3/conversations"
//            url: "http://hostname/"
        }
    ).on('response', function (resp) {
/*        for (var key in resp) {
             if (typeof  resp[key] !== "function") {
                 console.log(key + ": " + resp[key]);
             }
         }*/
    }).on('error', function (err) {
         for (var key in err) {
             if (typeof  err[key] !== "function") {
                 console.log(key + ": " + err[key]);
             }
         }
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

function pipe(method, url, request, response) {
    var contentType = "text/html";
    if (method == "GET") {
	    // Add user id
	    if (url.indexOf('?') >= 0) {
		url += "&xid=" + gUserId;
	    } else {
		url += "?xid=" + gUserId;
	    }
    }
    var headers = {};
//    var headers = request.headers;
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
    if (method == "POST") {
	var body = '';
        request.on('data', function (data) {
            body += data;
        });

        request.on('end', function (){ 
	    body = qs.parse(body);
console.log('before='+body);
    	    if (body.ownerXid) 
		body.ownerXid = gUserId;
    	    body.xid = gUserId;
	    config.body = JSON.stringify(body);
console.log('body='+JSON.stringify(config.body));
	    pipeRequest(config, response);
       });
    } else {
	pipeRequest(config, response);
    }
}

function pipeRequest(config, response) {
    var body = [];
    doRequest(config)
      .on('response', function (resp) {
        console.log("Responded " + resp.statusCode);
        contentType = resp.headers['content-type'];
        console.log(contentType);
    }).on('error', function (err) {
         for (var key in err) {
             if (typeof  err[key] !== "function") {
                 console.log(key + ": " + err[key]);
             }
         }
        response.writeHead(200, {"Content-Type": contentType});
        // response.writeHead(500, {"Content-Type": "text/html"});
        response.write("Error:<br>" + err);
        response.end();
    }).on('data', function (chunk) {
        body.push(chunk);
    }).on('end', function () {
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

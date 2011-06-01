var sys = require('sys'),
http = require('http'),
fs = require('fs'),
emitter = require('events').EventEmitter;

function Eventer() {};
Eventer.prototype = new process.EventEmitter();
var emitter = new Eventer();

var hc = require('./node-httpclient/lib/httpclient');
var url = 'http://10.0.0.254/Jpeg/CamImg.jpg';

var client = new hc.httpclient();
var g_fetcher = undefined;
var listeners = 0;

emitter.addListener("start-streaming", function(){
    listeners++;
    sys.puts("we have "+listeners+" listeners, fetching");
	g_fetcher = setInterval(function(){
	    client.perform(url, "GET", function(result) {
	        var body = result.response.body;
	        var jl = body.length;
	        sys.puts("fetched JPEG of "+jl);
	        emitter.emit("webcam-image", jl, body);
	    }, null, {"Connection":"close", "x-binary": true}, null);
	}, 10000);
    sys.puts("fetcher = "+sys.inspect(g_fetcher));
});

emitter.addListener("stop-streaming", function(){
    if (listeners > 0) { 
        listeners--;
        sys.puts("stop-streaming: listeners == "+listeners);
        if (listeners == 0 && g_fetcher !== undefined) {
            sys.puts("clearing interval "+sys.inspect(g_fetcher));
            clearInterval(g_fetcher);
        }
    }
});    

http.createServer(function (req, res) {
    emitter.emit("start-streaming");
    req.connection.addListener("end", function(){
        sys.puts("http stream ended");
        emitter.emit("stop-streaming");
    });
    res.writeHead(200, {
        'Expires': "Thu, 1 Jan 1998 00:00:00 GMT",
        'Content-Type': 'multipart/x-mixed-replace; boundary=mp-boundary'
    });
    sys.puts('Starting sending time');
    res.write("--mp-boundary\r\n");
    emitter.addListener("webcam-image", function(jl, body) {
        sys.puts("got a JPEG of "+jl);
        res.write(
            "Content-Type: image/jpeg\r\n"+
            "Content-Length: "+jl+"\r\n"+
            "\r\n"+ body +
            "\r\n--mp-boundary\r\n",
            "binary"
        );
    });
}).listen(8090);

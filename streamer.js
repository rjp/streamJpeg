var sys = require('sys'),
http = require('http'),
fs = require('fs'),
emitter = require('events').EventEmitter;

// DEFAULT CONFIGURATION
var defaults = {
    "webcam": 'http://10.0.0.254/Jpeg/CamImg.jpg',
    "port"  : 8090,
    "interval": 10000 // milliseconds
};

var url = process.argv[2] || defaults.webcam;
var port = parseInt(process.argv[3], 10) || defaults.port;
var interval = parseInt(process.argv[4], 10) || defaults.interval;

if (interval < 1000) { // possibly in seconds
    sys.puts("* interval of " + interval + " too small, converting to milliseconds");
    interval = interval * 1000;
}

sys.puts("* will fetch every " + interval + "ms from " + url + " to port " + port);

function Eventer() {};
Eventer.prototype = new process.EventEmitter();
var emitter = new Eventer();

var hc = require('./node-httpclient/lib/httpclient');

var client = new hc.httpclient();
var g_fetcher = undefined;
var listeners = [];

emitter.addListener("start-streaming", function(key){
    // only start fetching if we don't already have a fetcher running
    if (g_fetcher === undefined) {
		g_fetcher = setInterval(function(){
		    client.perform(url, "GET", function(result) {
		        var body = result.response.body;
		        var jl = body.length;
		        sys.puts("fetched JPEG of "+jl);
		        emitter.emit("webcam-image", jl, body);
		    }, null, {"Connection":"close", "x-binary": true}, null);
		}, 10000);
	    sys.puts("fetcher = "+sys.inspect(g_fetcher));
    }
});

emitter.addListener("stop-streaming", function(key){
    delete listeners[key];
    var count = Object.keys(listeners).length;
    sys.puts("stop-streaming: listeners == "+count);
    if (count == 0 && g_fetcher !== undefined) {
        sys.puts("clearing interval "+sys.inspect(g_fetcher));
        clearInterval(g_fetcher);
    }
});    

emitter.addListener('webcam-image', function(jl, body) {
    sys.puts("got a JPEG of "+jl);
    for(var i in listeners) {
        var res = listeners[i];
        sys.puts("sending jpeg to "+i);
	    res.write(
	        "Content-Type: image/jpeg\r\n"+
	        "Content-Length: "+jl+"\r\n"+
	        "\r\n"+ body +
	        "\r\n--mp-boundary\r\n",
	        "binary"
	    );
    }
});

http.createServer(function (req, res) {
    var key = req.connection.remoteAddress + ':' + req.connection.remotePort;
    emitter.emit("start-streaming", key);
    req.connection.addListener("end", function(){
        sys.puts("http stream ended");
        emitter.emit("stop-streaming", key);
    });
    res.writeHead(200, {
        'Expires': "Thu, 1 Jan 1998 00:00:00 GMT",
        'Content-Type': 'multipart/x-mixed-replace; boundary=mp-boundary'
    });
    res.write("--mp-boundary\r\n");
    listeners[key] = res;
}).listen(port);

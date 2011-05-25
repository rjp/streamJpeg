var sys = require('sys'),
http = require('http'),
fs = require('fs');

var hc = require('./node-httpclient/lib/httpclient');
var url = 'http://10.0.0.254/Jpeg/CamImg.jpg';

var client = new hc.httpclient();

http.createServer(function (req, res) {
    res.writeHead(200, {
        'Expires': "Thu, 1 Jan 1998 00:00:00 GMT",
        'Content-Type': 'multipart/x-mixed-replace; boundary=mp-boundary'
    });
    sys.puts('Starting sending time');
    res.write("--mp-boundary\r\n");
    setInterval(function(){
        client.perform(url, "GET", function(result) { 
            var body = result.response.body;
            var jl = body.length;
	        // sys.puts("sending "+jl+" bytes...");
	        res.write(
	            "Content-Type: image/jpeg\r\n"+
	            "Content-Length: "+jl+"\r\n"+
	            "\r\n"+ body +
	            "\r\n--mp-boundary\r\n",
	            "binary"
	        );
        }, null, {"Connection":"close", "x-binary": true}, null);
    },10000);
}).listen(8090);

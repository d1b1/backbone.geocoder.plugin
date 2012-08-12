var express    = require('express'),
    requestObj = require('request'),
    http       = require('http'),
    crypto     = require('crypto');

// ---------------------------------------------------

var app = express.createServer( express.logger() );

app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());

  app.use(express.static( __dirname + '/public/' ));
});

var port = process.env.PORT || 4200;
app.listen(port, function() { 
  console.log("StartUp: backbone.js-geocoder-plugin " + port ); 
});

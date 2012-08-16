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
});

app.configure('production', function() {
  console.log('Note: release');

  // Setup the Require.js
  app.use('/assets/js/libs/', express.static(__dirname + '/public/dist/release/'));

  // Setup the CSS file.
  app.use('/assets/css/', express.static(__dirname + '/public/dist/release/'));
});

app.use(express.static( __dirname + '/public/' ));

var port = process.env.PORT || 4200;
app.listen(port, function() { 
  console.log("StartUp: backbone.js-geocoder-plugin " + port ); 
});

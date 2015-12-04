var Express = require('express'),
    app = new Express(),
    config = require('./configcontroller.js'),
    bodyParser = require('body-parser'),
    proxy = require('express-http-proxy');


// database
var redis = require("redis"),
    client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});

/// Helpers

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

// expose static admin UI
app.use('/_admin', Express.static('public'));

// import config controller
app.use('/_config', config);

// proxy everything else
app.use('/*', function(req, res, next)
  {
    console.log(req.originalUrl);
    if (req.originalUrl.startsWith('/_')) 
    {
      return next();
    }
    console.log('looking up config for: ' + req.headers.host);

    client.get(req.headers.host, function(err, mapping) {
      

      // var mapping = mappings[req.headers.host];
      var conf = JSON.parse(mapping);
      console.log('mapping to: ' + conf.host);
      
      var failureType = 'failureType' in conf ? conf._failureType : 'end';
      
      if ( 'failureRate' in conf )
      {
        if ( Math.random() < conf.failureRate )
        {
          console.log(failureType);
          switch (failureType)
          {
            case 'end': res.end(); break;
            case '404': return next();
          }
        }
      }
      
      var proxyfunc = proxy(conf.host, {  
        forwardPath: function(req, res) {
          console.log(conf.host + req.originalUrl);
          return conf.host + req.originalUrl;
        }
      });
      
      (proxyfunc)(req, res, next);
    });
});


app.listen(process.env.PORT || 80);

module.exports = app;

console.log('fatalist started');
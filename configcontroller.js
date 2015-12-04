var Express = require('express'),
    app = new Express(),
    bodyParser = require('body-parser');


// database
var redis = require("redis"),
    client = redis.createClient();

client.on("error", function (err) {
    console.log("Error " + err);
});


app.use( bodyParser.json() );


app.post('/*', function(req, res, next) {
  var key = req.originalUrl.replace('/_config/', '');
  client.set(key, JSON.stringify(req.body));
  res.end();
});

app.get('/*', function(req, res, next) {
  var key = req.originalUrl.replace('/_config/', '');
  if ( key.length )
  {
    client.get(key, function(err, resp) {
      res.send(JSON.parse(resp));
      res.end();
    });
  }
  else 
  {
    client.keys("*", function (err, replies) {
        client.mget(replies, function(err, resp) {
          
          var responses = resp.map(JSON.parse);
          var output = {};
          for ( var i = 0; i < responses.length; i++ )
          {
            output[replies[i]] = responses[i];
          }
          res.send(output);
          res.end();
        });
    });
  }
});

module.exports = app;
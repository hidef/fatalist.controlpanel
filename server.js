var Express = require('express'),
    app = new Express(),
    bodyParser = require('body-parser'),
    proxy = require('express-http-proxy'),
    vhost = require('vhost'),
    url = require('url') ;


function assert(boolean, message)
{
  if ( !boolean ) throw new Error(message);
}


var redisUrl = url.parse(process.env.REDIS_URL || 'redis://localhost:6379' );
var authParts = redisUrl.auth.split(':');
assert(authParts.length == 2 || authParts.length == 0, 'unexpected redis authentication values, expected nothing or <username>:<password>');
// database
var redis = require("redis"),
    client = redis.createClient(redisUrl.host, redisUrl.port, authParts.length == 2 ? authParts[1] : null);

console.log('connected to redis');


client.on("error", function (err) {
    console.log("Error " + err);
});


app.use( bodyParser.json() );

// expose static admin UI
app.use(Express.static('public'));

app.get('/_env', function(req, res)
{
  res.send(process.env);
  res.end();
});

app.post('/_config/*', function(req, res, next) {
  var key = req.originalUrl.replace('/_config/', '');
  client.set(key, JSON.stringify(req.body));
  res.end();
});

app.get('/_config/*', function(req, res, next) {
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
      if (err) console.log(err);
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

app.listen(process.env.PORT || 80);

module.exports = app;

console.log('fatalist.controlpanel started');
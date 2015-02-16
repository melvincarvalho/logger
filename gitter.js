var https  = require('https');
var fs     = require('fs');
var mkdirp = require('mkdirp')

var roomId    = process.env.ROOM_ID;
var token     = process.env.TOKEN;
var heartbeat = " \n";

if (!roomId) {
  console.error('Please set environment variable ROOM_ID');
  process.exit(-1);
}

if (!token) {
  console.error('Please set environment variable TOKEN');
  process.exit(-1);
}

console.log('logging room : ' + roomId);

var gitter = {
  hostname: 'stream.gitter.im',
  port:     443,
  path:     '/v1/rooms/' + roomId + '/chatMessages',
  method:   'GET',
  headers:  {'Authorization': 'Bearer ' + token}
};

var ldp = {
  hostname: 'taskify.databox.me',
  rejectUnauthorized: false,
  port:     443,
  method:   'PUT',
  headers:  {'Content-Type': 'text/turtle'}
};


function gitterToTurtle(message) {
  // create turtle
  var turtle  = '<' + message['id'] + '#this> ';
  turtle += 'a <http://rdfs.org/sioc/ns#Post> ; ';
  turtle += '<http://rdfs.org/sioc/ns#content> """'+ message['text'] +'""" ; ';
  turtle += '<http://purl.org/dc/terms/creator> <#author>   ; ';
  turtle += '<http://www.w3.org/ns/mblog#author> <#author>   ; ';
  turtle += '<http://purl.org/dc/terms/created> "'+ message['sent'] +'"^^<http://www.w3.org/2001/XMLSchema#dateTime> . ';

  turtle  += '<#author> ';
  turtle += 'a <http://xmlns.com/foaf/0.1/#Person> ; ';
  turtle += '<http://xmlns.com/foaf/0.1/nick> """'+ message['fromUser']['username'] +'""" ; ';
  turtle += '<http://xmlns.com/foaf/0.1/name> """'+ message['fromUser']['displayName'] +'""" ; ';
  turtle += '<http://www.w3.org/2002/07/owl#sameAs> <https://github.com/'+ message['fromUser']['username'] +'#this>   ; ';
  turtle += '<http://xmlns.com/foaf/0.1/depiction> <#'+ message['fromUser']['avatarUrlSmall'] +'>   . ';

  return turtle;
}



var req = https.request(gitter, function(res) {
  res.on('data', function(chunk) {
    var msg = chunk.toString();
    if (msg !== heartbeat) {
      console.log('Message: ' + msg);
      var message = JSON.parse(msg);

      // create dir
      var today = new Date().toISOString().substring(0,10);
      var datadir   = './log/';
      datadir   += roomId + '/';
      datadir   += today + '/' ;

      console.log('Creating dir: ' + datadir);
      mkdirp.sync(datadir);

      // create turtle
      var turtle  = gitterToTurtle(message);

      console.log(turtle);

      // write file
      var out = datadir + message['id'] + '.json';
      console.log('Writing to: ' + out);
      fs.writeFileSync(out, msg);
      out = datadir + message['id'];
      console.log('Writing to: ' + out);
      fs.writeFileSync(out, turtle);

      // put file to ldp
      ldp.path = "/Public/log/" + roomId + '/' + today + '/' + message['id'];
      var put = https.request(ldp, function(res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.on('data', function (chunk) {
          console.log('BODY: ' + chunk);
        });
      });

      put.on('error', function(e) {
        console.log('problem with request: ' + e.message);
      });

      put.write(turtle);
      put.end();

    }
  });
});

req.on('error', function(e) {
  console.log('Something went wrong: ' + e.message);
});

req.end();

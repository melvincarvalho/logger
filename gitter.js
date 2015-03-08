var Gitter = require('node-gitter');
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

var gitter = new Gitter(token);


var ldp = {
  hostname: 'gitter.databox.me',
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
  turtle += '<http://xmlns.com/foaf/0.1/depiction> <'+ message['fromUser']['avatarUrlSmall'] +'>   . ';

  return turtle;
}



gitter.rooms.find(roomId).then(function(room) {

  var events = room.streaming().chatMessages();

  // The 'snapshot' event is emitted once, with the last messages in the room
  events.on('snapshot', function(snapshot) {
    console.log(snapshot.length + ' messages in the snapshot');
  });

  // The 'chatMessages' event is emitted on each new message
  events.on('chatMessages', function(message) {
    console.log('A message was ' + message.operation);
    console.log('Text: ', message.model.text);

    var msg = message.model;

    console.log(message.model);
    message = message.model;
    //var message = JSON.parse(msg);

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

    // put meta file
    ldp.path = "/Public/log/" + roomId + '/' + today + '/,meta';
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

    put.write('<> <http://www.w3.org/ns/posix/stat#mtime> "'+ Math.floor(Date.now() / 1000) +'" . ');
    put.end();

  });
});

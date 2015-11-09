/**
 * @fileOverview Gets gitter history and sends it to remote storage and locally.
 *   requires TOKEN environment veriable obtainable from
 *   https://developer.gitter.im/apps
 * @author <a href="http://melvincarvalho.com/#me">Melvin Carvalho</a>
 */


//requires
var debug  = require('debug')('gitter');
var Gitter = require('node-gitter');
var func   = require('./functions.js');

// init
var dataDir       = './data';
var defaultHost   = 'gitter.databox.me';
var defaultRoomId = '53fb5b57163965c9bc200404';


// env variables
var roomId = process.env.ROOM_ID;
var token  = process.env.TOKEN;
var host   = process.env.HOST;
if (!token) {
  console.error('TOKEN environment variable is required');
  process.exit(-1);
}

if (!roomId) {
  if (process.argv[2]) {
    roomId = process.argv[2];
  } else {
    roomId = defaultRoomId;
  }
}

if (!host) {
  host = defaultHost;
}

if (process.env.DATA_DIR) {
  dataDir = process.env.DATA_DIR;
}

var cert = process.env.CERT;


// gitter
var gitter = new Gitter(token);


debug('logging room : ' + roomId);


gitter.rooms.find(roomId).then(function(room) {

  var events = room.streaming().chatMessages();

  // The 'snapshot' event is emitted once, with the last messages in the room
  events.on('snapshot', function(snapshot) {
    debug(snapshot.length + ' messages in the snapshot');
  });

  // The 'chatMessages' event is emitted on each new message
  events.on('chatMessages', function(message) {
    debug('A message was ' + message.operation);
    debug('Text: ', message.model.text);

    var msg = message.model;

    debug(message.model);
    message = message.model;
    //var message = JSON.parse(msg);

    // create turtle
    var turtle  = func.getPostFromMessage(message);

    // write file
    func.writeMessageToFile(message, roomId, dataDir);

    func.sendToStorage(host, func.getPathFromMessage(message, roomId), turtle, cert, function(err, res){
      if (!err) {
        debug(res);
      } else {
        debug(err);
      }
    });

  });
});

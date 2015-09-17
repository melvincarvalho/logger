/**
 * @fileOverview Gets gitter history and sends it to remote storage and locally.
 *   requires TOKEN environment veriable obtainable from
 *   https://developer.gitter.im/apps
 * @author <a href="http://melvincarvalho.com/#me">Melvin Carvalho</a>
 */


//requires
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
  console.err('TOKEN environment variable is required');
  process.exit(-1);
}

if (!roomId) {
  roomId = defaultRoomId;
}

if (!host) {
  host = defaultHost;
}


// gitter
var gitter        = new Gitter(token);


// main
func.getGitterPosts(null, roomId, host, gitter, function() {
  console.log('messages feteched');
});

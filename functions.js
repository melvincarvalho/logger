/**
 * @fileOverview Functions for gitter API operations
 * @author <a href="http://melvincarvalho.com/#me">Melvin Carvalho</a>
 */


// requires
var debug  = require('debug')('gitter');
var fs     = require('fs');
var https  = require('https');
var mkdirp = require('mkdirp');
var Gitter = require('node-gitter');
var util   = require('util');

var queue         = [];
var finished      = false;


/**
 * addToQueue Adds an item to the queue
 * @param {String} path The path of the http request
 * @param {String} host The host to send posts
 * @param {String} data The data in turtle to PUT
 */
function addToQueue(path, host, data) {
  queue.push({'path': path, 'host': host, 'data': data, 'status': 'queued'});
}


/**
 * flushQueue Flushes all items in the queue with a delay
 * @param  {String}   cert     Certificate path used for auth
 * @param  {Function} callback Callback with error, number of posts and first ID
 */
function flushQueue(cert, callback) {
  DELAY = 1000;
  for (var i=0; i<queue.length; i++) {
    (function(i){
      setTimeout(function(){
        sendToStorage(queue[i].host, queue[i].path, queue[i].data, cert, function(err, res) {
          if (!err) {
            debug(res);
          } else {
            debug(err);
          }
        });
      }, DELAY * i);
    }(i));
  }
  if (callback) {
    callback(null);
  }
}


/**
 * sendToStorage Sends turtle data to remote storage
 * @param  {String}   host     The host to send to
 * @param  {String}   path     The path relative to host
 * @param  {String}   data     The turtle to send
 * @param  {String}   cert     Certificate path used for auth
 * @param  {Function} callback Callback with error or response
 */
function sendToStorage(host, path, data, cert, callback) {
  var protocol = 'https://';

  var ldp = {
    hostname: host,
    rejectUnauthorized: false,
    port:     443,
    method:   'PUT',
    headers:  {'Content-Type': 'text/turtle'}
  };

  if (cert) {
    ldp.key = fs.readFileSync(cert);
    ldp.cert = fs.readFileSync(cert);
  }

  // put file to ldp
  ldp.path = path;
  debug('sending to : ' + protocol + host + path);
  var put = https.request(ldp, function(res) {
    chunks = '';
    debug('STATUS: ' + res.statusCode);
    debug('HEADERS: ' + JSON.stringify(res.headers));
    res.on('data', function (chunk) {
      chunks += chunk;
    });
    res.on('end', function (chunk) {
      callback(null, chunks);
    });
  });

  put.on('error', function(e) {
    callback(e);
  });

  put.write(data);
  put.end();
}


/**
 * postsCallback Callback after getting posts for pagination
 * @param  {String}   err Errors
 * @param  {String}   limit Number of messages returned
 * @param  {String}   beforeId The beforeId for pagination
 * @param  {String}   notBeforeId The id not to get posts before
 * @param  {String}   roomId The id of the foom
 * @param  {String}   host This remote storage host
 * @param  {Function} gitter Gitter API object
 * @param  {String}   dataDir Data directory to log results
 * @param  {String}   cert Certificate path used for auth
 * @param  {Function} callback Callback with error, number of posts and first ID
 */
function postsCallback(err, length, beforeId, notBeforeId, roomId, host, gitter, dataDir, cert, callback) {
  var limit = 50;
  debug('Getting ' + limit + ' messages from room : ' + roomId);
  if (!err) {
    if (length === limit) {
      getGitterPosts(beforeId, notBeforeId, roomId, host, gitter, dataDir, cert, postsCallback);
    } else {
      debug('fetched all messages!');
      debug(queue);
      flushQueue(cert, callback);
    }
  } else {
    debug(err);
  }
}

/**
 * getGitterPosts Gets posts from the gitter API 50 at a time
 * @param  {String}   beforeId    The id to get posts before for pagination
 * @param  {String}   notBeforeId The id not to get posts before
 * @param  {String}   roomId      The id of the foom
 * @param  {String}   host        The remote storage host
 * @param  {Function} gitter      Gitter API object
 * @param  {String}   dataDir     The data directory to log to
 * @param  {String}   cert        Certificate path used for auth
 * @param  {Function} callback    Callback with error, number of posts and first ID
 */
function getGitterPosts(beforeId, notBeforeId, roomId, host, gitter, dataDir, cert, callback) {
  limit = 50;
  debug('Getting ' + limit + ' messages from room : ' + roomId);

  gitter.rooms.find(roomId).then(function(room) {
    return room.chatMessages({'beforeId' : beforeId, 'limit' : limit});
  }).then(function(messages) {
    debug('found ' + messages.length + ' messages');
    if (messages.length>0) {
      firstId = messages[0].id;
    }
    for (var i=messages.length-1; i>=0; i--) {
      if (notBeforeId) {
        if (messages[i].id == notBeforeId) {
          finished = true;
        }
      }
      if (!finished) {
        writeMessageToFile(messages[i], roomId, dataDir);
        addToQueue(getPathFromMessage(messages[i], roomId), host, getPostFromMessage(messages[i]));
      }
    }
    if (!finished) {
      postsCallback(null, messages.length, firstId, notBeforeId, roomId, host, gitter, dataDir, cert, callback);
    } else {
      flushQueue(cert, callback);
    }
  }).catch(function(error) {
    debug(error);
  });

}


/**
 * writeMessageToFile Writes a message to a file syncronously
 * @param  {String} message The message to write
 * @param  {String} roomId  The gitter roomID
 * @param  {String} dataDir The data directory to write to
 */
function writeMessageToFile(message, roomId, dataDir) {
  var dir = getDirFromMessage(message, roomId, dataDir);
  mkdirp.sync(dir);

  var file = getFileFromMessage(message, roomId, dataDir);
  var turtle = getPostFromMessage(message);

  fs.writeFileSync(file, turtle);

}


/**
 * getPathFromMessage Gets a remote path based on message
 * @param  {String} message The gitter message
 * @param  {String} roomId  The gitter roomID
 * @return {String}         A remote path based on date and message id
 */
function getPathFromMessage(message, roomId) {
  return "/Public/log/" + roomId + '/' + message.sent.substring(0, 10) + '/' + message.id + '.ttl';
}


/**
 * getFileFromMessage Gets the local filename from a message
 * @param  {String} message The gitter message
 * @param  {String} roomId  The gitter roomID
 * @param  {String} dataDir The base data directory
 * @return {String}         A local filename based on message id
 */
function getFileFromMessage(message, roomId, dataDir) {
  if (!message || !message.sent) return;
  return dataDir + '/' + roomId + '/' + message.sent.substring(0, 10) + '/' + message.id + '.ttl';
}


/**
 * getDirFromMessage Gets the local directory from a message
 * @param  {String} message The gitter message
 * @param  {String} roomId  The gitter roomID
 * @param  {String} dataDir The base data directory
 * @return {String}         A local directory based on date and roomId
 */
function getDirFromMessage(message, roomId, dataDir) {
  if (!message || !message.sent) return;
  return dataDir + '/' + roomId + '/' + message.sent.substring(0, 10);
}


/**
 * getPostFromMessage Gets sioc Post in turtle from gitter message
 * @param  {String} message JSON from the gitter API
 * @return {String}         Turtle containing SIOC post and author
 */
function getPostFromMessage(message) {
  if ( !message || !message.id || !message.fromUser ) return;

  // create turtle
  var turtle  = '<' + message.id + '#this> ';
  turtle += 'a <http://rdfs.org/sioc/ns#Post> ; \n';
  turtle += '<http://rdfs.org/sioc/ns#content> """'+ message.text +'""" ; \n';
  turtle += '<http://purl.org/dc/terms/creator> <#author>   ; \n';
  turtle += '<http://www.w3.org/ns/mblog#author> <#author>   ; \n';
  turtle += '<http://purl.org/dc/terms/created> "'+ message.sent +'"^^<http://www.w3.org/2001/XMLSchema#dateTime> . \n\n';

  turtle  += '<#author> ';
  turtle += 'a <http://xmlns.com/foaf/0.1/#Person> ; \n';
  turtle += '<http://xmlns.com/foaf/0.1/nick> """'+ message.fromUser.username +'""" ; \n';
  turtle += '<http://xmlns.com/foaf/0.1/name> """'+ message.fromUser.displayName +'""" ; \n';
  turtle += '<http://www.w3.org/2002/07/owl#sameAs> <https://github.com/'+ message.fromUser.username +'#this>   ; \n';
  turtle += '<http://xmlns.com/foaf/0.1/depiction> <'+ message.fromUser.avatarUrlSmall +'>   . \n';

  return turtle;
}


module.exports = {
  addToQueue         : addToQueue,
  flushQueue         : flushQueue,
  sendToStorage      : sendToStorage,
  postsCallback      : postsCallback,
  getGitterPosts     : getGitterPosts,
  writeMessageToFile : writeMessageToFile,
  getPathFromMessage : getPathFromMessage,
  getFileFromMessage : getFileFromMessage,
  getDirFromMessage  : getDirFromMessage,
  getPostFromMessage : getPostFromMessage
};

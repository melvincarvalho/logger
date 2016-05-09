#!/usr/bin/env node


/**
 * @fileOverview Gets gitter history and sends it to remote storage and locally.
 *   requires TOKEN environment veriable obtainable from
 *   https://developer.gitter.im/apps
 * @author <a href="http://melvincarvalho.com/#me">Melvin Carvalho</a>
 */


 var fs = require('fs');
 var path = require('path');
 var Gitter = require('node-gitter');
 var func   = require('../lib/functions.js');


 var argv = require('nomnom')
   .script('gitter')
   .option('version', {
     flag: true,
     help: 'Print current logger version',
     callback: function () {
       fs.readFile(path.resolve(__dirname, '../package.json'), 'utf-8', function (_, file) {
         console.log(JSON.parse(file).version);
       });
     }
   })
   .option('verbose', {
     abbr: 'v',
     flag: true,
     help: 'Print the logs to console\n'
   })
   .parse();



 function bin (argv) {
   // Print version and leave
   if (argv.version) {
     return 0;
   }


   // Set up debug environment
   process.env.DEBUG = argv.verbose ? 'logger:*' : false;
   var debug = require('../lib/debug').history;

   // Signal handling (e.g. CTRL+C)
   if (process.platform !== 'win32') {
     // Signal handlers don't work on Windows.
     process.on('SIGINT', function () {
       debug('logger stopped.');
       process.exit();
     });
   }

   // Finally starting app
   function main(argv) {
     // init
     var dataDir       = './data';
     var defaultHost   = 'gitter.databox.me';
     var defaultRoomId = '53fb5b57163965c9bc200404';
     var notBeforeId;


     // env variables
     var roomId = process.env.ROOM_ID;
     var token  = process.env.TOKEN;
     var host   = process.env.HOST;
     if (process.env.DATA_DIR) {
       dataDir = process.env.DATA_DIR;
     }
     if (!token) {
       console.err('TOKEN environment variable is required');
       process.exit(-1);
     }

     if (!roomId) {
       if (process.argv[2]) {
         roomId = process.argv[2];
       } else {
         roomId = defaultRoomId;
       }
     }

     if (process.argv[3]) {
       notBeforeId = process.argv[3];
     }


     if (!host) {
       host = defaultHost;
     }

     var cert = process.env.CERT;


     // gitter
     var gitter = new Gitter(token);


     // main
     func.getGitterPosts(null, notBeforeId, roomId, host, gitter, dataDir, cert, function() {
       console.log('messages fetched');
     });
   }

   main(argv);

 }



 bin(argv);

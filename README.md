# logger

[![Join the chat at https://gitter.im/melvincarvalho/logger](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/melvincarvalho/logger?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Setup

1. Firstly you will need a gitter API access token available from: https://developer.gitter.im/apps

    `export TOKEN=<token>`

2. Secondly you will need some storage space e.g available from : https://linkeddata.github.io/signup/?tab=signup

    `export DOMAIN=<domain> (e.g. foo.databox.me)`

3. You will need the gitter room ID (use inspect element .data-id)

    `export ROOM_ID=<room_id>`

Export environement vaiables before running

4. Optional debugging

    `export DEBUG=gitter`

## Running

    `nodejs history.js`

run once to set up the history

    `nodejs gitter.js`

run logger in realtime

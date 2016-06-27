'use strict';
const AWS = require('aws-sdk');
let http = require('http');
const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
exports.handler = (event, context, callback) => {
  processRecords(event, (err) => {
    if (err) callback(err);
    else callback();
  });
};
function processRecords(event, callback){
  if(event.Records.length > 0){
    var _rec = event.Records.shift();
    if(_rec.eventName === 'INSERT'){
      let _url = _rec.dynamodb.Keys.href.S;
      const req = http.get(_url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          var _games = findGames(body, _url);
          if(_games.length > 0){
            _games = unique(_games);
            updateCount(_url, _games.length, (err) => {
              if (err) callback(err);
              else {
                saveGames(_games, (err) => {
                  if (err) {
                      console.log(_url);
                      callback(err);
                  }
                  else processRecords(event, callback); 
                });
              }
            });
          }else processRecords(event, callback);
        });
      });
      req.on('error', callback);
    }else callback();
  }else callback();
}
function findGames(body, url){
  let _regex = /\\r\\n\[Event .*?(1\/2-1\/2|1-1\/2|1\/2-1|1-0|0-1)(<br.*?>|)\\r\\n/g;
  let _found = body.match(_regex);
  if(_found === null) return [];
  else return _found.map((pgn) => {
    //let _parts = pgn.replace(/<br.*?>/g, '').replace(/\\r\\n/g, '').replace(/&quot;/g,'"').replace(/\[%.*?\]/g, '').replace(/\[/g,'').split(']<br />\r\n');
    let _parts = pgn.replace(/&quot;/g,'"').replace(/\[/g,'').split(']<br />\r\n');
    let _game = {};
    _game.moves = _parts.pop().replace(/\\r\\n/g, '').replace(/<br.*?>/g, '');
    _parts.forEach((p) => {
      let _prop = p.split(' "');
      if(_prop[1] === undefined){
           console.log(url);
           console.log(_prop);
      }
      _game[_prop[0]] = _prop[1].slice(0,-1).replace(/\\r\\n/g, '').replace(/<br.*?>/g, '');
    });
    Object.keys(_game).forEach(function(k){
      if(_game[k] === '' || _game[k] === '?' || _game[k] === null || (Array.isArray(_game[k]) && _game[k].length === 0)) delete _game[k];
    });
    _game.id = _game.Date + '|' + _game.White + '|' + _game.Black;
    return { PutRequest: { Item: _game } };
  });
}
function saveGames(games, callback){
  if(games.length > 0){
    let _params = { RequestItems: {} };
    _params.RequestItems.games = games.splice(0, 25);
    dynamodb.batchWrite(_params, (e, data) => {
      if(e) callback(e);
      else saveGames(games, callback);
    });
  } else callback();
}
function unique (putRequests){
    let _result = [];
    putRequests.forEach(function(pr){
        var _duplicate = _result.filter(function(i){
            return (i.PutRequest.Item.id === pr.PutRequest.Item.id);
        });
        if(_duplicate.length === 0) _result.push(pr);
    });
    return _result;
}
function updateCount(url, count, callback){
  let _params = {
    TableName: 'threads',
    Key: { href: url },
    UpdateExpression: 'set games = :val',
    ExpressionAttributeValues: {
      ':val': count     
    }
  };
  dynamodb.update(_params, (e, data) => {
    if(e) callback(e);
    else callback();
  });
}
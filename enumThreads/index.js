'use strict';
const AWS = require('aws-sdk');
const ineed = require('ineed');
const dynamodb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
exports.handler = (event, context, callback) => {
  let _url = event.Records[0].Sns.Message;
  ineed.collect.hyperlinks.from(_url, (err, response, result) => {
    if(err) callback(err);
    else {
      let _links = fixurl(result.hyperlinks.filter((link) => {
        return link.href.indexOf('showthread.php') > -1 && link.href.indexOf('#post') === -1;
      }));
      if(_links.length > 0){
        let _params = {
          RequestItems: {
            TEST: _links.map((l) => { return { PutRequest: { Item: l } }; })
          }
        };
        dynamodb.batchWrite(_params, (err, data) => {
          if (err) callback(err);
          else callback();
        });
      }else callback();
    }
  });
};
function fixurl(links){ // remove sessionid from url
  return links.map((l) => {
    l.href = l.href.slice(0, -35);
    return l;
  });
}
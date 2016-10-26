'use strict';

var Mailjet = require('node-mailjet');
var packageData = require('../package.json');

module.exports = function(options) {
  return new MailjetTransport(options);
};

function MailjetTransport(options) {
  this.name = 'Mailjet';
  this.version = packageData.version;

  options = options || {};
  var auth = options.auth || {};
  this.mailjetClient = Mailjet.connect(auth.api_key, auth.api_secret);
}

MailjetTransport.prototype.send = function(mail, callback) {
  var sendEmail = Mailjet.post('send');
  var email = mail.data;

  //   // fetch envelope data from the message object
  // var addresses = mail.message.getAddresses();
  // var from = [].concat(addresses.from || addresses.sender || addresses['reply-to'] || []).shift();
  // var to = [].concat(addresses.to || []);
  // var cc = [].concat(addresses.cc || []);
  // var bcc = [].concat(addresses.bcc || []);

  //   // populate from and fromname
  // if (from) {
  //   if (from.address) {
  //     email['FromEmail'] = from.address;
  //   }

  //   if (from.name) {
  //     email['FromName'] = from.name;
  //   }
  // }


  // // populate to and toname arrays
  // email.to = to.map(function(rcpt) {
  //   return rcpt.address || '';
  // });

  // email.toname = to.map(function(rcpt) {
  //   return rcpt.name || '';
  // });

  // // populate cc and bcc arrays
  // email.cc = cc.map(function(rcpt) {
  //   return rcpt.address || '';
  // });

  // email.bcc = bcc.map(function(rcpt) {
  //   return rcpt.address || '';
  // });

  // // a list for processing attachments
  // var contents = [];

  // var emailData = {
  //   'FromEmail': 'my@email.com',
  //   'FromName': 'My Name',
  //   'Subject': 'Test with the NodeJS Mailjet wrapper',
  //   'Text-part': 'Hello NodeJs !',
  //   'Recipients': [{'Email': 'roger@smith.com'}],
  //   'Attachments': [{
  //     "Content-Type": "text-plain",
  //     "Filename": "test.txt",
  //     "Content": "VGhpcyBpcyB5b3VyIGF0dGFjaGVkIGZpbGUhISEK",
  //   }],
  // }

  sendEmail
  .request(email)
  .then(handlePostResponse)
  .catch(handleError);
}

function handleError (err) {
  throw new Error(err.ErrorMessage);
}

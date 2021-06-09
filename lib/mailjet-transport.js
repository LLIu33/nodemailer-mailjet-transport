'use strict';

const async = require('async');
const Mailjet = require('node-mailjet');

const packageData = require('../package.json');
const utils = require('./utils');
const Message = require('./message');
const MailComposer = require('nodemailer/lib/mail-composer');
const BuildAttachment = require('nodemailer-build-attachment');

const { callbackPromise } = require('nodemailer/lib/shared');
const addressFormatter = utils.addressFormatter;
const addressParser = utils.addressParser;
const headersParser = utils.headersParser;

function parseAddress(address, parseBulk) {
  const addrs = addressParser(address || '');

  return parseBulk
    ? (addrs || []).map(addressFormatter).join(',')
    : addressFormatter(addrs[0] || {});
}

function parser(mail, next) {
  const data = mail.data || mail;

  const fromAddress = parseAddress(data.from);
  const toAddress = parseAddress(data.to, true);
  const ccAddress = parseAddress(data.cc, true);
  const bccAddress = parseAddress(data.bcc, true);
  const replyToAddress = parseAddress(data.replyTo);
  const headers = headersParser(data.headers || []);
  this._parseAttachments(data.attachments || [], (err, attachments) => {
    if (err) {
      return next(err);
    }

    const message = new Message();

    message.setFromAddress(fromAddress);
    message.setToAddress(toAddress);
    message.setCcAddress(ccAddress);
    message.setBccAddress(bccAddress);
    message.setReplyToAddress(replyToAddress);

    if (data.templateId) {
      message.setTemplateId(data.templateId, data.templateModel, data.inlineCss);
    } else if (data.templateAlias) {
      message.setTemplateAlias(data.templateAlias, data.templateModel, data.inlineCss);
    } else {
      message.setSubject(data.subject);
      message.setHtmlBody(data.html);
      message.setTextBody(data.text);
    }

    message.setHeaders(headers);
    message.setAttachments(attachments);
    message.setTag(data.tag);
    message.setMetadata(data.metadata);
    message.setTrackOpens(data.trackOpens);

    try {
      message.setTrackLinks(data.trackLinks);
    } catch (err) {
      return next(err);
    }

    next(null, message);
  });
}

function MailjetTransport(options) {
  this.name = 'Mailjet';
  this.version = packageData.version;

  options = options || {};
  const auth = options.auth || {};
  this.client = Mailjet.connect(auth.apiKey, auth.api_secret);
}

/**
 *  Send a single email via Mailjet API
 *
 * @param {Object} mail
 * @param {Function} callback
 */
MailjetTransport.prototype.send = function (mail, callback) {
  // var sendEmail = Mailjet.post('send');
  // var email = mail.data;

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

  // sendEmail
  //   .request(email)
  //   .then(handlePostResponse)
  //   .catch(handleError);
  let promise;

  if (!callback) {
    promise = new Promise((resolve, reject) => {
      callback = callbackPromise(resolve, reject);
    });

    this._parse(mail, (err, message) => {
      if (err) {
        return callback(err);
      }

      const method = (message.TemplateId || message.TemplateAlias)
        ? 'sendEmailWithTemplate'
        : 'sendEmail';

      this._requestFactory(method)(message, callback);
    });

    return promise;
  }
};

/**
 * Send emails batch via Mailjet API
 *
 * @deprecated
 * @param  {Array}  mails
 * @param  {Function}  callback
 */
MailjetTransport.prototype.sendBatch = function (mails, callback) {
  let promise;

  if (!callback) {
    promise = new Promise((resolve, reject) => {
      callback = callbackPromise(resolve, reject);
    });
  }

  this._parse(mails, (err, messages) => {
    if (err) {
      return callback(err);
    }

    this._requestFactory('sendEmailBatch')(messages, callback);
  });

  return promise;
};

/**
 * Parse a nodemailer mail(s) object to Mailjet API objects
 *
 * @param  {Object|Array}  mails
 * @param  {Function}  callback
 */
MailjetTransport.prototype._parse = function (mails, callback) {
  let single = false;
  // pre processing mails
  if (!Array.isArray(mails)) {
    mails = [mails];
    single = true;
  }

  async.mapSeries(mails, parser.bind(this), (err, messages) => {
    if (err) {
      return callback(err);
    }

    // post processing messages
    callback(null, single ? messages[0] : messages);
  });
};

/**
 * Parse nodemailer attachment(s)
 *
 * @param  {Array}  attachments
 * @param  {Function}  callback
 */
MailjetTransport.prototype._parseAttachments = function (attachments, callback) {
  const mailComposer = new MailComposer({
    attachments: attachments
  });
  const elements = mailComposer.getAttachments().attached;
  const options = {
    lineLength: false
  };

  let attachment;

  async.mapSeries(elements, (element, next) => {
    attachment = new BuildAttachment({
      contentTransferEncoding: element.contentTransferEncoding || 'base64',
      filename: element.filename,
      cid: element.cid
    });

    attachment.setContent(element.content).build(options, next);
  }, callback);
};

/**
 * Returns Mailjet request processing
 *
 * @param  {String}  method
 * @returns  {Function}
 */
MailjetTransport.prototype._requestFactory = function (method) {
  return (payload, callback) => {
    const accepted = [];
    const rejected = [];

    console.log(method);
    console.log(Object.getOwnPropertyNames(this.client));

    this.client.post(method, { version: 'v3.0' })(payload, (err, results) => {
      if (err) {
        return callback(err);
      }

      if (!Array.isArray(results)) {
        results = [results];
      }

      results.forEach((result) => {
        if (result.ErrorCode === 0) {
          accepted.push(result);
        } else {
          rejected.push(result);
        }
      });

      return callback(null, {
        messageId: (results[0] || {}).MessageID,
        accepted: accepted,
        rejected: rejected
      });
    });
  };
};

module.exports = function (options) {
  return new MailjetTransport(options);
};

module.exports.MailjetTransport = MailjetTransport;

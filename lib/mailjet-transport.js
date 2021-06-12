'use strict';

const Promise = require('bluebird');
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
 */
MailjetTransport.prototype.send = async function (mail) {
  const message = await this._parse(mail);
  const request = this.client
    .post('send', { version: 'v3.1' })
    .request({ Messages: [message] });

  return request;
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
 */
MailjetTransport.prototype._parse = async function (mails) {
  return await Promise.map(mails, async (mail) => {
    const data = mail.data || mail;

    const fromAddress = parseAddress(data.from);
    const toAddress = parseAddress(data.to, true);
    const ccAddress = parseAddress(data.cc, true);
    const bccAddress = parseAddress(data.bcc, true);
    const replyToAddress = parseAddress(data.replyTo);
    const headers = headersParser(data.headers || []);
    const attachments = await this._parseAttachments(data.attachments);

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
    message.setTrackLinks(data.trackLinks);

    return message;
  });
};

/**
 * Parse nodemailer attachment(s)
 *
 * @param  {Array}  attachments
 */
MailjetTransport.prototype._parseAttachments = async function (attachments) {
  const mailComposer = new MailComposer({
    attachments: attachments
  });
  const elements = mailComposer.getAttachments().attached;
  const options = {
    lineLength: false
  };

  return Promise.map(elements, async (element) => {
    const attachment = new BuildAttachment({
      contentTransferEncoding: element.contentTransferEncoding || 'base64',
      filename: element.filename,
      cid: element.cid
    });

    attachment.setContent(element.content);
    const asyncBuild = Promise.promisify(attachment.build, { context: attachment });
    return asyncBuild(options);
  });
};

/**
 * Returns Mailjet request processing
 *
 * @param  {String}  method
 * @returns  {Function}
 */
MailjetTransport.prototype._requestFactory = function (method) {
  console.log('_requestFactory');
  return (payload, callback) => {
    const accepted = [];
    const rejected = [];

    this.client.post(method, { version: 'v3.1' })(payload, (err, results) => {
      if (err) {
        return callback(err);
      }
      console.log('234');
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

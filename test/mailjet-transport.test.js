'use strict';

const chai = require('chai');
const dirtyChai = require('dirty-chai');
const mailjetTransport = require('../');
const Message = require('../lib/message');
const pkg = require('../package.json');
const expect = chai.expect;
chai.should();
chai.use(require('chai-as-promised'));
chai.use(dirtyChai);

require('dotenv').config();

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

describe('MailjetTransport', () => {
  let transport;
  let options;
  let mails;

  beforeEach(() => {
    mails = [
      {
        data: {
          from: 'noreply@example.org',
          to: 'jane@example.org',
          subject: 'Hello Jane',
          html: '<h1>Hello Jane</h1>',
          text: 'Hello Jane',
          headers: [{
            key: 'X-Key-Name',
            value: 'key value1'
          }],
          attachments: [
            {
              path: 'data:text/plain;base64,aGVsbG8gd29ybGQ='
            }
          ]
        }
      },
      {
        data: {
          from: 'noreply@example.org',
          to: 'john@example.org',
          subject: 'Hello John',
          html: '<h1>Hello John</h1>',
          text: 'Hello John',
          headers: {
            'X-Key-Name': 'key value2'
          },
          attachments: [
            {
              filename: 'text.txt',
              content: 'Lorem ipsum..'
            }
          ]
        }
      }
    ];

    options = {
      auth: {
        apiKey: process.env.MAILJET_API_TEST,
        apiSecret: process.env.MAILJET_API_SECRET
      },
      SandboxMode: true
    };

    transport = mailjetTransport(options);
  });

  it('should expose name and version', () => {
    transport = mailjetTransport(options);
    expect(transport.name).equal('Mailjet');
    expect(transport.version).equal(pkg.version);
  });

  describe('#_parse', () => {
    let mail;

    beforeEach(() => {
      mail = mails[0];
      mails = [mail];
    });

    it('defaults', async () => {
      delete mail.data;

      const expected = new Message();

      const messages = await transport._parse(mails);
      expect(messages[0]).eql(expected);
    });

    describe('to / from / cc / bcc / replyTo', async () => {
      const validator = async (address, expected, fields) => {
        if (typeof fields === 'function') {
          fields = ['from', 'to', 'cc', 'bcc', 'replyTo'];
        }

        const messages = await transport._parse(mails);
        fields.map((field) => {
          mail.data[field] = address;
          return expect(messages[0][capitalize(field)]).equal(expected);
        });
      };

      it('should parse plain email address', () => {
        const address = 'foo@example.org';
        const expected = 'foo@example.org';
        validator(address, expected);
      });

      it('should parse email address with formatted name', () => {
        const address = '"John Doe" <john.doe@example.org>';
        const expected = '"John Doe" <john.doe@example.org>';
        validator(address, expected);
      });

      it('should parse address object', () => {
        const address = {
          name: 'Jane Doe',
          address: 'jane.doe@example.org'
        };

        const expected = '"Jane Doe" <jane.doe@example.org>';

        validator(address, expected);
      });

      it('should parse mixed address formats in to / cc / bcc fields', () => {
        const address = [
          'foo@example.org',
          '"Bar Bar" bar@example.org',
          '"Jane Doe" <jane.doe@example.org>, "John, Doe" <john.doe@example.org>',
          {
            name: 'Baz',
            address: 'baz@example.org'
          }
        ];

        const expected = [
          'foo@example.org',
          '"Bar Bar" <bar@example.org>',
          '"Jane Doe" <jane.doe@example.org>',
          '"John, Doe" <john.doe@example.org>',
          '"Baz" <baz@example.org>'
        ].join(',');

        validator(address, expected, ['to', 'cc', 'bcc']);
      });

      it('should parse first address in from field only', () => {
        const address = [
          'foo@example.org',
          '"Bar Bar" bar@example.org',
          '"Jane Doe" <jane.doe@example.org>, "John, Doe" <john.doe@example.org>',
          {
            name: 'Baz',
            address: 'baz@example.org'
          }
        ];

        const expected = 'foo@example.org';

        validator(address, expected, ['from']);
      });
    });

    describe('subject', () => {
      it('should be parsed', async () => {
        mail.data.subject = 'Subject';

        const messages = await transport._parse(mails);
        expect(messages[0].Subject).equal('Subject');
      });
    });

    describe('text', () => {
      it('should be parsed', async () => {
        mail.data.text = 'Hello';

        const messages = await transport._parse(mails);
        expect(messages[0].TextPart).equal('Hello');
      });
    });

    describe('html', () => {
      it('should be parsed', async () => {
        mail.data.html = '<h1>Hello</h1>';
        const messages = await transport._parse(mails);
        expect(messages[0].HtmlPart).equal('<h1>Hello</h1>');
      });
    });

    describe('headers', () => {
      it('should parse {"X-Key-Name": "key value"}', async () => {
        mail.data.headers = {
          'X-Key-Name': 'key value'
        };

        const messages = await transport._parse(mails);
        expect(messages[0].Headers).eql({ 'X-Key-Name': 'key value' });
      });

      it('should parse [{key: "X-Key-Name", value: "key value"}]', async () => {
        mail.data.headers = [
          {
            key: 'X-Key-Name',
            value: 'key value'
          }
        ];
        const messages = await transport._parse(mails);
        expect(messages[0].Headers).eql({ 'X-Key-Name': 'key value' });
      });
    });

    describe('headers (multiple)', () => {
      xit('should parse {"X-Key-Name": ["key value1", "key value2"]}', async () => {
        mail.data.headers = {
          'X-Key-Name': [
            'key value1',
            'key value2'
          ]
        };

        const messages = await transport._parse(mails);
        expect(messages[0].Headers).eql([
          {
            Name: 'X-Key-Name',
            Value: 'key value1'
          },
          {
            Name: 'X-Key-Name',
            Value: 'key value2'
          }
        ]);
      });

      xit('should parse [{key: "X-Key-Name", value: "key value1"}, {key: "X-Key-Name", value: "key value2"}]', async () => {
        mail.data.headers = [
          {
            key: 'X-Key-Name',
            value: 'key value1'
          },
          {
            key: 'X-Key-Name',
            value: 'key value2'
          }
        ];
        const messages = await transport._parse(mails);
        expect(messages[0].Headers).eql([
          {
            Name: 'X-Key-Name',
            Value: 'key value1'
          },
          {
            Name: 'X-Key-Name',
            Value: 'key value2'
          }
        ]);
      });
    });

    describe('attachments', () => {
      it('should be parsed', async () => {
        const names = ['text.txt', 'attachment-2.txt', 'attachment-3.txt'];
        const contents = ['TG9yZW0gaXBzdW0uLg==', 'aGVsbG8gd29ybGQ=', 'Zm9vIGJheiBiYXI='];
        const cid = ['', '', 'cid:text-01.txt'];

        mail.data.attachments = [
          {
            filename: 'text.txt',
            content: 'Lorem ipsum..'
          },
          {
            path: 'data:text/plain;base64,aGVsbG8gd29ybGQ='
          },
          {
            path: 'data:text/plain;base64,Zm9vIGJheiBiYXI=',
            cid: 'cid:text-01.txt'
          }
        ];

        const messages = await transport._parse(mails);
        messages[0].Attachments.forEach((attachment, i) => {
          expect(attachment.Filename).equal(names[i]);
          expect(attachment.Base64Content.toString()).equal(contents[i]);
          expect(attachment.ContentType).equal('text/plain');
          expect(attachment.ContentID).equal(cid[i]);
        });
      });
    });

    describe('tag', () => {
      it('should be parsed', async () => {
        mail.data.tag = 'quux';

        const messages = await transport._parse(mails);
        expect(messages[0].Tag).equal('quux');
      });
    });

    describe('metadata', () => {
      it('should be parsed', async () => {
        mail.data.metadata = { foo: 'bar' };

        const messages = await transport._parse(mails);
        expect(messages[0].Metadata).eql({ foo: 'bar' });
      });
    });

    describe('trackOpens', () => {
      it('should be ignored', async () => {
        const messages = await transport._parse(mails);
        expect(messages[0].TrackOpens).be.an('undefined');
      });

      xit('should be parsed', async () => {
        const values = [true, false];

        function iteratee(value, cb) {
          mail.data.trackOpens = value;

          transport._parse(mails, (err, messages) => {
            if (err) { return cb(err); }
            cb(null, messages[0]);
          });
        }

        Promise.map(values, iteratee, (err, results) => {
          expect(err).to.not.exist();

          results.forEach((actual, i) => {
            expect(actual.TrackOpens).equal(values[i]);
          });
        });
      });
    });

    describe('trackLinks', () => {
      it('should be ignored', async () => {
        const messages = await transport._parse(mails);
        expect(messages[0].TrackLinks).be.an('undefined');
      });

      it('should return error', async () => {
        mail.data.trackLinks = 'foo';

        await transport._parse(mails)
          .should.be.rejectedWith('"foo" is wrong value for link tracking. Valid values are: None, HtmlAndText, HtmlOnly, TextOnly');
      });

      xit('should be parsed', async () => {
        const values = ['None', 'HtmlAndText', 'HtmlOnly', 'TextOnly'];

        function iteratee(value, cb) {
          mail.data.trackLinks = value;

          transport._parse(mails, (err, messages) => {
            if (err) { return cb(err); }
            cb(null, messages[0]);
          });
        }

        Promise.map(values, iteratee, (err, results) => {
          expect(err).to.not.exist();

          results.forEach((actual, i) => {
            expect(actual.TrackLinks).equal(values[i]);
          });
        });
      });
    });

    describe('template id', () => {
      it('should be parsed', async () => {
        mail.data.templateId = 'foo';
        mail.data.templateModel = { bar: 'baz' };

        const messages = await transport._parse(mails);
        expect(messages[0].TemplateId).eql('foo');
        expect(messages[0].TemplateModel).eql({ bar: 'baz' });
      });

      it('should be parsed (inline css)', async () => {
        mail.data.templateId = 'foo';
        mail.data.templateModel = { bar: 'baz' };
        mail.data.inlineCss = true;

        const messages = await transport._parse(mails);
        expect(messages[0].TemplateId).equal('foo');
        expect(messages[0].TemplateModel).eql({ bar: 'baz' });
        expect(messages[0].InlineCss).equal(true);
      });
    });

    describe('template alias', () => {
      it('should be parsed', async () => {
        mail.data.templateAlias = 'buzz';
        mail.data.templateModel = { bar: 'baz' };

        const messages = await transport._parse(mails);
        expect(messages[0].TemplateAlias).eql('buzz');
        expect(messages[0].TemplateModel).eql({ bar: 'baz' });
      });

      it('should be parsed (inline css)', async () => {
        mail.data.templateAlias = 'buzz';
        mail.data.templateModel = { bar: 'baz' };
        mail.data.inlineCss = true;

        const messages = await transport._parse(mails);
        expect(messages[0].TemplateAlias).equal('buzz');
        expect(messages[0].TemplateModel).eql({ bar: 'baz' });
        expect(messages[0].InlineCss).equal(true);
      });
    });
  });

  describe('#send', () => {
    it('should be able to send a single mail ()', async () => {
      const result = await transport.send(mails[0]);
      const info = JSON.parse(result.response.text);
      expect(info).be.an('object');
      const accepted = info.Messages[0].To;

      expect(accepted[0].Email).equal('jane@example.org');
      expect(accepted[0].MessageID).be.a('number');
      expect(accepted[0].MessageUUID).be.a('string');
    });

    xit('should be able to send a single mail with template', async () => {
      delete mails[0].data.subject;
      delete mails[0].data.html;
      delete mails[0].data.text;

      mails[0].data.templateId = 0;
      mails[0].data.templateModel = {
        foo: 'bar'
      };

      const result = await transport.send(mails[0]);
      const info = JSON.parse(result.response.text);
      expect(info).be.an('object');
      const accepted = info.Messages[0].To;

      expect(accepted[0].Email).equal('jane@example.org');
      expect(accepted[0].MessageID).be.a('number');
      expect(accepted[0].MessageUUID).be.a('string');
    });
  });

  describe('#sendBatch', () => {
    it('should be able to send multiple mail (callback)', async () => {
      const result = await transport.sendBatch(mails);
      const info = JSON.parse(result.response.text);
      expect(info).be.an('object');

      expect(info.Messages[0].To[0].Email).equal('jane@example.org');
      expect(info.Messages[0].To[0].MessageID).be.a('number');
      expect(info.Messages[0].To[0].MessageUUID).be.a('string');

      expect(info.Messages[1].To[0].Email).equal('john@example.org');
      expect(info.Messages[1].To[0].MessageID).be.a('number');
      expect(info.Messages[1].To[0].MessageUUID).be.a('string');
    });
  });
});

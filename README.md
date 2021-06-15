# nodemailer-mailjet-transport

A Mailjet transport for Nodemailer.

[![Build Status](https://travis-ci.com/LLIu33/nodemailer-mailjet-transport.svg?branch=master)](https://travis-ci.com/LLIu33/nodemailer-mailjet-transport) [![Coverage Status](https://coveralls.io/repos/github/LLIu33/nodemailer-mailjet-transport/badge.svg?branch=master)](https://coveralls.io/github/LLIu33/nodemailer-mailjet-transport?branch=master) [![Dependency Status](https://david-dm.org/LLIu33/nodemailer-mailjet-transport.svg)](https://david-dm.org/LLIu33/nodemailer-mailjet-transport) [![devDependencies Status](https://status.david-dm.org/gh/LLIu33/nodemailer-mailjet-transport.svg?type=dev)](https://david-dm.org/LLIu33/nodemailer-mailjet-transport?type=dev) [![peerDependencies Status](https://david-dm.org/LLIu33/nodemailer-mailjet-transport/peer-status.svg)](https://david-dm.org/LLIu33/nodemailer-mailjet-transport?type=peer) [![npm version](https://img.shields.io/npm/v/nodemailer-mailjet-transport.svg)](https://www.npmjs.com/package/nodemailer-mailjet-transport) [![Codacy Badge](https://app.codacy.com/project/badge/Grade/f9ccc8ff4a074679aed43acca1ed6539)](https://www.codacy.com/gh/LLIu33/nodemailer-mailjet-transport/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=LLIu33/nodemailer-mailjet-transport&amp;utm_campaign=Badge_Grade) [![Known Vulnerabilities](https://snyk.io/test/npm/nodemailer-mailjet-transport/badge.svg)](https://snyk.io/test/npm/nodemailer-mailjet-transport)


This module is a transport plugin for [Nodemailer](https://github.com/andris9/Nodemailer) that makes it possible to send through [Mailjet's Web API](https://dev.mailjet.com/guides)!

## Install

```
npm install nodemailer-mailjet-transport
```

## Usage

### Quickstart

```javascript
'use strict';

const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');
const transport = nodemailer.createTransport(mailjetTransport({
  auth: {
    apiKey: 'key',
    apiSecret: 'secret'
  }
}));
const mail = {
  from: 'john.doe@example.org',
  to: 'jane.doe@example.org',
  subject: 'Hello',
  text: 'Hello',
  html: '<h1>Hello</h1>'
};

try {
  const info = await transport.sendMail(mail);
  console.log(info);
} catch (err) {
  console.error(err);
}

```

### Using attachments

```javascript
'use strict';

const nodemailer = require('nodemailer');
const mailjetTransport = require('nodemailer-mailjet-transport');
const transport = nodemailer.createTransport(mailjetTransport({
  auth: {
    apiKey: 'key',
    apiSecret: 'secret'
  }
}));
const mail = {
  from: 'john.doe@example.org',
  to: 'jane.doe@example.org',
  subject: 'Hello',
  text: 'Hello, This email contains attachments',
  html: '<h1>Hello, This email contains attachments</h1>',
  attachments: [
    {
      path: 'data:text/plain;base64,aGVsbG8gd29ybGQ=',
      cid: 'cid:molo.txt'
    }
  ]
};

try {
  const info = await transport.sendMail(mail);
  console.log(info);
} catch (err) {
  console.error(err);
}
});
```

## License

    The MIT License (MIT)

    Copyright (c) Artem Grechko

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

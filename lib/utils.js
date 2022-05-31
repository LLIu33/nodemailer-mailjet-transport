'use strict';

const addressparser = require('addressparser');

function addressFormatter(addr) {
  if (!addr.address) return null;

  const address = {
    Email: addr.address
  };

  if (addr.name) address.Name = addr.name;

  return address;
}

function addressParser(addrs) {
  if (!Array.isArray(addrs)) {
    addrs = [addrs];
  }

  return addrs
    .map((addr) => {
      return typeof addr === 'object'
        ? [addr]
        : addressparser(addr);
    })
    .reduce((acc, cur) => {
      return acc.concat(cur);
    }, []);
}

function headersParser(headers) {
  if (!Array.isArray(headers)) {
    headers = Object.keys(headers).map((name) => {
      return Array.isArray(headers[name])
        ? headers[name].map(function (x) {
          return {
            key: name,
            value: x
          };
        })
        : {
            key: name,
            value: headers[name]
          };
    });
  }

  return headers
    .reduce(function (acc, x) {
      return acc.concat(x);
    }, [])
    .map((header) => {
      return {
        Name: header.key,
        Value: header.value
      };
    });
}

module.exports = {
  addressFormatter: addressFormatter,
  addressParser: addressParser,
  headersParser: headersParser
};

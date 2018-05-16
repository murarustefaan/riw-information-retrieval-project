const DnsClient = require('./dns/Client.js');
const HttpClient = require('./http/Client.js');
const RepHandler = require('./http/RepHandler');

const repHandler = new RepHandler('RIWEB-CRAWLER');
repHandler.isEndpointAllowed('riweb.tibeica.com', '/crawl')
  .then(
    (allowed) => {
      return console.log(allowed);
    }
  );

// const dnsClient = new DnsClient('riweb.tibeica.com', true);
// dnsClient.getAddresses()
//   .then((addresses) => {
//     if (addresses.length === 0) {
//       console.error('No address found for the given hostname');
//       return;
//     }

//     const address = addresses[0];

//     new HttpClient(address, 'riweb.tibeica.com', '/robots.txt')
//       .get()
//       .then((resp) => {
//         console.log(resp);
//         return;
//       });
//   });


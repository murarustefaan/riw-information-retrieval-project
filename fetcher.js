const HttpClient = require('./http/Client');
const RepHandler = require('./http/RepHandler');
const { splitUrl } = require('./http/Parser');
const { extract } = require('./http/Parser');
const shell = require('shelljs');
const fs = require('fs');

const UserAgent = 'RIWEB_CRAWLER';
const savePath = 'X:\\Facultate\\RIW-Crawl';

process.on('message', async(message) => {
  let start = Date.now();
  let afterRequest = null;

  try {
    let { header, body } = await tryRequest(message.host, message.route);
    afterRequest = Date.now();

    console.log(process.pid, message.host, message.route, header.statusCode);

    let permanentRedirect = undefined;
    if (header.location !== 'http' && (header.statusCode === '301' || header.statusCode === '302')) {
      if (header.location.startsWith('https')) {
        throw new Error('Protocol https not supported');
      }

      const { host: redirect_host, route: redirect_route } = createRedirectUrl(header.location, message.host, message.route);

      const { header: redirect_header, body: redirect_body } = await tryRequest(redirect_host, redirect_route);

      if (!redirect_header.statusCode.startsWith('2') || !redirect_header.statusCode.startsWith('3')) {
        throw new Error('Redirect was not successfull');
      }

      if (header.statusCode === '301') {
        permanentRedirect = {
          host: redirect_host,
          route: redirect_route,
        };
      }

      header = redirect_header;
      body = redirect_body;
    }

    if (!header.statusCode.startsWith('2') && !header.statusCode.startsWith('3')) {
      throw new Error(`Not successful status code ${header.statusCode}`);
    }

    const { text, links } = await extract(body, `http://${message.host}`);

    const now = Date.now();
    // console.log(message.host, message.route, now - start, afterRequest - start, now - afterRequest);

    saveFile(`${message.host}${message.route}`, text);

    process.send({ host: message.host, route: message.route, success: true, links: links, redirect: permanentRedirect });
  } catch (e) {
    process.send({ host: message.host, route: message.route, success: false });
  }
});

/**
 * @argument {string} host
 * @argument {string} route
 * @returns {{header: object, body: string}}
 * @async
 */
async function tryRequest(host, route) {
  try {
    const isRepAllowed = await (new RepHandler(UserAgent)
      .isEndpointAllowed(host, route));

    if (!isRepAllowed) {
      console.warn(`${host}${route} does not allow access for given user agent`);
      return process.send({ host: host, route: route, success: false });
    }

    const { header, body } = await (new HttpClient(host, route)
      .get());

    return { header: header, body: body };
  } catch (e) {
    throw e;
  }
}

/**
 *
 * @param {string} receivedLocation
 * @param {string} host
 * @param {string} route
 * @returns {{host: string, route, string}}
 */
function createRedirectUrl(receivedLocation, host, route) {
  let newLocation = '';

  if (receivedLocation === 'http') {
    return {
      host: host,
      route: `${route}/`,
    };
  }

  if (receivedLocation.startsWith('http')) {
    return splitUrl(receivedLocation);
  }

  return {
    host: host,
    route: receivedLocation,
  };
}

/**
 * Save a file to the disk
 * @param {string} url
 * @param {string} contents
 */
function saveFile(url, contents) {
  if (contents === null) {
    return;
  }

  let filePath = url;
  let containsHttpPrefix = filePath.indexOf('http://');

  if (containsHttpPrefix === 0) {
    filePath = filePath.slice(7);
  }

  const split = filePath.split('/');
  if (split[split.length - 1] === '') {
    filePath = `${filePath }index.html`;
  }

  filePath = `${savePath}/${filePath}`;

  try {
    shell.mkdir('-p',
      filePath.split('/').slice(0, -1).join('/'));

    fs.writeFile(filePath, contents, () => {});
  } catch (ex) {
    console.warn(ex.message);
  }
}

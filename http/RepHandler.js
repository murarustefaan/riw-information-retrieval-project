const HttpClient = require('./Client');
const Robots = require('robots-parser');

let _instance = null;

const UserAgent = 'RIWEB_CRAWLER';

module.exports = exports = class RepHandler {
  /**
   * Singleton class used for chacking whether crawling a endpoint is allowed for the given UserAgent.
   * Only keeps records for the current User Agent.
   * @argument {string} userAgent
   */
  constructor(userAgent) {
    if (_instance !== null) {
      return _instance;
    }

    assignInstance(this);

    this.userAgent = userAgent;
    this.domains = { };
  }

  /**
   * Checks whether crawling a given endpoint of the host is allowed.
   * @param {string} host
   * @param {string} route
   * @returns {boolean}
   */
  async isEndpointAllowed(host, route) {
    if (this.domains[host]) {
      return Boolean(
        this.domains[host].isAllowed(`http://${host}${route}`, UserAgent)
      );
    }

    let response = null;

    // fetch the robots.txt file
    try {
      response = await new HttpClient(host, '/robots.txt').get();

      if (response.header && parseInt(response.header.statusCode, 10) === 200 && response.body) {
        this.domains[host] = Robots(`http://${host}/robots.txt`, response.body);

        return this.domains[host].isAllowed(`http://${host}${route}`, UserAgent);
      }
    } catch (e) {
      console.error(e);
      return true;
    }

    return true;
  }
};

/**
 * Assign the instance on a global parameter.
 * Only called on the first creation of the RepHandler class.
 * @param {RepHandler} instance
 */
function assignInstance(instance) {
  _instance = instance;
}

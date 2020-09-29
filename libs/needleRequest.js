const needle        = require('needle')
const iniParser = require('./iniParser')
const logging = require('./logging')
const {genReff} = require('./utils')

let config = iniParser.get()

function apiRequest(method, url, data, options={}){
    let baseUrl = config.service.url + url
    let reff = genReff()
    logging.info(`[MAIN-API][REQ][OUT] REFF: ${reff} ${method} ${baseUrl} ${JSON.stringify(data)} ${JSON.stringify(options)}`)
    return new Promise(function(resolve, reject) {
        needle.request(method, baseUrl, data, options, function(err, resp, body) {
            logging.info(`[MAIN-API][RES][IN] REFF: ${reff} ${resp.statusCode} ${JSON.stringify(body)}`)
            if (undefined === body) reject(null)

            resolve(body)
        });
    });
}

module.exports = apiRequest;

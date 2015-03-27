// the function of this module is simply to read any command line arguments and then start the webServer. 
// among other benefits, keeping the webServer in a separate module makes it easier to test the webServer.
try {
  var util = require("util");
  var logger = require("./util/logger");
  var configger = require("./util/configger");
  var webServer = require('./webServer');
  var packageJson = require('./package.json');
  var cheerio = require('cheerio');
  var request = require('request');
} catch (e) {
  console.log("Error initializing application", e);
  return;
}

var config = configger.load({});

logger.addTargets(config.loggingTargets);

logger.info("app version: " + packageJson.version);
logger.debug("config: " + util.inspect(config, {depth: null}));
logger.debug("package.json: " + util.inspect(packageJson,{depth: null}));

var tracBaseUrl = 'https://code.djangoproject.com/timeline?from=03%2F27%2F15&daysback=7&authors=&ticket=on&sfp_email=&sfph_mail=&update=Update';

request(tracBaseUrl, function(error, response, html) {
	if (error) {
		logger.error(error);
		return;
	}
	var $ = cheerio.load(html);
	var content = $('#content').children();
	console.log(content.length);
	var date = '';
	var ticket = {};
	for (var i = 0; i < content.length; i++){
		var child = content[i];
		if('h2' == child.name) {
			date = child.children[0].data.split(':')[0];
		}
		if ('dl' == child.name) {
			for (var j = 0; j < child.children.length; j++) {
				var ticketElement = child.children[j];
				if ('tag' == ticketElement.type) {
					if ('dt' == ticketElement.name) {
						if (ticket) console.log(ticket);
						ticket = {class: ticketElement.attribs.class, date: date, disposition: ''};
						if ('newticket' == ticketElement.attribs.class) {
							ticket.disposition = 'new';
						}
						for (var k = 0; k < ticketElement.children.length; k++){
							ticketComponent = ticketElement.children[k];
							if ('tag' == ticketComponent.type && 'a' == ticketComponent.name) {
								ticket.number = ticketComponent.attribs.href.split('/')[2].split('#')[0];
								for (var l = 0; l < ticketComponent.children.length; l++){
									ticketSubcomponent = ticketComponent.children[l];
									if ('tag' == ticketSubcomponent.type && 'span' == ticketSubcomponent.name && 'time' == ticketSubcomponent.attribs.class) {
										ticket.time = ticketSubcomponent.children[0].data;
									}
								}
							}
						}
					}
					if ('dd' == ticketElement.name) {
						if ('closedticket' == ticketElement.attribs.class) {
							if ('' != ticket.disposition) {
								logger.warn('multiple disposition comments!');
							}
							ticket.disposition += ticketElement.children[0].data.trim().split(':')[0];
						}
					}
				}
			}
		}
	}
	console.log(ticket);
});

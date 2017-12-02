function Chrome() {
	const
	  launcher = require('chrome-launcher')
	, cdp      = require('chrome-remote-interface')
	, args     = {chromeFlags: ['--disable-gpu', '--window-size=1920x1080'], port: 9222}
	, enable   =  ["Page", "Console"]
	;
	let
	  chromeClient   = null
	, chromeLauncher = null
	;

	function start(settings) {
		return new Promise(async (resolve, reject) => {
			chromeLauncher = await launcher.launch(args);
			chromeClient   = await cdp();
			const toolsPromises  = [];
			settings.enable.forEach((tool) => {
				toolsPromises.push(chromeClient[tool].enable());
			});
			await Promise.all(toolsPromises).catch((e) => {
				console.log(e);
			});
			if (settings.enableLogging) {
				_enableLogging();
			}
			resolve(chromeClient);
		});
	}

	async function stop() {
		await chromeClient.close();
		await chromeLauncher.kill();
		process.exit(1);
	}
	
	function exec(script, args, waitExec) {
		return new Promise(async (resolve) => {
			waitExec = waitExec || false;
			const result = await chromeClient.Runtime.evaluate({expression: "(" + script.toString() + ")(" + args + ");", awaitPromise: waitExec});
			resolve(result.result);
		});
	}

	function click(query) {
	}

	function sleep(ms) {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}

	function _enableLogging() {
		function logErrors() {
			document.addEventListener("error", (e) => {
				console.log(JSON.stringify(e));
			});
		}
		chromeClient.Console.messageAdded((msgObj) => {
			console.log(msgObj.message);
		});
		chromeClient.Page.addScriptToEvaluateOnLoad({scriptSource: "(" + logErrors.toString() + ")();"});
	}


	return {
	  start: start
	, stop: stop
	, click: click
	, exec: exec
	, sleep: sleep
	}
}

module.exports = new Chrome();

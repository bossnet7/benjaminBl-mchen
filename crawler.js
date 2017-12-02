(async (args) => {
	const
	  chrome = require('./Chrome')
	, fs = require('fs')
	, settings = {
		  enable: ["Page"]	
	}
	, client = await chrome.start(settings)
	, { Page } = client
	, data = []
	;
	let
	  currentUrl
	, previousUrl = "START"
	, listUrls = [args[2]]
	, num = 0
	;

	async function goNextUrl() {
		currentUrl = getUrlFromList(num);
		if (!currentUrl) {
			console.log("\n** FINISHED ** No further urls found **\n");
			console.log(data);
			process.exit(0);
		}
		console.log("\nUrl: " + currentUrl + "\n");
		await Page.navigate({"url": currentUrl});
	}

	function getUrlFromList() {
		return listUrls[num];
	}

	Page.loadEventFired(async () => {
		const
		  emails = await findMails()
		, urls   = await collectUrls()
		;
		data.push({ url: currentUrl, emailsFound: emails, urlsFound: urls, previous: previousUrl});
		previousUrl = currentUrl;
		num++;
		goNextUrl();
	});
	
	setInterval(() => {
		const dataExisting =  JSON.parse(fs.readFileSync("emails.txt"));
		data.forEach((site) => {	
			site.emailsFound.forEach((email) => {
				if (!dataExisting.includes(email)) {
					dataExisting.push(email);
				}
			});
		});
		fs.writeFileSync("emails.txt", JSON.stringify(dataExisting));
	}, 8000);

	goNextUrl();

	function findMails() {
		return new Promise(async (resolve) => {
			const info = await chrome.exec(() => {
				try {
					return new Promise((resolve, reject) => {
						const
						  regex = new RegExp(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)
						, emails = []
						, html = document.children[0].outerHTML
						;
						var result;
						while ((result = regex.exec(html)) !== null) {
							if (!emails.includes(result[0])) {
								emails.push(result[0]);
							}
						}
						resolve(JSON.stringify(emails));
					});
				} catch(e) {
					return new Promise((resolve) => {
						resolve(e);
					});
				}
			}, undefined, true).catch((e) => {console.log(e)});
			if (!info || !info.value) {
				throw new Error("'info' should not be undefined..");
			}
			const emails = JSON.parse(info.value)
			console.log("Emails found: " + emails.length);
			resolve(emails);
		});

	}

	function collectUrls() {
		return new Promise(async (resolve) => {
			const info = await chrome.exec(() => {
				const
				  targetElems = document.getElementsByTagName("a")
				, urls = []
				, length = targetElems.length
				;
				console.log(targetElems);
				for (let i = 0; i < length; i++) {
					let href;
					if ((href = targetElems[i].href) !== undefined) {
						urls.push(href);
					}
				}
				return JSON.stringify(urls);
			});
			if (!info.value) {
				throw new Error("Error occured collecting new Urls. info.value should not be undefined");
			}
			const urls = JSON.parse(info.value);
			console.log("Urls found: " + urls.length);
			urls.forEach(url => {
				if (!listUrls.includes(url) && !url.startsWith("mailto:")) {
					listUrls.push(url);
				}
			});
			resolve(urls);
		});
	}
})(process.argv);


//     dweet.io.js
//     http://dweet.io
//     (c) 2014 Jim Heising and Bug Labs, Inc.
//     dweet.io.js may be freely distributed under the MIT license.
(function () {

	var isNode = true;

	// Is this loading into node.js?
	try {
		isNode = (require);
	}
	catch (e) {
		isNode = false;
	}

	var io;
	var request;

	var LAST_THING_NAME = "last-thing.dat";
	var DWEET_SERVER = "https://beta.dweet.io:443";
	var STRICT_SSL = true;
	var REQUEST_TIMEOUT = 5000;
	var lastThing;

	if (isNode) {
		io = require("socket.io-client");
		request = require("request");

		if (require("fs").existsSync(LAST_THING_NAME)) {
			try {
				lastThing = require("fs").readFileSync(LAST_THING_NAME).toString();
			}
			catch (e) {
			}
		}
	}
	else {
		request = function (options, callback) {
			var xhr = new XMLHttpRequest();
			xhr.open(options.method || "GET", options.url);
			Object.keys(options.headers).forEach(function (key) { // set headers
				xhr.setRequestHeader(key, options.headers[key]);
			});
			xhr.send(JSON.stringify(options.json));

			xhr.onreadystatechange = function () {
			  var DONE = 4; // readyState 4 means the request is done.
			  var OK = 200; // status 200 is a successful return.
			  if (xhr.readyState === DONE) {
			    if (xhr.status === OK) {
						callback(null, xhr.response, xhr.responseText);
			    } else {
			      console.log('Error: ' + xhr.status); // An error occurred during the request.
			    }
			  }
			};
		};

		(function () {
			var re = /ded|co/;
			var onload = 'onload';
			var onreadystatechange = 'onreadystatechange';
			var readyState = 'readyState';

			var load = function (src, fn) {
				var script = document.createElement('script');
				script[onload] = script[onreadystatechange] = function () {
					if (!this[readyState] || re.test(this[readyState])) {
						script[onload] = script[onreadystatechange] = null;
						fn && fn(script);
						script = null;
					}
				};
				script.async = true;
				script.src = src;
				document.body.appendChild(script);
			};

			window.dweet_script_loader = function (srces, fn) {
				if (typeof srces == 'string') {
					load(srces, fn);
					return;
				}
				var src = srces.shift();
				load(src, function (script) {
					if (srces.length) {
						window.dweet_script_loader(srces, fn);
					}
					else {
						fn && fn(script);
					}
				});
			};
		})();
	}

	function isArray(obj) {
		return Object.prototype.toString.call( obj ) === '[object Array]'
	}

	var dweetioClient = function (username, password) {
		var self = this;
		var socket;
		var listenCallbacks = {};
		var currentThing = lastThing;

		function normalizeDweet(dweet) {
			if (dweet.created) {
				dweet.created = new Date(dweet.created);
			}

			return dweet;
		}

		function normalizeDweets(dweets) {
			if (dweets instanceof Array) {
				for (var index = 0; index < dweets.length; index++) {
					var dweet = dweets[index];
					normalizeDweet(dweet);
				}
			}
			else {
				normalizeDweet(dweets);
			}

			return dweets;
		}

		function parseBody(body) {
			var responseData;

			try {
				if (typeof body == 'string' || body instanceof String) {
					responseData = JSON.parse(body);
				}
				else {
					responseData = body;
				}
			}
			catch (e) {
			}

			return responseData;
		}

		function processResponse(body) {
			var err;

			var responseData = parseBody(body);

			if (!responseData) {
				err = new Error("server returned an invalid response");
			}
			else if (responseData["this"] == "failed") {
				err = new Error(responseData["because"]);
			}

			return err;
		}

		function processDweetResponse(err, callback, body) {
			var responseData = parseBody(body);
			if (!err) {
				err = processResponse(responseData);
			}

			if (responseData && responseData["with"]) {
				if (callback) callback(err, normalizeDweets(responseData["with"]));
			}
			else if (responseData) {
				if (callback) callback(err, responseData);
			}
			else {
				if (callback) callback("no response from server", undefined);
			}
		}

		self.login = function (username, password, callback) {
			var headers = {"X-DWEET-AUTH": self.token, "Accept": "application/json", "Content-Type": "application/json"};
			request({
				method: "POST",
				url: DWEET_SERVER + "/v2/users/login",
				json: {
					"username": username,
					"password": password
				},
				followAllRedirects: true,
				timeout: REQUEST_TIMEOUT,
				strictSSL: STRICT_SSL,
				jar: true,
				headers: headers
			}, function (err, response, body) {
				if (err) {console.log(err)}
				if (body) {self.token = body.GROUP.token}
				processDweetResponse(err, callback, body);
			});
		};

		function ensureLogin(callback) {
			self.token ? callback() : self.login(username, password, callback);
		}

		function makeRequest(options, callback) {
			ensureLogin(function () {
				var headers = {"X-DWEET-AUTH": self.token, "Accept": "application/json", "Content-Type": "application/json"};

				request({
					method: options.method || "GET",
					url: DWEET_SERVER + options.url,
					json: options.data,
					followAllRedirects: true,
					timeout: REQUEST_TIMEOUT,
					strictSSL: STRICT_SSL,
					jar: true,
					headers: headers
				}, options.callback || function (err, response, body) {
					processDweetResponse(err, callback, body);
				});
			});
		}

		self.set_server = function (server, strictSSL) {
			DWEET_SERVER = server;
			STRICT_SSL = strictSSL;

			if (isNode) {
				if (strictSSL)
					require('https').globalAgent.options.rejectUnauthorized = true;
				else
					require('https').globalAgent.options.rejectUnauthorized = false;
			}
		}

		self.dweet = function (data, callback) {
			makeRequest({url: "/v2/dweets", data: data, method: "POST", callback: function (err, response, body) {
				var responseData = parseBody(body);

				if (responseData["with"] && responseData["with"].thing != currentThing) {
					currentThing = responseData["with"].thing;

					if (isNode) {require("fs").writeFile(LAST_THING_NAME, currentThing);}
				}

				processDweetResponse(err, callback, responseData);
			}});
		};

		self.get_latest_dweet_for = function (thing, key, callback) {
			if (typeof key === "function") {
				callback = key;
				key = null;
			}

			makeRequest({url: "/v2/dweets/latest?thing=" + thing + "&key=" + key}, callback);
		};

		self.get_recent_dweets_for = function (thing, callback) {
			makeRequest({url: "/v2/dweets?thing=" + thing}, callback);
		};

		self.get_dweets_for_past_hour_for = function (thing, callback) {
			makeRequest({url: "/v2/dweets/hour?thing=" + thing}, callback);
		};

		self.get_all_dweets_for = function (thing, callback) {
			makeRequest({url: "/v2/dweets/all?thing=" + thing}, callback);
		};

		self.get_dweets_in_range = function (thing, start, end, callback) {
			makeRequest({url: "/v2/dweets/range?thing=" + thing + "&from=" + start + "&to=" + (end || Date.now())}, callback);
		};

		self.get_collection = function (collection, callback) {
			makeRequest({url: "/v2/collections/recheck?name=" + collection}, callback);
		};

		self.get_collections = function (callback) {
			makeRequest({url: "/v2/collections/all"}, callback);
		};

		self.get_all_locks = function (callback) {
			makeRequest({url: "/v2/locks/all"}, callback);
		};

		self.get_locks_count = function (callback) {
			makeRequest({url: "/v2/locks/count"}, callback);
		};

		self.get_used_locks = function (callback) {
			makeRequest({url: "/v2/locks/used"}, callback);
		};

		self.get_unused_locks = function (callback) {
			makeRequest({url: "/v2/locks/unused"}, callback);
		};

		self.get_lock = function (callback) {
			makeRequest({url: "/v2/lock/one"}, callback);
		};

		self.lock = function (thing, collection, callback) {
			self.get_lock(function (err, lock) {
				makeRequest({url: "/v2/things/lock", method: "PUT", data: {name: thing, lockId: lock.id, collectionname: collection}}, callback);
			});
		};

		self.unlock = function (thing, callback) {
			makeRequest({url: "/v2/things/unlock", method: "PUT", data: {name: thing}}, callback);
		};

		self.get_thing = function (thing, callback) {
			makeRequest({url: "/v2/things?name=" + thing}, callback);
		};

		self.get_all_things = function (callback) {
			makeRequest({url: "/v2/things/all"}, callback);
		};

		self.get_things_in_collection = function (collection, callback) {
			makeRequest({url: "/v2/things/collection?collection=" + collection}, callback);
		};

		self.get_count_in_collection = function (collection, callback) {
			makeRequest({url: "/v2/things/count?collection=" + collection}, callback);
		};

		self.find_things_like = function (query, callback) {
			makeRequest({url: "/v2/things/find?like=" + query}, callback);
		};

		self.search = function (query, callback) {
			makeRequest({url: "/v2/things/search-all?search=" + query}, callback);
		};

		self.listen_for = function (thing, key, callback) {
			// Initialize our callback list
			if (!listenCallbacks[thing]) {
				listenCallbacks[thing] = [];
			}

			// Add this to our callbacks
			if (listenCallbacks[thing].indexOf(callback) == -1) {
				listenCallbacks[thing].push(callback);
			}

			function createSocket() {
				socket = io.connect(DWEET_SERVER + "/v2/stream");

				ensureLogin(function () {
					socket.on("connect", function () {
						// Subscribe to all of the things that we might have asked for before connecting
						for (var id in listenCallbacks) {
							socket.emit("subscribe", {thing: id, key: key, token: self.token});
						}
					});
				});					

				socket.on("new_dweet", function (msg) {
					if (listenCallbacks[msg.thing]) {
						normalizeDweets(msg);
						var callbacks = listenCallbacks[msg.thing];
						for (var index = 0; index < callbacks.length; index++) {
							callbacks[index](msg);
						}
					}
				});
			}

			if (!socket) {
				if (isNode) {
					createSocket();
				}
				else {
					dweet_script_loader([DWEET_SERVER + "/socket.io/socket.io.js"], function () {
						io = window.io;
						createSocket();
					});
				}
			}
			if (socket) {
				socket.emit("subscribe", {thing: thing, key: key, token: self.token});
			}
		}

		self.stop_listening = function () {
			listenCallbacks = {};

			if (socket) {
				socket.disconnect();
				socket = undefined;
			}
		}

		self.stop_listening_for = function (thing) {
			listenCallbacks[thing] = undefined;
			delete listenCallbacks[thing];

			if (socket) {
				socket.emit("unsubscribe", {thing: thing});
			}
		}

		self.set_alert = function (options, callback) {
			if (!isArray(options.recipients)) {options.recipients = [options.recipients];} //recipients must always be an array

			makeRequest({
				url: "/v2/alerts",
				method: "POST",
				data: {
					thing: options.thing,
					name: options.name,
					recipients: options.recipients,
					condition: options.condition
				}
			}, callback);
		};

		self.get_alert = function (thing, callback) {
			makeRequest({url: "/v2/alerts?thing=" + thing}, callback);
		};

		self.get_alert_in_range = function (thing, start, end, callback) {
			makeRequest({url: "/v2/alerts/range?thing=" + thing + "&from=" + start + "&to=" + end}, callback);
		};

		self.get_all_alerts = function (callback) {
			makeRequest({url: "/v2/alerts/all"}, callback);
		};

		self.get_all_alerts_in_range = function (start, end, callback) {
			makeRequest({url: "/v2/alerts/range/all?from=" + start + "&to=" + end}, callback);
		};

		self.remove_alert = function(thing, name, callback) {
			makeRequest({
				url: "/v2/alerts",
				method: "DELETE",
				data: {
					thing: thing,
					name: name
				}
			}, callback);
		};
	};

	if (isNode) {
		module.exports = dweetioClient;
	}
	else {
		window.dweetio = new dweetioClient();
	}
})();
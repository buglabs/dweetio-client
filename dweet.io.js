var isNode = true;

// Is this loading into node.js?
try
{
	isNode = (require);
}
catch(e)
{
	isNode = false;
}

var io;
var request;

var LAST_THING_NAME = "last-thing.dat";
var DWEET_SERVER = "http://dweet.io";
var REQUEST_TIMEOUT = 2000;
var lastThing;

if(isNode)
{
	io = require("socket.io-client");
	request = require("request");

	if(require("fs").existsSync(LAST_THING_NAME))
	{
		try
		{
			lastThing = require("fs").readFileSync(LAST_THING_NAME).toString();
		}
		catch(e)
		{
		}
	}
}
else
{
	request = function(options, callback)
	{
		var self = this;
		var src = options.url + (options.url.indexOf("?") + 1 ? "&" : "?");
		var head = document.getElementsByTagName("head")[0];
		var params = [];
		var param_name = "";

		for(param_name in options.json)
		{
			params.push(param_name + "=" + encodeURIComponent(options.json[param_name]));
		}

		// Generate a unique callbackname
		var callbackName = "callback";
		var index = 0;
		while(window.dweetCallback[callbackName + index])
		{
			index++;
		}

		callbackName = callbackName + index;
		window.dweetCallback[callbackName] = function(data)
		{
			callback(null, data, data);
		};

		params.push("callback=dweetCallback." + callbackName);
		params.push("_" + "=" + Date.now());

		src += params.join("&");

		dweet_script_loader(src, function(script)
		{
			head.removeChild(script);
			window.dweetCallback[callbackName] = undefined;
			delete window.dweetCallback[callbackName];
		});
	};

	window.dweetCallback = {};

	(function()
	{
		var firstScript = document.getElementsByTagName('script')[0];
		var scriptHead = firstScript.parentNode;
		var re = /ded|co/;
		var onload = 'onload';
		var onreadystatechange = 'onreadystatechange';
		var readyState = 'readyState';

		var load = function(src, fn)
		{
			var script = document.createElement('script');
			script[onload] = script[onreadystatechange] = function()
			{
				if(!this[readyState] || re.test(this[readyState]))
				{
					script[onload] = script[onreadystatechange] = null;
					fn && fn(script);
					script = null;
				}
			};
			script.async = true;
			script.src = src;
			scriptHead.insertBefore(script, firstScript);
		};
		window.dweet_script_loader = function(srces, fn)
		{
			if(typeof srces == 'string')
			{
				load(srces, fn);
				return;
			}
			var src = srces.shift();
			load(src, function(script)
			{
				if(srces.length)
				{
					window.dweet_script_loader(srces, fn);
				}
				else
				{
					fn && fn(script);
				}
			});
		};
	})();
}

var dweetioClient = function()
{
	var self = this;
	var socket;
	var listenCallbacks = {};
	var currentThing = lastThing;

	function normalizeDweet(dweet)
	{
		if(dweet.created)
		{
			dweet.created = new Date(dweet.created);
		}

		return dweet;
	}

	function normalizeDweets(dweets)
	{
		if(dweets instanceof Array)
		{
			for(var index = 0; index < dweets.length; index++)
			{
				var dweet = dweets[index];
				normalizeDweet(dweet);
			}
		}
		else
		{
			normalizeDweet(dweets);
		}

		return dweets;
	}

	function processError(responseData)
	{
		var err;

		if(responseData && responseData["this"] == "failed")
		{
			err = new Error(responseData["because"]);
		}

		return err;
	}

	function isFunction(obj)
	{
		return typeof obj === 'function';
	}

	function createKeyedURL(url, key)
	{
		if(key)
		{
			return url + (url.indexOf("?") + 1 ? "&" : "?") + "key=" + encodeURIComponent(key);
		}

		return url;
	}

	self.set_server = function(server)
	{
		DWEET_SERVER = server;
	}

	self.dweet = function(data, callback)
	{
		if(currentThing)
		{
			self.dweet_for(currentThing, data, callback);
		}
		else
		{
			request({
				url   : DWEET_SERVER + "/dweet",
				jar   : true,
				method: "POST",
				timeout : REQUEST_TIMEOUT,
				json  : data
			}, function(err, response, responseData)
			{
				if(!err)
				{
					err = processError(responseData);
				}

				if(responseData["with"] && responseData["with"].thing != currentThing)
				{
					currentThing = responseData["with"].thing;

					if(isNode)
					{
						require("fs").writeFile(LAST_THING_NAME, currentThing);
					}
				}

				if(callback)
					callback(err, normalizeDweets(responseData["with"]));
			});
		}
	};

	self.dweet_for = function(thing, data, key, callback)
	{
		if(isFunction(key))
		{
			callback = key;
			key = null;
		}

		request({
			url   : createKeyedURL(DWEET_SERVER + "/dweet/for/" + thing, key),
			jar   : true,
			method: "POST",
			timeout: REQUEST_TIMEOUT,
			json  : data
		}, function(err, response, responseData)
		{
			if(!err)
			{
				err = processError(responseData);
			}

			if(callback)
			{
				callback(err, normalizeDweets(responseData["with"]));
			}
		});
	}

	self.get_latest_dweet_for = function(thing, key, callback)
	{
		if(isFunction(key))
		{
			callback = key;
			key = null;
		}

		request({
			url : createKeyedURL(DWEET_SERVER + "/get/latest/dweet/for/" + thing, key),
			jar : true,
			timeout: REQUEST_TIMEOUT,
			json: {}
		}, function(err, response, responseData)
		{
			if(!err)
			{
				err = processError(responseData);
			}

			if(callback)
			{
				callback(err, normalizeDweets(responseData["with"]));
			}
		});
	}

	self.get_all_dweets_for = function(thing, key, callback)
	{
		if(isFunction(key))
		{
			callback = key;
			key = null;
		}

		request({
			url : createKeyedURL(DWEET_SERVER + "/get/dweets/for/" + thing, key),
			jar : true,
			timeout: REQUEST_TIMEOUT,
			json: {}
		}, function(err, response, responseData)
		{
			if(!err)
			{
				err = processError(responseData);
			}

			if(callback)
			{
				callback(err, normalizeDweets(responseData["with"]));
			}
		});
	}

	self.listen_for = function(thing, key, callback)
	{
		if(isFunction(key))
		{
			callback = key;
			key = null;
		}

		// Initialize our callback list
		if(!listenCallbacks[thing])
		{
			listenCallbacks[thing] = [];
		}

		// Add this to our callbacks
		if(listenCallbacks[thing].indexOf(callback) == -1)
		{
			listenCallbacks[thing].push(callback);
		}

		function createSocket()
		{
			socket = io.connect(DWEET_SERVER + "/stream");

			socket.on("connect", function()
			{
				// Subscribe to all of the things that we might have asked for before connecting
				for(var id in listenCallbacks)
				{
					socket.emit("subscribe", {thing: id, key: key});
				}
			});

			socket.on("new_dweet", function(msg)
			{
				if(listenCallbacks[msg.thing])
				{
					normalizeDweets(msg);

					var callbacks = listenCallbacks[msg.thing];
					for(var index = 0; index < callbacks.length; index++)
					{
						callbacks[index](msg);
					}
				}
			});
		}

		if(!socket)
		{
			if(isNode)
			{
				createSocket();
			}
			else
			{
				dweet_script_loader([DWEET_SERVER + "/socket.io/socket.io.js"], function()
				{
					createSocket();
				});
			}
		}
		else if(socket && socket.socket.connected)
		{
			socket.emit("subscribe", {thing: thing});
		}
	}

	self.stop_listening = function()
	{
		listenCallbacks = {};

		if(socket)
		{
			socket.disconnect();
			socket = undefined;
		}
	}

	self.stop_listening_for = function(thing)
	{
		listenCallbacks[thing] = undefined;
		delete listenCallbacks[thing];

		if(socket)
		{
			socket.emit("unsubscribe", {thing: thing});
		}
	}
};

if(isNode)
{
	module.exports = dweetioClient;
}
else
{
	window.dweetio = new dweetioClient();
}
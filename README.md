# dweet.io Javascript Client

A javascript library for interacting with http://dweet.io — a free, easy-to-use messaging platform for the Internet of Things.

### Use It

```html
<script src="dweet.io.js"></script>
```

Or from our CDN

```html
<script src="//dweet.io/client/dweet.io.min.js"></script>
```

### Initialize The client

First initialize the client with your username and password from http://dweet.io.

```js
  var dweetClient = require("dweetio-client");
  var dweetio = new dweetClient("username", "password");
```

### Dweeting

Send a dweet with a name you define.
```js
dweetio.dweet({thing: "my-thing", content: {some: "data"}}, function (err, dweet) {
  if (err) {console.log(err);}

  console.log(dweet.thing); // The thing name
  console.log(dweet.content); // The content of the dweet
  console.log(dweet.created); // The create date of the dweet
});
```

### Getting Dweets

Get the latest dweet.
```js
dweetio.get_latest_dweet_for("my-thing", function (err, dweet) {
  var dweet = dweet[0]; // Dweet is always an array of 1

  console.log(dweet.thing); // The thing name
  console.log(dweet.content); // The content of the dweet
  console.log(dweet.created); // The create date of the dweet
});
```

Get all dweets from the past hour.
```js
dweetio.get_dweets_for_past_hour_for("my-thing", function (err, dweets) {
  if (err) {console.log(err);}

  // Dweets is an object, all is an array of dweets
  dweets.all.forEach(function (dweet) {
    console.log(dweet.thing); // The thing name
    console.log(dweet.content); // The content of the dweet
    console.log(dweet.created); // The create date of the dweet
  });
});
```

Get the last 5 dweets.
```js
dweetio.get_recent_dweets_for("my-thing", function (err, dweets) {
  if (err) {console.log(err);}

  // Dweets is an array of dweets
  dweets.forEach(function (dweet) {
    console.log(dweet.thing); // The thing name
    console.log(dweet.content); // The content of the dweet
    console.log(dweet.created); // The create date of the dweet
  });
});
```

Get all dweets (up to 500 in the last 24 hours).
```js
dweetio.get_all_dweets_for("my-thing", function (err, dweets) {
  if (err) {console.log(err);}

  // Dweets is an array of dweets
  dweets.forEach(function (dweet) {
    console.log(dweet.thing); // The thing name
    console.log(dweet.content); // The content of the dweet
    console.log(dweet.created); // The create date of the dweet
  });
});
```

### Alerts

Set an alert.

```js
dweetio.set_alert({
  thing: "my-thing",
  name: "alert-name",
  recipients: ["email1@doh-main.com, email2@doh-main.com"], // Email addresses must be an array
  condition: "if (dweet.some_data > 100) return 'something wrong';"
}, function (err, dweet) {
  if (err) console.log(err); // If there was a problem, err will be returned, otherwise setting the alert was successful.
  console.log(dweet);
});
```

A condition is a simple javascript expression to evaluate the data in a dweet and to return whether or not an alert should be sent. You can reference the actual data in the dweet as a javascript object, like dweet.my_field or dweet["my_field"]. If the javascript expression returns anything other than a "falsey" value (false, null, undefined, 0, etc.), an alert will be sent.

Get an alert.
```js
dweetio.get_alert("my-thing", function (err, alert) {
  if (err) console.log(err); // If there was a problem, err will be returned, otherwise the data for the alert will be returned in alert
  console.log(alert);
});
```

Get all alerts.
```js
dweetio.get_all_alerts(function (err, alert) {
  if (err) console.log(err); // If there was a problem, err will be returned, otherwise the data for the alert will be returned in alert
  console.log(alert);
});
```

Get alert in range.
```js
dweetio.get_alert_in_range("my-thing", "1990-01-01", "2016-10-20", function (err, alert) {
  if (err) console.log(err); // If there was a problem, err will be returned, otherwise the data for the alert will be returned in alert
  console.log(alert);
});
```

Remove an alert.
```js
// Email addresses can also be an array
dweetio.remove_alert("my-thing", "alert-name", function (err, alert) {
  if (err) console.log(err); // If there was a problem, err will be returned, otherwise the data for the alert will be returned in alert
  console.log(alert);
});
```

### Notifications

Listen for all dweets from a thing.
```js
dweetio.listen_for("my-thing", "my-key", function (dweet) {

    // This will be called anytime there is a new dweet for my-thing

});
```

Stop listening for dweets from a thing.
```js
dweetio.stop_listening_for("my-thing");
```

Stop listening for dweets from everything.
```js
dweetio.stop_listening();
```

### Locking & Security

By default, all things are publicly accessible if you know the thing name of the thing. You can also lock things so that they are only accessible to users with valid security credentials. To purchase locks, visit https://dweet.io/locks. The locks will be emailed to you.

To use purchased locks:

```js
// To lock a thing if you have available locks on your account.
dweetio.lock("my-thing", "my-collection", function (err, thingData){
  if (err) console.log(err); // If there was a problem, err will be returned.
  console.log(lockData); // thingData will return information about the thing including the lock that was used.
});

// To unlock a thing
dweetio.unlock("my-thing", function (err, thingData) {
  if (err) console.log(err); // If there was a problem, err will be returned.
  console.log(lockData); // thingData will return information about the thing.
});
```
### Copyright & License

Copyright © 2013 Jim Heising (https://github.com/jheising)
<br/>
Copyright © 2013 Bug Labs, Inc. (http://buglabs.net)
<br/>
Licensed under the **MIT** license.

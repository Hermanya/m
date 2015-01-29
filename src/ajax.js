module.exports = function ajax (method, url, data) {
  data = serialize(data);
  if (method === 'get' && data) {
    url += '?' + data;
    data = undefined;
  }

  console.info(method.toUpperCase(), url, data);
  return new Promise(function (resolve, reject) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = onRequestUpdate.bind(undefined, resolve, reject, xmlhttp);
    xmlhttp.open(method, url, true);

    if (method !== 'get') {
      xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    }

    xmlhttp.send(data);
  });
};

function serialize (object, prefix) {
  return Object.keys(object).map(function (key) {
    var value = object[key];
    if (prefix) {
      key = prefix + '[' + key + ']';
    }
    if (typeof value === 'object') {
      return serialize(value, key);
    }
    return encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }).join('&');
}

function onRequestUpdate (resolve, reject, xmlhttp) {
  if (xmlhttp.readyState === 4) {
    onRequestComplete(xmlhttp, resolve, reject);
  }
}

function onRequestComplete (resolve, reject, xmlhttp) {
  if (xmlhttp.status === 200) {
    resolve(JSON.parse(xmlhttp.responseText));
  } else {
    reject(xmlhttp);
  }
}

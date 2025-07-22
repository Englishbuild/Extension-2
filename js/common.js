var vd = {};
vd.fourKDataExpTimeFree = 60 * 60 * 1000; // 1 hour
vd.fourKDataExpTimePremium = 5 * 60 * 1000; // 5 minutes
vd.fourKEmptyDataExpTime = 5 * 60 * 1000; // 5 minutes
vd.loginStatusCheckIntTime = 30 * 60 * 1000; // 30 minutes
vd.bg4KVideoCheckForAllUsers = false; // values: true, false
vd.loginStatusCheckTimeout = 15000; // 15 seconds
vd.allVideoFormats = ['mp4', "mov", "flv", "webm", "3gp", "ogg", "m4a", "mp3", "wav", "bin"];
vd.defaultVideoFormats = ['.mp4', ".mov", ".flv", ".webm", ".3gp", ".ogg", ".m4a", ".wav", ".bin"];
vd.minVideoSizes = {
  "1": {
    bytes: 100 * 1024,
    text: "100 KB",
    id: "1"
  },
  "2": {
    bytes: 1024 * 1024,
    text: "1 MB",
    id: "2"
  },
  "3": {
    bytes: 2 * 1024 * 1024,
    text: "2 MB",
    id: "3"
  },
};
vd.premiumVideoFormats = [".mp3"];
vd.nonePremiumVideoFormats = ['.mp4', ".mov", ".flv", ".webm", ".3gp", ".ogg", ".m4a", ".wav", ".bin"];
vd.serverUrl = 'https://vidow.io/';
vd.serverUrl2 = 'http://vidow.me/chrome/';
vd.version = "PAID";
vd.extension = "chrome";


vd.storage = chrome.storage.local;
vd.storageKeys = {
  tabsData: "tabs_data",
  savedVideos: "saved_videos",
  minVideoSize: "min_video_size",
  totalDownloads: "total_downloads",
  fourKData: "four_k_data",
};

vd.getStorage = async function(key) {
  let data = await vd.storage.get([key]);
  return (data && data[key]) ? JSON.parse(data[key]) : null;
};
vd.setStorage = async function(key, value) {
  let data = {};
  data[key] = JSON.stringify(value);
  return await vd.storage.set(data);
};
vd.getStored4KData = async (id) => {
  let data = await vd.getStorage(vd.storageKeys.fourKData);
  // console.log(id);
  // console.log(data);
  return data ? data[id] : null;
};
vd.removeStored4KData = async (id) => {
  let data = await vd.getStorage(vd.storageKeys.fourKData);
  if (!data || !data[id]) {
    return 0;
  }
  delete data[id];
  await vd.setStorage(vd.storageKeys.fourKData, data);
};

vd.isVideoLinkTypeValid = function(videoLink, videoTypes) {
  let isValidType = true;
  if (videoTypes.length > 0) {
    // isValidType = ($.inArray(videoLink.extension + "", videoTypes) !== -1);
    isValidType = videoTypes.includes(videoLink.extension + "");
  }
  return isValidType;
};

vd.isVideoSizeValid = function(data, minVideoSize) {
  minVideoSize = vd.minVideoSizes[minVideoSize].bytes;
  var isValid = true;
  if (!data) {
    return isValid
  }
  var vSize = parseInt(data.filesize ? data.filesize : data.size);
  if (isNaN(vSize)) {
    return isValid;
  }
  return (vSize > minVideoSize);
};

vd.ignoreError = function() {
  if (chrome.runtime.lastError) {
    console.log("error: ", chrome.runtime.lastError);
  } else {}
};

vd.convertToJson = function(str) {
  return typeof str === "string" ? JSON.parse(str) : str;
};

vd.getLoginToken = function(callback) {
  chrome.storage.sync.get({
    login_token: false
  }, function(items) {
    callback(items.login_token);
  })
};

vd.autoLogin = function(callback) {
  chrome.storage.sync.get({
    login_token: false
  }, function(items) {
    if (!items.login_token) {
      callback({
        status: 0
      });
      return;
    }
    fetch(vd.serverUrl + "autoLogin/" + items.login_token).then(response => response.json()).then(response => {
      if (!response.status) {
        callback({
          status: 0
        });
        return;
      }
      callback({
        status: 1
      });
    });
    /*$.get(vd.serverUrl+"autoLogin/"+ items.login_token, function (response) {
        response = vd.convertToJson(response);

    });*/
  });
};

vd.isLoggedInAndUpgraded = function(callback) {
  chrome.storage.sync.get({
    logged_in: false,
    upgraded: 'false'
  }, function(items) {
    callback(items.logged_in && items.upgraded !== "false");
  });
};

vd.is4KDataValid = function(fourKData) {
  // console.log("Validation check", fourKData);
  var isValid = fourKData && (fourKData.title != null || (fourKData.value && fourKData.value.title != null)) && fourKData.ext !== 'unknown_video';
  // console.log(!!isValid);
  return !!isValid;
};
vd.setStored4KData = async (id, fourKData) => {
  let data = await vd.setStorage(vd.storageKeys.fourKData, fourKData);
  // data[id]
  return data ? data[id] : null;
};
vd.saveFourKData = async function(fourKData) {
  // console.log("Saving data");
  // console.log(fourKData);

  var url = fourKData.tabUrl ? fourKData.tabUrl : fourKData.webpage_url;
  var urlId = md5(url);
  let all4KData = await vd.getStorage(vd.storageKeys.fourKData);
  // console.log(url, urlId);
  if (!all4KData) {
    all4KData = {};
  }
  all4KData[urlId] = {
    "id": urlId,
    "url": fourKData.webpage_url,
    "value": fourKData,
    "time": new Date().getTime()
  };
  await vd.setStored4KData(urlId, all4KData);
  /*  localStorage.setItem(urlId, JSON.stringify({
        "id": urlId,
        "url": fourKData.webpage_url,
        "value": fourKData,
        "time": new Date().getTime()
    }));*/
};

vd.get4KData = function(videoUrl, callback) {
  fetch(vd.serverUrl2 + "getinfo.php?" + new URLSearchParams({
    videourl: encodeURIComponent(videoUrl)
  }), {
    method: "GET",
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(result => result.json()).then(data => {
    callback(data);
  }).catch((e) => {
    console.error(e);
    callback(false);
  });
};

vd.cleanUp4KData = async function() {
  let allFourKData = await vd.getStorage(vd.storageKeys.fourKData);
  if (!allFourKData) {
    return 0;
  }
  vd.isLoggedInAndUpgraded(function(bool) {
    let expireTime = bool ? vd.fourKDataExpTimePremium : vd.fourKDataExpTimeFree;
    let now = new Date().getTime();
    // console.log("Now: ", now);
    // console.log("All", allFourKData);
    Object.keys(allFourKData).forEach((id) => {
      let fourKData = allFourKData[id];
      if (!fourKData.time || ((now - fourKData.time) > expireTime)) {
        // console.log("Deleting", allFourKData[id]);
        delete allFourKData[id];
      }
    });
    return vd.setStorage(vd.storageKeys.fourKData, allFourKData);
  });
}

vd.is4KDataExpired = function(fourKData, callback) {
  // console.log(fourKData);
  if (!fourKData || !fourKData.time) {
    // console.log("YYYY");
    callback(true);
    return;
  }
  // console.log(new Date(fourKData.time));
  if (!vd.is4KDataValid(fourKData)) {
    callback(new Date().getTime() - fourKData.time > vd.fourKEmptyDataExpTime);
    return;
  }
  vd.isLoggedInAndUpgraded(function(bool) {
    // console.log("upgraded", bool);
    if (bool) {
      callback(new Date().getTime() - fourKData.time > vd.fourKDataExpTimePremium);
    } else {
      callback(new Date().getTime() - fourKData.time > vd.fourKDataExpTimeFree);
    }
  });

};


vd.getStoredSettings = function(callback) {
  chrome.storage.sync.get({
    videoTypes: vd.defaultVideoFormats,
    chromeCast: true,
    /*videoResolutions: [],*/
    minVideoSize: '1',
    logged_in: false,
    login_token: false,
    upgraded: 'false'
  }, function(items) {
    // console.log(items);
    if (vd.version !== "FREE" && items.upgraded === "false") {
      items.videoTypes = items.videoTypes.filter(function(videoType) {
        return vd.premiumVideoFormats.indexOf(videoType) === -1;
      });
    }
    callback(items);
  });
};
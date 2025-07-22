importScripts('common.js', "md5.min.js");

chrome.runtime.onInstalled.addListener(function(details) {
  // Check if the reason for the event is 'install'
  if (details.reason === "install") {
    chrome.tabs.create({
      url: 'https://chrome.vidow.io/installed/'
    });
  }
});

// vd.linksToBeDownloaded = {};
// vd.savedVideos = {};
var minVideoSize = "1";
vd.isVideoUrl = function(url) {
  let isVideoUrl = false;
  vd.allVideoFormats.some(function(format) {
    if (url.indexOf(format) != -1) {
      isVideoUrl = true;
      return true;
    }
  });
  return isVideoUrl;
};
vd.requestedUrlInfo = {};

vd.cleanTabsData = () => {
  chrome.tabs.query({}, async (tabs) => {
    let tabIds = tabs.map((tab) => {
      return tab.id
    });
    // console.log("Tabs", tabIds);
    let tabsData = await vd.getStorage(vd.storageKeys.tabsData);
    // console.log("Tabs data", tabsData);
    if (!tabsData) {
      return 0
    }
    Object.keys(tabsData).forEach((tabId) => {
      if (!tabIds.includes(parseInt(tabId))) {
        // console.log("Deleting tab data for ", tabId);
        delete tabsData[tabId];
      }
    });
    // console.log("New tabs data", tabsData);
  });
};

vd.getVideoType = function(responseHeaders) {
  var videoType = null;
  responseHeaders.some(function(responseHeader) {
    if (responseHeader.name.toLowerCase() === 'content-type') {
      vd.allVideoFormats.forEach(function(formatKey) {
        if (responseHeader.value.indexOf(formatKey) !== -1 && !/^audio/i.test(responseHeader.value)) {
          videoType = formatKey;
          return true;
        }
      });
      return true;
    }
  });
  return videoType;
};

vd.getNewTabObject = function() {
  return {
    videoLinks: [],
    url: ""
  }
};

vd.getVideoSize = function(videoHeaders) {
  var size = 0;
  videoHeaders.forEach(function(header) {
    if (header.name.toLowerCase() === "content-length") {
      size = parseInt(header.value);
    }
  });
  return size;
};

vd.getVideoDataFromServer = function(url, callback) {
  let controller = new AbortController();
  // console.log("Getting video content from server");
  // console.time();
  fetch(url, {
    signal: controller.signal
  }).then((response) => {
    controller.abort();
    // console.timeEnd();
    let size = response.headers.get('content-size') || response.headers.get('content-length');
    size = parseInt(size);
    size = isNaN(size) ? 2048 : size;
    let headerInfo = {
      mime: response.headers.get('content-type'),
      size: size
    };
    // console.log("Header info", headerInfo);
    callback(headerInfo);

  });
  /* var request = new XMLHttpRequest();
   request.onreadystatechange = function () {
       if (request.readyState === 2) {
           callback({mime: this.getResponseHeader("Content-Type"), size: this.getResponseHeader("Content-Length")});
           request.abort();
       }
   };
   request.open('Get', url);
   request.send();*/
};

vd.getFileName = function(str) {
  var regex = /[A-Za-z0-9()_ -]/;
  var escapedStr = "";
  str = Array.from(str);
  str.forEach(function(char) {
    if (regex.test(char)) {
      escapedStr += char;
    }
  });
  return escapedStr;
};

vd.isVideoLinkAlreadyAdded = function(videoLinksData, url) {
  //console.log("URL " + url);
  //console.log(videoLinksData);
  var isAlreadyAdded = false;
  videoLinksData.some(function(videoLinkData) {
    if (videoLinkData.url === url) {
      isAlreadyAdded = true;
      return true;
    }
  });
  //console.log("Is already added: "+ isAlreadyAdded);
  return isAlreadyAdded;
};

vd.updateExtensionIcon = function(tabId) {
  vd.getStorage(vd.storageKeys.tabsData).then((tabsData) => {
    if (!tabsData) {
      vd.colorizeExtensionIcon(false, tabId);
      return 0;
    }
    let colorize = tabsData[tabId] && tabsData[tabId].videoLinks.length > 0;
    vd.colorizeExtensionIcon(colorize, tabId);
  });
};

vd.addVideoLinkToTabFinalStep = function(tabId, videoLink) {
  //console.log(videoLink);
  //console.log("Trying to add url "+ videoLink.url);
  // console.log(vd.isVideoSizeValid(videoLink, minVideoSize));
  vd.getStorage(vd.storageKeys.tabsData).then((tabsData) => {
    if (!tabsData) {
      vd.updateExtensionIcon(tabId);
      return 0;
    }
    if (!vd.isVideoLinkAlreadyAdded(tabsData[tabId].videoLinks, videoLink.url) && vd.isVideoSizeValid(videoLink, minVideoSize) && vd.isVideoUrl(videoLink.url)) {
      tabsData[tabId].videoLinks.push(videoLink);
      vd.setStorage(vd.storageKeys.tabsData, tabsData).then(() => {
        vd.updateExtensionIcon(tabId);
      });
    }
  });
};

vd.addVideoLinkToTab = function(videoLink, tabId, tabUrl) {
  vd.getStorage(vd.storageKeys.tabsData).then((tabsData) => {
    // console.log("$$$$$$$$$", tabsData);
    // tabsData = JSON.parse(tabsData);
    tabsData = vd.addVideoLinkToTabObj(tabId, tabUrl, tabsData);
    vd.setStorage(vd.storageKeys.tabsData, tabsData).then(() => {
      vd.addVideoLinkToTabFinalStep(tabId, videoLink);
    });
  });
};

vd.inspectNetworkResponseHeaders = function(details) {
  /*    if(vd.linksToBeDownloaded[details.url]) {
          details.responseHeaders.push({name: "Content-Disposition",value: "attachment; filename=\""+vd.linksToBeDownloaded[details.url]+"\""});
          return {
              responseHeaders: details.responseHeaders
          };
      }*/
  let root_domain = vd.extractRootDomain(details.url);
  let videoType = vd.getVideoType(details.responseHeaders);

  if (root_domain !== 'vimeo.com' && videoType) {
    chrome.tabs.query({
      active: true
    }, function(tabs) {
      let tab = tabs[0];
      let tabId = tabs[0].id;
      vd.addVideoLinkToTab({
        url: details.url,
        webpage_url: tab.url,
        size: vd.getVideoSize(details.responseHeaders),
        fileName: vd.getFileName(tab.title),
        title: vd.getFileName(tab.title),
        extension: "." + videoType
      }, tabId, tab.url);
    });
  }
  return {
    responseHeaders: details.responseHeaders
  };
};

vd.resetVideoLinks = async function(tabId) {
  let tabsData = await vd.getStorage(vd.storageKeys.tabsData);
  if (!tabsData) {
    return 0
  }
  delete tabsData[tabId];
  await vd.setStorage(vd.storageKeys.tabsData, tabsData);
};

vd.escapeRegExp = function(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

vd.addVideoLinkToTabObj = (tabId, tabUrl, tabsData) => {
  if (!tabsData) {
    tabsData = {};
  }
  if (!tabsData[tabId]) {
    tabsData[tabId] = vd.getNewTabObject();
  }
  if (tabUrl !== tabsData[tabId].url) {
    tabsData[tabId].videoLinks = [];
    tabsData[tabId].url = tabUrl;
  }
  return tabsData;
}

vd.addVideoLinks = async function(videoLinks, tabId, tabUrl) {
  // console.log("Adding video links", videoLinks);
  let tabsData = await vd.getStorage(vd.storageKeys.tabsData);
  tabsData = vd.addVideoLinkToTabObj(tabId, tabUrl, tabsData);
  await vd.setStorage(vd.storageKeys.tabsData, tabsData);
  videoLinks.forEach(function(videoLink) {
    // console.log(videoLink);
    videoLink.fileName = vd.getFileName(videoLink.fileName) + " - " + videoLink.quality + videoLink.extension;
    vd.getVideoDataFromServer(videoLink.url, function(videoData) {
      videoLink.size = videoData.size;
      vd.addVideoLinkToTab(videoLink, tabId, tabUrl);
    });

  });
};

vd.getVideoLinksForTab = async function(tabId) {
  // console.log("tab id", tabId);
  let tabsData = await vd.getStorage(vd.storageKeys.tabsData);
  // console.log(tabsData);
  // console.log(tabsData[tabId]);
  return (tabsData && tabsData[tabId]) ? tabsData[tabId] : {};
};

vd.incrementDownloadCount = function() {
  // var numberOfDownloads = parseInt(localStorage.getItem('total_number_of_downloads'));
  vd.getStorage('total_number_of_downloads').then(numberOfDownloads => {
    numberOfDownloads = numberOfDownloads ?? 0;
    numberOfDownloads += 1;
    vd.setStorage('total_number_of_downloads', numberOfDownloads).then(() => {});
  });
};

/*chrome.declarativeNetRequest.onRuleMatchedDebug.addListener( info => {
        console.log(">>>>> declarative", info);
    }
);*/

vd.downloadVideoLink = function(url, fileName) {
  // console.log(url+" (Downloading) : " + fileName);
  fileName = fileName.trim();
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      "id": 2,
      "priority": 1,
      "action": {
        "type": "modifyHeaders",
        "responseHeaders": [{
          "header": "Content-Disposition",
          "operation": "set",
          "value": "attachment; filename=\"" + fileName + "\""
        }, ]
      },
      "condition": {
        "urlFilter": url,
        "resourceTypes": ["main_frame"]
      }
    }],
    removeRuleIds: [2]
  }, () => {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      if (!tabs || !tabs.length) {
        return 0
      }
      chrome.tabs.update(tabs[0].id, {
        "url": url,
        "active": false
      }, function(tab) {
        setTimeout(() => {
          // console.log("Removing rule id");
          chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [2]
          })
        }, 2000);
      });
      vd.incrementDownloadCount();
    });
  });
};
vd.castVideo = function(url) {


};

vd.extractHostname = function(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("://") > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
};

// To address those who want the "root domain," use this function:
vd.extractRootDomain = function(url) {
  var domain = vd.extractHostname(url),
    splitArr = domain.split('.'),
    arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain
  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
    //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (splitArr[arrLen - 2].length === 2 && splitArr[arrLen - 1].length === 2) {
      //this is using a ccTLD
      domain = splitArr[arrLen - 3] + '.' + domain;
    }
  }
  return domain;
};

vd.colorizeExtensionIcon = function(colorize, tabId) {
  // console.trace("Coloriziing", colorize, tabId);
  colorize ? chrome.action.setIcon({
    tabId: tabId,
    path: "../icons/icon_active.png"
  }) : chrome.action.setIcon({
    tabId: tabId,
    path: "../icons/icon_inactive.png"
  })
};

vd.removeParams = function(url) {
  return url.replace(/[#\?].*$/, '');
};


vd.on4KDataReceived = function(fourKData, tab) {
  // console.log(result);
  // let fourKData = typeof result === 'string' ? JSON.parse(result) : result;
  fourKData.tabUrl = tab.url;
  vd.getStoredSettings(function(items) {
    let isLoggedInAndUpgraded = (items.logged_in && items.upgraded !== 'false');
    // console.log("4k data", fourKData);
    if (fourKData.title && vd.isVideoLinkTypeValid({
        extension: "." + fourKData.ext
      }, items.videoTypes) && isLoggedInAndUpgraded) {
      vd.colorizeExtensionIcon(true, tab.id);
    }
  });
  vd.saveFourKData(fourKData);
};

vd.getAllSavedVideoData = function() {
  vd.isLoggedInAndUpgraded(function(bool) {
    // console.log("Is logged in and upgraded", bool);
    if (!bool && vd.version !== "FREE") {
      return
    }
    fetch(vd.serverUrl + "video_list/get_all_video_data").then(response => response.json()).then(function(response) {
      // response = vd.convertToJson(response);
      // console.log("Get all video response", response);
      let savedVideos = {};
      if (!response.status) {
        if (response.statusDescription === "Login required") {
          vd.autoLogin(function(response) {
            if (response.status) {
              vd.getAllSavedVideoData();
            }
          });
        }
        return
      }
      // console.log("All saved video data", response);
      response?.videos?.forEach(function(video) {
        savedVideos[video.md5] = video;
      });
      vd.setStorage(vd.storageKeys.savedVideos, savedVideos).then(() => {});
    });
  });
};

vd.getSavedVideoData = function(md5) {
  fetch(vd.serverUrl + "video_list/get_saved_video?unique_id=" + md5).then((response) => {
    response.json()
  }).then(function(response) {
    response = vd.convertToJson(response);
    if (!response.status) {
      if (response.statusDescription === "Login required") {
        vd.autoLogin(function(response) {
          if (response.status) {
            vd.vd.getSavedVideoData(md5);
          }
        });
      }
      return
    }
    vd.getStorage(vd.storageKeys.savedVideos).then(savedVideos => {
      if (!savedVideos) {
        savedVideos = {};
      }
      response.videos.forEach(function(video) {
        savedVideos[video.md5] = video;
      });
      vd.setStorage(vd.storageKeys.savedVideos, savedVideos);
    });
  });
};

vd.onWebPageLoaded = function(tab) {
  // console.log("On page loaded");
  if (tab.url?.includes("youtube.com")) {
    vd.colorizeExtensionIcon(true, tab.id);
    return true;
  }
  vd.isLoggedInAndUpgraded(function(bool) {
    if (!vd.bg4KVideoCheckForAllUsers && !bool) {
      return
    }
    if (vd.requestedUrlInfo[tab.url]) {
      return;
    }
    vd.requestedUrlInfo[tab.url] = 1;
    if (chrome.runtime.lastError) {
      // console.log("error: ", chrome.runtime.lastError);
    }
    let urlId = md5(tab.url);
    vd.getStored4KData(urlId).then((fourKData) => {
      vd.is4KDataExpired(fourKData, function(expired) {
        // console.log("is expired", expired);
        // console.log(fourKData);
        if (expired) {
          vd.get4KData(tab.url, function(data) {
            delete vd.requestedUrlInfo[tab.url];
            vd.on4KDataReceived(data, tab);
          });
        } else {
          vd.getStoredSettings(function(items) {
            fourKData = fourKData.value;
            if (fourKData.title && vd.isVideoLinkTypeValid({
                extension: "." + fourKData.ext
              }, items.videoTypes)) {
              vd.colorizeExtensionIcon(true, tab.id);
            }
          })
        }
      });
    });
    // let fourKData = JSON.parse(localStorage.getItem(urlId));
  });
};

vd.getVideoTypeFromUrl = function(link) {
  var videoType = null;
  vd.allVideoFormats.some(function(format) {
    if (new RegExp(vd.escapeRegExp('.' + format)).test(link)) {
      videoType = format;
      return true;
    }
  });
  return videoType;
};

vd.getVimeoDataFromServer = function(dataUrl, tab) {
  // console.log(dataUrl);
  // console.log(tab);
  fetch(dataUrl.trim()).then((response) => {
    return response.json();
  }).then(function(response) {
    // console.log("response received from vimeo", response);
    // response = typeof response == 'string' ? JSON.parse(response) : response;
    var title = response.video.title;
    var videoLinks = [];
    // console.log(response.request.files.progressive);
    response.request.files.progressive.forEach(function(obj) {
      videoLinks.push({
        url: obj.url,
        fileName: title,
        title: title,
        webpage_url: tab.url,
        extension: "." + vd.getVideoTypeFromUrl(obj.url),
        quality: obj.quality,
        thumb: response.video.thumbs["640"]
      });
    });
    // console.log(videoLinks);
    vd.addVideoLinks(videoLinks, tab.id, tab.url);
  });
};

vd.getLoginStatus = async function(callback) {
  let data = await chrome.cookies.get({
    url: vd.serverUrl,
    "name": "auth"
  });
  let loginStatus = {
    logged_in: false,
    upgraded: 'false'
  };
  try {
    loginStatus = JSON.parse(decodeURIComponent(data.value));
    await chrome.storage.sync.set({
      logged_in: loginStatus.logged_in,
      upgraded: loginStatus.upgraded ? 'true' : 'false'
    });
    return loginStatus;
  } catch (e) {
    return null;
  }
  // console.log(loginStatus);
};

vd.fetchWithTimeout = (url, timeout) => {
  const controller = new AbortController();
  const signal = controller.signal;

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  return fetch(url, {
    signal
  }).then(
    response => {
      clearTimeout(timer);
      return response.text();
    }
  ).catch(error => {
    clearTimeout(timer);
    throw error;
  });
};

vd.syncRemoteLoginStatus = async function(callback) {
  return new Promise(async (resolve, reject) => {
    let t = new Date().getTime();
    let lastCheckTime = await vd.getStorage("last_login_status_time");
    if (lastCheckTime) {
      lastCheckTime = parseInt(lastCheckTime);
      // console.log(lastCheckTime);
      // console.log(vd.loginStatusCheckIntTime);
      // console.log(lastCheckTime + vd.loginStatusCheckIntTime);
      // console.log(t);
      if (lastCheckTime + vd.loginStatusCheckIntTime > t) {
        resolve(true);
        return 0;
      }
    }
    // console.time("server");
    try {
      // console.log("Reponse", response);
      let response = await vd.fetchWithTimeout(vd.serverUrl + "status/" + t, vd.loginStatusCheckTimeout);
      response = JSON.parse(atob(response));
      // console.time("sync");
      // console.log(response);
      await chrome.storage.sync.set({
        logged_in: response.logged_in,
        upgraded: response.upgraded ? 'true' : 'false'
      });
      let lastCheckTime = new Date().getTime();
      await vd.setStorage("last_login_status_time", lastCheckTime.toString());
      resolve(true)
    } catch (e) {
      console.log("Error", e);
      resolve(false);
    }
  });
};

vd.syncData = async function() {
  // console.log("Syncing data");
  vd.getAllSavedVideoData();
  await vd.getLoginStatus();
};

vd.syncData().then(() => {});

setInterval(async function() {
  // console.log("Getting saved video data");
  await vd.syncData();
}, 30000);

vd.getStoredSettings(function(items) {
  minVideoSize = items.minVideoSize
});

vd.removeTabsData = async (tabIds) => {
  let tabsData = await vd.getStorage(vd.storageKeys.tabsData);
  if (!tabsData) {
    return 0
  }
  tabIds.forEach(tabId => {
    delete tabsData[tabId];
  });
  await vd.setStorage(vd.storageKeys.tabsData, tabsData);
};

vd.cleanTabsData();

chrome.runtime.onInstalled.addListener(async function(details) {
  if (details.reason === "install") {
    await vd.setStorage("total_number_of_downloads", 0);
    await vd.setStorage(vd.storageKeys.tabsData, {});
    await vd.setStorage(vd.storageKeys.savedVideos, {});
    await vd.setStorage(vd.storageKeys.fourKData, {});
  }
});

chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
  if (!changeInfo.url) {
    return
  }
  // console.log(changeInfo);
  // console.log("Tab updated pppppppp");
  vd.colorizeExtensionIcon(false, tabId);
  await vd.resetVideoLinks(tabId);
  chrome.tabs.sendMessage(tabId, {
    message: "initialize-page",
    url: changeInfo.url
  }).catch((e) => {
    // console.log(e)
  });
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  vd.removeTabsData([tabId]);
});

chrome.webRequest.onHeadersReceived.addListener(vd.inspectNetworkResponseHeaders, {
  urls: ["<all_urls>"]
}, ["responseHeaders"]);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // console.log(request);
  // console.log(sender);
  switch (request.message) {
    case "reset-video-links":
      vd.resetVideoLinks(sender.tab.id, sender.tab.url);
      sendResponse();
      break;
    case "add-video-links":
      // console.log('adding video links');
      vd.addVideoLinks(request.videoLinks, sender.tab.id, sender.tab.url).then(() => {});
      sendResponse("Message received.");
      break;
    case "on-web-page-loaded":
      vd.onWebPageLoaded(sender.tab);
      sendResponse("Received the message.");
      break;
    case "get-video-links":
      vd.getVideoLinksForTab(request.tabId).then(sendResponse);
      vd.cleanTabsData();
      break;
    case "download-video-link":
      vd.downloadVideoLink(request.url, request.fileName);
      break;
    case "cast-video":
      vd.castVideo(request.url);
      break;
    case "is-video-saved":
      vd.getStorage(vd.storageKeys.savedVideos).then(savedVideos => {
        let savedVideo = (savedVideos && savedVideos[request.tabUrlMd5]) ? savedVideos[request.tabUrlMd5] : null;
        sendResponse(savedVideo);
      });
      break;
    case "add-saved-video":
      // console.log("Saving video", request.video);
      vd.getStorage(vd.storageKeys.savedVideos).then(savedVideos => {
        if (!savedVideos) {
          savedVideos = {};
        }
        savedVideos[request.video.md5] = request.video;
        vd.setStorage(vd.storageKeys.savedVideos, savedVideos).then(sendResponse);
      });
      break;
    case "remove-saved-video":
      vd.getStorage(vd.storageKeys.savedVideos).then(savedVideos => {
        if (savedVideos && savedVideos[request.tabUrlMd5]) {
          delete savedVideos[request.tabUrlMd5];
          vd.setStorage(vd.storageKeys.savedVideos, savedVideos).then(sendResponse);
        }
      });
      break;
    case "create-vimeo-video-links":
      if (request?.dataUrl) {
        vd.getVimeoDataFromServer(request.dataUrl, sender.tab);
      }
      sendResponse("Message received.");
      break;
    case "activate-ext-icon":
      if (sender.tab) {
        vd.colorizeExtensionIcon(request.activate, sender.tab.id);
      }
      break;
    case "update-min-vid-size":
      minVideoSize = request.minVideoSize;
      break;
    case "sync-remote-login-status":
      (async () => {
        let synced = await vd.syncRemoteLoginStatus();
        sendResponse(synced);
      })();
      break;
  }
  return true;
});
var currentVolume = 0.5;
var cookieName;
var videoTypes = [];
var tabUrlMd5 = '';
var savedVideos = {};
var storedSettings = {};
vd.sendMessage = function(message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

vd.videoLinks = [];

vd.getChromeCastButton = function(videoData) {
  return '<a href="' + (videoData.streaming_url ? videoData.streaming_url : videoData.url) + '" data-thumb="' + (videoData.thumbnail || videoData.thumb) + '" data-title="' + (videoData.fileName || videoData.title) + '" data-href="' + (videoData.url || videoData.streaming_url) + '" class="cast-button" data-file-name="' + videoData.fileName + videoData.extension + '" data-domain="' + videoData.d + '"></a>';
};

vd.createDownloadSection = function(videoData, chromeCast) {
  var mathFloor = Math.floor(videoData.size * 100 / 1024 / 1024) / 100;
  var chromeCostString = "";
  if (chromeCast !== false) {
    chromeCostString = vd.getChromeCastButton(videoData);
  }
  return '<li class="video" data-thumb="" data-link="' + videoData.webpage_url + '" data-title="' + videoData.title + '">\
    <div class="video_list_L"> <a class="play-button" href="' + videoData.url + '" target="_blank"></a> </div>\
    <div class="title" title="' + videoData.fileName + '">' + videoData.fileName + '</div>\
    <div class="video_list_R">' + chromeCostString + '<a class="download-button btn-instant-download btn btn-sm btn33 " href="' + videoData.url + '" data-file-name="' + videoData.fileName + videoData.extension + '">Download - ' + mathFloor + ' MB</a> </div>\
    <div class=" clearfix"></div>\
    <div class="sep"></div>\
</li>';
};

vd.removeParams = function(url) {
  return url.replace(/[#\?].*$/, '');
};

vd.addYoutubeInfo = function(data) {
  let fourKData = typeof data === 'string' ? JSON.parse(data) : data;
  let videoList = $("#video-list");
  let chromeCastHtml = "";
  let fourKString = '';
  let fourKDownloadUrl;
  let dButtonStr;
  // Removed server dependency - show local download option
  fourKDownloadUrl = "#";
  dButtonStr = '<a class="btn btn-default btn33 btn-sm btn34" href="' + fourKDownloadUrl + '" target="_blank">Download Available</a>';
  fourKString = '<li class="video" data-thumb="' + fourKData.thumbnail + '" data-link="' + fourKData.webpage_url + '" data-title="' + fourKData.title + '">' +
    '<a class="play-button" href="' + fourKData.webpage_url + '" target="_blank"></a>' +
    '<div class="title" title="' + fourKData.title + ' ' + fourKData.formatTtile + ' (' + fourKData.ext + ')">' + fourKData.title + ' ' + fourKData.formatTtile + ' (' + fourKData.ext + ')</div>' +
    '<div class="video_list_R">' + chromeCastHtml + dButtonStr + '</div>' +
    '<div class=" clearfix"></div>' +
    '<div class="sep"></div>' +
    '</li>';
  videoList.prepend(fourKString);
  if (videoList.find("li").length > 0) {
    vd.showVideoList();
  } else {
    vd.emptyVideoList();
    vd.sendMessage({
      message: "activate-ext-icon",
      activate: false
    });
    $("#no-video-found").css('display', 'block');
  }
  $("#loading").hide();
  vd.showSaveForLaterButton();
};

vd.add4KLink = function(data, settings, callback) {
  let fourKData = typeof data === 'string' ? JSON.parse(data) : data;
  let videoList = $("#video-list");
  let size = " Free";
  let duration = 0;
  let chromeCastHtml = "";
  let fourKString = '';
  let fourKDownloadUrl = '';
  let dButtonStr = '';
  if (fourKData && !fourKData.streaming_url) {
    fourKData.streaming_url = fourKData.baseurl;
  }

  // Removed login token requirement
  if (vd.is4KDataValid(fourKData) && vd.isVideoSizeValid(fourKData, settings.minVideoSize) && vd.isVideoLinkTypeValid({
      extension: "." + fourKData.ext
    }, videoTypes)) {
    // Removed server dependency - direct download
    fourKDownloadUrl = fourKData.streaming_url || fourKData.url;
    dButtonStr = '<a class="download-button btn-four-k-download four-k btn btn-sm btn33" href="' + fourKDownloadUrl + '" data-web-page="' + fourKData.webpage_url + '">Download -' + size + '</a>';
    if (fourKData.filesize != null) {
      size = (fourKData.filesize / 1024 / 1024).toFixed(2);
      size = size + " MB";
    }

    if (fourKData.duration != null) {
      duration = Math.round(fourKData.duration / 60);
      duration = duration + " Mins";
    }

    if (settings.chromeCast !== false) {
      chromeCastHtml = vd.getChromeCastButton(fourKData);
    }

    fourKString = '<li class="video" data-thumb="' + fourKData.thumbnail + '" data-link="' + fourKData.webpage_url + '" data-title="' + fourKData.title + '"><a class="play-button" href="' + fourKData.webpage_url + '" target="_blank"></a><div class="title" title="' + fourKData.title + ' ' + fourKData.formatTtile + ' (' + fourKData.ext + ')">' + fourKData.title + ' ' + fourKData.formatTtile + ' (' + fourKData.ext + ')</div><div class="video_list_R">' + chromeCastHtml + dButtonStr + '</div><div class=" clearfix"></div><div class="sep"></div></li>';
    videoList.prepend(fourKString);
  }
  callback();
};

vd.on4KDataReceived = function(result, settings, callback) {
  let fourKData = typeof result === 'string' ? JSON.parse(result) : result;
  vd.add4KLink(fourKData, settings, callback);
};

vd.getValidYtLink = function(links) {
  let validLink = {};
  links.some(function(link) {
    if (link.thumbnail) {
      validLink = link;
      return true
    }
  });
  return validLink;
};

vd.createDownloadSection4KVideo = function(videoPageUrl, settings, callback) {
  console.log("Creating 4K link");
  let urlId = md5(videoPageUrl);
  vd.getStored4KData(urlId).then((videoData) => {
    vd.is4KDataExpired(videoData, function(expired) {
      if (videoData && !expired) {
        let fourKData = videoData.value;
        vd.add4KLink(fourKData, settings, callback);
      } else {
        vd.removeStored4KData(urlId).then(() => {
          vd.get4KData(videoPageUrl, function(result) {
            if (!result) {
              vd.removeStored4KData(urlId).then(callback);
              return;
            }
            result.tabUrl = videoPageUrl;
            vd.saveFourKData(result).then(() => {});
            vd.on4KDataReceived(result, settings, callback);
          })
        });
      }
    });
  });
};

vd.onVideoListChanged = function() {

};

vd.emptyVideoList = function() {
  let videoList = $("#video-list");
  videoList.html("");
  videoList.css('display', 'none');
};

vd.showVideoList = function() {
  let videoList = $("#video-list");
  vd.sendMessage({
    message: "activate-ext-icon",
    activate: true
  });
  $("#no-video-found").css('display', 'none');
  videoList.css('display', 'block');
};

vd.showSaveForLaterButton = function() {
  let videoList = $("#video-list");
  if (videoList.find("li").length > 0) {
    $("#bookmark-video").show();
  }
};

vd.changeSaveVideoBtnStatus = function(enable) {
  let faBookmark = $(".fa-bookmark");
  if (!enable) {
    faBookmark.css('color', '#ff0b46');
  } else {
    faBookmark.css('color', '#555');
  }
};

vd.showSaveVideoLoading = function() {
  $(".fa-bookmark").hide();
  $("#loading2").show();
};

vd.hideSaveVideoLoading = function() {
  $(".fa-bookmark").show();
  $("#loading2").hide();
};

// Removed server-dependent save functionality - now uses local storage only
vd.saveVideoForLater = function(video) {
  // Save locally only
  vd.getStorage(vd.storageKeys.savedVideos).then(savedVideos => {
    if (!savedVideos) {
      savedVideos = {};
    }
    video.id = video.md5; // Use md5 as ID
    savedVideos[video.md5] = video;
    vd.setStorage(vd.storageKeys.savedVideos, savedVideos).then(() => {
      vd.changeSaveVideoBtnStatus(false);
      vd.hideSaveVideoLoading();
      $('.btn-save-video').attr('data-video-id', video.id);
    });
  });
};

vd.deleteSavedVideo = function(id) {
  vd.showSaveVideoLoading();
  // Delete locally only
  vd.getStorage(vd.storageKeys.savedVideos).then(savedVideos => {
    if (savedVideos && savedVideos[tabUrlMd5]) {
      delete savedVideos[tabUrlMd5];
      vd.setStorage(vd.storageKeys.savedVideos, savedVideos).then(() => {
        vd.changeSaveVideoBtnStatus(true);
        $('.btn-save-video').attr('data-video-id', '');
        vd.hideSaveVideoLoading();
      });
    }
  });
};

// Removed login-dependent UI functions - all users have full access
vd.initializeLoggedInUI = function(items) {
  var myAccountBtn = $(".myaccount");
  myAccountBtn.hide(); // Hide account button since no login needed
  vd.initializeUpgradedUI(items); // All users get upgraded UI
};

vd.initializeUpgradedUI = function(items) {
  $.each(items.videoTypes, function(key, val) {
    $('.video_type[value="' + val + '"]').attr('checked', 'checked');
  });
  var upgradeBtn = $(".upgrade");
  upgradeBtn.hide(); // Hide upgrade button since everything is free
};

vd.initializeNotUpgradedUI = function(items) {
  // This function is no longer needed since everything is free
  vd.initializeUpgradedUI(items);
};

vd.initializeNotLoggedInUI = function(items) {
  // This function is no longer needed since everything is free
  vd.initializeUpgradedUI(items);
};

vd.getSavedVideoData = function() {
  vd.sendMessage({
    message: "is-video-saved",
    tabUrlMd5: tabUrlMd5
  }, function(video) {
    if (video) {
      vd.changeSaveVideoBtnStatus(false);
      $('.btn-save-video').attr('data-video-id', video.id);
    }
    vd.hideSaveVideoLoading();
  })
};

vd.afterDataLoaded = function() {
  let videoList = $("#video-list");
  vd.getStoredSettings(function(items) {
    let videoCount = videoList.find("li").length;
    $("#loading").hide();
    if (videoCount) {
      vd.showSaveForLaterButton();
    }
    // Always show loading as hidden since no login needed
    $("#loading2").hide();
    if (videoCount) {
      vd.showVideoList();
    } else {
      $("#no-video-found").css('display', 'block');
    }
    // Always show my-list since everything is free
    $(".my-list").show();
    vd.cleanUp4KData().then(() => {});
  });
};

vd.checkDownloadCount = async () => {
  let numberOfDownloads = await vd.getStorage("total_number_of_downloads");
  if ([5, 15, 30].includes(numberOfDownloads)) {
    if (confirm("You have downloaded multiple videos with Video Downloader Plus. Please share your experience with others and rate the extension.")) {
      // Show a generic thank you message instead of external redirect
      alert("Thank you for using Video Downloader Plus! Your feedback helps us improve.");
    }
  }
};

vd.start = async () => {
  const currentTab = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  let isYoutube = currentTab[0]?.url?.includes('youtube.com');
  if (isYoutube) {
    // Allow YouTube processing - no restrictions needed
    console.log("Processing YouTube page for video detection");
  }
  let videoList = $("#video-list");
  // Removed remote login status sync - everything is local now
  vd.getStoredSettings(function(items) {
    storedSettings = items;
    // All users get full UI since everything is free
    vd.initializeUpgradedUI(items);
  });
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    tabUrlMd5 = md5(tabs[0].url);
    vd.sendMessage({
      message: 'get-video-links',
      tabId: tabs[0].id
    }, function(tabsData) {
      vd.videoLinks = (tabsData?.videoLinks || []);
      if (!tabsData.url) {
        // Keep existing behavior
      }
      vd.emptyVideoList();
      vd.getStoredSettings(function(items) {
        // All users are considered logged in and upgraded
        let isLoggedInAndUpgraded = true;
        let showChromecast = items.chromeCast;
        videoTypes = items.videoTypes;
        vd.videoLinks.forEach(function(videoLink) {
          if (!vd.isVideoLinkTypeValid(videoLink, items.videoTypes) || !vd.isVideoSizeValid(videoLink, items.minVideoSize)) {
            return
          }
          videoList.append(vd.createDownloadSection(videoLink, showChromecast));
        });
        vd.getSavedVideoData();
        if (videoList.find("li").length > 0) {
          vd.showVideoList();
        }
        vd.createDownloadSection4KVideo(tabsData.url, {
          chromeCast: showChromecast,
          minVideoSize: items.minVideoSize
        }, vd.afterDataLoaded);
        // Always show my-list since everything is free
        $(".my-list").show();
      });
    });
  });
}

$(document).ready(function() {
  let body = $('body');
  let btnUpgrade = $(".upgrade");
  // Remove external server URL
  $(".my-list-a").attr('href', '#');
  vd.showSaveVideoLoading();
  // Hide upgrade button since everything is free
  btnUpgrade.hide();

  // Remove account button functionality since no login needed
  body.on('click', ".myaccount", function() {
    alert("Account management is not needed - this extension is completely free!");
  });

  $('#go-to-options').on('click', function() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('html/options.html'));
    }
  });

  // Remove upgrade functionality since everything is free
  $('.upgrade').on('click', function() {
    alert("Everything is already free! No upgrade needed.");
  });

  body.on('click', '.btn-save-video', function(e) {
    e.preventDefault();
    let btn = $(this);
    if (btn.attr('data-video-id')) {
      vd.deleteSavedVideo(btn.attr('data-video-id'));
      return;
    }
    vd.showSaveVideoLoading();
    let videoList = $("#video-list");
    if (!videoList.find("li").length) {
      return
    }
    let videoElem = videoList.find("li").eq(0);
    let link = videoElem.attr('data-link').trim();
    let video = {
      title: videoElem.attr('data-title'),
      link: link,
      thumbnail: videoElem.attr('data-thumb'),
      md5: md5(link)
    };
    // Save locally without login token
    vd.saveVideoForLater(video);
  });

  body.on('click', '.btn-instant-download', function(e) {
    e.preventDefault();
    vd.checkDownloadCount().then(() => {
      vd.sendMessage({
        message: 'download-video-link',
        url: $(this).attr('href'),
        fileName: $(this).attr('data-file-name')
      });
    });
  });

  // Removed server-dependent 4K download functionality
  body.on('click', '.btn-four-k-download', function(e) {
    e.preventDefault();
    // Direct download without server processing
    let url = $(this).attr('href');
    if (url && url !== '#') {
      vd.sendMessage({
        message: 'download-video-link',
        url: url,
        fileName: $(this).data('title') || 'video'
      });
    }
  });

  // Restored cast functionality - now works locally without server
  body.on('click', '.cast-button', function(e) {
    e.preventDefault();
    let link = $(this);
    var url = link.attr('href');
    var title = link.data('title');
    var thumb = link.data('thumb');
    
    // Use local casting without server dependency
    if (url) {
      vd.sendMessage({
        message: 'cast-video',
        url: url,
        title: title || 'Video',
        thumbnail: thumb
      }, function(response) {
        // Handle response if needed
        console.log('Cast initiated for:', title);
      });
    }
  });

  vd.start().then(() => {});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.message) {
    case "add-video-links":
      if (!request.videoLinks[0]) {
        sendResponse(); // Always send response to avoid channel closure
        return
      }
      vd.add4KLink(request.videoLinks[0], {
        chromeCast: storedSettings.chromeCast,
        minVideoSize: storedSettings.minVideoSize
      }, function() {
        vd.afterDataLoaded();
        sendResponse(); // Send response after completion
      });
      return true; // Indicate async response
      break;
    case "add-youtube-info-for-chrome":
      vd.addYoutubeInfo(request.videoLinks[0]);
      sendResponse(); // Always send response
      break;
    default:
      sendResponse(); // Always send response for unknown messages
      break;
  }
  return true; // Indicate async response for all cases
});
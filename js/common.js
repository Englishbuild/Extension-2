var vd = {};
vd.fourKDataExpTimeFree = 60 * 60 * 1000; // 1 hour
vd.fourKDataExpTimePremium = 60 * 60 * 1000; // 1 hour (same as free now)
vd.fourKEmptyDataExpTime = 5 * 60 * 1000; // 5 minutes
vd.loginStatusCheckIntTime = 30 * 60 * 1000; // 30 minutes
vd.bg4KVideoCheckForAllUsers = true; // Enable for all users
vd.loginStatusCheckTimeout = 15000; // 15 seconds
vd.allVideoFormats = ['mp4', "mov", "flv", "webm", "3gp", "ogg", "m4a", "mp3", "wav", "bin"];
vd.defaultVideoFormats = ['.mp4', ".mov", ".flv", ".webm", ".3gp", ".ogg", ".m4a", ".mp3", ".wav", ".bin"];
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
// All formats are now free
vd.premiumVideoFormats = [];
vd.nonePremiumVideoFormats = ['.mp4', ".mov", ".flv", ".webm", ".3gp", ".ogg", ".m4a", ".mp3", ".wav", ".bin"];
vd.serverUrl = ''; // Removed server dependency
vd.serverUrl2 = ''; // Removed server dependency
vd.version = "FREE"; // Now completely free
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

// Removed login functionality - always return false
vd.getLoginToken = function(callback) {
  callback(false);
};

// Removed auto login functionality 
vd.autoLogin = function(callback) {
  callback({
    status: 0
  });
};

// Always return true since everything is free now
vd.isLoggedInAndUpgraded = function(callback) {
  callback(true);
};

vd.is4KDataValid = function(fourKData) {
  var isValid = fourKData && (fourKData.title != null || (fourKData.value && fourKData.value.title != null)) && fourKData.ext !== 'unknown_video';
  return !!isValid;
};

vd.setStored4KData = async (id, fourKData) => {
  let data = await vd.setStorage(vd.storageKeys.fourKData, fourKData);
  return data ? data[id] : null;
};

vd.saveFourKData = async function(fourKData) {
  var url = fourKData.tabUrl ? fourKData.tabUrl : fourKData.webpage_url;
  var urlId = md5(url);
  let all4KData = await vd.getStorage(vd.storageKeys.fourKData);
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
};

// Restored 4K data functionality - now works locally without server dependency
vd.get4KData = function(videoUrl, callback) {
  // Analyze video URL locally to extract metadata
  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.toLowerCase();
    
    // Handle different video platforms locally
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      vd.extractYouTubeData(videoUrl, callback);
    } else if (hostname.includes('vimeo.com')) {
      vd.extractVimeoData(videoUrl, callback);
    } else if (hostname.includes('dailymotion.com')) {
      vd.extractDailymotionData(videoUrl, callback);
    } else {
      // For other sites, try to extract basic metadata from the page
      vd.extractGenericVideoData(videoUrl, callback);
    }
  } catch (error) {
    console.log('Error parsing video URL:', error);
    callback(false);
  }
};

// Extract YouTube video data locally
vd.extractYouTubeData = function(videoUrl, callback) {
  try {
    const url = new URL(videoUrl);
    const videoId = url.searchParams.get('v') || url.pathname.split('/').pop();
    
    if (videoId) {
      // Create basic video data structure
      const videoData = {
        title: 'YouTube Video',
        webpage_url: videoUrl,
        ext: 'mp4',
        format: 'mp4',
        formatTtile: 'MP4',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: null,
        filesize: null,
        streaming_url: videoUrl,
        _filename: `youtube_${videoId}`
      };
      callback(videoData);
    } else {
      callback(false);
    }
  } catch (error) {
    console.log('Error extracting YouTube data:', error);
    callback(false);
  }
};

// Extract Vimeo video data locally  
vd.extractVimeoData = function(videoUrl, callback) {
  try {
    const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
    
    if (videoId) {
      const videoData = {
        title: 'Vimeo Video',
        webpage_url: videoUrl,
        ext: 'mp4',
        format: 'mp4',
        formatTtile: 'MP4',
        thumbnail: null,
        duration: null,
        filesize: null,
        streaming_url: videoUrl,
        _filename: `vimeo_${videoId}`
      };
      callback(videoData);
    } else {
      callback(false);
    }
  } catch (error) {
    console.log('Error extracting Vimeo data:', error);
    callback(false);
  }
};

// Extract Dailymotion video data locally
vd.extractDailymotionData = function(videoUrl, callback) {
  try {
    const videoId = videoUrl.match(/dailymotion\.com\/video\/([^_]+)/)?.[1];
    
    if (videoId) {
      const videoData = {
        title: 'Dailymotion Video',
        webpage_url: videoUrl,
        ext: 'mp4',
        format: 'mp4',
        formatTtile: 'MP4',
        thumbnail: null,
        duration: null,
        filesize: null,
        streaming_url: videoUrl,
        _filename: `dailymotion_${videoId}`
      };
      callback(videoData);
    } else {
      callback(false);
    }
  } catch (error) {
    console.log('Error extracting Dailymotion data:', error);
    callback(false);
  }
};

// Extract generic video data for other sites
vd.extractGenericVideoData = function(videoUrl, callback) {
  try {
    const url = new URL(videoUrl);
    const hostname = url.hostname.replace('www.', '');
    const pathname = url.pathname;
    
    // Check if URL looks like a direct video file
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'flv', 'm4v', 'mkv'];
    const hasVideoExtension = videoExtensions.some(ext => 
      pathname.toLowerCase().includes(`.${ext}`)
    );
    
    if (hasVideoExtension) {
      const filename = pathname.split('/').pop() || 'video';
      const ext = filename.split('.').pop() || 'mp4';
      
      const videoData = {
        title: filename,
        webpage_url: videoUrl,
        ext: ext,
        format: ext,
        formatTtile: ext.toUpperCase(),
        thumbnail: null,
        duration: null,
        filesize: null,
        streaming_url: videoUrl,
        _filename: filename.replace(/\.[^/.]+$/, "")
      };
      callback(videoData);
    } else {
      // For non-direct video URLs, create basic metadata
      const videoData = {
        title: `Video from ${hostname}`,
        webpage_url: videoUrl,
        ext: 'mp4',
        format: 'mp4',
        formatTtile: 'MP4',
        thumbnail: null,
        duration: null,
        filesize: null,
        streaming_url: videoUrl,
        _filename: `video_${Date.now()}`
      };
      callback(videoData);
    }
  } catch (error) {
    console.log('Error extracting generic video data:', error);
    callback(false);
  }
};

vd.cleanUp4KData = async function() {
  let allFourKData = await vd.getStorage(vd.storageKeys.fourKData);
  if (!allFourKData) {
    return 0;
  }
  // Use free tier expiry time for everyone
  let expireTime = vd.fourKDataExpTimeFree;
  let now = new Date().getTime();
  Object.keys(allFourKData).forEach((id) => {
    let fourKData = allFourKData[id];
    if (!fourKData.time || ((now - fourKData.time) > expireTime)) {
      delete allFourKData[id];
    }
  });
  return vd.setStorage(vd.storageKeys.fourKData, allFourKData);
}

vd.is4KDataExpired = function(fourKData, callback) {
  if (!fourKData || !fourKData.time) {
    callback(true);
    return;
  }
  if (!vd.is4KDataValid(fourKData)) {
    callback(new Date().getTime() - fourKData.time > vd.fourKEmptyDataExpTime);
    return;
  }
  // Use free tier expiry time for everyone
  callback(new Date().getTime() - fourKData.time > vd.fourKDataExpTimeFree);
};

vd.getStoredSettings = function(callback) {
  chrome.storage.sync.get({
    videoTypes: vd.defaultVideoFormats,
    chromeCast: true,
    minVideoSize: '1',
    logged_in: true, // Always logged in since it's free
    login_token: false,
    upgraded: 'true' // Always upgraded since it's free
  }, function(items) {
    // All video types are available for free now
    callback(items);
  });
};
vd.sendMessage = function(message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

vd.escapeRegExp = function(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};

vd.getVideoType = function(link) {
  var videoType = null;
  vd.allVideoFormats.some(function(format) {
    if (new RegExp(vd.escapeRegExp('.' + format)).test(link)) {
      videoType = format;
      return true;
    }
  });
  return videoType;
};

vd.getAbsolutePath = function(link) {

  var protocol = window.location.protocol;
  if (new RegExp("^" + protocol + "//").test(link)) {
    return link;
  }
  if (new RegExp('^//').test(link)) {
    return protocol + link;
  }
  var stack = window.location.href.split("/"),
    parts = link.split("/");
  stack.pop(); // remove current file name (or empty string)
  // (omit if "base" is the current folder without trailing slash)
  for (var i = 0; i < parts.length; i++) {
    if (parts[i] == ".")
      continue;
    if (parts[i] == "..")
      stack.pop();
    else
      stack.push(parts[i]);
  }
  return stack.join("/");
};

vd.getLinkTitleFromNode = function(node) {
  var title = node.attr('title') ? node.attr('title') : node.attr('alt') ? node.attr('alt') : node.text().trim();
  return title ? title : document.title;
};

vd.getVideoLinks = function(node) {
  // console.log(node);
  var videoLinks = [];
  $(node).find('a').each(function() {
    var link = $(this).attr('href');
    var videoType = vd.getVideoType(link);
    var title = '';
    if (videoType) {
      title = vd.getLinkTitleFromNode($(this));
      videoLinks.push({
        url: link,
        fileName: title,
        title: title,
        webpage_url: window.location.href,
        extension: "." + videoType,
        quality: ""
      });
    }
  });
  $(node).find('video').each(function() {
    var nodes = [];
    $(this).attr('src') ? nodes.push($(this)) : void 0;
    // console.log(nodes);
    $(this).find('source').each(function() {
      nodes.push($(this));
    });
    nodes.forEach(function(node) {
      var link = node.attr('src');
      if (!link) {
        return
      }
      var videoType = vd.getVideoType(link);
      var title = vd.getLinkTitleFromNode(node);
      videoLinks.push({
        url: link,
        fileName: title,
        webpage_url: window.location.href,
        title: title,
        extension: "." + videoType,
        quality: ""
      })
    });
  });
  return videoLinks;
};

vd.mutationObserver = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    var addedNodes = mutation.addedNodes;
    addedNodes.forEach(function(node) {
      // console.log(node);
      vd.findVideoLinks(node);
    });
  });
});

vd.sendVimeoVideoLinks = function() {
  // console.log("Found Vimeo Videos");
  var dataUrl = $("div[data-config-url]").attr('data-config-url');
  vd.sendMessage({
    message: "create-vimeo-video-links",
    dataUrl: dataUrl
  }, function(response) {});
};

vd.inIframe = function() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};

vd.sendVideoLinks = function(videoLinks) {
  // if(videoLinks.length == 0) { return }
  videoLinks.forEach(function(videoLink) {
    videoLink.url = vd.getAbsolutePath(videoLink.url);
  });
  vd.sendMessage({
    message: 'add-video-links',
    videoLinks: videoLinks
  }, function(response) {});
};

vd.findVideoLinks = function(node) {
  var videoLinks = [];
  // console.log(window.location.host);
  switch (window.location.host) {
    case "vimeo.com":
      vd.sendVimeoVideoLinks();
      break;
    default:
      videoLinks = vd.getVideoLinks(node);
      vd.sendVideoLinks(videoLinks);
  }
};

vd.init = function() {
  vd.findVideoLinks(document.body);
  vd.sendMessage({
    message: "on-web-page-loaded"
  }, function() {});
};

// console.log(">>>>>>>>>");

vd.init();
var currentUrl = window.location.href;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.message) {
    case "initialize-page":
      setTimeout(function() {
        if (currentUrl !== request.url) {
          // console.log("Initializing after init request");
          vd.init();
          currentUrl = request.url;
        }
      }, 1000);
      sendResponse();
      break;
  }
});

// Removed login button functionality since no authentication is needed
if (document.getElementById('updatebutton')) {
  var button = document.getElementById("updatebutton");
  button.addEventListener("click", function() {
    alert("No login needed - this extension is completely free!");
  }, false);
}

// Removed logout button functionality since no authentication is needed
if (document.getElementById('logoutbutton')) {
  var button = document.getElementById("logoutbutton");
  button.addEventListener("click", function() {
    alert("No logout needed - this extension is completely free!");
  }, false);
}

$(document).ready(function() {});
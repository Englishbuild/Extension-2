// Saves options to chrome.storage
sendMessage = function(message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

function logout() {
  $.get(vd.serverUrl + "logout/ext", function(reponse) {
    chrome.storage.sync.set({
      logged_in: false,
      login_token: false
    }, function() {
      // $(".divUsechromecast").hide();
      var status = document.getElementById('status');
      setTimeout(function() {
        status.textContent = 'Logged out successfully';
        $("#logout").hide();
        window.location.reload();
      }, 750);
    });
  });
}

function saveOptionsFinalStep(options, callback) {
  // console.log("Saving object");
  // console.log(options);
  chrome.storage.sync.set(options, function() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
    callback();
  });
  sendMessage({
    message: "update-min-vid-size",
    minVideoSize: options.minVideoSize
  });
}

function save_options() {
  var videoTypes = [];
  // console.log("Rpring to save");
  vd.getStoredSettings(function(items) {
    var chromeCast = true;
    var minVideoSize = "1";
    if ($('#chromcast').is(':checked')) {
      chromeCast = true;
    } else {
      chromeCast = false;
    }
    minVideoSize = $("[name='minVideoSize']:checked").val();
    if ((!items.logged_in || items.upgraded === "false") && vd.version !== "FREE") {
      // Saving only video types and chrome cast settings
      videoTypes = items.videoTypes.filter(function(vt) {
        return !vd.nonePremiumVideoFormats.includes(vt)
      });
      // console.log(JSON.stringify(videoTypes));
      vd.nonePremiumVideoFormats.forEach(function(vf) {
        if ($("input[value='" + vf + "']").prop('checked')) {
          videoTypes.push(vf);
        }
      });
      // console.log(JSON.stringify(videoTypes));
      saveOptionsFinalStep({
        videoTypes: videoTypes,
        chromeCast: chromeCast,
        minVideoSize: minVideoSize
      }, function() {});
      return 0;
    }
    // console.log("Saving whole thing");
    $('.video_type').each(function() {
      if ($(this).is(':checked')) {
        videoTypes.push($(this).val());
      }
    });

    saveOptionsFinalStep({
      videoTypes: videoTypes,
      chromeCast: chromeCast,
      minVideoSize: minVideoSize,
    }, function() {
      // $('#logout').hide();
    });

  });

  /*var videoResolutions = [];
  $('.video_resolutions').each(function () {
      if($(this).is(':checked')){
          videoResolutions.push($(this).val());
      }
  });*/
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.

vd.shouldShowUpgradedFeatures = function(items) {
  // console.log("Checking to show upgraded features");
  let isLoggedInAndUpgraded = (items.logged_in && items.upgraded !== 'false');
  // console.log(isLoggedInAndUpgraded);
  return (vd.version === "FREE" || isLoggedInAndUpgraded);
};

vd.initializeLoggedInUI = function(items) {
  $("#logout").show();
  vd.shouldShowUpgradedFeatures(items) ? vd.initializeUpgradedUI(items) : vd.initializeNotUpgradedUI(items);
};

vd.initializeNotUpgradedUI = function(items) {
  // console.log("Initializing not upgraded UI");
  items.videoTypes.forEach(function(vt) {
    if (vd.nonePremiumVideoFormats.includes(vt)) {
      $('.video_type[value="' + vt + '"]').prop('checked', true)
    }
  });
};

vd.initializeUpgradedUI = function(items) {
  // console.log('>>>>>>>>>>>');
  // console.log(items);
  $('.video_type').prop('disabled', false);
  items.videoTypes.forEach(function(vt) {
    $('.video_type[value="' + vt + '"]').prop('checked', true)
  });
};

function getMinVideoSizeElem(videoSize) {
  var radio = $(' <div class="form-check form-check-inline">' +
    '    <input class="form-check-input min-video-size-radio" type="radio" name="minVideoSize" id="inlineRadio1" value="1">' +
    '    <label class="form-check-label" for="inlineRadio1"></label>' +
    '</div> ');
  radio.find("input").val(videoSize.id);
  radio.find("label").text(videoSize.text);
  return radio;
}

function initializeDefaultUIComponents(items) {
  if (items.chromeCast) {
    $('#chromcast').attr('checked', 'checked');
  }
  var minVideoSizeSection = $("#min-video-sizes");
  Object.keys(vd.minVideoSizes).forEach(function(id) {
    minVideoSizeSection.append(getMinVideoSizeElem(vd.minVideoSizes[id]));
  });
  setTimeout(function() {
    $(".min-video-size-radio").prop('checked', false);
    $(".min-video-size-radio[value='" + items.minVideoSize + "']").prop('checked', true);
  }, 50);
}

function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  vd.getStoredSettings(function(items) {
    initializeDefaultUIComponents(items);
    if (items.logged_in === true) {
      vd.initializeLoggedInUI(items);
    } else {
      vd.shouldShowUpgradedFeatures(items) ? vd.initializeUpgradedUI(items) : vd.initializeNotUpgradedUI(items);
    }
  });
}
document.addEventListener('DOMContentLoaded', restore_options);

if (document.getElementById('save')) {
  document.getElementById('save').addEventListener('click', save_options);
}
if (document.getElementById('logout')) {
  document.getElementById('logout').addEventListener('click', logout);
}
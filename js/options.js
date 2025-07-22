// Saves options to chrome.storage
sendMessage = function(message, callback) {
  chrome.runtime.sendMessage(message, callback);
};

// Removed logout functionality since no login is needed
function logout() {
  alert("No logout needed - this extension is completely free and doesn't require accounts!");
}

function saveOptionsFinalStep(options, callback) {
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
  vd.getStoredSettings(function(items) {
    var chromeCast = true;
    var minVideoSize = "1";
    if ($('#chromcast').is(':checked')) {
      chromeCast = true;
    } else {
      chromeCast = false;
    }
    minVideoSize = $("[name='minVideoSize']:checked").val();
    
    // All users get all video types since everything is free now
    $('.video_type').each(function() {
      if ($(this).is(':checked')) {
        videoTypes.push($(this).val());
      }
    });

    saveOptionsFinalStep({
      videoTypes: videoTypes,
      chromeCast: chromeCast,
      minVideoSize: minVideoSize,
    }, function() {});
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.

// All users get upgraded features since everything is free
vd.shouldShowUpgradedFeatures = function(items) {
  return true;
};

// All users get logged in UI since everything is free
vd.initializeLoggedInUI = function(items) {
  $("#logout").hide(); // Hide logout button since no login needed
  vd.initializeUpgradedUI(items); // All users get upgraded UI
};

// All users get upgraded UI since everything is free
vd.initializeNotUpgradedUI = function(items) {
  vd.initializeUpgradedUI(items);
};

vd.initializeUpgradedUI = function(items) {
  // Enable all video types since everything is free
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
    // All users get upgraded UI since everything is free
    vd.initializeUpgradedUI(items);
  });
}
document.addEventListener('DOMContentLoaded', restore_options);

if (document.getElementById('save')) {
  document.getElementById('save').addEventListener('click', save_options);
}
// Remove logout event listener since no login is needed
if (document.getElementById('logout')) {
  document.getElementById('logout').addEventListener('click', logout);
}
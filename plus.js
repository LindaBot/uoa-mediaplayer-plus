var vid;
var controls;
var loaded = false;
var intended_speed = 1;

// declare default values for settings
var settings = {
    volume: 1,
}

// declare default values for video data
var video_data = {
    position: 42, // default start position, skips copyright message
}

// Values for keydown
const keyboard_keys = {
    KEY_K: 32,
    KEY_SPACE: 75,
    KEY_F: 70,
    KEY_RIGHT_ARROW: 39,
    KEY_L: 76,
    KEY_LEFT_ARROW: 37,
    KEY_J: 74,
    KEY_UP_ARROW: 38,
    KEY_DOWN_ARROW: 40,
    KEY_DOT: 190,
    KEY_COMMA: 188,
    KEY_SLASH_FORWARD: 191,
    KEY_M: 77
}

// Store a list of keys that the extension need to override
let key_list = [];
for (key in keyboard_keys){
    key_list.push(keyboard_keys[key])
}

// get unique video id
var video_id = window.location.href.replace(".preview", "").replace("https://mediaplayer.auckland.ac.nz", "");

// load video data from local storage
chrome.storage.sync.get([video_id, "settings"], function(result) {
    console.log(result);
    video_data = {...video_data, ...result[video_id]};
    settings = {...settings, ...result["settings"]};
    console.log(settings);
});

// before the user leaves, save settings
window.onbeforeunload = function(){
    chrome.storage.sync.set({[video_id]: video_data});
    this.console.log(settings);
    chrome.storage.sync.set({"settings": settings});
};

var popup_timeout;
var popup;
function show_popup(icon, string) {
    popup.innerHTML = "<span class='material-icons'>" + icon + "</span><p>" + string + "</p>";
    popup.classList.add("show-action-popup");
    try {
        clearTimeout(popup_timeout);
    } catch {}
    timeout = setTimeout(function(){ popup.classList.remove("show-action-popup"); }, 500);
}
document.addEventListener("visibilitychange", function() {
    // make sure popup is hidden
    popup.classList.remove("show-action-popup");
});

document.arrive(".shaka-volume-bar-container", function() {
    if (!loaded) {
        loaded = true;
        console.log("Loaded!");

        vid = document.getElementById("video");
        vid.addEventListener('play', function() {
            vid.playbackRate = intended_speed; // make sure playback speed is still correct
            document.getElementById("mpp-play").innerHTML = "pause" // update play icon
        });
        vid.addEventListener('pause', function() {
            document.getElementById("mpp-play").innerHTML = "play_arrow" // update play icon
        });
        vid.addEventListener("timeupdate", function() {
            video_data.position = vid.currentTime;
        });
        vid.addEventListener("volumechange", function() {
            settings.volume = vid.volume;
            if (vid.muted) {
                settings.volume = 0;
            }
        });
        controls = document.getElementsByClassName("shaka-controls-container")[0]
        vol_slider = document.getElementsByClassName("shaka-volume-bar-container")[0]

        // apply settings
        vid.currentTime = video_data.position;
        vid.volume = settings.volume;

        // action info popup
        action_popup = "<div id='mpp-action-popup'></div>";
        document.getElementsByClassName("shaka-video-container")[0].insertAdjacentHTML("afterbegin", action_popup);
        popup = document.getElementById("mpp-action-popup");

        // download button
        download_button = "<button class='material-icons' id='mpp-download' aria-label='Download' title='Download'>get_app</button>"
        vol_slider.insertAdjacentHTML("afterend", download_button);
        document.getElementById("mpp-download").addEventListener('click', function() {
            url_string = window.location.href;
            url_string = url_string.replace('.preview', '.mp4');
            window.open(url_string,'_blank');
        });

        // snapshot button
        screenshot_button = "<button class='material-icons' id='mpp-screenshot' aria-label='Screenshot' title='Take Screenshot'>wallpaper</button>"
        vol_slider.insertAdjacentHTML("afterend", screenshot_button);
        document.getElementById("mpp-screenshot").addEventListener('click', function() {
            var canvas = document.createElement('canvas');
            canvas.width = vid.videoWidth;
            canvas.height = vid.videoHeight;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
            var dataURI = canvas.toDataURL('image/jpeg'); // can also use 'image/png'
            downloadURI(dataURI, "My Screenshot");
        });

        // keep intended speed
        speed_changer = document.getElementsByClassName("shaka-playback-rates")[0]
        speed_changer.addEventListener('click', function() {
            intended_speed = vid.playbackRate;
        })

        // play/pause button
        play_button = "<button class='material-icons' id='mpp-play' aria-label='Play/Pause' title='Play/Pause'>play_arrow</button>";
        document.getElementsByClassName("shaka-current-time")[0].insertAdjacentHTML("beforebegin", play_button);
        document.getElementById("mpp-play").addEventListener('click', function() {
            if (vid.paused) {
                vid.play();
            } else {
                vid.pause();
            }
        });

        // volume button
        volume_button = "<button class='material-icons' id='mpp-volume' aria-label='Toggle Sound' title='Toggle Sound'>volume_up</button>"
        document.getElementsByClassName("shaka-volume-bar-container")[0].insertAdjacentHTML("beforebegin", volume_button);
        volume_button = document.getElementById("mpp-volume");
        document.getElementById("mpp-volume").addEventListener('click', function() {
            if (vid.muted) {
                vid.muted = false;
            } else {
                vid.muted = true;
            }
        });
        vid.addEventListener("volumechange", function() {
            if (vid.muted) {
                volume_button.innerHTML = "volume_off"
            } else if (vid.volume < 0.5) {
                volume_button.innerHTML = "volume_down"
            } else {
                volume_button.innerHTML = "volume_up"
            }
        });
    }
});

// Keybindings
document.addEventListener('keydown', function(event) {
    // Check if we need to prevent default behavior
    if (!key_list.includes(event.keyCode) || event.ctrlKey || event.altKey || event.metaKey){
        return;
    }
    

    // Prevent player and browser default behavior
    event.preventDefault();
    document.activeElement.blur();

    try {
        clearTimeout(timeout);
    } catch {}
    controls.setAttribute("shown", "true");
    timeout = setTimeout(function(){ controls.removeAttribute("shown"); }, 1000);

    switch (event.keyCode){
        // Pause with space bar, 'k'
        case keyboard_keys.KEY_K:
        case keyboard_keys.KEY_SPACE:
            if (vid.paused) {
                vid.play();
                show_popup("play_arrow", "Play");
            } else {
                vid.pause();
                show_popup("pause", "Pause");
            }
            break;

        // Full screen with 'f'
        case keyboard_keys.KEY_F:
            document.getElementsByClassName("shaka-fullscreen-button")[0].click();
            break;

        // Seek forwards with '➡', 'l'
        case keyboard_keys.KEY_RIGHT_ARROW:
        case keyboard_keys.KEY_L:
            vid.currentTime = vid.currentTime + 5;
            show_popup("skip_next", "Seek");
            break;

        // Seek backwards with '⬅', 'j'
        case keyboard_keys.KEY_LEFT_ARROW:
        case keyboard_keys.KEY_J:
            vid.currentTime = vid.currentTime - 5;
            show_popup("skip_previous", "Seek");
            break;

        // Volume up with '⬆'
        case keyboard_keys.KEY_UP_ARROW:
            vid.volume = vid.volume + 0.05;
            if (vid.volume > 0.95) {
                vid.volume = 1;
            }
            show_popup("volume_up", Math.round(vid.volume*100));
            break;

        // Volume up with '⬇'
        case keyboard_keys.KEY_DOWN_ARROW:
            vid.volume = vid.volume - 0.05;
            if (vid.volume < 0.05) {
                vid.volume = 0;
            }
            show_popup("volume_down", Math.round(vid.volume*100));
            break;

        // Increase speed with '.'
        case keyboard_keys.KEY_DOT:
            vid.playbackRate = vid.playbackRate + 0.25;
            if (vid.playbackRate > 3) {
                vid.playbackRate = 3;
            }
            intended_speed = vid.playbackRate;
            show_popup("fast_forward", vid.playbackRate + "x");
            break;

        // Decrease speed with ','
        case keyboard_keys.KEY_COMMA:
            vid.playbackRate = vid.playbackRate - 0.25;
            if (vid.playbackRate < 0.25) {
                vid.playbackRate = 0.25;
            }
            intended_speed = vid.playbackRate;
            show_popup("fast_rewind", vid.playbackRate + "x");
            break;

        // Reset speed with '/'
        case keyboard_keys.KEY_SLASH_FORWARD:
            vid.playbackRate = 1;
            intended_speed = vid.playbackRate;
            show_popup("speed", "1x");
            break;
        
        // Toggle mute with 'm'
        case keyboard_keys.KEY_M:
            if (vid.muted) {
                vid.muted = false;
                show_popup("volume_up", "Unmuted");
            } else {
                vid.muted = true;
                show_popup("volume_off", "Muted");
            }
            break;
    }
});
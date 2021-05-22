// 2. This code loads the IFrame Player API code asynchronously.
var tag = document.createElement("script");

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// 3. This function creates an <iframe> (and YouTube player)
//    after the API code downloads.
var player;
function onYouTubeIframeAPIReady() {
  player = new YT.Player("player", {
    width: "640",
    videoId: "5qap5aO4i9A",
    playerVars: {
      playsinline: 1,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
    },
  });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
  event.target.playVideo();
}

// 5. The API calls this function when the player's state changes.
//    The function indicates that when playing a video (state=1),
//    the player should play for six seconds and then stop.
var done = false;
function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING && !done) {
    //setTimeout(stopVideo, 6000);
    done = true;
  }
}
function stopVideo() {
  player.stopVideo();
}

const pageFlipTime = 20000;
const streamStartTime = new Date(2018, 8, 22, 0, 0, 0, 0);
const countDiv = document.getElementById("count");

let pageCount = Math.floor(
  (new Date().getTime() - streamStartTime.getTime()) / pageFlipTime
);
countDiv.innerText = pageCount.toLocaleString();

const incrementPageCount = () => {
  console.log("incrementing...");
  pageCount++;
  countDiv.innerText = pageCount.toLocaleString();
  console.log(player.getCurrentTime());
};

let timeoutHandle = -1;
let intervalHandle = -1;

const syncCounter = async () => {
  clearTimeout(timeoutHandle);
  clearInterval(intervalHandle);

  let response = await fetch("http://localhost:3000/sync");
  let syncData = await response.json();
  let timeSinceLastPageFlip =
    new Date().getTime() - new Date(syncData.lastPageFlip).getTime();
  console.log(timeSinceLastPageFlip / 1000);

  timeoutHandle = setTimeout(() => {
    incrementPageCount();
    intervalHandle = setInterval(incrementPageCount, pageFlipTime);
  }, pageFlipTime - timeSinceLastPageFlip);
};

syncCounter();

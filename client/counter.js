const pageFlipTime = 19800;
const countDiv = document.getElementById("count");
countDiv.style.display = "none";

let player;
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

const onPlayerReady = (event) => {
  event.target.playVideo();
};

const onPlayerStateChange = (event) => {
  if (event.data == YT.PlayerState.PLAYING) {
    syncCounter();
  }
};

let pageCount = 0;
countDiv.innerText = pageCount.toLocaleString();

const incrementPageCount = () => {
  pageCount++;
  countDiv.innerText = pageCount.toLocaleString();
};

let timeoutHandle = -1;
let intervalHandle = -1;

const syncCounter = async () => {
  console.log("syncing...");
  clearTimeout(timeoutHandle);
  clearInterval(intervalHandle);
  let latencyDiff;
  try {
    let response = await fetch("http://localhost:3000/sync");
    let syncData = await response.json();
    pageCount = syncData.pageCount;
    countDiv.style.display = "";
    countDiv.innerText = pageCount.toLocaleString();

    if (player && player.getCurrentTime) {
      latencyDiff = (player.getCurrentTime() - syncData.lastPageFlip) * 1000;
    } else {
      latencyDiff = 0;
    }
  } catch (e) {
    console.error(`Sync failed: ${e}`);
    latencyDiff = 0;
  }

  timeoutHandle = setTimeout(() => {
    incrementPageCount();
    intervalHandle = setInterval(incrementPageCount, pageFlipTime);
  }, pageFlipTime - latencyDiff);
};
syncCounter();
// Sync up every ten minutes
setTimeout(syncCounter, 600000);

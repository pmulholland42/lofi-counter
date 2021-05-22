import puppeteer from "puppeteer";
import * as fs from "fs";
import looksSame from "looks-same";
import express from "express";

const lofiURL = "https://www.youtube.com/watch?v=5qap5aO4i9A";
const chromeExePath =
  "C:\\Users\\pmulh\\AppData\\Local\\Chromium\\Application\\chrome.exe";
const port = 3000;

let lastFlipTime = new Date();
let latency = 0;

// Set up api
const app = express();
app.get("/sync", (req, res) => {
  res.send({ lastFlipTime, latency });
});
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

// Read in the frames of lofi girl flipping the page
let flipFrameBuffers = [];
for (let i = 0; i < 5; i++) {
  let flipFrame = fs.readFileSync(`flip-frame-${i + 1}.png`, {
    encoding: "base64",
  });
  flipFrameBuffers.push(Buffer.from(flipFrame, "base64"));
}

// Launch headless chromium browser
console.log("Launching browser...");
const browser = await puppeteer.launch({
  executablePath: chromeExePath,
});

// TODO: make sure browser closes before exit
const cleanupAndExit = async () => {
  console.log("Closing browser...");
  await browser.close();
  console.log("Done, exiting...");
  process.exit();
};
process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
process.on("exit", cleanupAndExit);

// Load the stream
const page = await browser.newPage();
await page.goto(lofiURL);
await new Promise((resolve) => {
  // TODO: find a better way to wait for the page to load
  setTimeout(resolve, 3500);
});

// Click the video to start playing
await page.evaluate(() => {
  let videoElements = document.getElementsByTagName("video");
  videoElements[0].click();
  return Promise.resolve();
});

// Skip ads, decline YT Premium, etc.
await page.evaluate(() => {
  let skipAdButtons = document.getElementsByClassName(
    "ytp-ad-text ytp-ad-skip-button-text"
  );
  let declineButtons = [
    ...document.getElementsByTagName("yt-formatted-string"),
  ].filter(
    (button) =>
      button.innerHTML.includes("Skip trial") ||
      button.innerHTML.includes("No thanks")
  );

  if (declineButtons.length > 0) {
    declineButtons.forEach((button) => button.click());
  }

  if (skipAdButtons.length > 0) {
    [...skipAdButtons].forEach((button) => {
      button.click();
    });
  }
  return Promise.resolve();
});

// Open stats for nerds so we can read the latency value
// TODO: get left click working
let resultt = await page.evaluate(() => {
  // Right click video
  let videoElement = document.getElementsByTagName("video")[0];

  var ev1 = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: false,
    view: window,
    button: 1,
    buttons: 2,
    clientX: videoElement.getBoundingClientRect().x,
    clientY: videoElement.getBoundingClientRect().y,
  });
  videoElement.dispatchEvent(ev1);
  var ev2 = new MouseEvent("mouseup", {
    bubbles: true,
    cancelable: false,
    view: window,
    button: 1,
    buttons: 0,
    clientX: videoElement.getBoundingClientRect().x,
    clientY: videoElement.getBoundingClientRect().y,
  });
  videoElement.dispatchEvent(ev2);
  var ev3 = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: false,
    view: window,
    button: 1,
    buttons: 0,
    clientX: videoElement.getBoundingClientRect().x,
    clientY: videoElement.getBoundingClientRect().y,
  });
  videoElement.dispatchEvent(ev3);
  //videoElements[0].dispatchEvent(new CustomEvent("contextmenu"));

  // Click stats for nerds
  let statsForNerdsButton = [
    ...document.getElementsByClassName("ytp-menuitem-label"),
  ].find((element) => {
    element.innerText.includes("Stats for nerds");
  });

  if (statsForNerdsButton) {
    statsForNerdsButton.click();
  } else {
    return Promise.resolve("no statsForNerdsButton?");
  }

  return Promise.resolve("clicked?");
});

//console.log(resultt);

while (true) {
  // Screenshot the part of the stream with the notebook
  let screenshot = await page.screenshot({
    encoding: "base64",
    clip: {
      x: 218,
      y: 363,
      width: 129,
      height: 57,
    },
  });
  let currentFrameBuffer = Buffer.from(screenshot, "base64");

  // Compare the screenshot to each of the frames where she is flipping the page
  // We have to compare to multiple frames because the screenshots aren't taken fast enough to see every frame
  for (let i = 0; i < flipFrameBuffers.length; i++) {
    let equal = await new Promise((resolve, reject) => {
      looksSame(
        flipFrameBuffers[i],
        currentFrameBuffer,
        { tolerance: 60 },
        (error, { equal }) => {
          resolve(equal);
        }
      );
    });

    if (equal) {
      console.log(
        `flips plus plus!!!  (${
          (new Date().getTime() - lastFlipTime.getTime()) / 1000
        } seconds)`
      );
      lastFlipTime = new Date();
      break;
    }
  }

  // Read the stream latency value from the DOM
  latency = await page.evaluate(() => {
    let latencyDiv = [...document.getElementsByTagName("div")].find((div) =>
      div.innerText.includes("Live Latency")
    );

    if (latencyDiv) {
      let siblingSpan = [...latencyDiv.parentElement.children].find(
        (child) => child.tagName === "span"
      );
      if (siblingSpan) {
        return Promise.resolve(siblingSpan.lastChild.innerText);
      } else {
        return Promise.resolve("no sibling span");
      }
    } else {
      return Promise.resolve("no latency div");
    }
  });
  //console.log(latency);

  // Write the screenshot to disk (for testing purposes)
  /*let filePromise = new Promise((resolve, reject) => {
      fs.writeFile(`frame-${i}.png`, currentFrameBuffer, resolve);
    });*/

  // Wait for the next frame, in case the server is actually fast enough to screenshot every frame
  await new Promise((resolve) => {
    setTimeout(resolve, 67); // 15 fps
  });
}

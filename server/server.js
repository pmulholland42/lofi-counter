import puppeteer from "puppeteer";
import * as fs from "fs";
import looksSame from "looks-same";
import express from "express";

const lofiURL = "http://localhost:8000/"; //"https://www.youtube.com/watch?v=5qap5aO4i9A";
const chromeExePath =
  "C:\\Users\\pmulh\\AppData\\Local\\Chromium\\Application\\chrome.exe";
const port = 3000;
const originalStreamPageCount = 2402444;
const pageFlipTime = 19800; //19728;

let lastPageFlip = 0;
let pageCount = -1;

// Set up api
const app = express();
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
app.get("/sync", (req, res) => {
  console.log("Got request");
  res.send({ lastPageFlip, pageCount });
});
app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

// Read in the frames of lofi girl flipping the page
let flipFrameBuffers = [];
for (let i = 0; i < 5; i++) {
  let flipFrame = fs.readFileSync(`flip-frames/${i + 1}.png`, {
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

// Start the video playing
await page.evaluate(() => {
  player.playVideo();
  return Promise.resolve();
});

let rollingAvgSum = 0;
let rollingAvgCount = 0;
let i = 0;
while (true) {
  // Screenshot the part of the stream with the notebook
  let screenshot = await page.screenshot({
    encoding: "base64",
    clip: {
      x: 194,
      y: 414,
      width: 179,
      height: 69,
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
      // Get the current livestream time
      let prevLastPageFlipTime = lastPageFlip;
      lastPageFlip = await page.evaluate(() => {
        return Promise.resolve(player.getCurrentTime());
      });

      let time = lastPageFlip - prevLastPageFlipTime;
      if (pageCount === -1) {
        pageCount = Math.floor(
          (lastPageFlip * 1000) / pageFlipTime + originalStreamPageCount
        );
      } else if (time > 2) {
        pageCount++;
      }

      if (time > 17 && time < 25) {
        rollingAvgSum += time;
        rollingAvgCount++;
        console.log("new rolling avg: " + rollingAvgSum / rollingAvgCount);
      }
      console.log(lastPageFlip);
      break;
    }
  }

  // Write the screenshot to disk (for testing purposes)
  /*let filePromise = new Promise((resolve, reject) => {
    fs.writeFile(`frame-${i}.png`, currentFrameBuffer, resolve);
  });*/

  // Wait for the next frame, in case the server is actually fast enough to screenshot every frame
  await new Promise((resolve) => {
    setTimeout(resolve, 67); // 15 fps
  });
  i++;
}

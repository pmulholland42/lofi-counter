const puppeteer = require("puppeteer");
const fs = require("fs");
const looksSame = require("looks-same");

const lofiURL = "https://www.youtube.com/watch?v=5qap5aO4i9A";

(async () => {
  let flipFrameBuffers = [];
  for (let i = 0; i < 5; i++) {
    let flipFrame = fs.readFileSync(`flip-frame-${i + 1}.png`, {
      encoding: "base64",
    });
    flipFrameBuffers.push(Buffer.from(flipFrame, "base64"));
  }

  const browser = await puppeteer.launch({
    executablePath:
      "C:\\Users\\pmulh\\AppData\\Local\\Chromium\\Application\\chrome.exe",
  });
  const page = await browser.newPage();
  await page.goto(lofiURL);
  await new Promise((resolve) => {
    setTimeout(resolve, 3500);
  });

  // Click the video to start playing
  await page.evaluate(() => {
    let videoElements = document.getElementsByTagName("video");
    videoElements[0].click();
    return Promise.resolve();
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  let lastFlipTime = new Date();
  for (let i = 0; i < 1000; i++) {
    let screenshot = await page.screenshot({
      encoding: "binary",
      clip: {
        x: 218,
        y: 363,
        width: 129,
        height: 57,
      },
    });
    let currentFrameBuffer = Buffer.from(screenshot, "binary");

    flipFrameBuffers.forEach(async (frame, index) => {
      let equal = await new Promise((resolve, reject) => {
        looksSame(
          frame,
          currentFrameBuffer,
          { tolerance: 50 },
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
      }
    });

    /*let filePromise = new Promise((resolve, reject) => {
      fs.writeFile(`frame-${i}.png`, currentFrameBuffer, resolve);
    });*/

    // Skip ads, decline YT Premium, etc.
    await page.evaluate(() => {
      let skipAdButtons = document.getElementsByClassName(
        "ytp-ad-text ytp-ad-skip-button-text"
      );
      let noThanksButton = [
        ...document.getElementsByTagName("yt-formatted-string"),
      ].find(
        (button) =>
          button.innerHTML.includes("Skip trial") ||
          button.innerHTML.includes("No thanks")
      );

      if (noThanksButton) {
        noThanksButton.click();
      }

      if (skipAdButtons.length > 0) {
        [...skipAdButtons].forEach((button) => {
          button.click();
        });
      }
      return Promise.resolve();
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 67); // 15 fps
    });
  }

  await browser.close();
})();

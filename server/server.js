const CDP = require("chrome-remote-interface");
const fs = require("fs");

CDP(async (client) => {
  // Extract used DevTools domains.
  const { Page, Runtime } = client;

  // Enable events on domains we are interested in.
  await Page.enable();
  await Page.navigate({
    url: "https://www.youtube.com/watch?v=5qap5aO4i9A",
  });
  await Page.loadEventFired();
  /*await new Promise((resolve) => {
    setTimeout(resolve, 3500);
  });*/

  const clickTheVideo1 = `
    let videoElements = document.getElementsByTagName('video');
    let stringElements = document.getElementsByTagName('yt-formatted-string');
    videoElements[0].click();
    [...stringElements].forEach(stringElement => stringElement.innerText = "butt");
    Array.prototype.map.call(videoElements, video => video.outerHTML);
  `;
  const clickTheVideo2 = `
    videoElements = document.getElementsByTagName('video');
    stringElements = document.getElementsByTagName('yt-formatted-string');
    videoElements[0].click();
    [...stringElements].forEach(stringElement => stringElement.innerText = "butt");
    Array.prototype.map.call(videoElements, video => video.outerHTML);
  `;

  await Runtime.evaluate({
    expression: clickTheVideo1,
  });

  await Page.startScreencast({ format: "png", everyNthFrame: 1 });
  let counter = 0;
  let now = new Date();
  let then = new Date();
  while (counter < 1000) {
    now = new Date();
    //console.log(now.getTime() - then.getTime());
    then = new Date();
    const { data, metadata, sessionId } = await Page.screencastFrame();
    let filePromise = new Promise((resolve, reject) => {
      fs.writeFile(
        `frame-${counter}.png`,
        Buffer.from(data, "base64"),
        resolve
      );
    });
    //console.log(metadata);
    let frameAckPromise = Page.screencastFrameAck({ sessionId: sessionId });
    await Promise.all([filePromise, frameAckPromise]);
    if (counter > 10) {
      let result = await Runtime.evaluate({
        expression: clickTheVideo2,
      });
      console.log(result);
    }
    counter++;
  }
  /*Page.screencastFrame((image) => {
    const { data, metadata } = image;
    console.log(metadata);
  });*/

  /*await new Promise((resolve) => {
    setTimeout(resolve, 3500);
  });
  let screenshot = await Page.captureScreenshot();
  console.log("took screenshot");
  fs.writeFileSync("screenshot.png", Buffer.from(screenshot.data, "base64"));*/
  client.close();
}).on("error", (err) => {
  console.error("Cannot connect to browser:", err);
});

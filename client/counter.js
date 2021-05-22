console.log("script loaded");

const testDiv = document.getElementById("test");
testDiv.oncontextmenu = () => {
  console.log("context!!");
};

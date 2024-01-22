var canvas = document.getElementById("maincanvas");
// var ctx = canvas.getContext('2d');
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
$(document).ready(function () {
  window.greenWindow = undefined;
  handShake();
  let interval = setInterval(function () {
    if (window.greenWindow !== undefined) {
      clearInterval(interval);
    } else {
      return;
    }
    initTracking();
    resizeCanvas();
    init();
    window.addEventListener("resize", resizeCanvas);
  }, 100);
});
function handShake() {
  var channel = new BroadcastChannel("handshake");
  channel.onmessage = function (event) {
    if (event.data === "GREEN") {
      window.greenWindow = true;
      channel.postMessage("RED");
    } else if (event.data === "RED") {
      window.greenWindow = false;
    }
    console.log("handshake", event.data);
  };
  if (!window.greenWindow) {
    channel.postMessage("GREEN");
  }
}
function initTracking() {
  window.channel = new BroadcastChannel("my_channel");

  channel.onmessage = function (event) {
    var line = {
      x1: canvas.width / 2,
      y1: canvas.height / 2,
      x2: event.data.x + event.data.width / 2 - window.screenX,
      y2: event.data.y + event.data.height / 2 - window.screenY,
    };
    let intersection = findIntersection(
      window.screenX + window.innerWidth/2,
      window.screenY + window.innerHeight/2,
      event.data.x+event.data.width / 2,
      event.data.y+ event.data.height / 2,
      window.screenX + window.innerWidth,
      window.screenY + window.innerHeight,
      window.screenX,
      window.screenY
    );
    window.otherWindowData = {
      x1: line.x1,
      y1: line.y1,
      x2: intersection.x- window.screenX,
      y2: intersection.y- window.screenY,
    };
  };
  startTrackingWindowPosition();
}
function startTrackingWindowPosition() {
  setInterval(function () {
    channel.postMessage({
      x: window.screenX,
      y: window.screenY,
      width: canvas.width,
      height: canvas.height + 150,
    });
  }, 10);
}

function findIntersection(x1, y1, x2, y2, rightEdgeX, bottomEdgeY,leftEdge,topEdge){
  // check if point 2 is inside the rectangle
  if(x2>leftEdge&&x2<rightEdgeX&&y2>topEdge&&y2<bottomEdgeY){
    return {x:x2,y:y2};
  }
  // Calculate the slope and y-intercept of the line
  let m = (y2 - y1) / (x2 - x1);
  let b = y1 - m * x1;

  let intersectionRightY = m * rightEdgeX + b;
  let intersectionBottomX = (bottomEdgeY - b) / m;
  let intersectionLeftY = m * leftEdge + b;
  let intersectionTopX = (topEdge - b) / m;


  let lineIsMovingRight = x2 > x1;
  let lineIsMovingDown = y2 > y1;
  if(lineIsMovingRight&&lineIsMovingDown) {
    if(intersectionRightY<bottomEdgeY){
      return {x:rightEdgeX,y:intersectionRightY};
    }else{
      return {x:intersectionBottomX,y:bottomEdgeY};
    }
  }else if(lineIsMovingRight&&!lineIsMovingDown){
    if(intersectionRightY>topEdge){
      return {x:rightEdgeX,y:intersectionRightY};
    }else{
      return {x:intersectionTopX,y:topEdge};
    }
  }else if(!lineIsMovingRight&&lineIsMovingDown){
    if(intersectionLeftY<bottomEdgeY){
      return {x:leftEdge,y:intersectionLeftY};
    }else{
      return {x:intersectionBottomX,y:bottomEdgeY};
    }
  }else if(!lineIsMovingRight&&!lineIsMovingDown){
    if(intersectionLeftY>topEdge){
      return {x:leftEdge,y:intersectionLeftY};
    }else{
      return {x:intersectionTopX,y:topEdge};
    }
  }

  return intersection;
}
function drawLine(x1, y1, x2, y2) {
  // // Clear canvas
  // ctx.clearRect(0, 0, canvas.width, canvas.height);
  // ctx.beginPath();
  // ctx.moveTo(x1, y1);
  // ctx.lineTo(x2, y2);
  // ctx.stroke();
}

function calculateAngleRadians(x1, y1, x2, y2) {
  var deltaX = x2 - x1;
  var deltaY = y2 - y1;

  var theta = Math.atan2(deltaY, deltaX); // Range (-PI, PI)

  return theta;
}
function calculateVelocityComponents(speed, angleRadians) {
  var vx = speed * Math.cos(angleRadians);
  var vy = -speed * Math.sin(angleRadians);

  return { vx, vy };
}

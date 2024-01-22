var canvas, scene, renderer, camera; // Standard basic objects for three.js

var masterPointCloud; // The object that represents the visible cloud of points.
var masterGeometry; // Object of type THREE.Geometry containing the visible points.
var masterMaterial; // Object of type THREE.PointCloudMaterial for point color and size.
var masterPoints; // An array of Vector3, containing all possible points
var masterSpinSpeeds; // An array of Quarterians, containing point rotations for "spin" animation
var masterDriftSpeeds; // An array of Vector3, contianing point velocities for "drift" animation

var secondaryPointCloud; // The object that represents the visible cloud of points.
var secondaryGeometry; // Object of type THREE.Geometry containing the visible points.
var secondaryMaterial; // Object of type THREE.PointCloudMaterial for point color and size.
var secondaryPoints; // An array of Vector3, containing all possible points
var secondarySpinSpeeds; // An array of Quarterians, containing point rotations for "spin" animation
var secondaryDriftSpeeds; // An array of Vector3, contianing point velocities for "drift" animation

var MAX_POINTS = 10000; // Number of points available
var minVector, maxVector; // The minimum and maximum values for the points
var noisePerlin = new Noise(Math.random());

var settings = {
  points: 8000,
  pointSize: 1.0,
};


function render() {
  updateForSpin(masterGeometry, masterPoints, masterSpinSpeeds);
  updateForSpin(secondaryGeometry, secondaryPoints, secondarySpinSpeeds);
  updateForMasterDrift();
  updateForSecondaryDrift();
  requestAnimationFrame(render);
  renderer.render(scene, camera);
}

function updateForSpin(geometry, points, spinSpeeds) {
  for (let i = 0; i < geometry.vertices.length; i++) {
    if (i % 2 != 0) continue; // skip every other point (for a more interesting effect
    let v = points[i];
    v.applyQuaternion(spinSpeeds[i]); // applies a rotation about the y-axis
  }
  geometry.verticesNeedUpdate = true;
}

function calculateIntersectionPoint(screenX, screenY, tolerance = 3) {
  const ndcX = (screenX / window.innerWidth) * 2 - 1;
  const ndcY = -(screenY / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(planeZ, intersection);
  const intersectionNormalized = new THREE.Vector3(
    intersection.x,
    intersection.y,
    intersection.z,
  );
  intersectionNormalized.normalize();
  intersection.x =
    intersection.x + Math.random() * intersectionNormalized.x * tolerance;
  intersection.y =
    intersection.y + Math.random() * intersectionNormalized.y * tolerance;
  return intersection;
}

function calculateVelocityFromScreenPoint(
  camera,
  screenX,
  screenY,
  worldPoint,
  speed,
) {
  const intersection = calculateIntersectionPoint(screenX, screenY);
  const velocity = intersection
    .sub(worldPoint)
    .normalize()
    .multiplyScalar(speed);
  return velocity;
}
function getPointOnscreenTo3dPoint(x, y) {
  const ndcX = (x / window.innerWidth) * 2 - 1;
  const ndcY = -(y / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(planeZ, intersection);
  return intersection;
}

function updateForMasterDrift() {
  if (!window.otherWindowData) {
    return;
  }
  for (var i = 0; i < masterGeometry.vertices.length; i++) {
    if (i % 2 == 0) continue; // skip every other point (for a more interesting effect
    var v = masterPoints[i];
    v.add(masterDriftSpeeds[i]);

    minVector = getPointOnscreenTo3dPoint(0, 0);
    maxVector = getPointOnscreenTo3dPoint(canvas.width, canvas.height);
    minVector, maxVector;
    if (
      v.x > maxVector.x ||
      v.x < minVector.x ||
      v.y > minVector.y ||
      v.y < maxVector.y ||
      v.z > 2.5 ||
      v.z < -2.5 ||
      Math.abs(masterDriftSpeeds[i].x) + Math.abs(masterDriftSpeeds[i].y) <
        0.001
    ) {
      let newPoint = randomPointOnSphereWithNoise(1);
      v.x = newPoint.x;
      v.y = newPoint.y;
      v.z = newPoint.z;
    }

    let velocity = calculateVelocityFromScreenPoint(
      camera,
      window.otherWindowData.x2,
      window.otherWindowData.y2,
      v,
      0.03,
    );
    masterDriftSpeeds[i] = velocity;
    v.multiplyScalar(0.9997);
  }
  masterGeometry.verticesNeedUpdate = true;
}
function updateForSecondaryDrift() {
  if (!window.otherWindowData) {
    return;
  }

  for (var i = 0; i < secondaryGeometry.vertices.length; i++) {
    if (i % 2 == 0) continue; // skip every other point (for a more interesting effect
    var v = secondaryPoints[i];
    v.add(secondaryDriftSpeeds[i]);
    minVector = getPointOnscreenTo3dPoint(0, 0);
    maxVector = getPointOnscreenTo3dPoint(canvas.width, canvas.height);
    if (Math.sqrt(v.x * v.x + v.y * v.y) < 1) {
      let startPoint = calculateIntersectionPoint(
        window.otherWindowData.x2,
        window.otherWindowData.y2,
        2,
      );
      v.x = startPoint.x;
      v.y = startPoint.y;
      v.z = startPoint.z;
    }
    let endPointVector3 = new THREE.Vector3(
      secondaryPoints[i + 1].x,
      secondaryPoints[i + 1].y,
      secondaryPoints[i + 1].z,
    );
    endPointVector3.sub(v).normalize();
    let velocity = endPointVector3.multiplyScalar(0.03);
    secondaryDriftSpeeds[i] = velocity;
    v.multiplyScalar(0.9997);
  }
  secondaryGeometry.verticesNeedUpdate = true;
}

function noise(x, y, z) {
  return noisePerlin.simplex2(x, y);
}
function randomPointOnSphereWithNoise(
  radius,
  noiseScale = 0.5,
  tolerance = 0.04,
) {
  let phi = Math.acos(2 * Math.random() - 1); // Uniform distribution of phi
  let theta = 2 * Math.PI * Math.random(); // Uniform distribution of theta

  let randomTolerance = Math.random() * tolerance;
  let radiusWithTolerance =
    radius + noise(phi, theta, 0) * tolerance + randomTolerance * 2;
  // Apply noise to the angles
  phi += noise(phi, theta, 0) * noiseScale;
  theta += noise(phi, theta, 1) * noiseScale;

  // Convert spherical to Cartesian coordinates
  let x = radiusWithTolerance * Math.sin(phi) * Math.cos(theta);
  let y = radiusWithTolerance * Math.sin(phi) * Math.sin(theta);
  let z = radiusWithTolerance * Math.cos(phi);

  // Normalize the point to ensure it's on the sphere's surface
  let length = Math.sqrt(x * x + y * y + z * z);
  x = (x / length) * radiusWithTolerance;
  y = (y / length) * radiusWithTolerance;
  z = (z / length) * radiusWithTolerance;

  return { x, y, z };
}
function createMasterGeometry() {
  masterPoints = new Array(MAX_POINTS);
  masterSpinSpeeds = new Array(MAX_POINTS);
  masterDriftSpeeds = new Array(MAX_POINTS);
  var i = 0;
  var yaxis = new THREE.Vector3(1, 1, 1);
  while (i < MAX_POINTS) {
    let { x, y, z } = randomPointOnSphereWithNoise(1);
    let angularSpeed = 0.001 + Math.random() * 0.0001; // angular speed of rotation about the y-axis
    masterSpinSpeeds[i] = new THREE.Quaternion();
    masterSpinSpeeds[i].setFromAxisAngle(yaxis, angularSpeed); // The quaternian for rotation by angularSpeed radians about the y-axis.
    masterDriftSpeeds[i] = new THREE.Vector3(0, 0, 0);
    masterPoints[i] = new THREE.Vector3(x, y, z);
    i++;
  }
  masterGeometry = new THREE.Geometry();
  for (i = 0; i < settings.points; i++) {
    masterGeometry.vertices.push(masterPoints[i]);
  }
  masterMaterial = new THREE.PointsMaterial({
    color: !window.greenWindow ? "#2ad870" : "#FF3333",
    size: settings.pointSize,
    sizeAttenuation: false,
  });
  masterPointCloud = new THREE.Points(masterGeometry, masterMaterial);
  scene.add(masterPointCloud);
}

function createSecondaryGeometry() {
  secondaryPoints = new Array(MAX_POINTS);
  secondarySpinSpeeds = new Array(MAX_POINTS);
  secondaryDriftSpeeds = new Array(MAX_POINTS);
  var i = 0;
  var yaxis = new THREE.Vector3(1, 1, 1);
  while (i < MAX_POINTS) {
    let { x, y, z } = randomPointOnSphereWithNoise(0.7);
    let angularSpeed = 0.00001 + Math.random() / 700;
    secondarySpinSpeeds[i] = new THREE.Quaternion();
    secondarySpinSpeeds[i].setFromAxisAngle(yaxis, angularSpeed);
    secondaryDriftSpeeds[i] = new THREE.Vector3(0, 0, 0);
    secondaryPoints[i] = new THREE.Vector3(x, y, z);
    i++;
  }
  secondaryGeometry = new THREE.Geometry();
  for (i = 0; i < settings.points; i++) {
    secondaryGeometry.vertices.push(secondaryPoints[i]);
  }
  secondaryMaterial = new THREE.PointsMaterial({
    color: window.greenWindow ? "#2ad870" : "#FF6363",
    size: settings.pointSize + 0.05,
    sizeAttenuation: false,
  });
  secondaryPointCloud = new THREE.Points(secondaryGeometry, secondaryMaterial);
  scene.add(secondaryPointCloud);
}

function createWorld() {
  scene = new THREE.Scene();
  renderer.setClearColor(0);
  camera = new THREE.PerspectiveCamera(
    30,
    canvas.width / canvas.height,
    1,
    1000,
  );
  camera.position.z = 8;
  createMasterGeometry();
  createSecondaryGeometry();
}

function init() {
  try {
    canvas = document.getElementById("maincanvas");
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
  } catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p><b>Sorry, an error occurred:<br>" + e + "</b></p>";
    return;
  }

  createWorld();
  render();
}

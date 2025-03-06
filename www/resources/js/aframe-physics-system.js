/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

__webpack_require__(/*! ./src/components/math */ "./src/components/math/index.js");
__webpack_require__(/*! ./src/components/body/ammo-body */ "./src/components/body/ammo-body.js");
__webpack_require__(/*! ./src/components/shape/ammo-shape */ "./src/components/shape/ammo-shape.js")
__webpack_require__(/*! ./src/components/ammo-constraint */ "./src/components/ammo-constraint.js");
__webpack_require__(/*! ./src/system */ "./src/system.js");

module.exports = {
  registerAll: function () {
    console.warn('registerAll() is deprecated. Components are automatically registered.');
  }
};


/***/ }),

/***/ "./node_modules/aframe-stats-panel/index.js":
/*!**************************************************!*\
  !*** ./node_modules/aframe-stats-panel/index.js ***!
  \**************************************************/
/***/ (() => {

AFRAME.registerComponent('stats-panel', {
  schema: {
    merge: {type: 'boolean', default: true}
  },

  init() {

    const container = document.querySelector('.rs-container')

    if (container && this.data.merge) {
      //stats panel exists, just merge into it.
      this.container = container
      return;
    }

    // if stats panel doesn't exist, add one to support our custom stats.
    this.base = document.createElement('div')
    this.base.classList.add('rs-base')
    const body = document.body || document.getElementsByTagName('body')[0]

    if (container && !this.data.merge) {
      this.base.style.top = "auto"
      this.base.style.bottom = "20px"
    }

    body.appendChild(this.base)

    this.container = document.createElement('div')
    this.container.classList.add('rs-container')
    this.base.appendChild(this.container)
  }
});

AFRAME.registerComponent('stats-group', {
  multiple: true,
  schema: {
    label: {type: 'string'}
  },

  init() {

    let container
    const baseComponent = this.el.components['stats-panel']
    if (baseComponent) {
      container = baseComponent.container
    }
    else {
      container = document.querySelector('.rs-container')
    }

    if (!container) {
      console.warn(`Couldn't find stats container to add stats to.
                    Add either stats or stats-panel component to a-scene`)
      return;
    }
    
    this.groupHeader = document.createElement('h1')
    this.groupHeader.innerHTML = this.data.label
    container.appendChild(this.groupHeader)

    this.group = document.createElement('div')
    this.group.classList.add('rs-group')
    // rs-group hs style flex-direction of 'column-reverse'
    // No idea why it's like that, but it's not what we want for our stats.
    // We prefer them rendered in the order speified.
    // So override this style.
    this.group.style.flexDirection = 'column'
    this.group.style.webKitFlexDirection = 'column'
    container.appendChild(this.group)
  }
});

AFRAME.registerComponent('stats-row', {
  multiple: true,
  schema: {
    // name of the group to add the stats row to.
    group: {type: 'string'},

    // name of an event to listen for
    event: {type: 'string'},

    // property from event to output in stats panel
    properties: {type: 'array'},

    // label for the row in the stats panel
    label: {type: 'string'}
  },

  init () {

    const groupComponentName = "stats-group__" + this.data.group
    const groupComponent = this.el.components[groupComponentName] ||
                           this.el.sceneEl.components[groupComponentName] ||
                           this.el.components["stats-group"] ||
                           this.el.sceneEl.components["stats-group"]

    if (!groupComponent) {
      console.warn(`Couldn't find stats group ${groupComponentName}`)
      return;
    }
  
    this.counter = document.createElement('div')
    this.counter.classList.add('rs-counter-base')
    groupComponent.group.appendChild(this.counter)

    this.counterId = document.createElement('div')
    this.counterId.classList.add('rs-counter-id')
    this.counterId.innerHTML = this.data.label
    this.counter.appendChild(this.counterId)

    this.counterValues = {}
    this.data.properties.forEach((property) => {
      const counterValue = document.createElement('div')
      counterValue.classList.add('rs-counter-value')
      counterValue.innerHTML = "..."
      this.counter.appendChild(counterValue)
      this.counterValues[property] = counterValue
    })

    this.updateStatsData = this.updateStatsData.bind(this)
    this.el.addEventListener(this.data.event, this.updateStatsData)

    this.splitCache = {}
  },

  updateStatsData(e) {

    if (!this.data.properties) return
    
    this.data.properties.forEach((property) => {
      const split = this.splitDot(property);
      let value = e.detail;
      for (i = 0; i < split.length; i++) {
        value = value[split[i]];
      }
      this.counterValues[property].innerHTML = value
    })
  },

  splitDot (path) {
    if (path in this.splitCache) { return this.splitCache[path]; }
    this.splitCache[path] = path.split('.');
    return this.splitCache[path];
  }

});

AFRAME.registerComponent('stats-collector', {
  multiple: true,

  schema: {
    // name of an event to listen for
    inEvent: {type: 'string'},

    // property from event to output in stats panel
    properties: {type: 'array'},

    // frequency of output in terms of events received.
    outputFrequency: {type: 'number', default: 100},

    // name of event to emit
    outEvent: {type: 'string'},
    
    // outputs (generated for each property)
    // Combination of: mean, max, percentile__XX.X (where XX.X is a number)
    outputs: {type: 'array'},

    // Whether to output to console as well as generating events
    // If a string is specified, this is output to console, together with the event data
    // If no string is specified, nothing is output to console.
    outputToConsole: {type: 'string'}
  },

  init() {
    
    this.statsData = {}
    this.resetData()
    this.outputDetail = {}
    this.data.properties.forEach((property) => {
      this.outputDetail[property] = {}
    })

    this.statsReceived = this.statsReceived.bind(this)
    this.el.addEventListener(this.data.inEvent, this.statsReceived)
  },
  
  resetData() {

    this.counter = 0
    this.data.properties.forEach((property) => {
      
      // For calculating percentiles like 0.01 and 99.9% we'll want to store
      // additional data - something like this...
      // Store off outliers, and discard data.
      // const min = Math.min(...this.statsData[property])
      // this.lowOutliers[property].push(min)
      // const max = Math.max(...this.statsData[property])
      // this.highOutliers[property].push(max)

      this.statsData[property] = []
    })
  },

  statsReceived(e) {

    this.updateStatsData(e.detail)

    this.counter++ 
    if (this.counter === this.data.outputFrequency) {
      this.outputData()
      this.resetData()
    }
  },

  updateStatsData(detail) {

    this.data.properties.forEach((property) => {
      let value = detail;
      value = value[property];
      this.statsData[property].push(value)
    })
  },

  outputData() {
    this.data.properties.forEach((property) => {
      this.data.outputs.forEach((output) => {
        this.outputDetail[property][output] = this.computeOutput(output, this.statsData[property])
      })
    })

    if (this.data.outEvent) {
      this.el.emit(this.data.outEvent, this.outputDetail)
    }

    if (this.data.outputToConsole) {
      console.log(this.data.outputToConsole, this.outputDetail)
    }
  },

  computeOutput(outputInstruction, data) {

    const outputInstructions = outputInstruction.split("__")
    const outputType = outputInstructions[0]
    let output

    switch (outputType) {
      case "mean":
        output = data.reduce((a, b) => a + b, 0) / data.length;
        break;
      
      case "max":
        output = Math.max(...data)
        break;

      case "min":
        output = Math.min(...data)
        break;

      case "percentile":
        const sorted = data.sort((a, b) => a - b)
        // decimal percentiles encoded like 99+9 rather than 99.9 due to "." being used as a 
        // separator for nested properties.
        const percentileString = outputInstructions[1].replace("_", ".")
        const proportion = +percentileString / 100

        // Note that this calculation of the percentile is inaccurate when there is insufficient data
        // e.g. for 0.1th or 99.9th percentile when only 100 data points.
        // Greater accuracy would require storing off more data (specifically outliers) and folding these
        // into the computation.
        const position = (data.length - 1) * proportion
        const base = Math.floor(position)
        const delta = position - base;
        if (sorted[base + 1] !== undefined) {
            output = sorted[base] + delta * (sorted[base + 1] - sorted[base]);
        } else {
            output = sorted[base];
        }
        break;
    }
    return output.toFixed(2)
  }
});


/***/ }),

/***/ "./node_modules/ammo-debug-drawer/AmmoDebugDrawer.js":
/*!***********************************************************!*\
  !*** ./node_modules/ammo-debug-drawer/AmmoDebugDrawer.js ***!
  \***********************************************************/
/***/ (() => {

/* global Ammo,THREE */

THREE.AmmoDebugConstants = {
  NoDebug: 0,
  DrawWireframe: 1,
  DrawAabb: 2,
  DrawFeaturesText: 4,
  DrawContactPoints: 8,
  NoDeactivation: 16,
  NoHelpText: 32,
  DrawText: 64,
  ProfileTimings: 128,
  EnableSatComparison: 256,
  DisableBulletLCP: 512,
  EnableCCD: 1024,
  DrawConstraints: 1 << 11, //2048
  DrawConstraintLimits: 1 << 12, //4096
  FastWireframe: 1 << 13, //8192
  DrawNormals: 1 << 14, //16384
  DrawOnTop: 1 << 15, //32768
  MAX_DEBUG_DRAW_MODE: 0xffffffff
};

/**
 * An implementation of the btIDebugDraw interface in Ammo.js, for debug rendering of Ammo shapes
 * @class AmmoDebugDrawer
 * @param {THREE.Scene} scene
 * @param {Ammo.btCollisionWorld} world
 * @param {object} [options]
 */
THREE.AmmoDebugDrawer = function(scene, world, options) {
  this.scene = scene;
  this.world = world;
  options = options || {};

  this.debugDrawMode = options.debugDrawMode || THREE.AmmoDebugConstants.DrawWireframe;
  var drawOnTop = this.debugDrawMode & THREE.AmmoDebugConstants.DrawOnTop || false;
  var maxBufferSize = options.maxBufferSize || 1000000;

  this.geometry = new THREE.BufferGeometry();
  var vertices = new Float32Array(maxBufferSize * 3);
  var colors = new Float32Array(maxBufferSize * 3);

  this.geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3).setUsage(THREE.DynamicDrawUsage));
  this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));

  this.index = 0;

  var material = new THREE.LineBasicMaterial({
    vertexColors: true,
    depthTest: !drawOnTop
  });

  this.mesh = new THREE.LineSegments(this.geometry, material);
  if (drawOnTop) this.mesh.renderOrder = 999;
  this.mesh.frustumCulled = false;

  this.enabled = false;

  this.debugDrawer = new Ammo.DebugDrawer();
  this.debugDrawer.drawLine = this.drawLine.bind(this);
  this.debugDrawer.drawContactPoint = this.drawContactPoint.bind(this);
  this.debugDrawer.reportErrorWarning = this.reportErrorWarning.bind(this);
  this.debugDrawer.draw3dText = this.draw3dText.bind(this);
  this.debugDrawer.setDebugMode = this.setDebugMode.bind(this);
  this.debugDrawer.getDebugMode = this.getDebugMode.bind(this);
  this.debugDrawer.enable = this.enable.bind(this);
  this.debugDrawer.disable = this.disable.bind(this);
  this.debugDrawer.update = this.update.bind(this);

  this.world.setDebugDrawer(this.debugDrawer);
};

THREE.AmmoDebugDrawer.prototype = function() {
  return this.debugDrawer;
};

THREE.AmmoDebugDrawer.prototype.enable = function() {
  this.enabled = true;
  this.scene.add(this.mesh);
};

THREE.AmmoDebugDrawer.prototype.disable = function() {
  this.enabled = false;
  this.scene.remove(this.mesh);
};

THREE.AmmoDebugDrawer.prototype.update = function() {
  if (!this.enabled) {
    return;
  }

  if (this.index != 0) {
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  this.index = 0;

  this.world.debugDrawWorld();

  this.geometry.setDrawRange(0, this.index);
};

THREE.AmmoDebugDrawer.prototype.drawLine = function(from, to, color) {
  const heap = Ammo.HEAPF32;
  const r = heap[(color + 0) / 4];
  const g = heap[(color + 4) / 4];
  const b = heap[(color + 8) / 4];

  const fromX = heap[(from + 0) / 4];
  const fromY = heap[(from + 4) / 4];
  const fromZ = heap[(from + 8) / 4];
  this.geometry.attributes.position.setXYZ(this.index, fromX, fromY, fromZ);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);

  const toX = heap[(to + 0) / 4];
  const toY = heap[(to + 4) / 4];
  const toZ = heap[(to + 8) / 4];
  this.geometry.attributes.position.setXYZ(this.index, toX, toY, toZ);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);
};

//TODO: figure out how to make lifeTime work
THREE.AmmoDebugDrawer.prototype.drawContactPoint = function(pointOnB, normalOnB, distance, lifeTime, color) {
  const heap = Ammo.HEAPF32;
  const r = heap[(color + 0) / 4];
  const g = heap[(color + 4) / 4];
  const b = heap[(color + 8) / 4];

  const x = heap[(pointOnB + 0) / 4];
  const y = heap[(pointOnB + 4) / 4];
  const z = heap[(pointOnB + 8) / 4];
  this.geometry.attributes.position.setXYZ(this.index, x, y, z);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);

  const dx = heap[(normalOnB + 0) / 4] * distance;
  const dy = heap[(normalOnB + 4) / 4] * distance;
  const dz = heap[(normalOnB + 8) / 4] * distance;
  this.geometry.attributes.position.setXYZ(this.index, x + dx, y + dy, z + dz);
  this.geometry.attributes.color.setXYZ(this.index++, r, g, b);
};

THREE.AmmoDebugDrawer.prototype.reportErrorWarning = function(warningString) {
  if (Ammo.hasOwnProperty("Pointer_stringify")) {
    console.warn(Ammo.Pointer_stringify(warningString));
  } else if (!this.warnedOnce) {
    this.warnedOnce = true;
    console.warn("Cannot print warningString, please rebuild Ammo.js using 'debug' flag");
  }
};

THREE.AmmoDebugDrawer.prototype.draw3dText = function(location, textString) {
  //TODO
  console.warn("TODO: draw3dText");
};

THREE.AmmoDebugDrawer.prototype.setDebugMode = function(debugMode) {
  this.debugDrawMode = debugMode;
};

THREE.AmmoDebugDrawer.prototype.getDebugMode = function() {
  return this.debugDrawMode;
};


/***/ }),

/***/ "./node_modules/three-to-ammo/index.js":
/*!*********************************************!*\
  !*** ./node_modules/three-to-ammo/index.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   FIT: () => (/* binding */ FIT),
/* harmony export */   HEIGHTFIELD_DATA_TYPE: () => (/* binding */ HEIGHTFIELD_DATA_TYPE),
/* harmony export */   TYPE: () => (/* binding */ TYPE),
/* harmony export */   createBoxShape: () => (/* binding */ createBoxShape),
/* harmony export */   createCapsuleShape: () => (/* binding */ createCapsuleShape),
/* harmony export */   createCollisionShapes: () => (/* binding */ createCollisionShapes),
/* harmony export */   createConeShape: () => (/* binding */ createConeShape),
/* harmony export */   createCylinderShape: () => (/* binding */ createCylinderShape),
/* harmony export */   createHACDShapes: () => (/* binding */ createHACDShapes),
/* harmony export */   createHeightfieldTerrainShape: () => (/* binding */ createHeightfieldTerrainShape),
/* harmony export */   createHullShape: () => (/* binding */ createHullShape),
/* harmony export */   createSphereShape: () => (/* binding */ createSphereShape),
/* harmony export */   createTriMeshShape: () => (/* binding */ createTriMeshShape),
/* harmony export */   createVHACDShapes: () => (/* binding */ createVHACDShapes),
/* harmony export */   iterateGeometries: () => (/* binding */ iterateGeometries)
/* harmony export */ });
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! three */ "three");
/* harmony import */ var three__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(three__WEBPACK_IMPORTED_MODULE_0__);

/* global Ammo */


const TYPE = {
  BOX: "box",
  CYLINDER: "cylinder",
  SPHERE: "sphere",
  CAPSULE: "capsule",
  CONE: "cone",
  HULL: "hull",
  HACD: "hacd", //Hierarchical Approximate Convex Decomposition
  VHACD: "vhacd", //Volumetric Hierarchical Approximate Convex Decomposition
  MESH: "mesh",
  HEIGHTFIELD: "heightfield"
};

const FIT = {
  ALL: "all", //A single shape is automatically sized to bound all meshes within the entity.
  MANUAL: "manual" //A single shape is sized manually. Requires halfExtents or sphereRadius.
};

const HEIGHTFIELD_DATA_TYPE = {
  short: "short",
  float: "float"
};

const createCollisionShapes = function(vertices, matrices, indexes, matrixWorld, options = {}) {
  switch (options.type) {
    case TYPE.BOX:
      return [createBoxShape(vertices, matrices, matrixWorld, options)];
    case TYPE.CYLINDER:
      return [createCylinderShape(vertices, matrices, matrixWorld, options)];
    case TYPE.CAPSULE:
      return [createCapsuleShape(vertices, matrices, matrixWorld, options)];
    case TYPE.CONE:
      return [createConeShape(vertices, matrices, matrixWorld, options)];
    case TYPE.SPHERE:
      return [createSphereShape(vertices, matrices, matrixWorld, options)];
    case TYPE.HULL:
      return [createHullShape(vertices, matrices, matrixWorld, options)];
    case TYPE.HACD:
      return createHACDShapes(vertices, matrices, indexes, matrixWorld, options);
    case TYPE.VHACD:
      return createVHACDShapes(vertices, matrices, indexes, matrixWorld, options);
    case TYPE.MESH:
      return [createTriMeshShape(vertices, matrices, indexes, matrixWorld, options)];
    case TYPE.HEIGHTFIELD:
      return [createHeightfieldTerrainShape(options)];
    default:
      console.warn(options.type + " is not currently supported");
      return [];
  }
};

//TODO: support gimpact (dynamic trimesh) and heightmap

const createBoxShape = function(vertices, matrices, matrixWorld, options = {}) {
  options.type = TYPE.BOX;
  _setOptions(options);

  if (options.fit === FIT.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtent,
      options.maxHalfExtent
    );
  }

  const btHalfExtents = new Ammo.btVector3(options.halfExtents.x, options.halfExtents.y, options.halfExtents.z);
  const collisionShape = new Ammo.btBoxShape(btHalfExtents);
  Ammo.destroy(btHalfExtents);

  _finishCollisionShape(collisionShape, options, _computeScale(matrixWorld, options));
  return collisionShape;
};

const createCylinderShape = function(vertices, matrices, matrixWorld, options = {}) {
  options.type = TYPE.CYLINDER;
  _setOptions(options);

  if (options.fit === FIT.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtent,
      options.maxHalfExtent
    );
  }

  const btHalfExtents = new Ammo.btVector3(options.halfExtents.x, options.halfExtents.y, options.halfExtents.z);
  const collisionShape = (() => {
    switch (options.cylinderAxis) {
      case "y":
        return new Ammo.btCylinderShape(btHalfExtents);
      case "x":
        return new Ammo.btCylinderShapeX(btHalfExtents);
      case "z":
        return new Ammo.btCylinderShapeZ(btHalfExtents);
    }
    return null;
  })();
  Ammo.destroy(btHalfExtents);

  _finishCollisionShape(collisionShape, options, _computeScale(matrixWorld, options));
  return collisionShape;
};

const createCapsuleShape = function(vertices, matrices, matrixWorld, options = {}) {
  options.type = TYPE.CAPSULE;
  _setOptions(options);

  if (options.fit === FIT.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtent,
      options.maxHalfExtent
    );
  }

  const { x, y, z } = options.halfExtents;
  const collisionShape = (() => {
    switch (options.cylinderAxis) {
      case "y":
        return new Ammo.btCapsuleShape(Math.max(x, z), y * 2);
      case "x":
        return new Ammo.btCapsuleShapeX(Math.max(y, z), x * 2);
      case "z":
        return new Ammo.btCapsuleShapeZ(Math.max(x, y), z * 2);
    }
    return null;
  })();

  _finishCollisionShape(collisionShape, options, _computeScale(matrixWorld, options));
  return collisionShape;
};

const createConeShape = function(vertices, matrices, matrixWorld, options = {}) {
  options.type = TYPE.CONE;
  _setOptions(options);

  if (options.fit === FIT.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtent,
      options.maxHalfExtent
    );
  }

  const { x, y, z } = options.halfExtents;
  const collisionShape = (() => {
    switch (options.cylinderAxis) {
      case "y":
        return new Ammo.btConeShape(Math.max(x, z), y * 2);
      case "x":
        return new Ammo.btConeShapeX(Math.max(y, z), x * 2);
      case "z":
        return new Ammo.btConeShapeZ(Math.max(x, y), z * 2);
    }
    return null;
  })();

  _finishCollisionShape(collisionShape, options, _computeScale(matrixWorld, options));
  return collisionShape;
};

const createSphereShape = function(vertices, matrices, matrixWorld, options = {}) {
  options.type = TYPE.SPHERE;
  _setOptions(options);

  let radius;
  if (options.fit === FIT.MANUAL && !isNaN(options.sphereRadius)) {
    radius = options.sphereRadius;
  } else {
    radius = _computeRadius(vertices, matrices, _computeBounds(vertices, matrices));
  }

  const collisionShape = new Ammo.btSphereShape(radius);
  _finishCollisionShape(collisionShape, options, _computeScale(matrixWorld, options));

  return collisionShape;
};

const createHullShape = (function() {
  const vertex = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const center = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  return function(vertices, matrices, matrixWorld, options = {}) {
    options.type = TYPE.HULL;
    _setOptions(options);

    if (options.fit === FIT.MANUAL) {
      console.warn("cannot use fit: manual with type: hull");
      return null;
    }

    const bounds = _computeBounds(vertices, matrices);

    const btVertex = new Ammo.btVector3();
    const originalHull = new Ammo.btConvexHullShape();
    originalHull.setMargin(options.margin);
    center.addVectors(bounds.max, bounds.min).multiplyScalar(0.5);

    let vertexCount = 0;
    for (let i = 0; i < vertices.length; i++) {
      vertexCount += vertices[i].length / 3;
    }

    const maxVertices = options.hullMaxVertices || 100000;
    // todo: might want to implement this in a deterministic way that doesn't do O(verts) calls to Math.random
    if (vertexCount > maxVertices) {
      console.warn(`too many vertices for hull shape; sampling ~${maxVertices} from ~${vertexCount} vertices`);
    }
    const p = Math.min(1, maxVertices / vertexCount);

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < components.length; j += 3) {
        const isLastVertex = i === vertices.length - 1 && j === components.length - 3;
        if (Math.random() <= p || isLastVertex) {
          // always include the last vertex
          vertex
            .set(components[j], components[j + 1], components[j + 2])
            .applyMatrix4(matrix)
            .sub(center);
          btVertex.setValue(vertex.x, vertex.y, vertex.z);
          originalHull.addPoint(btVertex, isLastVertex); // recalc AABB only on last geometry
        }
      }
    }

    let collisionShape = originalHull;
    if (originalHull.getNumVertices() >= 100) {
      //Bullet documentation says don't use convexHulls with 100 verts or more
      const shapeHull = new Ammo.btShapeHull(originalHull);
      shapeHull.buildHull(options.margin);
      Ammo.destroy(originalHull);
      collisionShape = new Ammo.btConvexHullShape(
        Ammo.getPointer(shapeHull.getVertexPointer()),
        shapeHull.numVertices()
      );
      Ammo.destroy(shapeHull); // btConvexHullShape makes a copy
    }

    Ammo.destroy(btVertex);

    _finishCollisionShape(collisionShape, options, _computeScale(matrixWorld, options));
    return collisionShape;
  };
})();

const createHACDShapes = (function() {
  const vector = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const center = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  return function(vertices, matrices, indexes, matrixWorld, options = {}) {
    options.type = TYPE.HACD;
    _setOptions(options);

    if (options.fit === FIT.MANUAL) {
      console.warn("cannot use fit: manual with type: hacd");
      return [];
    }

    if (!Ammo.hasOwnProperty("HACD")) {
      console.warn(
        "HACD unavailable in included build of Ammo.js. Visit https://github.com/mozillareality/ammo.js for the latest version."
      );
      return [];
    }

    const bounds = _computeBounds(vertices, matrices);
    const scale = _computeScale(matrixWorld, options);

    let vertexCount = 0;
    let triCount = 0;
    center.addVectors(bounds.max, bounds.min).multiplyScalar(0.5);

    for (let i = 0; i < vertices.length; i++) {
      vertexCount += vertices[i].length / 3;
      if (indexes && indexes[i]) {
        triCount += indexes[i].length / 3;
      } else {
        triCount += vertices[i].length / 9;
      }
    }

    const hacd = new Ammo.HACD();
    if (options.hasOwnProperty("compacityWeight")) hacd.SetCompacityWeight(options.compacityWeight);
    if (options.hasOwnProperty("volumeWeight")) hacd.SetVolumeWeight(options.volumeWeight);
    if (options.hasOwnProperty("nClusters")) hacd.SetNClusters(options.nClusters);
    if (options.hasOwnProperty("nVerticesPerCH")) hacd.SetNVerticesPerCH(options.nVerticesPerCH);
    if (options.hasOwnProperty("concavity")) hacd.SetConcavity(options.concavity);

    const points = Ammo._malloc(vertexCount * 3 * 8);
    const triangles = Ammo._malloc(triCount * 3 * 4);
    hacd.SetPoints(points);
    hacd.SetTriangles(triangles);
    hacd.SetNPoints(vertexCount);
    hacd.SetNTriangles(triCount);

    let pptr = points / 8,
      tptr = triangles / 4;

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < components.length; j += 3) {
        vector
          .set(components[j + 0], components[j + 1], components[j + 2])
          .applyMatrix4(matrix)
          .sub(center);
        Ammo.HEAPF64[pptr + 0] = vector.x;
        Ammo.HEAPF64[pptr + 1] = vector.y;
        Ammo.HEAPF64[pptr + 2] = vector.z;
        pptr += 3;
      }
      if (indexes[i]) {
        const indices = indexes[i];
        for (let j = 0; j < indices.length; j++) {
          Ammo.HEAP32[tptr] = indices[j];
          tptr++;
        }
      } else {
        for (let j = 0; j < components.length / 3; j++) {
          Ammo.HEAP32[tptr] = j;
          tptr++;
        }
      }
    }

    hacd.Compute();
    Ammo._free(points);
    Ammo._free(triangles);
    const nClusters = hacd.GetNClusters();

    const shapes = [];
    for (let i = 0; i < nClusters; i++) {
      const hull = new Ammo.btConvexHullShape();
      hull.setMargin(options.margin);
      const nPoints = hacd.GetNPointsCH(i);
      const nTriangles = hacd.GetNTrianglesCH(i);
      const hullPoints = Ammo._malloc(nPoints * 3 * 8);
      const hullTriangles = Ammo._malloc(nTriangles * 3 * 4);
      hacd.GetCH(i, hullPoints, hullTriangles);

      const pptr = hullPoints / 8;
      for (let pi = 0; pi < nPoints; pi++) {
        const btVertex = new Ammo.btVector3();
        const px = Ammo.HEAPF64[pptr + pi * 3 + 0];
        const py = Ammo.HEAPF64[pptr + pi * 3 + 1];
        const pz = Ammo.HEAPF64[pptr + pi * 3 + 2];
        btVertex.setValue(px, py, pz);
        hull.addPoint(btVertex, pi === nPoints - 1);
        Ammo.destroy(btVertex);
      }

      _finishCollisionShape(hull, options, scale);
      shapes.push(hull);
    }

    return shapes;
  };
})();

const createVHACDShapes = (function() {
  const vector = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const center = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  return function(vertices, matrices, indexes, matrixWorld, options = {}) {
    options.type = TYPE.VHACD;
    _setOptions(options);

    if (options.fit === FIT.MANUAL) {
      console.warn("cannot use fit: manual with type: vhacd");
      return [];
    }

    if (!Ammo.hasOwnProperty("VHACD")) {
      console.warn(
        "VHACD unavailable in included build of Ammo.js. Visit https://github.com/mozillareality/ammo.js for the latest version."
      );
      return [];
    }

    const bounds = _computeBounds(vertices, matrices);
    const scale = _computeScale(matrixWorld, options);

    let vertexCount = 0;
    let triCount = 0;
    center.addVectors(bounds.max, bounds.min).multiplyScalar(0.5);

    for (let i = 0; i < vertices.length; i++) {
      vertexCount += vertices[i].length / 3;
      if (indexes && indexes[i]) {
        triCount += indexes[i].length / 3;
      } else {
        triCount += vertices[i].length / 9;
      }
    }

    const vhacd = new Ammo.VHACD();
    const params = new Ammo.Parameters();
    //https://kmamou.blogspot.com/2014/12/v-hacd-20-parameters-description.html
    if (options.hasOwnProperty("resolution")) params.set_m_resolution(options.resolution);
    if (options.hasOwnProperty("depth")) params.set_m_depth(options.depth);
    if (options.hasOwnProperty("concavity")) params.set_m_concavity(options.concavity);
    if (options.hasOwnProperty("planeDownsampling")) params.set_m_planeDownsampling(options.planeDownsampling);
    if (options.hasOwnProperty("convexhullDownsampling"))
      params.set_m_convexhullDownsampling(options.convexhullDownsampling);
    if (options.hasOwnProperty("alpha")) params.set_m_alpha(options.alpha);
    if (options.hasOwnProperty("beta")) params.set_m_beta(options.beta);
    if (options.hasOwnProperty("gamma")) params.set_m_gamma(options.gamma);
    if (options.hasOwnProperty("pca")) params.set_m_pca(options.pca);
    if (options.hasOwnProperty("mode")) params.set_m_mode(options.mode);
    if (options.hasOwnProperty("maxNumVerticesPerCH")) params.set_m_maxNumVerticesPerCH(options.maxNumVerticesPerCH);
    if (options.hasOwnProperty("minVolumePerCH")) params.set_m_minVolumePerCH(options.minVolumePerCH);
    if (options.hasOwnProperty("convexhullApproximation"))
      params.set_m_convexhullApproximation(options.convexhullApproximation);
    if (options.hasOwnProperty("oclAcceleration")) params.set_m_oclAcceleration(options.oclAcceleration);

    const points = Ammo._malloc(vertexCount * 3 * 8 + 3);
    const triangles = Ammo._malloc(triCount * 3 * 4);

    let pptr = points / 8,
      tptr = triangles / 4;

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < components.length; j += 3) {
        vector
          .set(components[j + 0], components[j + 1], components[j + 2])
          .applyMatrix4(matrix)
          .sub(center);
        Ammo.HEAPF64[pptr + 0] = vector.x;
        Ammo.HEAPF64[pptr + 1] = vector.y;
        Ammo.HEAPF64[pptr + 2] = vector.z;
        pptr += 3;
      }
      if (indexes[i]) {
        const indices = indexes[i];
        for (let j = 0; j < indices.length; j++) {
          Ammo.HEAP32[tptr] = indices[j];
          tptr++;
        }
      } else {
        for (let j = 0; j < components.length / 3; j++) {
          Ammo.HEAP32[tptr] = j;
          tptr++;
        }
      }
    }
    vhacd.Compute(points, 3, vertexCount, triangles, 3, triCount, params);
    Ammo._free(points);
    Ammo._free(triangles);
    const nHulls = vhacd.GetNConvexHulls();

    const shapes = [];
    const ch = new Ammo.ConvexHull();
    for (let i = 0; i < nHulls; i++) {
      vhacd.GetConvexHull(i, ch);
      const nPoints = ch.get_m_nPoints();
      const hullPoints = ch.get_m_points();

      const hull = new Ammo.btConvexHullShape();
      hull.setMargin(options.margin);

      for (let pi = 0; pi < nPoints; pi++) {
        const btVertex = new Ammo.btVector3();
        const px = ch.get_m_points(pi * 3 + 0);
        const py = ch.get_m_points(pi * 3 + 1);
        const pz = ch.get_m_points(pi * 3 + 2);
        btVertex.setValue(px, py, pz);
        hull.addPoint(btVertex, pi === nPoints - 1);
        Ammo.destroy(btVertex);
      }

      _finishCollisionShape(hull, options, scale);
      shapes.push(hull);
    }
    Ammo.destroy(ch);
    Ammo.destroy(vhacd);

    return shapes;
  };
})();

const createTriMeshShape = (function() {
  const va = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const vb = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const vc = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  return function(vertices, matrices, indexes, matrixWorld, options = {}) {
    options.type = TYPE.MESH;
    _setOptions(options);

    if (options.fit === FIT.MANUAL) {
      console.warn("cannot use fit: manual with type: mesh");
      return null;
    }

    const scale = _computeScale(matrixWorld, options);

    const bta = new Ammo.btVector3();
    const btb = new Ammo.btVector3();
    const btc = new Ammo.btVector3();
    const triMesh = new Ammo.btTriangleMesh(true, false);

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      const index = indexes[i] ? indexes[i] : null;
      matrix.fromArray(matrices[i]);
      if (index) {
        for (let j = 0; j < index.length; j += 3) {
          const ai = index[j] * 3;
          const bi = index[j + 1] * 3;
          const ci = index[j + 2] * 3;
          va.set(components[ai], components[ai + 1], components[ai + 2]).applyMatrix4(matrix);
          vb.set(components[bi], components[bi + 1], components[bi + 2]).applyMatrix4(matrix);
          vc.set(components[ci], components[ci + 1], components[ci + 2]).applyMatrix4(matrix);
          bta.setValue(va.x, va.y, va.z);
          btb.setValue(vb.x, vb.y, vb.z);
          btc.setValue(vc.x, vc.y, vc.z);
          triMesh.addTriangle(bta, btb, btc, false);
        }
      } else {
        for (let j = 0; j < components.length; j += 9) {
          va.set(components[j + 0], components[j + 1], components[j + 2]).applyMatrix4(matrix);
          vb.set(components[j + 3], components[j + 4], components[j + 5]).applyMatrix4(matrix);
          vc.set(components[j + 6], components[j + 7], components[j + 8]).applyMatrix4(matrix);
          bta.setValue(va.x, va.y, va.z);
          btb.setValue(vb.x, vb.y, vb.z);
          btc.setValue(vc.x, vc.y, vc.z);
          triMesh.addTriangle(bta, btb, btc, false);
        }
      }
    }

    const localScale = new Ammo.btVector3(scale.x, scale.y, scale.z);
    triMesh.setScaling(localScale);
    Ammo.destroy(localScale);

    const collisionShape = new Ammo.btBvhTriangleMeshShape(triMesh, true, true);
    collisionShape.resources = [triMesh];

    Ammo.destroy(bta);
    Ammo.destroy(btb);
    Ammo.destroy(btc);

    _finishCollisionShape(collisionShape, options);
    return collisionShape;
  };
})();

const createHeightfieldTerrainShape = function(options = {}) {
  _setOptions(options);

  if (options.fit === FIT.ALL) {
    console.warn("cannot use fit: all with type: heightfield");
    return null;
  }
  const heightfieldDistance = options.heightfieldDistance || 1;
  const heightfieldData = options.heightfieldData || [];
  const heightScale = options.heightScale || 0;
  const upAxis = options.hasOwnProperty("upAxis") ? options.upAxis : 1; // x = 0; y = 1; z = 2
  const hdt = (() => {
    switch (options.heightDataType) {
      case "short":
        return Ammo.PHY_SHORT;
      case "float":
        return Ammo.PHY_FLOAT;
      default:
        return Ammo.PHY_FLOAT;
    }
  })();
  const flipQuadEdges = options.hasOwnProperty("flipQuadEdges") ? options.flipQuadEdges : true;

  const heightStickLength = heightfieldData.length;
  const heightStickWidth = heightStickLength > 0 ? heightfieldData[0].length : 0;

  const data = Ammo._malloc(heightStickLength * heightStickWidth * 4);
  const ptr = data / 4;

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  let index = 0;
  for (let l = 0; l < heightStickLength; l++) {
    for (let w = 0; w < heightStickWidth; w++) {
      const height = heightfieldData[l][w];
      Ammo.HEAPF32[ptr + index] = height;
      index++;
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }
  }

  const collisionShape = new Ammo.btHeightfieldTerrainShape(
    heightStickWidth,
    heightStickLength,
    data,
    heightScale,
    minHeight,
    maxHeight,
    upAxis,
    hdt,
    flipQuadEdges
  );

  const scale = new Ammo.btVector3(heightfieldDistance, 1, heightfieldDistance);
  collisionShape.setLocalScaling(scale);
  Ammo.destroy(scale);

  collisionShape.heightfieldData = data;

  _finishCollisionShape(collisionShape, options);
  return collisionShape;
};

function _setOptions(options) {
  options.fit = options.hasOwnProperty("fit") ? options.fit : FIT.ALL;
  options.type = options.type || TYPE.HULL;
  options.minHalfExtent = options.hasOwnProperty("minHalfExtent") ? options.minHalfExtent : 0;
  options.maxHalfExtent = options.hasOwnProperty("maxHalfExtent") ? options.maxHalfExtent : Number.POSITIVE_INFINITY;
  options.cylinderAxis = options.cylinderAxis || "y";
  options.margin = options.hasOwnProperty("margin") ? options.margin : 0.01;
  options.includeInvisible = options.hasOwnProperty("includeInvisible") ? options.includeInvisible : false;

  if (!options.offset) {
    options.offset = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  }

  if (!options.orientation) {
    options.orientation = new three__WEBPACK_IMPORTED_MODULE_0__.Quaternion();
  }
}

const _finishCollisionShape = function(collisionShape, options, scale) {
  collisionShape.type = options.type;
  collisionShape.setMargin(options.margin);
  collisionShape.destroy = () => {
    for (let res of collisionShape.resources || []) {
      Ammo.destroy(res);
    }
    if (collisionShape.heightfieldData) {
      Ammo._free(collisionShape.heightfieldData);
    }
    Ammo.destroy(collisionShape);
  };

  const localTransform = new Ammo.btTransform();
  const rotation = new Ammo.btQuaternion();
  localTransform.setIdentity();

  localTransform.getOrigin().setValue(options.offset.x, options.offset.y, options.offset.z);
  rotation.setValue(options.orientation.x, options.orientation.y, options.orientation.z, options.orientation.w);

  localTransform.setRotation(rotation);
  Ammo.destroy(rotation);

  if (scale) {
    const localScale = new Ammo.btVector3(scale.x, scale.y, scale.z);
    collisionShape.setLocalScaling(localScale);
    Ammo.destroy(localScale);
  }

  collisionShape.localTransform = localTransform;
};

const iterateGeometries = (function() {
  const inverse = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  const vertices = [];
  return function(root, options, cb) {
    inverse.copy(root.matrixWorld).invert();
    root.traverse(mesh => {
      const transform = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
      if (
        mesh.isMesh &&
        mesh.name !== "Sky" &&
        (options.includeInvisible || (mesh.el && mesh.el.object3D.visible) || mesh.visible)
      ) {
        if (mesh === root) {
          transform.identity();
        } else {
          mesh.updateWorldMatrix(true);
          transform.multiplyMatrices(inverse, mesh.matrixWorld);
        }
        // todo: might want to return null xform if this is the root so that callers can avoid multiplying
        // things by the identity matrix

        let unInterleavedVertices;
        if (mesh.geometry.isBufferGeometry) {
          const verticesAttribute = mesh.geometry.attributes.position;
          if (verticesAttribute.isInterleavedBufferAttribute) {
            //
            // An interleaved buffer attribute shares the underlying
            // array with other attributes. We translate it to a
            // regular array here to not carry this logic around in
            // the shape api.
            //
            vertices.length = 0;
            for (let i = 0; i < verticesAttribute.count; i += 3) {
              vertices.push(verticesAttribute.getX(i));
              vertices.push(verticesAttribute.getY(i));
              vertices.push(verticesAttribute.getZ(i));
            }
	    unInterleavedVertices = vertices;
          } else {
	    unInterleavedVertices = verticesAttribute.array;
          }
        } else {
          unInterleavedVertices = mesh.geometry.vertices;
        }

        cb(
          unInterleavedVertices,
          transform.elements,
          mesh.geometry.index ? mesh.geometry.index.array : null
        );
      }
    });
  };
})();

const _computeScale = (function() {
  const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  return function(matrixWorld, options = {}) {
    const scale = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3(1, 1, 1);
    if (options.fit === FIT.ALL) {
      matrix.fromArray(matrixWorld);
      scale.setFromMatrixScale(matrix);
    }
    return scale;
  };
})();

const _computeRadius = (function() {
  const center = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  return function(vertices, matrices, bounds) {
    let maxRadiusSq = 0;
    let { x: cx, y: cy, z: cz } = bounds.getCenter(center);

    _iterateVertices(vertices, matrices, v => {
      const dx = cx - v.x;
      const dy = cy - v.y;
      const dz = cz - v.z;
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    });
    return Math.sqrt(maxRadiusSq);
  };
})();

const _computeHalfExtents = function(bounds, minHalfExtent, maxHalfExtent) {
  const halfExtents = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  return halfExtents
    .subVectors(bounds.max, bounds.min)
    .multiplyScalar(0.5)
    .clampScalar(minHalfExtent, maxHalfExtent);
};

const _computeLocalOffset = function(matrix, bounds, target) {
  target
    .addVectors(bounds.max, bounds.min)
    .multiplyScalar(0.5)
    .applyMatrix4(matrix);
  return target;
};

// returns the bounding box for the geometries underneath `root`.
const _computeBounds = function(vertices, matrices) {
  const bounds = new three__WEBPACK_IMPORTED_MODULE_0__.Box3();
  let minX = +Infinity;
  let minY = +Infinity;
  let minZ = +Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  bounds.min.set(0, 0, 0);
  bounds.max.set(0, 0, 0);

  _iterateVertices(vertices, matrices, v => {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  });

  bounds.min.set(minX, minY, minZ);
  bounds.max.set(maxX, maxY, maxZ);
  return bounds;
};

const _iterateVertices = (function() {
  const vertex = new three__WEBPACK_IMPORTED_MODULE_0__.Vector3();
  const matrix = new three__WEBPACK_IMPORTED_MODULE_0__.Matrix4();
  return function(vertices, matrices, cb) {
    for (let i = 0; i < vertices.length; i++) {
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < vertices[i].length; j += 3) {
        vertex.set(vertices[i][j], vertices[i][j + 1], vertices[i][j + 2]).applyMatrix4(matrix);
        cb(vertex);
      }
    }
  };
})();


/***/ }),

/***/ "./src/components/ammo-constraint.js":
/*!*******************************************!*\
  !*** ./src/components/ammo-constraint.js ***!
  \*******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* global Ammo */
const CONSTRAINT = (__webpack_require__(/*! ../constants */ "./src/constants.js").CONSTRAINT);

module.exports = AFRAME.registerComponent("ammo-constraint", {
  multiple: true,

  schema: {
    // Type of constraint.
    type: {
      default: CONSTRAINT.LOCK,
      oneOf: [
        CONSTRAINT.LOCK,
        CONSTRAINT.FIXED,
        CONSTRAINT.SPRING,
        CONSTRAINT.SLIDER,
        CONSTRAINT.HINGE,
        CONSTRAINT.CONE_TWIST,
        CONSTRAINT.POINT_TO_POINT
      ]
    },

    // Target (other) body for the constraint.
    target: { type: "selector" },

    // Offset of the hinge or point-to-point constraint, defined locally in the body. Used for hinge, coneTwist pointToPoint constraints.
    pivot: { type: "vec3" },
    targetPivot: { type: "vec3" },

    // An axis that each body can rotate around, defined locally to that body. Used for hinge constraints.
    axis: { type: "vec3", default: { x: 0, y: 0, z: 1 } },
    targetAxis: { type: "vec3", default: { x: 0, y: 0, z: 1 } },

    // damping & stuffness - used for spring contraints only
    damping: { type: "number", default: 1 },
    stiffness: { type: "number", default: 100 },
  },

  init: function() {
    this.system = this.el.sceneEl.systems.physics;
    this.constraint = null;
  },

  remove: function() {
    if (!this.constraint) return;

    this.system.removeConstraint(this.constraint);
    this.constraint = null;
  },

  update: function() {
    const el = this.el,
      data = this.data;

    this.remove();

    if (!el.body || !data.target.body) {
      (el.body ? data.target : el).addEventListener("body-loaded", this.update.bind(this, {}), { once: true });
      return;
    }

    this.constraint = this.createConstraint();
    this.system.addConstraint(this.constraint);
  },

  /**
   * @return {Ammo.btTypedConstraint}
   */
  createConstraint: function() {
    let constraint;
    const data = this.data,
      body = this.el.body,
      targetBody = data.target.body;

    const bodyTransform = body
      .getCenterOfMassTransform()
      .inverse()
      .op_mul(targetBody.getWorldTransform());
    const targetTransform = new Ammo.btTransform();
    targetTransform.setIdentity();

    switch (data.type) {
      case CONSTRAINT.LOCK: {
        constraint = new Ammo.btGeneric6DofConstraint(body, targetBody, bodyTransform, targetTransform, true);
        const zero = new Ammo.btVector3(0, 0, 0);
        //TODO: allow these to be configurable
        constraint.setLinearLowerLimit(zero);
        constraint.setLinearUpperLimit(zero);
        constraint.setAngularLowerLimit(zero);
        constraint.setAngularUpperLimit(zero);
        Ammo.destroy(zero);
        break;
      }
      //TODO: test and verify all other constraint types
      case CONSTRAINT.FIXED: {
        //btFixedConstraint does not seem to debug render
        bodyTransform.setRotation(body.getWorldTransform().getRotation());
        targetTransform.setRotation(targetBody.getWorldTransform().getRotation());
        constraint = new Ammo.btFixedConstraint(body, targetBody, bodyTransform, targetTransform);
        break;
      }
      case CONSTRAINT.SPRING: {
        constraint = new Ammo.btGeneric6DofSpringConstraint(body, targetBody, bodyTransform, targetTransform, true);

        // Very limited initial implementation of spring constraint.
        // See: https://github.com/n5ro/aframe-physics-system/issues/171
        for (var i in [0,1,2,3,4,5]) {
          constraint.enableSpring(1, true)
          constraint.setStiffness(1, this.data.stiffness)
          constraint.setDamping(1, this.data.damping)
        }
        const upper = new Ammo.btVector3(-1, -1, -1);
        const lower = new Ammo.btVector3(1, 1, 1);
        constraint.setLinearUpperLimit(upper);
        constraint.setLinearLowerLimit(lower)
        Ammo.destroy(upper);
        Ammo.destroy(lower);
        break;
      }
      case CONSTRAINT.SLIDER: {
        //TODO: support setting linear and angular limits
        constraint = new Ammo.btSliderConstraint(body, targetBody, bodyTransform, targetTransform, true);
        constraint.setLowerLinLimit(-1);
        constraint.setUpperLinLimit(1);
        // constraint.setLowerAngLimit();
        // constraint.setUpperAngLimit();
        break;
      }
      case CONSTRAINT.HINGE: {
        const pivot = new Ammo.btVector3(data.pivot.x, data.pivot.y, data.pivot.z);
        const targetPivot = new Ammo.btVector3(data.targetPivot.x, data.targetPivot.y, data.targetPivot.z);

        const axis = new Ammo.btVector3(data.axis.x, data.axis.y, data.axis.z);
        const targetAxis = new Ammo.btVector3(data.targetAxis.x, data.targetAxis.y, data.targetAxis.z);

        constraint = new Ammo.btHingeConstraint(body, targetBody, pivot, targetPivot, axis, targetAxis, true);

        Ammo.destroy(pivot);
        Ammo.destroy(targetPivot);
        Ammo.destroy(axis);
        Ammo.destroy(targetAxis);
        break;
      }
      case CONSTRAINT.CONE_TWIST: {
        const pivotTransform = new Ammo.btTransform();
        pivotTransform.setIdentity();
        pivotTransform.getOrigin().setValue(data.pivot.x, data.pivot.y, data.pivot.z);
        const targetPivotTransform = new Ammo.btTransform();
        targetPivotTransform.setIdentity();
        targetPivotTransform.getOrigin().setValue(data.targetPivot.x, data.targetPivot.y, data.targetPivot.z);
        constraint = new Ammo.btConeTwistConstraint(body, targetBody, pivotTransform, targetPivotTransform);
        Ammo.destroy(pivotTransform);
        Ammo.destroy(targetPivotTransform);
        break;
      }
      case CONSTRAINT.POINT_TO_POINT: {
        const pivot = new Ammo.btVector3(data.pivot.x, data.pivot.y, data.pivot.z);
        const targetPivot = new Ammo.btVector3(data.targetPivot.x, data.targetPivot.y, data.targetPivot.z);

        constraint = new Ammo.btPoint2PointConstraint(body, targetBody, pivot, targetPivot);

        Ammo.destroy(pivot);
        Ammo.destroy(targetPivot);
        break;
      }
      default:
        throw new Error("[constraint] Unexpected type: " + data.type);
    }

    Ammo.destroy(targetTransform);

    return constraint;
  }
});


/***/ }),

/***/ "./src/components/body/ammo-body.js":
/*!******************************************!*\
  !*** ./src/components/body/ammo-body.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* global Ammo,THREE */
const AmmoDebugDrawer = __webpack_require__(/*! ammo-debug-drawer */ "./node_modules/ammo-debug-drawer/AmmoDebugDrawer.js");
const threeToAmmo = __webpack_require__(/*! three-to-ammo */ "./node_modules/three-to-ammo/index.js");
const CONSTANTS = __webpack_require__(/*! ../../constants */ "./src/constants.js"),
  ACTIVATION_STATE = CONSTANTS.ACTIVATION_STATE,
  COLLISION_FLAG = CONSTANTS.COLLISION_FLAG,
  SHAPE = CONSTANTS.SHAPE,
  TYPE = CONSTANTS.TYPE,
  FIT = CONSTANTS.FIT;

const ACTIVATION_STATES = [
  ACTIVATION_STATE.ACTIVE_TAG,
  ACTIVATION_STATE.ISLAND_SLEEPING,
  ACTIVATION_STATE.WANTS_DEACTIVATION,
  ACTIVATION_STATE.DISABLE_DEACTIVATION,
  ACTIVATION_STATE.DISABLE_SIMULATION
];

const RIGID_BODY_FLAGS = {
  NONE: 0,
  DISABLE_WORLD_GRAVITY: 1
};

function almostEqualsVector3(epsilon, u, v) {
  return Math.abs(u.x - v.x) < epsilon && Math.abs(u.y - v.y) < epsilon && Math.abs(u.z - v.z) < epsilon;
}

function almostEqualsBtVector3(epsilon, u, v) {
  return Math.abs(u.x() - v.x()) < epsilon && Math.abs(u.y() - v.y()) < epsilon && Math.abs(u.z() - v.z()) < epsilon;
}

function almostEqualsQuaternion(epsilon, u, v) {
  return (
    (Math.abs(u.x - v.x) < epsilon &&
      Math.abs(u.y - v.y) < epsilon &&
      Math.abs(u.z - v.z) < epsilon &&
      Math.abs(u.w - v.w) < epsilon) ||
    (Math.abs(u.x + v.x) < epsilon &&
      Math.abs(u.y + v.y) < epsilon &&
      Math.abs(u.z + v.z) < epsilon &&
      Math.abs(u.w + v.w) < epsilon)
  );
}

let AmmoBody = {
  schema: {
    loadedEvent: { default: "" },
    mass: { default: 1 },
    gravity: { type: "vec3", default: null },
    linearDamping: { default: 0.01 },
    angularDamping: { default: 0.01 },
    linearSleepingThreshold: { default: 1.6 },
    angularSleepingThreshold: { default: 2.5 },
    angularFactor: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    activationState: {
      default: ACTIVATION_STATE.ACTIVE_TAG,
      oneOf: ACTIVATION_STATES
    },
    type: { default: "dynamic", oneOf: [TYPE.STATIC, TYPE.DYNAMIC, TYPE.KINEMATIC] },
    emitCollisionEvents: { default: false },
    disableCollision: { default: false },
    collisionFilterGroup: { default: 1 }, //32-bit mask,
    collisionFilterMask: { default: 1 }, //32-bit mask
    scaleAutoUpdate: { default: true },
    restitution: {default: 0} // does not support updates
  },

  /**
   * Initializes a body component, assigning it to the physics system and binding listeners for
   * parsing the elements geometry.
   */
  init: function() {
    this.system = this.el.sceneEl.systems.physics;
    this.shapeComponents = [];

    if (this.data.loadedEvent === "") {
      this.loadedEventFired = true;
    } else {
      this.el.addEventListener(
        this.data.loadedEvent,
        () => {
          this.loadedEventFired = true;
        },
        { once: true }
      );
    }

    if (this.system.initialized && this.loadedEventFired) {
      this.initBody();
    }
  },

  /**
   * Parses an element's geometry and component metadata to create an Ammo body instance for the
   * component.
   */
  initBody: (function() {
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const boundingBox = new THREE.Box3();

    return function() {
      const el = this.el,
        data = this.data;
      const clamp = (num, min, max) => Math.min(Math.max(num, min), max)

      this.localScaling = new Ammo.btVector3();

      const obj = this.el.object3D;
      obj.getWorldPosition(pos);
      obj.getWorldQuaternion(quat);

      this.prevScale = new THREE.Vector3(1, 1, 1);
      this.prevNumChildShapes = 0;

      this.msTransform = new Ammo.btTransform();
      this.msTransform.setIdentity();
      this.rotation = new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w);

      this.msTransform.getOrigin().setValue(pos.x, pos.y, pos.z);
      this.msTransform.setRotation(this.rotation);

      this.motionState = new Ammo.btDefaultMotionState(this.msTransform);

      this.localInertia = new Ammo.btVector3(0, 0, 0);

      this.compoundShape = new Ammo.btCompoundShape(true);

      this.rbInfo = new Ammo.btRigidBodyConstructionInfo(
        data.mass,
        this.motionState,
        this.compoundShape,
        this.localInertia
      );
      this.rbInfo.m_restitution = clamp(this.data.restitution, 0, 1);
      this.body = new Ammo.btRigidBody(this.rbInfo);
      this.body.setActivationState(ACTIVATION_STATES.indexOf(data.activationState) + 1);
      this.body.setSleepingThresholds(data.linearSleepingThreshold, data.angularSleepingThreshold);

      this.body.setDamping(data.linearDamping, data.angularDamping);

      const angularFactor = new Ammo.btVector3(data.angularFactor.x, data.angularFactor.y, data.angularFactor.z);
      this.body.setAngularFactor(angularFactor);
      Ammo.destroy(angularFactor);

      this._updateBodyGravity(data.gravity)

      this.updateCollisionFlags();

      this.el.body = this.body;
      this.body.el = el;

      this.isLoaded = true;

      this.el.emit("body-loaded", { body: this.el.body });

      this._addToSystem();
    };
  })(),

  tick: function() {
    if (this.system.initialized && !this.isLoaded && this.loadedEventFired) {
      this.initBody();
    }
  },

  _updateBodyGravity(gravity) {

    if (gravity.x !== undefined &&
        gravity.y !== undefined &&
        gravity.z !== undefined) {
      const gravityBtVec = new Ammo.btVector3(gravity.x, gravity.y, gravity.z);
      if (!almostEqualsBtVector3(0.001, gravityBtVec, this.system.driver.physicsWorld.getGravity())) {
        this.body.setFlags(RIGID_BODY_FLAGS.DISABLE_WORLD_GRAVITY);
      } else {
        this.body.setFlags(RIGID_BODY_FLAGS.NONE);
      }
      this.body.setGravity(gravityBtVec);
      Ammo.destroy(gravityBtVec);
    }
    else {
      // no per-body gravity specified - just use world gravity
      this.body.setFlags(RIGID_BODY_FLAGS.NONE);
    }
  },

  _updateShapes: (function() {
    const needsPolyhedralInitialization = [SHAPE.HULL, SHAPE.HACD, SHAPE.VHACD];
    return function() {
      let updated = false;

      const obj = this.el.object3D;
      if (this.data.scaleAutoUpdate && this.prevScale && !almostEqualsVector3(0.001, obj.scale, this.prevScale)) {
        this.prevScale.copy(obj.scale);
        updated = true;

        this.localScaling.setValue(this.prevScale.x, this.prevScale.y, this.prevScale.z);
        this.compoundShape.setLocalScaling(this.localScaling);
      }

      if (this.shapeComponentsChanged) {
        this.shapeComponentsChanged = false;
        updated = true;
        for (let i = 0; i < this.shapeComponents.length; i++) {
          const shapeComponent = this.shapeComponents[i];
          if (shapeComponent.getShapes().length === 0) {
            this._createCollisionShape(shapeComponent);
          }
          const collisionShapes = shapeComponent.getShapes();
          for (let j = 0; j < collisionShapes.length; j++) {
            const collisionShape = collisionShapes[j];
            if (!collisionShape.added) {
              this.compoundShape.addChildShape(collisionShape.localTransform, collisionShape);
              collisionShape.added = true;
            }
          }
        }

        if (this.data.type === TYPE.DYNAMIC) {
          this.updateMass();
        }

        this.system.driver.updateBody(this.body);
      }

      //call initializePolyhedralFeatures for hull shapes if debug is turned on and/or scale changes
      if (this.system.debug && (updated || !this.polyHedralFeaturesInitialized)) {
        for (let i = 0; i < this.shapeComponents.length; i++) {
          const collisionShapes = this.shapeComponents[i].getShapes();
          for (let j = 0; j < collisionShapes.length; j++) {
            const collisionShape = collisionShapes[j];
            if (needsPolyhedralInitialization.indexOf(collisionShape.type) !== -1) {
              collisionShape.initializePolyhedralFeatures(0);
            }
          }
        }
        this.polyHedralFeaturesInitialized = true;
      }
    };
  })(),

  _createCollisionShape: function(shapeComponent) {
    const data = shapeComponent.data;
    const vertices = [];
    const matrices = [];
    const indexes = [];

    const root = shapeComponent.el.object3D;
    const matrixWorld = root.matrixWorld;

    threeToAmmo.iterateGeometries(root, data, (vertexArray, matrixArray, indexArray) => {
      vertices.push(vertexArray);
      matrices.push(matrixArray);
      indexes.push(indexArray);
    });

    const collisionShapes = threeToAmmo.createCollisionShapes(vertices, matrices, indexes, matrixWorld.elements, data);
    shapeComponent.addShapes(collisionShapes);
    return;
  },

  /**
   * Registers the component with the physics system.
   */
  play: function() {
    if (this.isLoaded) {
      this._addToSystem();
    }
  },

  _addToSystem: function() {
    if (!this.addedToSystem) {
      this.system.addBody(this.body, this.data.collisionFilterGroup, this.data.collisionFilterMask);

      if (this.data.emitCollisionEvents) {
        this.system.driver.addEventListener(this.body);
      }

      this.system.addComponent(this);
      this.addedToSystem = true;
    }
  },

  /**
   * Unregisters the component with the physics system.
   */
  pause: function() {
    if (this.addedToSystem) {
      this.system.removeComponent(this);
      this.system.removeBody(this.body);
      this.addedToSystem = false;
    }
  },

  /**
   * Updates the rigid body instance, where possible.
   */
  update: function(prevData) {
    if (this.isLoaded) {
      if (!this.hasUpdated) {
        //skip the first update
        this.hasUpdated = true;
        return;
      }

      const data = this.data;

      if (prevData.type !== data.type || prevData.disableCollision !== data.disableCollision) {
        this.updateCollisionFlags();
      }

      if (prevData.activationState !== data.activationState) {
        this.body.forceActivationState(ACTIVATION_STATES.indexOf(data.activationState) + 1);
        if (data.activationState === ACTIVATION_STATE.ACTIVE_TAG) {
          this.body.activate(true);
        }
      }

      if (
        prevData.collisionFilterGroup !== data.collisionFilterGroup ||
        prevData.collisionFilterMask !== data.collisionFilterMask
      ) {
        const broadphaseProxy = this.body.getBroadphaseProxy();
        broadphaseProxy.set_m_collisionFilterGroup(data.collisionFilterGroup);
        broadphaseProxy.set_m_collisionFilterMask(data.collisionFilterMask);
        this.system.driver.broadphase
          .getOverlappingPairCache()
          .removeOverlappingPairsContainingProxy(broadphaseProxy, this.system.driver.dispatcher);
      }

      if (prevData.linearDamping != data.linearDamping || prevData.angularDamping != data.angularDamping) {
        this.body.setDamping(data.linearDamping, data.angularDamping);
      }

      if (!almostEqualsVector3(0.001, prevData.gravity, data.gravity)) {
        this._updateBodyGravity(data.gravity)
      }

      if (
        prevData.linearSleepingThreshold != data.linearSleepingThreshold ||
        prevData.angularSleepingThreshold != data.angularSleepingThreshold
      ) {
        this.body.setSleepingThresholds(data.linearSleepingThreshold, data.angularSleepingThreshold);
      }

      if (!almostEqualsVector3(0.001, prevData.angularFactor, data.angularFactor)) {
        const angularFactor = new Ammo.btVector3(data.angularFactor.x, data.angularFactor.y, data.angularFactor.z);
        this.body.setAngularFactor(angularFactor);
        Ammo.destroy(angularFactor);
      }

      if (prevData.restitution != data.restitution ) {
        console.warn("ammo-body restitution cannot be updated from its initial value.")
      }

      //TODO: support dynamic update for other properties
    }
  },

  /**
   * Removes the component and all physics and scene side effects.
   */
  remove: function() {
    if (this.triMesh) Ammo.destroy(this.triMesh);
    if (this.localScaling) Ammo.destroy(this.localScaling);
    if (this.compoundShape) Ammo.destroy(this.compoundShape);
    if (this.body) {
      Ammo.destroy(this.body);
      delete this.body;
    }
    Ammo.destroy(this.rbInfo);
    Ammo.destroy(this.msTransform);
    Ammo.destroy(this.motionState);
    Ammo.destroy(this.localInertia);
    Ammo.destroy(this.rotation);
  },

  beforeStep: function() {
    this._updateShapes();
    // Note that since static objects don't move,
    // we don't sync them to physics on a routine basis.
    if (this.data.type === TYPE.KINEMATIC) {
      this.syncToPhysics();
    }
  },

  step: function() {
    if (this.data.type === TYPE.DYNAMIC) {
      this.syncFromPhysics();
    }
  },

  /**
   * Updates the rigid body's position, velocity, and rotation, based on the scene.
   */
  syncToPhysics: (function() {
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const q2 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    return function() {
      const el = this.el,
        parentEl = el.parentEl,
        body = this.body;

      if (!body) return;

      this.motionState.getWorldTransform(this.msTransform);

      if (parentEl.isScene) {
        v.copy(el.object3D.position);
        q.copy(el.object3D.quaternion);
      } else {
        el.object3D.getWorldPosition(v);
        el.object3D.getWorldQuaternion(q);
      }

      const position = this.msTransform.getOrigin();
      v2.set(position.x(), position.y(), position.z());

      const quaternion = this.msTransform.getRotation();
      q2.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());

      if (!almostEqualsVector3(0.001, v, v2) || !almostEqualsQuaternion(0.001, q, q2)) {
        if (!this.body.isActive()) {
          this.body.activate(true);
        }
        this.msTransform.getOrigin().setValue(v.x, v.y, v.z);
        this.rotation.setValue(q.x, q.y, q.z, q.w);
        this.msTransform.setRotation(this.rotation);
        this.motionState.setWorldTransform(this.msTransform);

        if (this.data.type !== TYPE.KINEMATIC) {
          this.body.setCenterOfMassTransform(this.msTransform);
        }
      }
    };
  })(),

  /**
   * Updates the scene object's position and rotation, based on the physics simulation.
   */
  syncFromPhysics: (function() {
    const v = new THREE.Vector3(),
      q1 = new THREE.Quaternion(),
      q2 = new THREE.Quaternion();
    return function() {
      this.motionState.getWorldTransform(this.msTransform);
      const position = this.msTransform.getOrigin();
      const quaternion = this.msTransform.getRotation();

      const el = this.el,
        body = this.body;

      // For the parent, prefer to use the THHREE.js scene graph parent (if it can be determined)
      // and only use the HTML scene graph parent as a fallback.
      // Usually these are the same, but there are various cases where it's useful to modify the THREE.js
      // scene graph so that it deviates from the HTML.
      // In these cases the THREE.js scene graph should be considered the definitive reference in terms
      // of object positioning etc.
      // For specific examples, and more discussion, see:
      // https://github.com/c-frame/aframe-physics-system/pull/1#issuecomment-1264686433
      const parentEl = el.object3D.parent.el ? el.object3D.parent.el : el.parentEl;

      if (!body) return;
      if (!parentEl) return;

      if (parentEl.isScene) {
        el.object3D.position.set(position.x(), position.y(), position.z());
        el.object3D.quaternion.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
      } else {
        q1.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
        parentEl.object3D.getWorldQuaternion(q2);
        q1.multiply(q2.invert());
        el.object3D.quaternion.copy(q1);

        v.set(position.x(), position.y(), position.z());
        parentEl.object3D.worldToLocal(v);
        el.object3D.position.copy(v);
      }
    };
  })(),

  addShapeComponent: function(shapeComponent) {
    if (shapeComponent.data.type === SHAPE.MESH && this.data.type !== TYPE.STATIC) {
      console.warn("non-static mesh colliders not supported");
      return;
    }

    this.shapeComponents.push(shapeComponent);
    this.shapeComponentsChanged = true;
  },

  removeShapeComponent: function(shapeComponent) {
    const index = this.shapeComponents.indexOf(shapeComponent);
    if (this.compoundShape && index !== -1 && this.body) {
      const shapes = shapeComponent.getShapes();
      for (var i = 0; i < shapes.length; i++) {
        this.compoundShape.removeChildShape(shapes[i]);
      }
      this.shapeComponentsChanged = true;
      this.shapeComponents.splice(index, 1);
    }
  },

  updateMass: function() {
    const shape = this.body.getCollisionShape();
    const mass = this.data.type === TYPE.DYNAMIC ? this.data.mass : 0;
    shape.calculateLocalInertia(mass, this.localInertia);
    this.body.setMassProps(mass, this.localInertia);
    this.body.updateInertiaTensor();
  },

  updateCollisionFlags: function() {
    let flags = this.data.disableCollision ? 4 : 0;
    switch (this.data.type) {
      case TYPE.STATIC:
        flags |= COLLISION_FLAG.STATIC_OBJECT;
        break;
      case TYPE.KINEMATIC:
        flags |= COLLISION_FLAG.KINEMATIC_OBJECT;
        break;
      default:
        this.body.applyGravity();
        break;
    }
    this.body.setCollisionFlags(flags);

    this.updateMass();

    // TODO: enable CCD if dynamic?
    // this.body.setCcdMotionThreshold(0.001);
    // this.body.setCcdSweptSphereRadius(0.001);

    this.system.driver.updateBody(this.body);
  },

  getVelocity: function() {
    return this.body.getLinearVelocity();
  }
};

module.exports.definition = AmmoBody;
module.exports.Component = AFRAME.registerComponent("ammo-body", AmmoBody);


/***/ }),

/***/ "./src/components/math/index.js":
/*!**************************************!*\
  !*** ./src/components/math/index.js ***!
  \**************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = {
  'velocity':   __webpack_require__(/*! ./velocity */ "./src/components/math/velocity.js"),

  registerAll: function (AFRAME) {
    if (this._registered) return;

    AFRAME = AFRAME || window.AFRAME;

    if (!AFRAME.components['velocity'])    AFRAME.registerComponent('velocity',   this.velocity);

    this._registered = true;
  }
};


/***/ }),

/***/ "./src/components/math/velocity.js":
/*!*****************************************!*\
  !*** ./src/components/math/velocity.js ***!
  \*****************************************/
/***/ ((module) => {

/**
 * Velocity, in m/s.
 */
module.exports = AFRAME.registerComponent('velocity', {
  schema: {type: 'vec3'},

  init: function () {
    this.system = this.el.sceneEl.systems.physics;

    if (this.system) {
      this.system.addComponent(this);
    }
  },

  remove: function () {
    if (this.system) {
      this.system.removeComponent(this);
    }
  },

  tick: function (t, dt) {
    if (!dt) return;
    if (this.system) return;
    this.afterStep(t, dt);
  },

  afterStep: function (t, dt) {
    if (!dt) return;

    var physics = this.el.sceneEl.systems.physics || {data: {maxInterval: 1 / 60}},

    // TODO - There's definitely a bug with getComputedAttribute and el.data.
    velocity = this.el.getAttribute('velocity') || {x: 0, y: 0, z: 0},
    position = this.el.object3D.position || {x: 0, y: 0, z: 0};

    dt = Math.min(dt, physics.data.maxInterval * 1000);

    this.el.object3D.position.set(
      position.x + velocity.x * dt / 1000,
      position.y + velocity.y * dt / 1000,
      position.z + velocity.z * dt / 1000
    );
  }
});


/***/ }),

/***/ "./src/components/shape/ammo-shape.js":
/*!********************************************!*\
  !*** ./src/components/shape/ammo-shape.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* global Ammo,THREE */
const threeToAmmo = __webpack_require__(/*! three-to-ammo */ "./node_modules/three-to-ammo/index.js");
const CONSTANTS = __webpack_require__(/*! ../../constants */ "./src/constants.js"),
  SHAPE = CONSTANTS.SHAPE,
  FIT = CONSTANTS.FIT;

var AmmoShape = {
  schema: {
    type: {
      default: SHAPE.HULL,
      oneOf: [
        SHAPE.BOX,
        SHAPE.CYLINDER,
        SHAPE.SPHERE,
        SHAPE.CAPSULE,
        SHAPE.CONE,
        SHAPE.HULL,
        SHAPE.HACD,
        SHAPE.VHACD,
        SHAPE.MESH,
        SHAPE.HEIGHTFIELD
      ]
    },
    fit: { default: FIT.ALL, oneOf: [FIT.ALL, FIT.MANUAL] },
    halfExtents: { type: "vec3", default: { x: 1, y: 1, z: 1 } },
    minHalfExtent: { default: 0 },
    maxHalfExtent: { default: Number.POSITIVE_INFINITY },
    sphereRadius: { default: NaN },
    cylinderAxis: { default: "y", oneOf: ["x", "y", "z"] },
    margin: { default: 0.01 },
    offset: { type: "vec3", default: { x: 0, y: 0, z: 0 } },
    orientation: { type: "vec4", default: { x: 0, y: 0, z: 0, w: 1 } },
    heightfieldData: { default: [] },
    heightfieldDistance: { default: 1 },
    includeInvisible: { default: false }
  },

  multiple: true,

  init: function() {
    if (this.data.fit !== FIT.MANUAL) {
      if (this.el.object3DMap.mesh) {
	this.mesh = this.el.object3DMap.mesh;
      } else {
	const self = this;
	this.el.addEventListener("object3dset", function (e) {
	  if (e.detail.type === "mesh") {
	    self.init();
	  }
	});
	console.log("Cannot use FIT.ALL without object3DMap.mesh. Waiting for it to be set.");
        return;
      }
    }

    this.system = this.el.sceneEl.systems.physics;
    this.collisionShapes = [];

    let bodyEl = this.el;
    this.body = bodyEl.components["ammo-body"] || null;
    while (!this.body && bodyEl.parentNode != this.el.sceneEl) {
      bodyEl = bodyEl.parentNode;
      if (bodyEl.components["ammo-body"]) {
        this.body = bodyEl.components["ammo-body"];
      }
    }
    if (!this.body) {
      console.warn("body not found");
      return;
    }
    this.body.addShapeComponent(this);
  },

  getMesh: function() {
    return this.mesh || null;
  },

  addShapes: function(collisionShapes) {
    this.collisionShapes = collisionShapes;
  },

  getShapes: function() {
    return this.collisionShapes;
  },

  remove: function() {
    if (!this.body) {
      return;
    }

    this.body.removeShapeComponent(this);

    while (this.collisionShapes.length > 0) {
      const collisionShape = this.collisionShapes.pop();
      collisionShape.destroy();
      Ammo.destroy(collisionShape.localTransform);
    }
  }
};

module.exports.definition = AmmoShape;
module.exports.Component = AFRAME.registerComponent("ammo-shape", AmmoShape);


/***/ }),

/***/ "./src/constants.js":
/*!**************************!*\
  !*** ./src/constants.js ***!
  \**************************/
/***/ ((module) => {

module.exports = {
  GRAVITY: -9.8,
  MAX_INTERVAL: 4 / 60,
  ITERATIONS: 10,
  CONTACT_MATERIAL: {
    friction: 0.01,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3,
    frictionEquationStiffness: 1e8,
    frictionEquationRegularization: 3
  },
  ACTIVATION_STATE: {
    ACTIVE_TAG: "active",
    ISLAND_SLEEPING: "islandSleeping",
    WANTS_DEACTIVATION: "wantsDeactivation",
    DISABLE_DEACTIVATION: "disableDeactivation",
    DISABLE_SIMULATION: "disableSimulation"
  },
  COLLISION_FLAG: {
    STATIC_OBJECT: 1,
    KINEMATIC_OBJECT: 2,
    NO_CONTACT_RESPONSE: 4,
    CUSTOM_MATERIAL_CALLBACK: 8, //this allows per-triangle material (friction/restitution)
    CHARACTER_OBJECT: 16,
    DISABLE_VISUALIZE_OBJECT: 32, //disable debug drawing
    DISABLE_SPU_COLLISION_PROCESSING: 64 //disable parallel/SPU processing
  },
  TYPE: {
    STATIC: "static",
    DYNAMIC: "dynamic",
    KINEMATIC: "kinematic"
  },
  SHAPE: {
    BOX: "box",
    CYLINDER: "cylinder",
    SPHERE: "sphere",
    CAPSULE: "capsule",
    CONE: "cone",
    HULL: "hull",
    HACD: "hacd",
    VHACD: "vhacd",
    MESH: "mesh",
    HEIGHTFIELD: "heightfield"
  },
  FIT: {
    ALL: "all",
    MANUAL: "manual"
  },
  CONSTRAINT: {
    LOCK: "lock",
    FIXED: "fixed",
    SPRING: "spring",
    SLIDER: "slider",
    HINGE: "hinge",
    CONE_TWIST: "coneTwist",
    POINT_TO_POINT: "pointToPoint"
  }
};


/***/ }),

/***/ "./src/drivers/ammo-driver.js":
/*!************************************!*\
  !*** ./src/drivers/ammo-driver.js ***!
  \************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* global THREE */
const Driver = __webpack_require__(/*! ./driver */ "./src/drivers/driver.js");

if (typeof window !== 'undefined') {
  window.AmmoModule = window.Ammo;
  window.Ammo = null;
}

const EPS = 10e-6;

function AmmoDriver() {
  this.collisionConfiguration = null;
  this.dispatcher = null;
  this.broadphase = null;
  this.solver = null;
  this.physicsWorld = null;
  this.debugDrawer = null;

  this.els = new Map();
  this.eventListeners = [];
  this.collisions = new Map();
  this.collisionKeys = [];
  this.currentCollisions = new Map();
}

AmmoDriver.prototype = new Driver();
AmmoDriver.prototype.constructor = AmmoDriver;

module.exports = AmmoDriver;

/* @param {object} worldConfig */
AmmoDriver.prototype.init = function(worldConfig) {
  //Emscripten doesn't use real promises, just a .then() callback, so it necessary to wrap in a real promise.
  return new Promise(resolve => {
    AmmoModule().then(result => {
      Ammo = result;
      this.epsilon = worldConfig.epsilon || EPS;
      this.debugDrawMode = worldConfig.debugDrawMode || THREE.AmmoDebugConstants.NoDebug;
      this.maxSubSteps = worldConfig.maxSubSteps || 4;
      this.fixedTimeStep = worldConfig.fixedTimeStep || 1 / 60;
      this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
      this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration);
      this.broadphase = new Ammo.btDbvtBroadphase();
      this.solver = new Ammo.btSequentialImpulseConstraintSolver();
      this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        this.dispatcher,
        this.broadphase,
        this.solver,
        this.collisionConfiguration
      );
      this.physicsWorld.setForceUpdateAllAabbs(false);
      this.physicsWorld.setGravity(
        new Ammo.btVector3(0, worldConfig.hasOwnProperty("gravity") ? worldConfig.gravity : -9.8, 0)
      );
      this.physicsWorld.getSolverInfo().set_m_numIterations(worldConfig.solverIterations);
      resolve();
    });
  });
};

/* @param {Ammo.btCollisionObject} body */
AmmoDriver.prototype.addBody = function(body, group, mask) {
  this.physicsWorld.addRigidBody(body, group, mask);
  const bodyptr = Ammo.getPointer(body);
  this.els.set(bodyptr, body.el);
  this.collisions.set(bodyptr, []);
  this.collisionKeys.push(bodyptr);
  this.currentCollisions.set(bodyptr, new Set());
};

/* @param {Ammo.btCollisionObject} body */
AmmoDriver.prototype.removeBody = function(body) {
  this.physicsWorld.removeRigidBody(body);
  this.removeEventListener(body);
  const bodyptr = Ammo.getPointer(body);
  this.els.delete(bodyptr);
  this.collisions.delete(bodyptr);
  this.collisionKeys.splice(this.collisionKeys.indexOf(bodyptr), 1);
  this.currentCollisions.delete(bodyptr);
};

AmmoDriver.prototype.updateBody = function(body) {
  if (this.els.has(Ammo.getPointer(body))) {
    this.physicsWorld.updateSingleAabb(body);
  }
};

/* @param {number} deltaTime */
AmmoDriver.prototype.step = function(deltaTime) {
  this.physicsWorld.stepSimulation(deltaTime, this.maxSubSteps, this.fixedTimeStep);

  const numManifolds = this.dispatcher.getNumManifolds();
  for (let i = 0; i < numManifolds; i++) {
    const persistentManifold = this.dispatcher.getManifoldByIndexInternal(i);
    const numContacts = persistentManifold.getNumContacts();
    const body0ptr = Ammo.getPointer(persistentManifold.getBody0());
    const body1ptr = Ammo.getPointer(persistentManifold.getBody1());
    let collided = false;

    for (let j = 0; j < numContacts; j++) {
      const manifoldPoint = persistentManifold.getContactPoint(j);
      const distance = manifoldPoint.getDistance();
      if (distance <= this.epsilon) {
        collided = true;
        break;
      }
    }

    if (collided) {
      if (this.collisions.get(body0ptr).indexOf(body1ptr) === -1) {
        this.collisions.get(body0ptr).push(body1ptr);
        if (this.eventListeners.indexOf(body0ptr) !== -1) {
          this.els.get(body0ptr).emit("collidestart", { targetEl: this.els.get(body1ptr) });
        }
        if (this.eventListeners.indexOf(body1ptr) !== -1) {
          this.els.get(body1ptr).emit("collidestart", { targetEl: this.els.get(body0ptr) });
        }
      }
      this.currentCollisions.get(body0ptr).add(body1ptr);
    }
  }

  for (let i = 0; i < this.collisionKeys.length; i++) {
    const body0ptr = this.collisionKeys[i];
    const body1ptrs = this.collisions.get(body0ptr);
    for (let j = body1ptrs.length - 1; j >= 0; j--) {
      const body1ptr = body1ptrs[j];
      if (this.currentCollisions.get(body0ptr).has(body1ptr)) {
        continue;
      }
      if (this.eventListeners.indexOf(body0ptr) !== -1) {
        this.els.get(body0ptr).emit("collideend", { targetEl: this.els.get(body1ptr) });
      }
      if (this.eventListeners.indexOf(body1ptr) !== -1) {
        this.els.get(body1ptr).emit("collideend", { targetEl: this.els.get(body0ptr) });
      }
      body1ptrs.splice(j, 1);
    }
    this.currentCollisions.get(body0ptr).clear();
  }

  if (this.debugDrawer) {
    this.debugDrawer.update();
  }
};

/* @param {?} constraint */
AmmoDriver.prototype.addConstraint = function(constraint) {
  this.physicsWorld.addConstraint(constraint, false);
};

/* @param {?} constraint */
AmmoDriver.prototype.removeConstraint = function(constraint) {
  this.physicsWorld.removeConstraint(constraint);
};

/* @param {Ammo.btCollisionObject} body */
AmmoDriver.prototype.addEventListener = function(body) {
  this.eventListeners.push(Ammo.getPointer(body));
};

/* @param {Ammo.btCollisionObject} body */
AmmoDriver.prototype.removeEventListener = function(body) {
  const ptr = Ammo.getPointer(body);
  if (this.eventListeners.indexOf(ptr) !== -1) {
    this.eventListeners.splice(this.eventListeners.indexOf(ptr), 1);
  }
};

AmmoDriver.prototype.destroy = function() {
  Ammo.destroy(this.collisionConfiguration);
  Ammo.destroy(this.dispatcher);
  Ammo.destroy(this.broadphase);
  Ammo.destroy(this.solver);
  Ammo.destroy(this.physicsWorld);
  Ammo.destroy(this.debugDrawer);
};

/**
 * @param {THREE.Scene} scene
 * @param {object} options
 */
AmmoDriver.prototype.getDebugDrawer = function(scene, options) {
  if (!this.debugDrawer) {
    options = options || {};
    options.debugDrawMode = options.debugDrawMode || this.debugDrawMode;
    this.debugDrawer = new THREE.AmmoDebugDrawer(scene, this.physicsWorld, options);
  }
  return this.debugDrawer;
};


/***/ }),

/***/ "./src/drivers/driver.js":
/*!*******************************!*\
  !*** ./src/drivers/driver.js ***!
  \*******************************/
/***/ ((module) => {

/**
 * Driver - defines limited API to local and remote physics controllers.
 */

function Driver () {}

module.exports = Driver;

/******************************************************************************
 * Lifecycle
 */

/* @param {object} worldConfig */
Driver.prototype.init = abstractMethod;

/* @param {number} deltaMS */
Driver.prototype.step = abstractMethod;

Driver.prototype.destroy = abstractMethod;

/******************************************************************************
 * Bodies
 */

/* @param {CANNON.Body} body */
Driver.prototype.addBody = abstractMethod;

/* @param {CANNON.Body} body */
Driver.prototype.removeBody = abstractMethod;

/**
 * @param {CANNON.Body} body
 * @param {string} methodName
 * @param {Array} args
 */
Driver.prototype.applyBodyMethod = abstractMethod;

/** @param {CANNON.Body} body */
Driver.prototype.updateBodyProperties = abstractMethod;

/******************************************************************************
 * Materials
 */

/** @param {object} materialConfig */
Driver.prototype.addMaterial = abstractMethod;

/**
 * @param {string} materialName1
 * @param {string} materialName2
 * @param {object} contactMaterialConfig
 */
Driver.prototype.addContactMaterial = abstractMethod;

/******************************************************************************
 * Constraints
 */

/* @param {CANNON.Constraint} constraint */
Driver.prototype.addConstraint = abstractMethod;

/* @param {CANNON.Constraint} constraint */
Driver.prototype.removeConstraint = abstractMethod;

/******************************************************************************
 * Contacts
 */

/** @return {Array<object>} */
Driver.prototype.getContacts = abstractMethod;

/*****************************************************************************/

function abstractMethod () {
  throw new Error('Method not implemented.');
}


/***/ }),

/***/ "./src/system.js":
/*!***********************!*\
  !*** ./src/system.js ***!
  \***********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

/* global THREE */
var CONSTANTS = __webpack_require__(/*! ./constants */ "./src/constants.js"),
    C_GRAV = CONSTANTS.GRAVITY,
    C_MAT = CONSTANTS.CONTACT_MATERIAL;

const { TYPE } = __webpack_require__(/*! ./constants */ "./src/constants.js");
var AmmoDriver = __webpack_require__(/*! ./drivers/ammo-driver */ "./src/drivers/ammo-driver.js");
__webpack_require__(/*! aframe-stats-panel */ "./node_modules/aframe-stats-panel/index.js")

/**
 * Physics system.
 */
module.exports = AFRAME.registerSystem('physics', {
  schema: {
    driver:                         { default: 'ammo', oneOf: ['ammo'] },
    networkUrl:                     { default: '', if: {driver: 'network'} },

    gravity:                        { default: C_GRAV },
    iterations:                     { default: CONSTANTS.ITERATIONS },
    friction:                       { default: C_MAT.friction },
    restitution:                    { default: C_MAT.restitution },
    contactEquationStiffness:       { default: C_MAT.contactEquationStiffness },
    contactEquationRelaxation:      { default: C_MAT.contactEquationRelaxation },
    frictionEquationStiffness:      { default: C_MAT.frictionEquationStiffness },
    frictionEquationRegularization: { default: C_MAT.frictionEquationRegularization },

    // Never step more than four frames at once. Effectively pauses the scene
    // when out of focus, and prevents weird "jumps" when focus returns.
    maxInterval:                    { default: 4 / 60 },

    // If true, show wireframes around physics bodies.
    debug:                          { default: false },

    // If using ammo, set the default rendering mode for debug
    debugDrawMode: { default: THREE.AmmoDebugConstants.NoDebug },
    // If using ammo, set the max number of steps per frame 
    maxSubSteps: { default: 4 },
    // If using ammo, set the framerate of the simulation
    fixedTimeStep: { default: 1 / 60 },
    // Whether to output stats, and how to output them.  One or more of "console", "events", "panel"
    stats: {type: 'array', default: []}
  },

  /**
   * Initializes the physics system.
   */
  async init() {
    var data = this.data;

    // If true, show wireframes around physics bodies.
    this.debug = data.debug;
    this.initStats();

    this.callbacks = {beforeStep: [], step: [], afterStep: []};

    this.listeners = {};

    this.driver = new AmmoDriver();

    await this.driver.init({
      gravity: data.gravity,
      debugDrawMode: data.debugDrawMode,
      solverIterations: data.iterations,
      maxSubSteps: data.maxSubSteps,
      fixedTimeStep: data.fixedTimeStep
    });

    this.initialized = true;

    if (this.debug) {
      this.setDebug(true);
    }
  },

  initStats() {
    // Data used for performance monitoring.
    this.statsToConsole = this.data.stats.includes("console")
    this.statsToEvents = this.data.stats.includes("events")
    this.statsToPanel = this.data.stats.includes("panel")

    if (this.statsToConsole || this.statsToEvents || this.statsToPanel) {
      this.trackPerf = true;
      this.tickCounter = 0;
      
      this.statsTickData = {};
      this.statsBodyData = {};

      this.countBodies = {
        "ammo": () => this.countBodiesAmmo(),
      }

      this.bodyTypeToStatsPropertyMap = {
        "ammo": {
          [TYPE.STATIC] : "staticBodies",
          [TYPE.KINEMATIC] : "kinematicBodies",
          [TYPE.DYNAMIC] : "dynamicBodies",
        }, 
      }
      
      const scene = this.el.sceneEl;
      scene.setAttribute("stats-collector", `inEvent: physics-tick-data;
                                             properties: before, after, engine, total;
                                             outputFrequency: 100;
                                             outEvent: physics-tick-summary;
                                             outputs: percentile__50, percentile__90, max`);
    }

    if (this.statsToPanel) {
      const scene = this.el.sceneEl;
      const space = "&nbsp&nbsp&nbsp"
    
      scene.setAttribute("stats-panel", "")
      scene.setAttribute("stats-group__bodies", `label: Physics Bodies`)
      scene.setAttribute("stats-row__b1", `group: bodies;
                                           event:physics-body-data;
                                           properties: staticBodies;
                                           label: Static`)
      scene.setAttribute("stats-row__b2", `group: bodies;
                                           event:physics-body-data;
                                           properties: dynamicBodies;
                                           label: Dynamic`)

      scene.setAttribute("stats-row__b3", `group: bodies;
                                             event:physics-body-data;
                                             properties: kinematicBodies;
                                             label: Kinematic`)
      scene.setAttribute("stats-row__b4", `group: bodies;
                                             event: physics-body-data;
                                             properties: manifolds;
                                             label: Manifolds`)
      scene.setAttribute("stats-row__b5", `group: bodies;
                                             event: physics-body-data;
                                             properties: manifoldContacts;
                                             label: Contacts`)
      scene.setAttribute("stats-row__b6", `group: bodies;
                                             event: physics-body-data;
                                             properties: collisions;
                                             label: Collisions`)
      scene.setAttribute("stats-row__b7", `group: bodies;
                                             event: physics-body-data;
                                             properties: collisionKeys;
                                             label: Coll Keys`)

      scene.setAttribute("stats-group__tick", `label: Physics Ticks: Median${space}90th%${space}99th%`)
      scene.setAttribute("stats-row__1", `group: tick;
                                          event:physics-tick-summary;
                                          properties: before.percentile__50, 
                                                      before.percentile__90, 
                                                      before.max;
                                          label: Before`)
      scene.setAttribute("stats-row__2", `group: tick;
                                          event:physics-tick-summary;
                                          properties: after.percentile__50, 
                                                      after.percentile__90, 
                                                      after.max; 
                                          label: After`)
      scene.setAttribute("stats-row__3", `group: tick; 
                                          event:physics-tick-summary; 
                                          properties: engine.percentile__50, 
                                                      engine.percentile__90, 
                                                      engine.max;
                                          label: Engine`)
      scene.setAttribute("stats-row__4", `group: tick;
                                          event:physics-tick-summary;
                                          properties: total.percentile__50, 
                                                      total.percentile__90, 
                                                      total.max;
                                          label: Total`)
    }
  },

  /**
   * Updates the physics world on each tick of the A-Frame scene. It would be
   * entirely possible to separate the two – updating physics more or less
   * frequently than the scene – if greater precision or performance were
   * necessary.
   * @param  {number} t
   * @param  {number} dt
   */
  tick: function (t, dt) {
    if (!this.initialized || !dt) return;

    const beforeStartTime = performance.now();

    var i;
    var callbacks = this.callbacks;

    for (i = 0; i < this.callbacks.beforeStep.length; i++) {
      this.callbacks.beforeStep[i].beforeStep(t, dt);
    }

    const engineStartTime = performance.now();

    this.driver.step(Math.min(dt / 1000, this.data.maxInterval));

    const engineEndTime = performance.now();

    for (i = 0; i < callbacks.step.length; i++) {
      callbacks.step[i].step(t, dt);
    }

    for (i = 0; i < callbacks.afterStep.length; i++) {
      callbacks.afterStep[i].afterStep(t, dt);
    }

    if (this.trackPerf) {
      const afterEndTime = performance.now();

      this.statsTickData.before = engineStartTime - beforeStartTime
      this.statsTickData.engine = engineEndTime - engineStartTime
      this.statsTickData.after = afterEndTime - engineEndTime
      this.statsTickData.total = afterEndTime - beforeStartTime

      this.el.emit("physics-tick-data", this.statsTickData)

      this.tickCounter++;

      if (this.tickCounter === 100) {

        this.countBodies[this.data.driver]()

        if (this.statsToConsole) {
          console.log("Physics body stats:", this.statsBodyData)
        }

        if (this.statsToEvents  || this.statsToPanel) {
          this.el.emit("physics-body-data", this.statsBodyData)
        }
        this.tickCounter = 0;
      }
    }
  },

  countBodiesAmmo() {

    const statsData = this.statsBodyData
    statsData.manifolds = this.driver.dispatcher.getNumManifolds();
    statsData.manifoldContacts = 0;
    for (let i = 0; i < statsData.manifolds; i++) {
      const manifold = this.driver.dispatcher.getManifoldByIndexInternal(i);
      statsData.manifoldContacts += manifold.getNumContacts();
    }
    statsData.collisions = this.driver.collisions.size;
    statsData.collisionKeys = this.driver.collisionKeys.length;
    statsData.staticBodies = 0
    statsData.kinematicBodies = 0
    statsData.dynamicBodies = 0
    
    function type(el) {
      return el.components['ammo-body'].data.type
    }

    this.driver.els.forEach((el) => {
      const property = this.bodyTypeToStatsPropertyMap["ammo"][type(el)]
      statsData[property]++
    })
  },

  setDebug: function(debug) {
    this.debug = debug;
    if (this.data.driver === 'ammo' && this.initialized) {
      if (debug && !this.debugDrawer) {
        this.debugDrawer = this.driver.getDebugDrawer(this.el.object3D);
        this.debugDrawer.enable();
      } else if (this.debugDrawer) {
        this.debugDrawer.disable();
        this.debugDrawer = null;
      }
    }
  },

  /**
   * Adds a body to the scene, and binds proxied methods to the driver.
   */
  addBody: function (body, group, mask) {
    var driver = this.driver;

    this.driver.addBody(body, group, mask);
  },

  /**
   * Removes a body and its proxied methods.
   */
  removeBody: function (body) {
    this.driver.removeBody(body);
  },

  /** @param {Ammo.btTypedConstraint} constraint */
  addConstraint: function (constraint) {
    this.driver.addConstraint(constraint);
  },

  /** @param {Ammo.btTypedConstraint} constraint */
  removeConstraint: function (constraint) {
    this.driver.removeConstraint(constraint);
  },

  /**
   * Adds a component instance to the system and schedules its update methods to be called
   * the given phase.
   * @param {Component} component
   * @param {string} phase
   */
  addComponent: function (component) {
    var callbacks = this.callbacks;
    if (component.beforeStep) callbacks.beforeStep.push(component);
    if (component.step)       callbacks.step.push(component);
    if (component.afterStep)  callbacks.afterStep.push(component);
  },

  /**
   * Removes a component instance from the system.
   * @param {Component} component
   * @param {string} phase
   */
  removeComponent: function (component) {
    var callbacks = this.callbacks;
    if (component.beforeStep) {
      callbacks.beforeStep.splice(callbacks.beforeStep.indexOf(component), 1);
    }
    if (component.step) {
      callbacks.step.splice(callbacks.step.indexOf(component), 1);
    }
    if (component.afterStep) {
      callbacks.afterStep.splice(callbacks.afterStep.indexOf(component), 1);
    }
  },

  /** @return {Array<object>} */
  getContacts: function () {
    return this.driver.getContacts();
  },

  getMaterial: function (name) {
    return this.driver.getMaterial(name);
  }
});


/***/ }),

/***/ "three":
/*!************************!*\
  !*** external "THREE" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = THREE;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./index.js");
/******/ 	
/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7Ozs7Ozs7Ozs7O0FDelJEOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsV0FBVyxhQUFhO0FBQ3hCLFdBQVcsdUJBQXVCO0FBQ2xDLFdBQVcsUUFBUTtBQUNuQjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUk7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ25LYTtBQUNiO0FBQytCOztBQUV4QjtBQUNQO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRU87QUFDUDtBQUNBO0FBQ0E7O0FBRU87QUFDUDtBQUNBO0FBQ0E7O0FBRU8sNkZBQTZGO0FBQ3BHO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRU8sNkVBQTZFO0FBQ3BGO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFTyxrRkFBa0Y7QUFDekY7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIOztBQUVBO0FBQ0E7QUFDQTs7QUFFTyxpRkFBaUY7QUFDeEY7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxVQUFVLFVBQVU7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTs7QUFFTyw4RUFBOEU7QUFDckY7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxVQUFVLFVBQVU7QUFDcEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTs7QUFFTyxnRkFBZ0Y7QUFDdkY7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJO0FBQ0o7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRU87QUFDUCxxQkFBcUIsMENBQWE7QUFDbEMscUJBQXFCLDBDQUFhO0FBQ2xDLHFCQUFxQiwwQ0FBYTtBQUNsQywrREFBK0Q7QUFDL0Q7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLG9CQUFvQixxQkFBcUI7QUFDekM7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxzREFBc0QsWUFBWSxhQUFhLFFBQVEsYUFBYTtBQUNwRztBQUNBOztBQUVBLG9CQUFvQixxQkFBcUI7QUFDekM7QUFDQTtBQUNBLHNCQUFzQix1QkFBdUI7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHlEQUF5RDtBQUN6RDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwrQkFBK0I7QUFDL0I7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFTTtBQUNQLHFCQUFxQiwwQ0FBYTtBQUNsQyxxQkFBcUIsMENBQWE7QUFDbEMscUJBQXFCLDBDQUFhO0FBQ2xDLHdFQUF3RTtBQUN4RTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSxvQkFBb0IscUJBQXFCO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBLG9CQUFvQixxQkFBcUI7QUFDekM7QUFDQTtBQUNBLHNCQUFzQix1QkFBdUI7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixvQkFBb0I7QUFDNUM7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSLHdCQUF3QiwyQkFBMkI7QUFDbkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLG9CQUFvQixlQUFlO0FBQ25DO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsdUJBQXVCLGNBQWM7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLENBQUM7O0FBRU07QUFDUCxxQkFBcUIsMENBQWE7QUFDbEMscUJBQXFCLDBDQUFhO0FBQ2xDLHFCQUFxQiwwQ0FBYTtBQUNsQyx3RUFBd0U7QUFDeEU7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEsb0JBQW9CLHFCQUFxQjtBQUN6QztBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxvQkFBb0IscUJBQXFCO0FBQ3pDO0FBQ0E7QUFDQSxzQkFBc0IsdUJBQXVCO0FBQzdDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0Isb0JBQW9CO0FBQzVDO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUix3QkFBd0IsMkJBQTJCO0FBQ25EO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0Esb0JBQW9CLFlBQVk7QUFDaEM7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsdUJBQXVCLGNBQWM7QUFDckM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxDQUFDOztBQUVNO0FBQ1AsaUJBQWlCLDBDQUFhO0FBQzlCLGlCQUFpQiwwQ0FBYTtBQUM5QixpQkFBaUIsMENBQWE7QUFDOUIscUJBQXFCLDBDQUFhO0FBQ2xDLHdFQUF3RTtBQUN4RTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLG9CQUFvQixxQkFBcUI7QUFDekM7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0Isa0JBQWtCO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1Isd0JBQXdCLHVCQUF1QjtBQUMvQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7QUFFTSwyREFBMkQ7QUFDbEU7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx3RUFBd0UsVUFBVSxPQUFPO0FBQ3pGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7QUFDSDs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0JBQWtCLHVCQUF1QjtBQUN6QyxvQkFBb0Isc0JBQXNCO0FBQzFDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EseUJBQXlCLDBDQUFhO0FBQ3RDOztBQUVBO0FBQ0EsOEJBQThCLDZDQUFnQjtBQUM5QztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFTztBQUNQLHNCQUFzQiwwQ0FBYTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBLDRCQUE0QiwwQ0FBYTtBQUN6QztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw0QkFBNEIsNkJBQTZCO0FBQ3pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZO0FBQ1o7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLENBQUM7O0FBRUQ7QUFDQSxxQkFBcUIsMENBQWE7QUFDbEMsMkNBQTJDO0FBQzNDLHNCQUFzQiwwQ0FBYTtBQUNuQztBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxDQUFDOztBQUVEO0FBQ0EscUJBQXFCLDBDQUFhO0FBQ2xDO0FBQ0E7QUFDQSxVQUFVLHNCQUFzQjs7QUFFaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsQ0FBQzs7QUFFRDtBQUNBLDBCQUEwQiwwQ0FBYTtBQUN2QztBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxxQkFBcUIsdUNBQVU7QUFDL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxxQkFBcUIsMENBQWE7QUFDbEMscUJBQXFCLDBDQUFhO0FBQ2xDO0FBQ0Esb0JBQW9CLHFCQUFxQjtBQUN6QztBQUNBLHNCQUFzQix3QkFBd0I7QUFDOUM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLENBQUM7Ozs7Ozs7Ozs7O0FDdHlCRDtBQUNBLG1CQUFtQiwwRUFBa0M7O0FBRXJEO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLOztBQUVMO0FBQ0EsY0FBYyxrQkFBa0I7O0FBRWhDO0FBQ0EsYUFBYSxjQUFjO0FBQzNCLG1CQUFtQixjQUFjOztBQUVqQztBQUNBLFlBQVkseUJBQXlCLG9CQUFvQjtBQUN6RCxrQkFBa0IseUJBQXlCLG9CQUFvQjs7QUFFL0Q7QUFDQSxlQUFlLDRCQUE0QjtBQUMzQyxpQkFBaUIsOEJBQThCO0FBQy9DLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBOztBQUVBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBLDRGQUE0RixLQUFLLFlBQVk7QUFDN0c7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0EsQ0FBQzs7Ozs7Ozs7Ozs7QUM1S0Q7QUFDQSx3QkFBd0IsbUJBQU8sQ0FBQyw4RUFBbUI7QUFDbkQsb0JBQW9CLG1CQUFPLENBQUMsNERBQWU7QUFDM0Msa0JBQWtCLG1CQUFPLENBQUMsMkNBQWlCO0FBQzNDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLG1CQUFtQixhQUFhO0FBQ2hDLFlBQVksWUFBWTtBQUN4QixlQUFlLDZCQUE2QjtBQUM1QyxxQkFBcUIsZUFBZTtBQUNwQyxzQkFBc0IsZUFBZTtBQUNyQywrQkFBK0IsY0FBYztBQUM3QyxnQ0FBZ0MsY0FBYztBQUM5QyxxQkFBcUIseUJBQXlCLG9CQUFvQjtBQUNsRTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0wsWUFBWSx3RUFBd0U7QUFDcEYsMkJBQTJCLGdCQUFnQjtBQUMzQyx3QkFBd0IsZ0JBQWdCO0FBQ3hDLDRCQUE0QixZQUFZO0FBQ3hDLDJCQUEyQixZQUFZO0FBQ3ZDLHVCQUF1QixlQUFlO0FBQ3RDLGtCQUFrQixZQUFZO0FBQzlCLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVCxVQUFVO0FBQ1Y7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7O0FBRUEsb0NBQW9DLG9CQUFvQjs7QUFFeEQ7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSx3QkFBd0IsaUNBQWlDO0FBQ3pEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSwwQkFBMEIsNEJBQTRCO0FBQ3REO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSx3QkFBd0IsaUNBQWlDO0FBQ3pEO0FBQ0EsMEJBQTBCLDRCQUE0QjtBQUN0RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxRQUFRO0FBQ1I7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FB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Q0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQSxhQUFhLFdBQVc7QUFDeEIsYUFBYSxRQUFRO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUgsZUFBZSxlQUFlO0FBQzlCO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBLENBQUM7Ozs7Ozs7Ozs7OztBQ2hWRDs7Ozs7O1VDQUE7VUFDQTs7VUFFQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTs7VUFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTs7Ozs7V0N0QkE7V0FDQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLGlDQUFpQyxXQUFXO1dBQzVDO1dBQ0E7Ozs7O1dDUEE7V0FDQTtXQUNBO1dBQ0E7V0FDQSx5Q0FBeUMsd0NBQXdDO1dBQ2pGO1dBQ0E7V0FDQTs7Ozs7V0NQQTs7Ozs7V0NBQTtXQUNBO1dBQ0E7V0FDQSx1REFBdUQsaUJBQWlCO1dBQ3hFO1dBQ0EsZ0RBQWdELGFBQWE7V0FDN0Q7Ozs7O1VFTkE7VUFDQTtVQUNBO1VBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtLy4vaW5kZXguanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL25vZGVfbW9kdWxlcy9hZnJhbWUtc3RhdHMtcGFuZWwvaW5kZXguanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL25vZGVfbW9kdWxlcy9hbW1vLWRlYnVnLWRyYXdlci9BbW1vRGVidWdEcmF3ZXIuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL25vZGVfbW9kdWxlcy90aHJlZS10by1hbW1vL2luZGV4LmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvY29tcG9uZW50cy9hbW1vLWNvbnN0cmFpbnQuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9jb21wb25lbnRzL2JvZHkvYW1tby1ib2R5LmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvY29tcG9uZW50cy9tYXRoL2luZGV4LmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvY29tcG9uZW50cy9tYXRoL3ZlbG9jaXR5LmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvY29tcG9uZW50cy9zaGFwZS9hbW1vLXNoYXBlLmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvY29uc3RhbnRzLmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvZHJpdmVycy9hbW1vLWRyaXZlci5qcyIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtLy4vc3JjL2RyaXZlcnMvZHJpdmVyLmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvc3lzdGVtLmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vZXh0ZXJuYWwgdmFyIFwiVEhSRUVcIiIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS93ZWJwYWNrL3J1bnRpbWUvZGVmaW5lIHByb3BlcnR5IGdldHRlcnMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3dlYnBhY2svYmVmb3JlLXN0YXJ0dXAiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS93ZWJwYWNrL3N0YXJ0dXAiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS93ZWJwYWNrL2FmdGVyLXN0YXJ0dXAiXSwic291cmNlc0NvbnRlbnQiOlsicmVxdWlyZSgnLi9zcmMvY29tcG9uZW50cy9tYXRoJyk7XG5yZXF1aXJlKCcuL3NyYy9jb21wb25lbnRzL2JvZHkvYW1tby1ib2R5Jyk7XG5yZXF1aXJlKCcuL3NyYy9jb21wb25lbnRzL3NoYXBlL2FtbW8tc2hhcGUnKVxucmVxdWlyZSgnLi9zcmMvY29tcG9uZW50cy9hbW1vLWNvbnN0cmFpbnQnKTtcbnJlcXVpcmUoJy4vc3JjL3N5c3RlbScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcmVnaXN0ZXJBbGw6IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zb2xlLndhcm4oJ3JlZ2lzdGVyQWxsKCkgaXMgZGVwcmVjYXRlZC4gQ29tcG9uZW50cyBhcmUgYXV0b21hdGljYWxseSByZWdpc3RlcmVkLicpO1xuICB9XG59O1xuIiwiQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KCdzdGF0cy1wYW5lbCcsIHtcclxuICBzY2hlbWE6IHtcclxuICAgIG1lcmdlOiB7dHlwZTogJ2Jvb2xlYW4nLCBkZWZhdWx0OiB0cnVlfVxyXG4gIH0sXHJcblxyXG4gIGluaXQoKSB7XHJcblxyXG4gICAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJzLWNvbnRhaW5lcicpXHJcblxyXG4gICAgaWYgKGNvbnRhaW5lciAmJiB0aGlzLmRhdGEubWVyZ2UpIHtcclxuICAgICAgLy9zdGF0cyBwYW5lbCBleGlzdHMsIGp1c3QgbWVyZ2UgaW50byBpdC5cclxuICAgICAgdGhpcy5jb250YWluZXIgPSBjb250YWluZXJcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHN0YXRzIHBhbmVsIGRvZXNuJ3QgZXhpc3QsIGFkZCBvbmUgdG8gc3VwcG9ydCBvdXIgY3VzdG9tIHN0YXRzLlxyXG4gICAgdGhpcy5iYXNlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRoaXMuYmFzZS5jbGFzc0xpc3QuYWRkKCdycy1iYXNlJylcclxuICAgIGNvbnN0IGJvZHkgPSBkb2N1bWVudC5ib2R5IHx8IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdib2R5JylbMF1cclxuXHJcbiAgICBpZiAoY29udGFpbmVyICYmICF0aGlzLmRhdGEubWVyZ2UpIHtcclxuICAgICAgdGhpcy5iYXNlLnN0eWxlLnRvcCA9IFwiYXV0b1wiXHJcbiAgICAgIHRoaXMuYmFzZS5zdHlsZS5ib3R0b20gPSBcIjIwcHhcIlxyXG4gICAgfVxyXG5cclxuICAgIGJvZHkuYXBwZW5kQ2hpbGQodGhpcy5iYXNlKVxyXG5cclxuICAgIHRoaXMuY29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRoaXMuY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ3JzLWNvbnRhaW5lcicpXHJcbiAgICB0aGlzLmJhc2UuYXBwZW5kQ2hpbGQodGhpcy5jb250YWluZXIpXHJcbiAgfVxyXG59KTtcclxuXHJcbkFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgnc3RhdHMtZ3JvdXAnLCB7XHJcbiAgbXVsdGlwbGU6IHRydWUsXHJcbiAgc2NoZW1hOiB7XHJcbiAgICBsYWJlbDoge3R5cGU6ICdzdHJpbmcnfVxyXG4gIH0sXHJcblxyXG4gIGluaXQoKSB7XHJcblxyXG4gICAgbGV0IGNvbnRhaW5lclxyXG4gICAgY29uc3QgYmFzZUNvbXBvbmVudCA9IHRoaXMuZWwuY29tcG9uZW50c1snc3RhdHMtcGFuZWwnXVxyXG4gICAgaWYgKGJhc2VDb21wb25lbnQpIHtcclxuICAgICAgY29udGFpbmVyID0gYmFzZUNvbXBvbmVudC5jb250YWluZXJcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucnMtY29udGFpbmVyJylcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWNvbnRhaW5lcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oYENvdWxkbid0IGZpbmQgc3RhdHMgY29udGFpbmVyIHRvIGFkZCBzdGF0cyB0by5cclxuICAgICAgICAgICAgICAgICAgICBBZGQgZWl0aGVyIHN0YXRzIG9yIHN0YXRzLXBhbmVsIGNvbXBvbmVudCB0byBhLXNjZW5lYClcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0aGlzLmdyb3VwSGVhZGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaDEnKVxyXG4gICAgdGhpcy5ncm91cEhlYWRlci5pbm5lckhUTUwgPSB0aGlzLmRhdGEubGFiZWxcclxuICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZCh0aGlzLmdyb3VwSGVhZGVyKVxyXG5cclxuICAgIHRoaXMuZ3JvdXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGhpcy5ncm91cC5jbGFzc0xpc3QuYWRkKCdycy1ncm91cCcpXHJcbiAgICAvLyBycy1ncm91cCBocyBzdHlsZSBmbGV4LWRpcmVjdGlvbiBvZiAnY29sdW1uLXJldmVyc2UnXHJcbiAgICAvLyBObyBpZGVhIHdoeSBpdCdzIGxpa2UgdGhhdCwgYnV0IGl0J3Mgbm90IHdoYXQgd2Ugd2FudCBmb3Igb3VyIHN0YXRzLlxyXG4gICAgLy8gV2UgcHJlZmVyIHRoZW0gcmVuZGVyZWQgaW4gdGhlIG9yZGVyIHNwZWlmaWVkLlxyXG4gICAgLy8gU28gb3ZlcnJpZGUgdGhpcyBzdHlsZS5cclxuICAgIHRoaXMuZ3JvdXAuc3R5bGUuZmxleERpcmVjdGlvbiA9ICdjb2x1bW4nXHJcbiAgICB0aGlzLmdyb3VwLnN0eWxlLndlYktpdEZsZXhEaXJlY3Rpb24gPSAnY29sdW1uJ1xyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZ3JvdXApXHJcbiAgfVxyXG59KTtcclxuXHJcbkFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgnc3RhdHMtcm93Jywge1xyXG4gIG11bHRpcGxlOiB0cnVlLFxyXG4gIHNjaGVtYToge1xyXG4gICAgLy8gbmFtZSBvZiB0aGUgZ3JvdXAgdG8gYWRkIHRoZSBzdGF0cyByb3cgdG8uXHJcbiAgICBncm91cDoge3R5cGU6ICdzdHJpbmcnfSxcclxuXHJcbiAgICAvLyBuYW1lIG9mIGFuIGV2ZW50IHRvIGxpc3RlbiBmb3JcclxuICAgIGV2ZW50OiB7dHlwZTogJ3N0cmluZyd9LFxyXG5cclxuICAgIC8vIHByb3BlcnR5IGZyb20gZXZlbnQgdG8gb3V0cHV0IGluIHN0YXRzIHBhbmVsXHJcbiAgICBwcm9wZXJ0aWVzOiB7dHlwZTogJ2FycmF5J30sXHJcblxyXG4gICAgLy8gbGFiZWwgZm9yIHRoZSByb3cgaW4gdGhlIHN0YXRzIHBhbmVsXHJcbiAgICBsYWJlbDoge3R5cGU6ICdzdHJpbmcnfVxyXG4gIH0sXHJcblxyXG4gIGluaXQgKCkge1xyXG5cclxuICAgIGNvbnN0IGdyb3VwQ29tcG9uZW50TmFtZSA9IFwic3RhdHMtZ3JvdXBfX1wiICsgdGhpcy5kYXRhLmdyb3VwXHJcbiAgICBjb25zdCBncm91cENvbXBvbmVudCA9IHRoaXMuZWwuY29tcG9uZW50c1tncm91cENvbXBvbmVudE5hbWVdIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZWwuc2NlbmVFbC5jb21wb25lbnRzW2dyb3VwQ29tcG9uZW50TmFtZV0gfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbC5jb21wb25lbnRzW1wic3RhdHMtZ3JvdXBcIl0gfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbC5zY2VuZUVsLmNvbXBvbmVudHNbXCJzdGF0cy1ncm91cFwiXVxyXG5cclxuICAgIGlmICghZ3JvdXBDb21wb25lbnQpIHtcclxuICAgICAgY29uc29sZS53YXJuKGBDb3VsZG4ndCBmaW5kIHN0YXRzIGdyb3VwICR7Z3JvdXBDb21wb25lbnROYW1lfWApXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICBcclxuICAgIHRoaXMuY291bnRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICB0aGlzLmNvdW50ZXIuY2xhc3NMaXN0LmFkZCgncnMtY291bnRlci1iYXNlJylcclxuICAgIGdyb3VwQ29tcG9uZW50Lmdyb3VwLmFwcGVuZENoaWxkKHRoaXMuY291bnRlcilcclxuXHJcbiAgICB0aGlzLmNvdW50ZXJJZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICB0aGlzLmNvdW50ZXJJZC5jbGFzc0xpc3QuYWRkKCdycy1jb3VudGVyLWlkJylcclxuICAgIHRoaXMuY291bnRlcklkLmlubmVySFRNTCA9IHRoaXMuZGF0YS5sYWJlbFxyXG4gICAgdGhpcy5jb3VudGVyLmFwcGVuZENoaWxkKHRoaXMuY291bnRlcklkKVxyXG5cclxuICAgIHRoaXMuY291bnRlclZhbHVlcyA9IHt9XHJcbiAgICB0aGlzLmRhdGEucHJvcGVydGllcy5mb3JFYWNoKChwcm9wZXJ0eSkgPT4ge1xyXG4gICAgICBjb25zdCBjb3VudGVyVmFsdWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgICBjb3VudGVyVmFsdWUuY2xhc3NMaXN0LmFkZCgncnMtY291bnRlci12YWx1ZScpXHJcbiAgICAgIGNvdW50ZXJWYWx1ZS5pbm5lckhUTUwgPSBcIi4uLlwiXHJcbiAgICAgIHRoaXMuY291bnRlci5hcHBlbmRDaGlsZChjb3VudGVyVmFsdWUpXHJcbiAgICAgIHRoaXMuY291bnRlclZhbHVlc1twcm9wZXJ0eV0gPSBjb3VudGVyVmFsdWVcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy51cGRhdGVTdGF0c0RhdGEgPSB0aGlzLnVwZGF0ZVN0YXRzRGF0YS5iaW5kKHRoaXMpXHJcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5kYXRhLmV2ZW50LCB0aGlzLnVwZGF0ZVN0YXRzRGF0YSlcclxuXHJcbiAgICB0aGlzLnNwbGl0Q2FjaGUgPSB7fVxyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZVN0YXRzRGF0YShlKSB7XHJcblxyXG4gICAgaWYgKCF0aGlzLmRhdGEucHJvcGVydGllcykgcmV0dXJuXHJcbiAgICBcclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIGNvbnN0IHNwbGl0ID0gdGhpcy5zcGxpdERvdChwcm9wZXJ0eSk7XHJcbiAgICAgIGxldCB2YWx1ZSA9IGUuZGV0YWlsO1xyXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YWx1ZSA9IHZhbHVlW3NwbGl0W2ldXTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNvdW50ZXJWYWx1ZXNbcHJvcGVydHldLmlubmVySFRNTCA9IHZhbHVlXHJcbiAgICB9KVxyXG4gIH0sXHJcblxyXG4gIHNwbGl0RG90IChwYXRoKSB7XHJcbiAgICBpZiAocGF0aCBpbiB0aGlzLnNwbGl0Q2FjaGUpIHsgcmV0dXJuIHRoaXMuc3BsaXRDYWNoZVtwYXRoXTsgfVxyXG4gICAgdGhpcy5zcGxpdENhY2hlW3BhdGhdID0gcGF0aC5zcGxpdCgnLicpO1xyXG4gICAgcmV0dXJuIHRoaXMuc3BsaXRDYWNoZVtwYXRoXTtcclxuICB9XHJcblxyXG59KTtcclxuXHJcbkFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgnc3RhdHMtY29sbGVjdG9yJywge1xyXG4gIG11bHRpcGxlOiB0cnVlLFxyXG5cclxuICBzY2hlbWE6IHtcclxuICAgIC8vIG5hbWUgb2YgYW4gZXZlbnQgdG8gbGlzdGVuIGZvclxyXG4gICAgaW5FdmVudDoge3R5cGU6ICdzdHJpbmcnfSxcclxuXHJcbiAgICAvLyBwcm9wZXJ0eSBmcm9tIGV2ZW50IHRvIG91dHB1dCBpbiBzdGF0cyBwYW5lbFxyXG4gICAgcHJvcGVydGllczoge3R5cGU6ICdhcnJheSd9LFxyXG5cclxuICAgIC8vIGZyZXF1ZW5jeSBvZiBvdXRwdXQgaW4gdGVybXMgb2YgZXZlbnRzIHJlY2VpdmVkLlxyXG4gICAgb3V0cHV0RnJlcXVlbmN5OiB7dHlwZTogJ251bWJlcicsIGRlZmF1bHQ6IDEwMH0sXHJcblxyXG4gICAgLy8gbmFtZSBvZiBldmVudCB0byBlbWl0XHJcbiAgICBvdXRFdmVudDoge3R5cGU6ICdzdHJpbmcnfSxcclxuICAgIFxyXG4gICAgLy8gb3V0cHV0cyAoZ2VuZXJhdGVkIGZvciBlYWNoIHByb3BlcnR5KVxyXG4gICAgLy8gQ29tYmluYXRpb24gb2Y6IG1lYW4sIG1heCwgcGVyY2VudGlsZV9fWFguWCAod2hlcmUgWFguWCBpcyBhIG51bWJlcilcclxuICAgIG91dHB1dHM6IHt0eXBlOiAnYXJyYXknfSxcclxuXHJcbiAgICAvLyBXaGV0aGVyIHRvIG91dHB1dCB0byBjb25zb2xlIGFzIHdlbGwgYXMgZ2VuZXJhdGluZyBldmVudHNcclxuICAgIC8vIElmIGEgc3RyaW5nIGlzIHNwZWNpZmllZCwgdGhpcyBpcyBvdXRwdXQgdG8gY29uc29sZSwgdG9nZXRoZXIgd2l0aCB0aGUgZXZlbnQgZGF0YVxyXG4gICAgLy8gSWYgbm8gc3RyaW5nIGlzIHNwZWNpZmllZCwgbm90aGluZyBpcyBvdXRwdXQgdG8gY29uc29sZS5cclxuICAgIG91dHB1dFRvQ29uc29sZToge3R5cGU6ICdzdHJpbmcnfVxyXG4gIH0sXHJcblxyXG4gIGluaXQoKSB7XHJcbiAgICBcclxuICAgIHRoaXMuc3RhdHNEYXRhID0ge31cclxuICAgIHRoaXMucmVzZXREYXRhKClcclxuICAgIHRoaXMub3V0cHV0RGV0YWlsID0ge31cclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIHRoaXMub3V0cHV0RGV0YWlsW3Byb3BlcnR5XSA9IHt9XHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuc3RhdHNSZWNlaXZlZCA9IHRoaXMuc3RhdHNSZWNlaXZlZC5iaW5kKHRoaXMpXHJcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5kYXRhLmluRXZlbnQsIHRoaXMuc3RhdHNSZWNlaXZlZClcclxuICB9LFxyXG4gIFxyXG4gIHJlc2V0RGF0YSgpIHtcclxuXHJcbiAgICB0aGlzLmNvdW50ZXIgPSAwXHJcbiAgICB0aGlzLmRhdGEucHJvcGVydGllcy5mb3JFYWNoKChwcm9wZXJ0eSkgPT4ge1xyXG4gICAgICBcclxuICAgICAgLy8gRm9yIGNhbGN1bGF0aW5nIHBlcmNlbnRpbGVzIGxpa2UgMC4wMSBhbmQgOTkuOSUgd2UnbGwgd2FudCB0byBzdG9yZVxyXG4gICAgICAvLyBhZGRpdGlvbmFsIGRhdGEgLSBzb21ldGhpbmcgbGlrZSB0aGlzLi4uXHJcbiAgICAgIC8vIFN0b3JlIG9mZiBvdXRsaWVycywgYW5kIGRpc2NhcmQgZGF0YS5cclxuICAgICAgLy8gY29uc3QgbWluID0gTWF0aC5taW4oLi4udGhpcy5zdGF0c0RhdGFbcHJvcGVydHldKVxyXG4gICAgICAvLyB0aGlzLmxvd091dGxpZXJzW3Byb3BlcnR5XS5wdXNoKG1pbilcclxuICAgICAgLy8gY29uc3QgbWF4ID0gTWF0aC5tYXgoLi4udGhpcy5zdGF0c0RhdGFbcHJvcGVydHldKVxyXG4gICAgICAvLyB0aGlzLmhpZ2hPdXRsaWVyc1twcm9wZXJ0eV0ucHVzaChtYXgpXHJcblxyXG4gICAgICB0aGlzLnN0YXRzRGF0YVtwcm9wZXJ0eV0gPSBbXVxyXG4gICAgfSlcclxuICB9LFxyXG5cclxuICBzdGF0c1JlY2VpdmVkKGUpIHtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZVN0YXRzRGF0YShlLmRldGFpbClcclxuXHJcbiAgICB0aGlzLmNvdW50ZXIrKyBcclxuICAgIGlmICh0aGlzLmNvdW50ZXIgPT09IHRoaXMuZGF0YS5vdXRwdXRGcmVxdWVuY3kpIHtcclxuICAgICAgdGhpcy5vdXRwdXREYXRhKClcclxuICAgICAgdGhpcy5yZXNldERhdGEoKVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZVN0YXRzRGF0YShkZXRhaWwpIHtcclxuXHJcbiAgICB0aGlzLmRhdGEucHJvcGVydGllcy5mb3JFYWNoKChwcm9wZXJ0eSkgPT4ge1xyXG4gICAgICBsZXQgdmFsdWUgPSBkZXRhaWw7XHJcbiAgICAgIHZhbHVlID0gdmFsdWVbcHJvcGVydHldO1xyXG4gICAgICB0aGlzLnN0YXRzRGF0YVtwcm9wZXJ0eV0ucHVzaCh2YWx1ZSlcclxuICAgIH0pXHJcbiAgfSxcclxuXHJcbiAgb3V0cHV0RGF0YSgpIHtcclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIHRoaXMuZGF0YS5vdXRwdXRzLmZvckVhY2goKG91dHB1dCkgPT4ge1xyXG4gICAgICAgIHRoaXMub3V0cHV0RGV0YWlsW3Byb3BlcnR5XVtvdXRwdXRdID0gdGhpcy5jb21wdXRlT3V0cHV0KG91dHB1dCwgdGhpcy5zdGF0c0RhdGFbcHJvcGVydHldKVxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuXHJcbiAgICBpZiAodGhpcy5kYXRhLm91dEV2ZW50KSB7XHJcbiAgICAgIHRoaXMuZWwuZW1pdCh0aGlzLmRhdGEub3V0RXZlbnQsIHRoaXMub3V0cHV0RGV0YWlsKVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmRhdGEub3V0cHV0VG9Db25zb2xlKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKHRoaXMuZGF0YS5vdXRwdXRUb0NvbnNvbGUsIHRoaXMub3V0cHV0RGV0YWlsKVxyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIGNvbXB1dGVPdXRwdXQob3V0cHV0SW5zdHJ1Y3Rpb24sIGRhdGEpIHtcclxuXHJcbiAgICBjb25zdCBvdXRwdXRJbnN0cnVjdGlvbnMgPSBvdXRwdXRJbnN0cnVjdGlvbi5zcGxpdChcIl9fXCIpXHJcbiAgICBjb25zdCBvdXRwdXRUeXBlID0gb3V0cHV0SW5zdHJ1Y3Rpb25zWzBdXHJcbiAgICBsZXQgb3V0cHV0XHJcblxyXG4gICAgc3dpdGNoIChvdXRwdXRUeXBlKSB7XHJcbiAgICAgIGNhc2UgXCJtZWFuXCI6XHJcbiAgICAgICAgb3V0cHV0ID0gZGF0YS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIGRhdGEubGVuZ3RoO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBcclxuICAgICAgY2FzZSBcIm1heFwiOlxyXG4gICAgICAgIG91dHB1dCA9IE1hdGgubWF4KC4uLmRhdGEpXHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlIFwibWluXCI6XHJcbiAgICAgICAgb3V0cHV0ID0gTWF0aC5taW4oLi4uZGF0YSlcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgXCJwZXJjZW50aWxlXCI6XHJcbiAgICAgICAgY29uc3Qgc29ydGVkID0gZGF0YS5zb3J0KChhLCBiKSA9PiBhIC0gYilcclxuICAgICAgICAvLyBkZWNpbWFsIHBlcmNlbnRpbGVzIGVuY29kZWQgbGlrZSA5OSs5IHJhdGhlciB0aGFuIDk5LjkgZHVlIHRvIFwiLlwiIGJlaW5nIHVzZWQgYXMgYSBcclxuICAgICAgICAvLyBzZXBhcmF0b3IgZm9yIG5lc3RlZCBwcm9wZXJ0aWVzLlxyXG4gICAgICAgIGNvbnN0IHBlcmNlbnRpbGVTdHJpbmcgPSBvdXRwdXRJbnN0cnVjdGlvbnNbMV0ucmVwbGFjZShcIl9cIiwgXCIuXCIpXHJcbiAgICAgICAgY29uc3QgcHJvcG9ydGlvbiA9ICtwZXJjZW50aWxlU3RyaW5nIC8gMTAwXHJcblxyXG4gICAgICAgIC8vIE5vdGUgdGhhdCB0aGlzIGNhbGN1bGF0aW9uIG9mIHRoZSBwZXJjZW50aWxlIGlzIGluYWNjdXJhdGUgd2hlbiB0aGVyZSBpcyBpbnN1ZmZpY2llbnQgZGF0YVxyXG4gICAgICAgIC8vIGUuZy4gZm9yIDAuMXRoIG9yIDk5Ljl0aCBwZXJjZW50aWxlIHdoZW4gb25seSAxMDAgZGF0YSBwb2ludHMuXHJcbiAgICAgICAgLy8gR3JlYXRlciBhY2N1cmFjeSB3b3VsZCByZXF1aXJlIHN0b3Jpbmcgb2ZmIG1vcmUgZGF0YSAoc3BlY2lmaWNhbGx5IG91dGxpZXJzKSBhbmQgZm9sZGluZyB0aGVzZVxyXG4gICAgICAgIC8vIGludG8gdGhlIGNvbXB1dGF0aW9uLlxyXG4gICAgICAgIGNvbnN0IHBvc2l0aW9uID0gKGRhdGEubGVuZ3RoIC0gMSkgKiBwcm9wb3J0aW9uXHJcbiAgICAgICAgY29uc3QgYmFzZSA9IE1hdGguZmxvb3IocG9zaXRpb24pXHJcbiAgICAgICAgY29uc3QgZGVsdGEgPSBwb3NpdGlvbiAtIGJhc2U7XHJcbiAgICAgICAgaWYgKHNvcnRlZFtiYXNlICsgMV0gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBvdXRwdXQgPSBzb3J0ZWRbYmFzZV0gKyBkZWx0YSAqIChzb3J0ZWRbYmFzZSArIDFdIC0gc29ydGVkW2Jhc2VdKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBvdXRwdXQgPSBzb3J0ZWRbYmFzZV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dHB1dC50b0ZpeGVkKDIpXHJcbiAgfVxyXG59KTtcclxuIiwiLyogZ2xvYmFsIEFtbW8sVEhSRUUgKi9cblxuVEhSRUUuQW1tb0RlYnVnQ29uc3RhbnRzID0ge1xuICBOb0RlYnVnOiAwLFxuICBEcmF3V2lyZWZyYW1lOiAxLFxuICBEcmF3QWFiYjogMixcbiAgRHJhd0ZlYXR1cmVzVGV4dDogNCxcbiAgRHJhd0NvbnRhY3RQb2ludHM6IDgsXG4gIE5vRGVhY3RpdmF0aW9uOiAxNixcbiAgTm9IZWxwVGV4dDogMzIsXG4gIERyYXdUZXh0OiA2NCxcbiAgUHJvZmlsZVRpbWluZ3M6IDEyOCxcbiAgRW5hYmxlU2F0Q29tcGFyaXNvbjogMjU2LFxuICBEaXNhYmxlQnVsbGV0TENQOiA1MTIsXG4gIEVuYWJsZUNDRDogMTAyNCxcbiAgRHJhd0NvbnN0cmFpbnRzOiAxIDw8IDExLCAvLzIwNDhcbiAgRHJhd0NvbnN0cmFpbnRMaW1pdHM6IDEgPDwgMTIsIC8vNDA5NlxuICBGYXN0V2lyZWZyYW1lOiAxIDw8IDEzLCAvLzgxOTJcbiAgRHJhd05vcm1hbHM6IDEgPDwgMTQsIC8vMTYzODRcbiAgRHJhd09uVG9wOiAxIDw8IDE1LCAvLzMyNzY4XG4gIE1BWF9ERUJVR19EUkFXX01PREU6IDB4ZmZmZmZmZmZcbn07XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIGJ0SURlYnVnRHJhdyBpbnRlcmZhY2UgaW4gQW1tby5qcywgZm9yIGRlYnVnIHJlbmRlcmluZyBvZiBBbW1vIHNoYXBlc1xuICogQGNsYXNzIEFtbW9EZWJ1Z0RyYXdlclxuICogQHBhcmFtIHtUSFJFRS5TY2VuZX0gc2NlbmVcbiAqIEBwYXJhbSB7QW1tby5idENvbGxpc2lvbldvcmxkfSB3b3JsZFxuICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICovXG5USFJFRS5BbW1vRGVidWdEcmF3ZXIgPSBmdW5jdGlvbihzY2VuZSwgd29ybGQsIG9wdGlvbnMpIHtcbiAgdGhpcy5zY2VuZSA9IHNjZW5lO1xuICB0aGlzLndvcmxkID0gd29ybGQ7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHRoaXMuZGVidWdEcmF3TW9kZSA9IG9wdGlvbnMuZGVidWdEcmF3TW9kZSB8fCBUSFJFRS5BbW1vRGVidWdDb25zdGFudHMuRHJhd1dpcmVmcmFtZTtcbiAgdmFyIGRyYXdPblRvcCA9IHRoaXMuZGVidWdEcmF3TW9kZSAmIFRIUkVFLkFtbW9EZWJ1Z0NvbnN0YW50cy5EcmF3T25Ub3AgfHwgZmFsc2U7XG4gIHZhciBtYXhCdWZmZXJTaXplID0gb3B0aW9ucy5tYXhCdWZmZXJTaXplIHx8IDEwMDAwMDA7XG5cbiAgdGhpcy5nZW9tZXRyeSA9IG5ldyBUSFJFRS5CdWZmZXJHZW9tZXRyeSgpO1xuICB2YXIgdmVydGljZXMgPSBuZXcgRmxvYXQzMkFycmF5KG1heEJ1ZmZlclNpemUgKiAzKTtcbiAgdmFyIGNvbG9ycyA9IG5ldyBGbG9hdDMyQXJyYXkobWF4QnVmZmVyU2l6ZSAqIDMpO1xuXG4gIHRoaXMuZ2VvbWV0cnkuc2V0QXR0cmlidXRlKFwicG9zaXRpb25cIiwgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZSh2ZXJ0aWNlcywgMykuc2V0VXNhZ2UoVEhSRUUuRHluYW1pY0RyYXdVc2FnZSkpO1xuICB0aGlzLmdlb21ldHJ5LnNldEF0dHJpYnV0ZShcImNvbG9yXCIsIG5ldyBUSFJFRS5CdWZmZXJBdHRyaWJ1dGUoY29sb3JzLCAzKS5zZXRVc2FnZShUSFJFRS5EeW5hbWljRHJhd1VzYWdlKSk7XG5cbiAgdGhpcy5pbmRleCA9IDA7XG5cbiAgdmFyIG1hdGVyaWFsID0gbmV3IFRIUkVFLkxpbmVCYXNpY01hdGVyaWFsKHtcbiAgICB2ZXJ0ZXhDb2xvcnM6IHRydWUsXG4gICAgZGVwdGhUZXN0OiAhZHJhd09uVG9wXG4gIH0pO1xuXG4gIHRoaXMubWVzaCA9IG5ldyBUSFJFRS5MaW5lU2VnbWVudHModGhpcy5nZW9tZXRyeSwgbWF0ZXJpYWwpO1xuICBpZiAoZHJhd09uVG9wKSB0aGlzLm1lc2gucmVuZGVyT3JkZXIgPSA5OTk7XG4gIHRoaXMubWVzaC5mcnVzdHVtQ3VsbGVkID0gZmFsc2U7XG5cbiAgdGhpcy5lbmFibGVkID0gZmFsc2U7XG5cbiAgdGhpcy5kZWJ1Z0RyYXdlciA9IG5ldyBBbW1vLkRlYnVnRHJhd2VyKCk7XG4gIHRoaXMuZGVidWdEcmF3ZXIuZHJhd0xpbmUgPSB0aGlzLmRyYXdMaW5lLmJpbmQodGhpcyk7XG4gIHRoaXMuZGVidWdEcmF3ZXIuZHJhd0NvbnRhY3RQb2ludCA9IHRoaXMuZHJhd0NvbnRhY3RQb2ludC5iaW5kKHRoaXMpO1xuICB0aGlzLmRlYnVnRHJhd2VyLnJlcG9ydEVycm9yV2FybmluZyA9IHRoaXMucmVwb3J0RXJyb3JXYXJuaW5nLmJpbmQodGhpcyk7XG4gIHRoaXMuZGVidWdEcmF3ZXIuZHJhdzNkVGV4dCA9IHRoaXMuZHJhdzNkVGV4dC5iaW5kKHRoaXMpO1xuICB0aGlzLmRlYnVnRHJhd2VyLnNldERlYnVnTW9kZSA9IHRoaXMuc2V0RGVidWdNb2RlLmJpbmQodGhpcyk7XG4gIHRoaXMuZGVidWdEcmF3ZXIuZ2V0RGVidWdNb2RlID0gdGhpcy5nZXREZWJ1Z01vZGUuYmluZCh0aGlzKTtcbiAgdGhpcy5kZWJ1Z0RyYXdlci5lbmFibGUgPSB0aGlzLmVuYWJsZS5iaW5kKHRoaXMpO1xuICB0aGlzLmRlYnVnRHJhd2VyLmRpc2FibGUgPSB0aGlzLmRpc2FibGUuYmluZCh0aGlzKTtcbiAgdGhpcy5kZWJ1Z0RyYXdlci51cGRhdGUgPSB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMpO1xuXG4gIHRoaXMud29ybGQuc2V0RGVidWdEcmF3ZXIodGhpcy5kZWJ1Z0RyYXdlcik7XG59O1xuXG5USFJFRS5BbW1vRGVidWdEcmF3ZXIucHJvdG90eXBlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmRlYnVnRHJhd2VyO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbmFibGVkID0gdHJ1ZTtcbiAgdGhpcy5zY2VuZS5hZGQodGhpcy5tZXNoKTtcbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVuYWJsZWQgPSBmYWxzZTtcbiAgdGhpcy5zY2VuZS5yZW1vdmUodGhpcy5tZXNoKTtcbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5lbmFibGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKHRoaXMuaW5kZXggIT0gMCkge1xuICAgIHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5wb3NpdGlvbi5uZWVkc1VwZGF0ZSA9IHRydWU7XG4gICAgdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLmNvbG9yLm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgfVxuXG4gIHRoaXMuaW5kZXggPSAwO1xuXG4gIHRoaXMud29ybGQuZGVidWdEcmF3V29ybGQoKTtcblxuICB0aGlzLmdlb21ldHJ5LnNldERyYXdSYW5nZSgwLCB0aGlzLmluZGV4KTtcbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUuZHJhd0xpbmUgPSBmdW5jdGlvbihmcm9tLCB0bywgY29sb3IpIHtcbiAgY29uc3QgaGVhcCA9IEFtbW8uSEVBUEYzMjtcbiAgY29uc3QgciA9IGhlYXBbKGNvbG9yICsgMCkgLyA0XTtcbiAgY29uc3QgZyA9IGhlYXBbKGNvbG9yICsgNCkgLyA0XTtcbiAgY29uc3QgYiA9IGhlYXBbKGNvbG9yICsgOCkgLyA0XTtcblxuICBjb25zdCBmcm9tWCA9IGhlYXBbKGZyb20gKyAwKSAvIDRdO1xuICBjb25zdCBmcm9tWSA9IGhlYXBbKGZyb20gKyA0KSAvIDRdO1xuICBjb25zdCBmcm9tWiA9IGhlYXBbKGZyb20gKyA4KSAvIDRdO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb24uc2V0WFlaKHRoaXMuaW5kZXgsIGZyb21YLCBmcm9tWSwgZnJvbVopO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMuY29sb3Iuc2V0WFlaKHRoaXMuaW5kZXgrKywgciwgZywgYik7XG5cbiAgY29uc3QgdG9YID0gaGVhcFsodG8gKyAwKSAvIDRdO1xuICBjb25zdCB0b1kgPSBoZWFwWyh0byArIDQpIC8gNF07XG4gIGNvbnN0IHRvWiA9IGhlYXBbKHRvICsgOCkgLyA0XTtcbiAgdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLnBvc2l0aW9uLnNldFhZWih0aGlzLmluZGV4LCB0b1gsIHRvWSwgdG9aKTtcbiAgdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLmNvbG9yLnNldFhZWih0aGlzLmluZGV4KyssIHIsIGcsIGIpO1xufTtcblxuLy9UT0RPOiBmaWd1cmUgb3V0IGhvdyB0byBtYWtlIGxpZmVUaW1lIHdvcmtcblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUuZHJhd0NvbnRhY3RQb2ludCA9IGZ1bmN0aW9uKHBvaW50T25CLCBub3JtYWxPbkIsIGRpc3RhbmNlLCBsaWZlVGltZSwgY29sb3IpIHtcbiAgY29uc3QgaGVhcCA9IEFtbW8uSEVBUEYzMjtcbiAgY29uc3QgciA9IGhlYXBbKGNvbG9yICsgMCkgLyA0XTtcbiAgY29uc3QgZyA9IGhlYXBbKGNvbG9yICsgNCkgLyA0XTtcbiAgY29uc3QgYiA9IGhlYXBbKGNvbG9yICsgOCkgLyA0XTtcblxuICBjb25zdCB4ID0gaGVhcFsocG9pbnRPbkIgKyAwKSAvIDRdO1xuICBjb25zdCB5ID0gaGVhcFsocG9pbnRPbkIgKyA0KSAvIDRdO1xuICBjb25zdCB6ID0gaGVhcFsocG9pbnRPbkIgKyA4KSAvIDRdO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb24uc2V0WFlaKHRoaXMuaW5kZXgsIHgsIHksIHopO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMuY29sb3Iuc2V0WFlaKHRoaXMuaW5kZXgrKywgciwgZywgYik7XG5cbiAgY29uc3QgZHggPSBoZWFwWyhub3JtYWxPbkIgKyAwKSAvIDRdICogZGlzdGFuY2U7XG4gIGNvbnN0IGR5ID0gaGVhcFsobm9ybWFsT25CICsgNCkgLyA0XSAqIGRpc3RhbmNlO1xuICBjb25zdCBkeiA9IGhlYXBbKG5vcm1hbE9uQiArIDgpIC8gNF0gKiBkaXN0YW5jZTtcbiAgdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLnBvc2l0aW9uLnNldFhZWih0aGlzLmluZGV4LCB4ICsgZHgsIHkgKyBkeSwgeiArIGR6KTtcbiAgdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLmNvbG9yLnNldFhZWih0aGlzLmluZGV4KyssIHIsIGcsIGIpO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5yZXBvcnRFcnJvcldhcm5pbmcgPSBmdW5jdGlvbih3YXJuaW5nU3RyaW5nKSB7XG4gIGlmIChBbW1vLmhhc093blByb3BlcnR5KFwiUG9pbnRlcl9zdHJpbmdpZnlcIikpIHtcbiAgICBjb25zb2xlLndhcm4oQW1tby5Qb2ludGVyX3N0cmluZ2lmeSh3YXJuaW5nU3RyaW5nKSk7XG4gIH0gZWxzZSBpZiAoIXRoaXMud2FybmVkT25jZSkge1xuICAgIHRoaXMud2FybmVkT25jZSA9IHRydWU7XG4gICAgY29uc29sZS53YXJuKFwiQ2Fubm90IHByaW50IHdhcm5pbmdTdHJpbmcsIHBsZWFzZSByZWJ1aWxkIEFtbW8uanMgdXNpbmcgJ2RlYnVnJyBmbGFnXCIpO1xuICB9XG59O1xuXG5USFJFRS5BbW1vRGVidWdEcmF3ZXIucHJvdG90eXBlLmRyYXczZFRleHQgPSBmdW5jdGlvbihsb2NhdGlvbiwgdGV4dFN0cmluZykge1xuICAvL1RPRE9cbiAgY29uc29sZS53YXJuKFwiVE9ETzogZHJhdzNkVGV4dFwiKTtcbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUuc2V0RGVidWdNb2RlID0gZnVuY3Rpb24oZGVidWdNb2RlKSB7XG4gIHRoaXMuZGVidWdEcmF3TW9kZSA9IGRlYnVnTW9kZTtcbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUuZ2V0RGVidWdNb2RlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLmRlYnVnRHJhd01vZGU7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vKiBnbG9iYWwgQW1tbyAqL1xuaW1wb3J0ICogYXMgVEhSRUUgZnJvbSBcInRocmVlXCI7XG5cbmV4cG9ydCBjb25zdCBUWVBFID0ge1xuICBCT1g6IFwiYm94XCIsXG4gIENZTElOREVSOiBcImN5bGluZGVyXCIsXG4gIFNQSEVSRTogXCJzcGhlcmVcIixcbiAgQ0FQU1VMRTogXCJjYXBzdWxlXCIsXG4gIENPTkU6IFwiY29uZVwiLFxuICBIVUxMOiBcImh1bGxcIixcbiAgSEFDRDogXCJoYWNkXCIsIC8vSGllcmFyY2hpY2FsIEFwcHJveGltYXRlIENvbnZleCBEZWNvbXBvc2l0aW9uXG4gIFZIQUNEOiBcInZoYWNkXCIsIC8vVm9sdW1ldHJpYyBIaWVyYXJjaGljYWwgQXBwcm94aW1hdGUgQ29udmV4IERlY29tcG9zaXRpb25cbiAgTUVTSDogXCJtZXNoXCIsXG4gIEhFSUdIVEZJRUxEOiBcImhlaWdodGZpZWxkXCJcbn07XG5cbmV4cG9ydCBjb25zdCBGSVQgPSB7XG4gIEFMTDogXCJhbGxcIiwgLy9BIHNpbmdsZSBzaGFwZSBpcyBhdXRvbWF0aWNhbGx5IHNpemVkIHRvIGJvdW5kIGFsbCBtZXNoZXMgd2l0aGluIHRoZSBlbnRpdHkuXG4gIE1BTlVBTDogXCJtYW51YWxcIiAvL0Egc2luZ2xlIHNoYXBlIGlzIHNpemVkIG1hbnVhbGx5LiBSZXF1aXJlcyBoYWxmRXh0ZW50cyBvciBzcGhlcmVSYWRpdXMuXG59O1xuXG5leHBvcnQgY29uc3QgSEVJR0hURklFTERfREFUQV9UWVBFID0ge1xuICBzaG9ydDogXCJzaG9ydFwiLFxuICBmbG9hdDogXCJmbG9hdFwiXG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlQ29sbGlzaW9uU2hhcGVzID0gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gIHN3aXRjaCAob3B0aW9ucy50eXBlKSB7XG4gICAgY2FzZSBUWVBFLkJPWDpcbiAgICAgIHJldHVybiBbY3JlYXRlQm94U2hhcGUodmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyldO1xuICAgIGNhc2UgVFlQRS5DWUxJTkRFUjpcbiAgICAgIHJldHVybiBbY3JlYXRlQ3lsaW5kZXJTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLkNBUFNVTEU6XG4gICAgICByZXR1cm4gW2NyZWF0ZUNhcHN1bGVTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLkNPTkU6XG4gICAgICByZXR1cm4gW2NyZWF0ZUNvbmVTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLlNQSEVSRTpcbiAgICAgIHJldHVybiBbY3JlYXRlU3BoZXJlU2hhcGUodmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyldO1xuICAgIGNhc2UgVFlQRS5IVUxMOlxuICAgICAgcmV0dXJuIFtjcmVhdGVIdWxsU2hhcGUodmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyldO1xuICAgIGNhc2UgVFlQRS5IQUNEOlxuICAgICAgcmV0dXJuIGNyZWF0ZUhBQ0RTaGFwZXModmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyk7XG4gICAgY2FzZSBUWVBFLlZIQUNEOlxuICAgICAgcmV0dXJuIGNyZWF0ZVZIQUNEU2hhcGVzKHZlcnRpY2VzLCBtYXRyaWNlcywgaW5kZXhlcywgbWF0cml4V29ybGQsIG9wdGlvbnMpO1xuICAgIGNhc2UgVFlQRS5NRVNIOlxuICAgICAgcmV0dXJuIFtjcmVhdGVUcmlNZXNoU2hhcGUodmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyldO1xuICAgIGNhc2UgVFlQRS5IRUlHSFRGSUVMRDpcbiAgICAgIHJldHVybiBbY3JlYXRlSGVpZ2h0ZmllbGRUZXJyYWluU2hhcGUob3B0aW9ucyldO1xuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLndhcm4ob3B0aW9ucy50eXBlICsgXCIgaXMgbm90IGN1cnJlbnRseSBzdXBwb3J0ZWRcIik7XG4gICAgICByZXR1cm4gW107XG4gIH1cbn07XG5cbi8vVE9ETzogc3VwcG9ydCBnaW1wYWN0IChkeW5hbWljIHRyaW1lc2gpIGFuZCBoZWlnaHRtYXBcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUJveFNoYXBlID0gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gIG9wdGlvbnMudHlwZSA9IFRZUEUuQk9YO1xuICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5BTEwpIHtcbiAgICBvcHRpb25zLmhhbGZFeHRlbnRzID0gX2NvbXB1dGVIYWxmRXh0ZW50cyhcbiAgICAgIF9jb21wdXRlQm91bmRzKHZlcnRpY2VzLCBtYXRyaWNlcyksXG4gICAgICBvcHRpb25zLm1pbkhhbGZFeHRlbnQsXG4gICAgICBvcHRpb25zLm1heEhhbGZFeHRlbnRcbiAgICApO1xuICB9XG5cbiAgY29uc3QgYnRIYWxmRXh0ZW50cyA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhvcHRpb25zLmhhbGZFeHRlbnRzLngsIG9wdGlvbnMuaGFsZkV4dGVudHMueSwgb3B0aW9ucy5oYWxmRXh0ZW50cy56KTtcbiAgY29uc3QgY29sbGlzaW9uU2hhcGUgPSBuZXcgQW1tby5idEJveFNoYXBlKGJ0SGFsZkV4dGVudHMpO1xuICBBbW1vLmRlc3Ryb3koYnRIYWxmRXh0ZW50cyk7XG5cbiAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zLCBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKSk7XG4gIHJldHVybiBjb2xsaXNpb25TaGFwZTtcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVDeWxpbmRlclNoYXBlID0gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gIG9wdGlvbnMudHlwZSA9IFRZUEUuQ1lMSU5ERVI7XG4gIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zLmZpdCA9PT0gRklULkFMTCkge1xuICAgIG9wdGlvbnMuaGFsZkV4dGVudHMgPSBfY29tcHV0ZUhhbGZFeHRlbnRzKFxuICAgICAgX2NvbXB1dGVCb3VuZHModmVydGljZXMsIG1hdHJpY2VzKSxcbiAgICAgIG9wdGlvbnMubWluSGFsZkV4dGVudCxcbiAgICAgIG9wdGlvbnMubWF4SGFsZkV4dGVudFxuICAgICk7XG4gIH1cblxuICBjb25zdCBidEhhbGZFeHRlbnRzID0gbmV3IEFtbW8uYnRWZWN0b3IzKG9wdGlvbnMuaGFsZkV4dGVudHMueCwgb3B0aW9ucy5oYWxmRXh0ZW50cy55LCBvcHRpb25zLmhhbGZFeHRlbnRzLnopO1xuICBjb25zdCBjb2xsaXNpb25TaGFwZSA9ICgoKSA9PiB7XG4gICAgc3dpdGNoIChvcHRpb25zLmN5bGluZGVyQXhpcykge1xuICAgICAgY2FzZSBcInlcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q3lsaW5kZXJTaGFwZShidEhhbGZFeHRlbnRzKTtcbiAgICAgIGNhc2UgXCJ4XCI6XG4gICAgICAgIHJldHVybiBuZXcgQW1tby5idEN5bGluZGVyU2hhcGVYKGJ0SGFsZkV4dGVudHMpO1xuICAgICAgY2FzZSBcInpcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q3lsaW5kZXJTaGFwZVooYnRIYWxmRXh0ZW50cyk7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9KSgpO1xuICBBbW1vLmRlc3Ryb3koYnRIYWxmRXh0ZW50cyk7XG5cbiAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zLCBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKSk7XG4gIHJldHVybiBjb2xsaXNpb25TaGFwZTtcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVDYXBzdWxlU2hhcGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgb3B0aW9ucy50eXBlID0gVFlQRS5DQVBTVUxFO1xuICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5BTEwpIHtcbiAgICBvcHRpb25zLmhhbGZFeHRlbnRzID0gX2NvbXB1dGVIYWxmRXh0ZW50cyhcbiAgICAgIF9jb21wdXRlQm91bmRzKHZlcnRpY2VzLCBtYXRyaWNlcyksXG4gICAgICBvcHRpb25zLm1pbkhhbGZFeHRlbnQsXG4gICAgICBvcHRpb25zLm1heEhhbGZFeHRlbnRcbiAgICApO1xuICB9XG5cbiAgY29uc3QgeyB4LCB5LCB6IH0gPSBvcHRpb25zLmhhbGZFeHRlbnRzO1xuICBjb25zdCBjb2xsaXNpb25TaGFwZSA9ICgoKSA9PiB7XG4gICAgc3dpdGNoIChvcHRpb25zLmN5bGluZGVyQXhpcykge1xuICAgICAgY2FzZSBcInlcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q2Fwc3VsZVNoYXBlKE1hdGgubWF4KHgsIHopLCB5ICogMik7XG4gICAgICBjYXNlIFwieFwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDYXBzdWxlU2hhcGVYKE1hdGgubWF4KHksIHopLCB4ICogMik7XG4gICAgICBjYXNlIFwielwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDYXBzdWxlU2hhcGVaKE1hdGgubWF4KHgsIHkpLCB6ICogMik7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9KSgpO1xuXG4gIF9maW5pc2hDb2xsaXNpb25TaGFwZShjb2xsaXNpb25TaGFwZSwgb3B0aW9ucywgX2NvbXB1dGVTY2FsZShtYXRyaXhXb3JsZCwgb3B0aW9ucykpO1xuICByZXR1cm4gY29sbGlzaW9uU2hhcGU7XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlQ29uZVNoYXBlID0gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gIG9wdGlvbnMudHlwZSA9IFRZUEUuQ09ORTtcbiAgX3NldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuQUxMKSB7XG4gICAgb3B0aW9ucy5oYWxmRXh0ZW50cyA9IF9jb21wdXRlSGFsZkV4dGVudHMoXG4gICAgICBfY29tcHV0ZUJvdW5kcyh2ZXJ0aWNlcywgbWF0cmljZXMpLFxuICAgICAgb3B0aW9ucy5taW5IYWxmRXh0ZW50LFxuICAgICAgb3B0aW9ucy5tYXhIYWxmRXh0ZW50XG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHsgeCwgeSwgeiB9ID0gb3B0aW9ucy5oYWxmRXh0ZW50cztcbiAgY29uc3QgY29sbGlzaW9uU2hhcGUgPSAoKCkgPT4ge1xuICAgIHN3aXRjaCAob3B0aW9ucy5jeWxpbmRlckF4aXMpIHtcbiAgICAgIGNhc2UgXCJ5XCI6XG4gICAgICAgIHJldHVybiBuZXcgQW1tby5idENvbmVTaGFwZShNYXRoLm1heCh4LCB6KSwgeSAqIDIpO1xuICAgICAgY2FzZSBcInhcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q29uZVNoYXBlWChNYXRoLm1heCh5LCB6KSwgeCAqIDIpO1xuICAgICAgY2FzZSBcInpcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q29uZVNoYXBlWihNYXRoLm1heCh4LCB5KSwgeiAqIDIpO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSkoKTtcblxuICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoY29sbGlzaW9uU2hhcGUsIG9wdGlvbnMsIF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpKTtcbiAgcmV0dXJuIGNvbGxpc2lvblNoYXBlO1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVNwaGVyZVNoYXBlID0gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gIG9wdGlvbnMudHlwZSA9IFRZUEUuU1BIRVJFO1xuICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICBsZXQgcmFkaXVzO1xuICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5NQU5VQUwgJiYgIWlzTmFOKG9wdGlvbnMuc3BoZXJlUmFkaXVzKSkge1xuICAgIHJhZGl1cyA9IG9wdGlvbnMuc3BoZXJlUmFkaXVzO1xuICB9IGVsc2Uge1xuICAgIHJhZGl1cyA9IF9jb21wdXRlUmFkaXVzKHZlcnRpY2VzLCBtYXRyaWNlcywgX2NvbXB1dGVCb3VuZHModmVydGljZXMsIG1hdHJpY2VzKSk7XG4gIH1cblxuICBjb25zdCBjb2xsaXNpb25TaGFwZSA9IG5ldyBBbW1vLmJ0U3BoZXJlU2hhcGUocmFkaXVzKTtcbiAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zLCBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKSk7XG5cbiAgcmV0dXJuIGNvbGxpc2lvblNoYXBlO1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUh1bGxTaGFwZSA9IChmdW5jdGlvbigpIHtcbiAgY29uc3QgdmVydGV4ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgbWF0cml4ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXRyaWNlcywgbWF0cml4V29ybGQsIG9wdGlvbnMgPSB7fSkge1xuICAgIG9wdGlvbnMudHlwZSA9IFRZUEUuSFVMTDtcbiAgICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zLmZpdCA9PT0gRklULk1BTlVBTCkge1xuICAgICAgY29uc29sZS53YXJuKFwiY2Fubm90IHVzZSBmaXQ6IG1hbnVhbCB3aXRoIHR5cGU6IGh1bGxcIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBib3VuZHMgPSBfY29tcHV0ZUJvdW5kcyh2ZXJ0aWNlcywgbWF0cmljZXMpO1xuXG4gICAgY29uc3QgYnRWZXJ0ZXggPSBuZXcgQW1tby5idFZlY3RvcjMoKTtcbiAgICBjb25zdCBvcmlnaW5hbEh1bGwgPSBuZXcgQW1tby5idENvbnZleEh1bGxTaGFwZSgpO1xuICAgIG9yaWdpbmFsSHVsbC5zZXRNYXJnaW4ob3B0aW9ucy5tYXJnaW4pO1xuICAgIGNlbnRlci5hZGRWZWN0b3JzKGJvdW5kcy5tYXgsIGJvdW5kcy5taW4pLm11bHRpcGx5U2NhbGFyKDAuNSk7XG5cbiAgICBsZXQgdmVydGV4Q291bnQgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZlcnRleENvdW50ICs9IHZlcnRpY2VzW2ldLmxlbmd0aCAvIDM7XG4gICAgfVxuXG4gICAgY29uc3QgbWF4VmVydGljZXMgPSBvcHRpb25zLmh1bGxNYXhWZXJ0aWNlcyB8fCAxMDAwMDA7XG4gICAgLy8gdG9kbzogbWlnaHQgd2FudCB0byBpbXBsZW1lbnQgdGhpcyBpbiBhIGRldGVybWluaXN0aWMgd2F5IHRoYXQgZG9lc24ndCBkbyBPKHZlcnRzKSBjYWxscyB0byBNYXRoLnJhbmRvbVxuICAgIGlmICh2ZXJ0ZXhDb3VudCA+IG1heFZlcnRpY2VzKSB7XG4gICAgICBjb25zb2xlLndhcm4oYHRvbyBtYW55IHZlcnRpY2VzIGZvciBodWxsIHNoYXBlOyBzYW1wbGluZyB+JHttYXhWZXJ0aWNlc30gZnJvbSB+JHt2ZXJ0ZXhDb3VudH0gdmVydGljZXNgKTtcbiAgICB9XG4gICAgY29uc3QgcCA9IE1hdGgubWluKDEsIG1heFZlcnRpY2VzIC8gdmVydGV4Q291bnQpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IHZlcnRpY2VzW2ldO1xuICAgICAgbWF0cml4LmZyb21BcnJheShtYXRyaWNlc1tpXSk7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNvbXBvbmVudHMubGVuZ3RoOyBqICs9IDMpIHtcbiAgICAgICAgY29uc3QgaXNMYXN0VmVydGV4ID0gaSA9PT0gdmVydGljZXMubGVuZ3RoIC0gMSAmJiBqID09PSBjb21wb25lbnRzLmxlbmd0aCAtIDM7XG4gICAgICAgIGlmIChNYXRoLnJhbmRvbSgpIDw9IHAgfHwgaXNMYXN0VmVydGV4KSB7XG4gICAgICAgICAgLy8gYWx3YXlzIGluY2x1ZGUgdGhlIGxhc3QgdmVydGV4XG4gICAgICAgICAgdmVydGV4XG4gICAgICAgICAgICAuc2V0KGNvbXBvbmVudHNbal0sIGNvbXBvbmVudHNbaiArIDFdLCBjb21wb25lbnRzW2ogKyAyXSlcbiAgICAgICAgICAgIC5hcHBseU1hdHJpeDQobWF0cml4KVxuICAgICAgICAgICAgLnN1YihjZW50ZXIpO1xuICAgICAgICAgIGJ0VmVydGV4LnNldFZhbHVlKHZlcnRleC54LCB2ZXJ0ZXgueSwgdmVydGV4LnopO1xuICAgICAgICAgIG9yaWdpbmFsSHVsbC5hZGRQb2ludChidFZlcnRleCwgaXNMYXN0VmVydGV4KTsgLy8gcmVjYWxjIEFBQkIgb25seSBvbiBsYXN0IGdlb21ldHJ5XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgY29sbGlzaW9uU2hhcGUgPSBvcmlnaW5hbEh1bGw7XG4gICAgaWYgKG9yaWdpbmFsSHVsbC5nZXROdW1WZXJ0aWNlcygpID49IDEwMCkge1xuICAgICAgLy9CdWxsZXQgZG9jdW1lbnRhdGlvbiBzYXlzIGRvbid0IHVzZSBjb252ZXhIdWxscyB3aXRoIDEwMCB2ZXJ0cyBvciBtb3JlXG4gICAgICBjb25zdCBzaGFwZUh1bGwgPSBuZXcgQW1tby5idFNoYXBlSHVsbChvcmlnaW5hbEh1bGwpO1xuICAgICAgc2hhcGVIdWxsLmJ1aWxkSHVsbChvcHRpb25zLm1hcmdpbik7XG4gICAgICBBbW1vLmRlc3Ryb3kob3JpZ2luYWxIdWxsKTtcbiAgICAgIGNvbGxpc2lvblNoYXBlID0gbmV3IEFtbW8uYnRDb252ZXhIdWxsU2hhcGUoXG4gICAgICAgIEFtbW8uZ2V0UG9pbnRlcihzaGFwZUh1bGwuZ2V0VmVydGV4UG9pbnRlcigpKSxcbiAgICAgICAgc2hhcGVIdWxsLm51bVZlcnRpY2VzKClcbiAgICAgICk7XG4gICAgICBBbW1vLmRlc3Ryb3koc2hhcGVIdWxsKTsgLy8gYnRDb252ZXhIdWxsU2hhcGUgbWFrZXMgYSBjb3B5XG4gICAgfVxuXG4gICAgQW1tby5kZXN0cm95KGJ0VmVydGV4KTtcblxuICAgIF9maW5pc2hDb2xsaXNpb25TaGFwZShjb2xsaXNpb25TaGFwZSwgb3B0aW9ucywgX2NvbXB1dGVTY2FsZShtYXRyaXhXb3JsZCwgb3B0aW9ucykpO1xuICAgIHJldHVybiBjb2xsaXNpb25TaGFwZTtcbiAgfTtcbn0pKCk7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVIQUNEU2hhcGVzID0gKGZ1bmN0aW9uKCkge1xuICBjb25zdCB2ZWN0b3IgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBjZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICByZXR1cm4gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgb3B0aW9ucy50eXBlID0gVFlQRS5IQUNEO1xuICAgIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuTUFOVUFMKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjYW5ub3QgdXNlIGZpdDogbWFudWFsIHdpdGggdHlwZTogaGFjZFwiKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBpZiAoIUFtbW8uaGFzT3duUHJvcGVydHkoXCJIQUNEXCIpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIFwiSEFDRCB1bmF2YWlsYWJsZSBpbiBpbmNsdWRlZCBidWlsZCBvZiBBbW1vLmpzLiBWaXNpdCBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYXJlYWxpdHkvYW1tby5qcyBmb3IgdGhlIGxhdGVzdCB2ZXJzaW9uLlwiXG4gICAgICApO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGJvdW5kcyA9IF9jb21wdXRlQm91bmRzKHZlcnRpY2VzLCBtYXRyaWNlcyk7XG4gICAgY29uc3Qgc2NhbGUgPSBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKTtcblxuICAgIGxldCB2ZXJ0ZXhDb3VudCA9IDA7XG4gICAgbGV0IHRyaUNvdW50ID0gMDtcbiAgICBjZW50ZXIuYWRkVmVjdG9ycyhib3VuZHMubWF4LCBib3VuZHMubWluKS5tdWx0aXBseVNjYWxhcigwLjUpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmVydGV4Q291bnQgKz0gdmVydGljZXNbaV0ubGVuZ3RoIC8gMztcbiAgICAgIGlmIChpbmRleGVzICYmIGluZGV4ZXNbaV0pIHtcbiAgICAgICAgdHJpQ291bnQgKz0gaW5kZXhlc1tpXS5sZW5ndGggLyAzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJpQ291bnQgKz0gdmVydGljZXNbaV0ubGVuZ3RoIC8gOTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBoYWNkID0gbmV3IEFtbW8uSEFDRCgpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiY29tcGFjaXR5V2VpZ2h0XCIpKSBoYWNkLlNldENvbXBhY2l0eVdlaWdodChvcHRpb25zLmNvbXBhY2l0eVdlaWdodCk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJ2b2x1bWVXZWlnaHRcIikpIGhhY2QuU2V0Vm9sdW1lV2VpZ2h0KG9wdGlvbnMudm9sdW1lV2VpZ2h0KTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcIm5DbHVzdGVyc1wiKSkgaGFjZC5TZXROQ2x1c3RlcnMob3B0aW9ucy5uQ2x1c3RlcnMpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiblZlcnRpY2VzUGVyQ0hcIikpIGhhY2QuU2V0TlZlcnRpY2VzUGVyQ0gob3B0aW9ucy5uVmVydGljZXNQZXJDSCk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJjb25jYXZpdHlcIikpIGhhY2QuU2V0Q29uY2F2aXR5KG9wdGlvbnMuY29uY2F2aXR5KTtcblxuICAgIGNvbnN0IHBvaW50cyA9IEFtbW8uX21hbGxvYyh2ZXJ0ZXhDb3VudCAqIDMgKiA4KTtcbiAgICBjb25zdCB0cmlhbmdsZXMgPSBBbW1vLl9tYWxsb2ModHJpQ291bnQgKiAzICogNCk7XG4gICAgaGFjZC5TZXRQb2ludHMocG9pbnRzKTtcbiAgICBoYWNkLlNldFRyaWFuZ2xlcyh0cmlhbmdsZXMpO1xuICAgIGhhY2QuU2V0TlBvaW50cyh2ZXJ0ZXhDb3VudCk7XG4gICAgaGFjZC5TZXROVHJpYW5nbGVzKHRyaUNvdW50KTtcblxuICAgIGxldCBwcHRyID0gcG9pbnRzIC8gOCxcbiAgICAgIHRwdHIgPSB0cmlhbmdsZXMgLyA0O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IHZlcnRpY2VzW2ldO1xuICAgICAgbWF0cml4LmZyb21BcnJheShtYXRyaWNlc1tpXSk7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNvbXBvbmVudHMubGVuZ3RoOyBqICs9IDMpIHtcbiAgICAgICAgdmVjdG9yXG4gICAgICAgICAgLnNldChjb21wb25lbnRzW2ogKyAwXSwgY29tcG9uZW50c1tqICsgMV0sIGNvbXBvbmVudHNbaiArIDJdKVxuICAgICAgICAgIC5hcHBseU1hdHJpeDQobWF0cml4KVxuICAgICAgICAgIC5zdWIoY2VudGVyKTtcbiAgICAgICAgQW1tby5IRUFQRjY0W3BwdHIgKyAwXSA9IHZlY3Rvci54O1xuICAgICAgICBBbW1vLkhFQVBGNjRbcHB0ciArIDFdID0gdmVjdG9yLnk7XG4gICAgICAgIEFtbW8uSEVBUEY2NFtwcHRyICsgMl0gPSB2ZWN0b3IuejtcbiAgICAgICAgcHB0ciArPSAzO1xuICAgICAgfVxuICAgICAgaWYgKGluZGV4ZXNbaV0pIHtcbiAgICAgICAgY29uc3QgaW5kaWNlcyA9IGluZGV4ZXNbaV07XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgaW5kaWNlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgIEFtbW8uSEVBUDMyW3RwdHJdID0gaW5kaWNlc1tqXTtcbiAgICAgICAgICB0cHRyKys7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29tcG9uZW50cy5sZW5ndGggLyAzOyBqKyspIHtcbiAgICAgICAgICBBbW1vLkhFQVAzMlt0cHRyXSA9IGo7XG4gICAgICAgICAgdHB0cisrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaGFjZC5Db21wdXRlKCk7XG4gICAgQW1tby5fZnJlZShwb2ludHMpO1xuICAgIEFtbW8uX2ZyZWUodHJpYW5nbGVzKTtcbiAgICBjb25zdCBuQ2x1c3RlcnMgPSBoYWNkLkdldE5DbHVzdGVycygpO1xuXG4gICAgY29uc3Qgc2hhcGVzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuQ2x1c3RlcnM7IGkrKykge1xuICAgICAgY29uc3QgaHVsbCA9IG5ldyBBbW1vLmJ0Q29udmV4SHVsbFNoYXBlKCk7XG4gICAgICBodWxsLnNldE1hcmdpbihvcHRpb25zLm1hcmdpbik7XG4gICAgICBjb25zdCBuUG9pbnRzID0gaGFjZC5HZXROUG9pbnRzQ0goaSk7XG4gICAgICBjb25zdCBuVHJpYW5nbGVzID0gaGFjZC5HZXROVHJpYW5nbGVzQ0goaSk7XG4gICAgICBjb25zdCBodWxsUG9pbnRzID0gQW1tby5fbWFsbG9jKG5Qb2ludHMgKiAzICogOCk7XG4gICAgICBjb25zdCBodWxsVHJpYW5nbGVzID0gQW1tby5fbWFsbG9jKG5UcmlhbmdsZXMgKiAzICogNCk7XG4gICAgICBoYWNkLkdldENIKGksIGh1bGxQb2ludHMsIGh1bGxUcmlhbmdsZXMpO1xuXG4gICAgICBjb25zdCBwcHRyID0gaHVsbFBvaW50cyAvIDg7XG4gICAgICBmb3IgKGxldCBwaSA9IDA7IHBpIDwgblBvaW50czsgcGkrKykge1xuICAgICAgICBjb25zdCBidFZlcnRleCA9IG5ldyBBbW1vLmJ0VmVjdG9yMygpO1xuICAgICAgICBjb25zdCBweCA9IEFtbW8uSEVBUEY2NFtwcHRyICsgcGkgKiAzICsgMF07XG4gICAgICAgIGNvbnN0IHB5ID0gQW1tby5IRUFQRjY0W3BwdHIgKyBwaSAqIDMgKyAxXTtcbiAgICAgICAgY29uc3QgcHogPSBBbW1vLkhFQVBGNjRbcHB0ciArIHBpICogMyArIDJdO1xuICAgICAgICBidFZlcnRleC5zZXRWYWx1ZShweCwgcHksIHB6KTtcbiAgICAgICAgaHVsbC5hZGRQb2ludChidFZlcnRleCwgcGkgPT09IG5Qb2ludHMgLSAxKTtcbiAgICAgICAgQW1tby5kZXN0cm95KGJ0VmVydGV4KTtcbiAgICAgIH1cblxuICAgICAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGh1bGwsIG9wdGlvbnMsIHNjYWxlKTtcbiAgICAgIHNoYXBlcy5wdXNoKGh1bGwpO1xuICAgIH1cblxuICAgIHJldHVybiBzaGFwZXM7XG4gIH07XG59KSgpO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlVkhBQ0RTaGFwZXMgPSAoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IHZlY3RvciA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IG1hdHJpeCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG4gIHJldHVybiBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIGluZGV4ZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgICBvcHRpb25zLnR5cGUgPSBUWVBFLlZIQUNEO1xuICAgIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuTUFOVUFMKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjYW5ub3QgdXNlIGZpdDogbWFudWFsIHdpdGggdHlwZTogdmhhY2RcIik7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgaWYgKCFBbW1vLmhhc093blByb3BlcnR5KFwiVkhBQ0RcIikpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgXCJWSEFDRCB1bmF2YWlsYWJsZSBpbiBpbmNsdWRlZCBidWlsZCBvZiBBbW1vLmpzLiBWaXNpdCBodHRwczovL2dpdGh1Yi5jb20vbW96aWxsYXJlYWxpdHkvYW1tby5qcyBmb3IgdGhlIGxhdGVzdCB2ZXJzaW9uLlwiXG4gICAgICApO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGNvbnN0IGJvdW5kcyA9IF9jb21wdXRlQm91bmRzKHZlcnRpY2VzLCBtYXRyaWNlcyk7XG4gICAgY29uc3Qgc2NhbGUgPSBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKTtcblxuICAgIGxldCB2ZXJ0ZXhDb3VudCA9IDA7XG4gICAgbGV0IHRyaUNvdW50ID0gMDtcbiAgICBjZW50ZXIuYWRkVmVjdG9ycyhib3VuZHMubWF4LCBib3VuZHMubWluKS5tdWx0aXBseVNjYWxhcigwLjUpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmVydGV4Q291bnQgKz0gdmVydGljZXNbaV0ubGVuZ3RoIC8gMztcbiAgICAgIGlmIChpbmRleGVzICYmIGluZGV4ZXNbaV0pIHtcbiAgICAgICAgdHJpQ291bnQgKz0gaW5kZXhlc1tpXS5sZW5ndGggLyAzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdHJpQ291bnQgKz0gdmVydGljZXNbaV0ubGVuZ3RoIC8gOTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB2aGFjZCA9IG5ldyBBbW1vLlZIQUNEKCk7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IEFtbW8uUGFyYW1ldGVycygpO1xuICAgIC8vaHR0cHM6Ly9rbWFtb3UuYmxvZ3Nwb3QuY29tLzIwMTQvMTIvdi1oYWNkLTIwLXBhcmFtZXRlcnMtZGVzY3JpcHRpb24uaHRtbFxuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwicmVzb2x1dGlvblwiKSkgcGFyYW1zLnNldF9tX3Jlc29sdXRpb24ob3B0aW9ucy5yZXNvbHV0aW9uKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImRlcHRoXCIpKSBwYXJhbXMuc2V0X21fZGVwdGgob3B0aW9ucy5kZXB0aCk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJjb25jYXZpdHlcIikpIHBhcmFtcy5zZXRfbV9jb25jYXZpdHkob3B0aW9ucy5jb25jYXZpdHkpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwicGxhbmVEb3duc2FtcGxpbmdcIikpIHBhcmFtcy5zZXRfbV9wbGFuZURvd25zYW1wbGluZyhvcHRpb25zLnBsYW5lRG93bnNhbXBsaW5nKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImNvbnZleGh1bGxEb3duc2FtcGxpbmdcIikpXG4gICAgICBwYXJhbXMuc2V0X21fY29udmV4aHVsbERvd25zYW1wbGluZyhvcHRpb25zLmNvbnZleGh1bGxEb3duc2FtcGxpbmcpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiYWxwaGFcIikpIHBhcmFtcy5zZXRfbV9hbHBoYShvcHRpb25zLmFscGhhKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImJldGFcIikpIHBhcmFtcy5zZXRfbV9iZXRhKG9wdGlvbnMuYmV0YSk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJnYW1tYVwiKSkgcGFyYW1zLnNldF9tX2dhbW1hKG9wdGlvbnMuZ2FtbWEpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwicGNhXCIpKSBwYXJhbXMuc2V0X21fcGNhKG9wdGlvbnMucGNhKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcIm1vZGVcIikpIHBhcmFtcy5zZXRfbV9tb2RlKG9wdGlvbnMubW9kZSk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJtYXhOdW1WZXJ0aWNlc1BlckNIXCIpKSBwYXJhbXMuc2V0X21fbWF4TnVtVmVydGljZXNQZXJDSChvcHRpb25zLm1heE51bVZlcnRpY2VzUGVyQ0gpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwibWluVm9sdW1lUGVyQ0hcIikpIHBhcmFtcy5zZXRfbV9taW5Wb2x1bWVQZXJDSChvcHRpb25zLm1pblZvbHVtZVBlckNIKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImNvbnZleGh1bGxBcHByb3hpbWF0aW9uXCIpKVxuICAgICAgcGFyYW1zLnNldF9tX2NvbnZleGh1bGxBcHByb3hpbWF0aW9uKG9wdGlvbnMuY29udmV4aHVsbEFwcHJveGltYXRpb24pO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwib2NsQWNjZWxlcmF0aW9uXCIpKSBwYXJhbXMuc2V0X21fb2NsQWNjZWxlcmF0aW9uKG9wdGlvbnMub2NsQWNjZWxlcmF0aW9uKTtcblxuICAgIGNvbnN0IHBvaW50cyA9IEFtbW8uX21hbGxvYyh2ZXJ0ZXhDb3VudCAqIDMgKiA4ICsgMyk7XG4gICAgY29uc3QgdHJpYW5nbGVzID0gQW1tby5fbWFsbG9jKHRyaUNvdW50ICogMyAqIDQpO1xuXG4gICAgbGV0IHBwdHIgPSBwb2ludHMgLyA4LFxuICAgICAgdHB0ciA9IHRyaWFuZ2xlcyAvIDQ7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjb21wb25lbnRzID0gdmVydGljZXNbaV07XG4gICAgICBtYXRyaXguZnJvbUFycmF5KG1hdHJpY2VzW2ldKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29tcG9uZW50cy5sZW5ndGg7IGogKz0gMykge1xuICAgICAgICB2ZWN0b3JcbiAgICAgICAgICAuc2V0KGNvbXBvbmVudHNbaiArIDBdLCBjb21wb25lbnRzW2ogKyAxXSwgY29tcG9uZW50c1tqICsgMl0pXG4gICAgICAgICAgLmFwcGx5TWF0cml4NChtYXRyaXgpXG4gICAgICAgICAgLnN1YihjZW50ZXIpO1xuICAgICAgICBBbW1vLkhFQVBGNjRbcHB0ciArIDBdID0gdmVjdG9yLng7XG4gICAgICAgIEFtbW8uSEVBUEY2NFtwcHRyICsgMV0gPSB2ZWN0b3IueTtcbiAgICAgICAgQW1tby5IRUFQRjY0W3BwdHIgKyAyXSA9IHZlY3Rvci56O1xuICAgICAgICBwcHRyICs9IDM7XG4gICAgICB9XG4gICAgICBpZiAoaW5kZXhlc1tpXSkge1xuICAgICAgICBjb25zdCBpbmRpY2VzID0gaW5kZXhlc1tpXTtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpbmRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgQW1tby5IRUFQMzJbdHB0cl0gPSBpbmRpY2VzW2pdO1xuICAgICAgICAgIHRwdHIrKztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb21wb25lbnRzLmxlbmd0aCAvIDM7IGorKykge1xuICAgICAgICAgIEFtbW8uSEVBUDMyW3RwdHJdID0gajtcbiAgICAgICAgICB0cHRyKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmhhY2QuQ29tcHV0ZShwb2ludHMsIDMsIHZlcnRleENvdW50LCB0cmlhbmdsZXMsIDMsIHRyaUNvdW50LCBwYXJhbXMpO1xuICAgIEFtbW8uX2ZyZWUocG9pbnRzKTtcbiAgICBBbW1vLl9mcmVlKHRyaWFuZ2xlcyk7XG4gICAgY29uc3Qgbkh1bGxzID0gdmhhY2QuR2V0TkNvbnZleEh1bGxzKCk7XG5cbiAgICBjb25zdCBzaGFwZXMgPSBbXTtcbiAgICBjb25zdCBjaCA9IG5ldyBBbW1vLkNvbnZleEh1bGwoKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5IdWxsczsgaSsrKSB7XG4gICAgICB2aGFjZC5HZXRDb252ZXhIdWxsKGksIGNoKTtcbiAgICAgIGNvbnN0IG5Qb2ludHMgPSBjaC5nZXRfbV9uUG9pbnRzKCk7XG4gICAgICBjb25zdCBodWxsUG9pbnRzID0gY2guZ2V0X21fcG9pbnRzKCk7XG5cbiAgICAgIGNvbnN0IGh1bGwgPSBuZXcgQW1tby5idENvbnZleEh1bGxTaGFwZSgpO1xuICAgICAgaHVsbC5zZXRNYXJnaW4ob3B0aW9ucy5tYXJnaW4pO1xuXG4gICAgICBmb3IgKGxldCBwaSA9IDA7IHBpIDwgblBvaW50czsgcGkrKykge1xuICAgICAgICBjb25zdCBidFZlcnRleCA9IG5ldyBBbW1vLmJ0VmVjdG9yMygpO1xuICAgICAgICBjb25zdCBweCA9IGNoLmdldF9tX3BvaW50cyhwaSAqIDMgKyAwKTtcbiAgICAgICAgY29uc3QgcHkgPSBjaC5nZXRfbV9wb2ludHMocGkgKiAzICsgMSk7XG4gICAgICAgIGNvbnN0IHB6ID0gY2guZ2V0X21fcG9pbnRzKHBpICogMyArIDIpO1xuICAgICAgICBidFZlcnRleC5zZXRWYWx1ZShweCwgcHksIHB6KTtcbiAgICAgICAgaHVsbC5hZGRQb2ludChidFZlcnRleCwgcGkgPT09IG5Qb2ludHMgLSAxKTtcbiAgICAgICAgQW1tby5kZXN0cm95KGJ0VmVydGV4KTtcbiAgICAgIH1cblxuICAgICAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGh1bGwsIG9wdGlvbnMsIHNjYWxlKTtcbiAgICAgIHNoYXBlcy5wdXNoKGh1bGwpO1xuICAgIH1cbiAgICBBbW1vLmRlc3Ryb3koY2gpO1xuICAgIEFtbW8uZGVzdHJveSh2aGFjZCk7XG5cbiAgICByZXR1cm4gc2hhcGVzO1xuICB9O1xufSkoKTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVRyaU1lc2hTaGFwZSA9IChmdW5jdGlvbigpIHtcbiAgY29uc3QgdmEgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCB2YiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IHZjID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgbWF0cml4ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXRyaWNlcywgaW5kZXhlcywgbWF0cml4V29ybGQsIG9wdGlvbnMgPSB7fSkge1xuICAgIG9wdGlvbnMudHlwZSA9IFRZUEUuTUVTSDtcbiAgICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICAgIGlmIChvcHRpb25zLmZpdCA9PT0gRklULk1BTlVBTCkge1xuICAgICAgY29uc29sZS53YXJuKFwiY2Fubm90IHVzZSBmaXQ6IG1hbnVhbCB3aXRoIHR5cGU6IG1lc2hcIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBzY2FsZSA9IF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpO1xuXG4gICAgY29uc3QgYnRhID0gbmV3IEFtbW8uYnRWZWN0b3IzKCk7XG4gICAgY29uc3QgYnRiID0gbmV3IEFtbW8uYnRWZWN0b3IzKCk7XG4gICAgY29uc3QgYnRjID0gbmV3IEFtbW8uYnRWZWN0b3IzKCk7XG4gICAgY29uc3QgdHJpTWVzaCA9IG5ldyBBbW1vLmJ0VHJpYW5nbGVNZXNoKHRydWUsIGZhbHNlKTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSB2ZXJ0aWNlc1tpXTtcbiAgICAgIGNvbnN0IGluZGV4ID0gaW5kZXhlc1tpXSA/IGluZGV4ZXNbaV0gOiBudWxsO1xuICAgICAgbWF0cml4LmZyb21BcnJheShtYXRyaWNlc1tpXSk7XG4gICAgICBpZiAoaW5kZXgpIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpbmRleC5sZW5ndGg7IGogKz0gMykge1xuICAgICAgICAgIGNvbnN0IGFpID0gaW5kZXhbal0gKiAzO1xuICAgICAgICAgIGNvbnN0IGJpID0gaW5kZXhbaiArIDFdICogMztcbiAgICAgICAgICBjb25zdCBjaSA9IGluZGV4W2ogKyAyXSAqIDM7XG4gICAgICAgICAgdmEuc2V0KGNvbXBvbmVudHNbYWldLCBjb21wb25lbnRzW2FpICsgMV0sIGNvbXBvbmVudHNbYWkgKyAyXSkuYXBwbHlNYXRyaXg0KG1hdHJpeCk7XG4gICAgICAgICAgdmIuc2V0KGNvbXBvbmVudHNbYmldLCBjb21wb25lbnRzW2JpICsgMV0sIGNvbXBvbmVudHNbYmkgKyAyXSkuYXBwbHlNYXRyaXg0KG1hdHJpeCk7XG4gICAgICAgICAgdmMuc2V0KGNvbXBvbmVudHNbY2ldLCBjb21wb25lbnRzW2NpICsgMV0sIGNvbXBvbmVudHNbY2kgKyAyXSkuYXBwbHlNYXRyaXg0KG1hdHJpeCk7XG4gICAgICAgICAgYnRhLnNldFZhbHVlKHZhLngsIHZhLnksIHZhLnopO1xuICAgICAgICAgIGJ0Yi5zZXRWYWx1ZSh2Yi54LCB2Yi55LCB2Yi56KTtcbiAgICAgICAgICBidGMuc2V0VmFsdWUodmMueCwgdmMueSwgdmMueik7XG4gICAgICAgICAgdHJpTWVzaC5hZGRUcmlhbmdsZShidGEsIGJ0YiwgYnRjLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29tcG9uZW50cy5sZW5ndGg7IGogKz0gOSkge1xuICAgICAgICAgIHZhLnNldChjb21wb25lbnRzW2ogKyAwXSwgY29tcG9uZW50c1tqICsgMV0sIGNvbXBvbmVudHNbaiArIDJdKS5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgICAgICAgICB2Yi5zZXQoY29tcG9uZW50c1tqICsgM10sIGNvbXBvbmVudHNbaiArIDRdLCBjb21wb25lbnRzW2ogKyA1XSkuYXBwbHlNYXRyaXg0KG1hdHJpeCk7XG4gICAgICAgICAgdmMuc2V0KGNvbXBvbmVudHNbaiArIDZdLCBjb21wb25lbnRzW2ogKyA3XSwgY29tcG9uZW50c1tqICsgOF0pLmFwcGx5TWF0cml4NChtYXRyaXgpO1xuICAgICAgICAgIGJ0YS5zZXRWYWx1ZSh2YS54LCB2YS55LCB2YS56KTtcbiAgICAgICAgICBidGIuc2V0VmFsdWUodmIueCwgdmIueSwgdmIueik7XG4gICAgICAgICAgYnRjLnNldFZhbHVlKHZjLngsIHZjLnksIHZjLnopO1xuICAgICAgICAgIHRyaU1lc2guYWRkVHJpYW5nbGUoYnRhLCBidGIsIGJ0YywgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbG9jYWxTY2FsZSA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhzY2FsZS54LCBzY2FsZS55LCBzY2FsZS56KTtcbiAgICB0cmlNZXNoLnNldFNjYWxpbmcobG9jYWxTY2FsZSk7XG4gICAgQW1tby5kZXN0cm95KGxvY2FsU2NhbGUpO1xuXG4gICAgY29uc3QgY29sbGlzaW9uU2hhcGUgPSBuZXcgQW1tby5idEJ2aFRyaWFuZ2xlTWVzaFNoYXBlKHRyaU1lc2gsIHRydWUsIHRydWUpO1xuICAgIGNvbGxpc2lvblNoYXBlLnJlc291cmNlcyA9IFt0cmlNZXNoXTtcblxuICAgIEFtbW8uZGVzdHJveShidGEpO1xuICAgIEFtbW8uZGVzdHJveShidGIpO1xuICAgIEFtbW8uZGVzdHJveShidGMpO1xuXG4gICAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zKTtcbiAgICByZXR1cm4gY29sbGlzaW9uU2hhcGU7XG4gIH07XG59KSgpO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlSGVpZ2h0ZmllbGRUZXJyYWluU2hhcGUgPSBmdW5jdGlvbihvcHRpb25zID0ge30pIHtcbiAgX3NldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuQUxMKSB7XG4gICAgY29uc29sZS53YXJuKFwiY2Fubm90IHVzZSBmaXQ6IGFsbCB3aXRoIHR5cGU6IGhlaWdodGZpZWxkXCIpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGNvbnN0IGhlaWdodGZpZWxkRGlzdGFuY2UgPSBvcHRpb25zLmhlaWdodGZpZWxkRGlzdGFuY2UgfHwgMTtcbiAgY29uc3QgaGVpZ2h0ZmllbGREYXRhID0gb3B0aW9ucy5oZWlnaHRmaWVsZERhdGEgfHwgW107XG4gIGNvbnN0IGhlaWdodFNjYWxlID0gb3B0aW9ucy5oZWlnaHRTY2FsZSB8fCAwO1xuICBjb25zdCB1cEF4aXMgPSBvcHRpb25zLmhhc093blByb3BlcnR5KFwidXBBeGlzXCIpID8gb3B0aW9ucy51cEF4aXMgOiAxOyAvLyB4ID0gMDsgeSA9IDE7IHogPSAyXG4gIGNvbnN0IGhkdCA9ICgoKSA9PiB7XG4gICAgc3dpdGNoIChvcHRpb25zLmhlaWdodERhdGFUeXBlKSB7XG4gICAgICBjYXNlIFwic2hvcnRcIjpcbiAgICAgICAgcmV0dXJuIEFtbW8uUEhZX1NIT1JUO1xuICAgICAgY2FzZSBcImZsb2F0XCI6XG4gICAgICAgIHJldHVybiBBbW1vLlBIWV9GTE9BVDtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBBbW1vLlBIWV9GTE9BVDtcbiAgICB9XG4gIH0pKCk7XG4gIGNvbnN0IGZsaXBRdWFkRWRnZXMgPSBvcHRpb25zLmhhc093blByb3BlcnR5KFwiZmxpcFF1YWRFZGdlc1wiKSA/IG9wdGlvbnMuZmxpcFF1YWRFZGdlcyA6IHRydWU7XG5cbiAgY29uc3QgaGVpZ2h0U3RpY2tMZW5ndGggPSBoZWlnaHRmaWVsZERhdGEubGVuZ3RoO1xuICBjb25zdCBoZWlnaHRTdGlja1dpZHRoID0gaGVpZ2h0U3RpY2tMZW5ndGggPiAwID8gaGVpZ2h0ZmllbGREYXRhWzBdLmxlbmd0aCA6IDA7XG5cbiAgY29uc3QgZGF0YSA9IEFtbW8uX21hbGxvYyhoZWlnaHRTdGlja0xlbmd0aCAqIGhlaWdodFN0aWNrV2lkdGggKiA0KTtcbiAgY29uc3QgcHRyID0gZGF0YSAvIDQ7XG5cbiAgbGV0IG1pbkhlaWdodCA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgbGV0IG1heEhlaWdodCA9IE51bWJlci5ORUdBVElWRV9JTkZJTklUWTtcbiAgbGV0IGluZGV4ID0gMDtcbiAgZm9yIChsZXQgbCA9IDA7IGwgPCBoZWlnaHRTdGlja0xlbmd0aDsgbCsrKSB7XG4gICAgZm9yIChsZXQgdyA9IDA7IHcgPCBoZWlnaHRTdGlja1dpZHRoOyB3KyspIHtcbiAgICAgIGNvbnN0IGhlaWdodCA9IGhlaWdodGZpZWxkRGF0YVtsXVt3XTtcbiAgICAgIEFtbW8uSEVBUEYzMltwdHIgKyBpbmRleF0gPSBoZWlnaHQ7XG4gICAgICBpbmRleCsrO1xuICAgICAgbWluSGVpZ2h0ID0gTWF0aC5taW4obWluSGVpZ2h0LCBoZWlnaHQpO1xuICAgICAgbWF4SGVpZ2h0ID0gTWF0aC5tYXgobWF4SGVpZ2h0LCBoZWlnaHQpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNvbGxpc2lvblNoYXBlID0gbmV3IEFtbW8uYnRIZWlnaHRmaWVsZFRlcnJhaW5TaGFwZShcbiAgICBoZWlnaHRTdGlja1dpZHRoLFxuICAgIGhlaWdodFN0aWNrTGVuZ3RoLFxuICAgIGRhdGEsXG4gICAgaGVpZ2h0U2NhbGUsXG4gICAgbWluSGVpZ2h0LFxuICAgIG1heEhlaWdodCxcbiAgICB1cEF4aXMsXG4gICAgaGR0LFxuICAgIGZsaXBRdWFkRWRnZXNcbiAgKTtcblxuICBjb25zdCBzY2FsZSA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhoZWlnaHRmaWVsZERpc3RhbmNlLCAxLCBoZWlnaHRmaWVsZERpc3RhbmNlKTtcbiAgY29sbGlzaW9uU2hhcGUuc2V0TG9jYWxTY2FsaW5nKHNjYWxlKTtcbiAgQW1tby5kZXN0cm95KHNjYWxlKTtcblxuICBjb2xsaXNpb25TaGFwZS5oZWlnaHRmaWVsZERhdGEgPSBkYXRhO1xuXG4gIF9maW5pc2hDb2xsaXNpb25TaGFwZShjb2xsaXNpb25TaGFwZSwgb3B0aW9ucyk7XG4gIHJldHVybiBjb2xsaXNpb25TaGFwZTtcbn07XG5cbmZ1bmN0aW9uIF9zZXRPcHRpb25zKG9wdGlvbnMpIHtcbiAgb3B0aW9ucy5maXQgPSBvcHRpb25zLmhhc093blByb3BlcnR5KFwiZml0XCIpID8gb3B0aW9ucy5maXQgOiBGSVQuQUxMO1xuICBvcHRpb25zLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgVFlQRS5IVUxMO1xuICBvcHRpb25zLm1pbkhhbGZFeHRlbnQgPSBvcHRpb25zLmhhc093blByb3BlcnR5KFwibWluSGFsZkV4dGVudFwiKSA/IG9wdGlvbnMubWluSGFsZkV4dGVudCA6IDA7XG4gIG9wdGlvbnMubWF4SGFsZkV4dGVudCA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJtYXhIYWxmRXh0ZW50XCIpID8gb3B0aW9ucy5tYXhIYWxmRXh0ZW50IDogTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICBvcHRpb25zLmN5bGluZGVyQXhpcyA9IG9wdGlvbnMuY3lsaW5kZXJBeGlzIHx8IFwieVwiO1xuICBvcHRpb25zLm1hcmdpbiA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJtYXJnaW5cIikgPyBvcHRpb25zLm1hcmdpbiA6IDAuMDE7XG4gIG9wdGlvbnMuaW5jbHVkZUludmlzaWJsZSA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJpbmNsdWRlSW52aXNpYmxlXCIpID8gb3B0aW9ucy5pbmNsdWRlSW52aXNpYmxlIDogZmFsc2U7XG5cbiAgaWYgKCFvcHRpb25zLm9mZnNldCkge1xuICAgIG9wdGlvbnMub2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgfVxuXG4gIGlmICghb3B0aW9ucy5vcmllbnRhdGlvbikge1xuICAgIG9wdGlvbnMub3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICB9XG59XG5cbmNvbnN0IF9maW5pc2hDb2xsaXNpb25TaGFwZSA9IGZ1bmN0aW9uKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zLCBzY2FsZSkge1xuICBjb2xsaXNpb25TaGFwZS50eXBlID0gb3B0aW9ucy50eXBlO1xuICBjb2xsaXNpb25TaGFwZS5zZXRNYXJnaW4ob3B0aW9ucy5tYXJnaW4pO1xuICBjb2xsaXNpb25TaGFwZS5kZXN0cm95ID0gKCkgPT4ge1xuICAgIGZvciAobGV0IHJlcyBvZiBjb2xsaXNpb25TaGFwZS5yZXNvdXJjZXMgfHwgW10pIHtcbiAgICAgIEFtbW8uZGVzdHJveShyZXMpO1xuICAgIH1cbiAgICBpZiAoY29sbGlzaW9uU2hhcGUuaGVpZ2h0ZmllbGREYXRhKSB7XG4gICAgICBBbW1vLl9mcmVlKGNvbGxpc2lvblNoYXBlLmhlaWdodGZpZWxkRGF0YSk7XG4gICAgfVxuICAgIEFtbW8uZGVzdHJveShjb2xsaXNpb25TaGFwZSk7XG4gIH07XG5cbiAgY29uc3QgbG9jYWxUcmFuc2Zvcm0gPSBuZXcgQW1tby5idFRyYW5zZm9ybSgpO1xuICBjb25zdCByb3RhdGlvbiA9IG5ldyBBbW1vLmJ0UXVhdGVybmlvbigpO1xuICBsb2NhbFRyYW5zZm9ybS5zZXRJZGVudGl0eSgpO1xuXG4gIGxvY2FsVHJhbnNmb3JtLmdldE9yaWdpbigpLnNldFZhbHVlKG9wdGlvbnMub2Zmc2V0LngsIG9wdGlvbnMub2Zmc2V0LnksIG9wdGlvbnMub2Zmc2V0LnopO1xuICByb3RhdGlvbi5zZXRWYWx1ZShvcHRpb25zLm9yaWVudGF0aW9uLngsIG9wdGlvbnMub3JpZW50YXRpb24ueSwgb3B0aW9ucy5vcmllbnRhdGlvbi56LCBvcHRpb25zLm9yaWVudGF0aW9uLncpO1xuXG4gIGxvY2FsVHJhbnNmb3JtLnNldFJvdGF0aW9uKHJvdGF0aW9uKTtcbiAgQW1tby5kZXN0cm95KHJvdGF0aW9uKTtcblxuICBpZiAoc2NhbGUpIHtcbiAgICBjb25zdCBsb2NhbFNjYWxlID0gbmV3IEFtbW8uYnRWZWN0b3IzKHNjYWxlLngsIHNjYWxlLnksIHNjYWxlLnopO1xuICAgIGNvbGxpc2lvblNoYXBlLnNldExvY2FsU2NhbGluZyhsb2NhbFNjYWxlKTtcbiAgICBBbW1vLmRlc3Ryb3kobG9jYWxTY2FsZSk7XG4gIH1cblxuICBjb2xsaXNpb25TaGFwZS5sb2NhbFRyYW5zZm9ybSA9IGxvY2FsVHJhbnNmb3JtO1xufTtcblxuZXhwb3J0IGNvbnN0IGl0ZXJhdGVHZW9tZXRyaWVzID0gKGZ1bmN0aW9uKCkge1xuICBjb25zdCBpbnZlcnNlID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcbiAgY29uc3QgdmVydGljZXMgPSBbXTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHJvb3QsIG9wdGlvbnMsIGNiKSB7XG4gICAgaW52ZXJzZS5jb3B5KHJvb3QubWF0cml4V29ybGQpLmludmVydCgpO1xuICAgIHJvb3QudHJhdmVyc2UobWVzaCA9PiB7XG4gICAgICBjb25zdCB0cmFuc2Zvcm0gPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICAgICAgaWYgKFxuICAgICAgICBtZXNoLmlzTWVzaCAmJlxuICAgICAgICBtZXNoLm5hbWUgIT09IFwiU2t5XCIgJiZcbiAgICAgICAgKG9wdGlvbnMuaW5jbHVkZUludmlzaWJsZSB8fCAobWVzaC5lbCAmJiBtZXNoLmVsLm9iamVjdDNELnZpc2libGUpIHx8IG1lc2gudmlzaWJsZSlcbiAgICAgICkge1xuICAgICAgICBpZiAobWVzaCA9PT0gcm9vdCkge1xuICAgICAgICAgIHRyYW5zZm9ybS5pZGVudGl0eSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG1lc2gudXBkYXRlV29ybGRNYXRyaXgodHJ1ZSk7XG4gICAgICAgICAgdHJhbnNmb3JtLm11bHRpcGx5TWF0cmljZXMoaW52ZXJzZSwgbWVzaC5tYXRyaXhXb3JsZCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gdG9kbzogbWlnaHQgd2FudCB0byByZXR1cm4gbnVsbCB4Zm9ybSBpZiB0aGlzIGlzIHRoZSByb290IHNvIHRoYXQgY2FsbGVycyBjYW4gYXZvaWQgbXVsdGlwbHlpbmdcbiAgICAgICAgLy8gdGhpbmdzIGJ5IHRoZSBpZGVudGl0eSBtYXRyaXhcblxuICAgICAgICBsZXQgdW5JbnRlcmxlYXZlZFZlcnRpY2VzO1xuICAgICAgICBpZiAobWVzaC5nZW9tZXRyeS5pc0J1ZmZlckdlb21ldHJ5KSB7XG4gICAgICAgICAgY29uc3QgdmVydGljZXNBdHRyaWJ1dGUgPSBtZXNoLmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb247XG4gICAgICAgICAgaWYgKHZlcnRpY2VzQXR0cmlidXRlLmlzSW50ZXJsZWF2ZWRCdWZmZXJBdHRyaWJ1dGUpIHtcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBBbiBpbnRlcmxlYXZlZCBidWZmZXIgYXR0cmlidXRlIHNoYXJlcyB0aGUgdW5kZXJseWluZ1xuICAgICAgICAgICAgLy8gYXJyYXkgd2l0aCBvdGhlciBhdHRyaWJ1dGVzLiBXZSB0cmFuc2xhdGUgaXQgdG8gYVxuICAgICAgICAgICAgLy8gcmVndWxhciBhcnJheSBoZXJlIHRvIG5vdCBjYXJyeSB0aGlzIGxvZ2ljIGFyb3VuZCBpblxuICAgICAgICAgICAgLy8gdGhlIHNoYXBlIGFwaS5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB2ZXJ0aWNlcy5sZW5ndGggPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlc0F0dHJpYnV0ZS5jb3VudDsgaSArPSAzKSB7XG4gICAgICAgICAgICAgIHZlcnRpY2VzLnB1c2godmVydGljZXNBdHRyaWJ1dGUuZ2V0WChpKSk7XG4gICAgICAgICAgICAgIHZlcnRpY2VzLnB1c2godmVydGljZXNBdHRyaWJ1dGUuZ2V0WShpKSk7XG4gICAgICAgICAgICAgIHZlcnRpY2VzLnB1c2godmVydGljZXNBdHRyaWJ1dGUuZ2V0WihpKSk7XG4gICAgICAgICAgICB9XG5cdCAgICB1bkludGVybGVhdmVkVmVydGljZXMgPSB2ZXJ0aWNlcztcbiAgICAgICAgICB9IGVsc2Uge1xuXHQgICAgdW5JbnRlcmxlYXZlZFZlcnRpY2VzID0gdmVydGljZXNBdHRyaWJ1dGUuYXJyYXk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHVuSW50ZXJsZWF2ZWRWZXJ0aWNlcyA9IG1lc2guZ2VvbWV0cnkudmVydGljZXM7XG4gICAgICAgIH1cblxuICAgICAgICBjYihcbiAgICAgICAgICB1bkludGVybGVhdmVkVmVydGljZXMsXG4gICAgICAgICAgdHJhbnNmb3JtLmVsZW1lbnRzLFxuICAgICAgICAgIG1lc2guZ2VvbWV0cnkuaW5kZXggPyBtZXNoLmdlb21ldHJ5LmluZGV4LmFycmF5IDogbnVsbFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSkoKTtcblxuY29uc3QgX2NvbXB1dGVTY2FsZSA9IChmdW5jdGlvbigpIHtcbiAgY29uc3QgbWF0cml4ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgICBjb25zdCBzY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDEsIDEpO1xuICAgIGlmIChvcHRpb25zLmZpdCA9PT0gRklULkFMTCkge1xuICAgICAgbWF0cml4LmZyb21BcnJheShtYXRyaXhXb3JsZCk7XG4gICAgICBzY2FsZS5zZXRGcm9tTWF0cml4U2NhbGUobWF0cml4KTtcbiAgICB9XG4gICAgcmV0dXJuIHNjYWxlO1xuICB9O1xufSkoKTtcblxuY29uc3QgX2NvbXB1dGVSYWRpdXMgPSAoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIHJldHVybiBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIGJvdW5kcykge1xuICAgIGxldCBtYXhSYWRpdXNTcSA9IDA7XG4gICAgbGV0IHsgeDogY3gsIHk6IGN5LCB6OiBjeiB9ID0gYm91bmRzLmdldENlbnRlcihjZW50ZXIpO1xuXG4gICAgX2l0ZXJhdGVWZXJ0aWNlcyh2ZXJ0aWNlcywgbWF0cmljZXMsIHYgPT4ge1xuICAgICAgY29uc3QgZHggPSBjeCAtIHYueDtcbiAgICAgIGNvbnN0IGR5ID0gY3kgLSB2Lnk7XG4gICAgICBjb25zdCBkeiA9IGN6IC0gdi56O1xuICAgICAgbWF4UmFkaXVzU3EgPSBNYXRoLm1heChtYXhSYWRpdXNTcSwgZHggKiBkeCArIGR5ICogZHkgKyBkeiAqIGR6KTtcbiAgICB9KTtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KG1heFJhZGl1c1NxKTtcbiAgfTtcbn0pKCk7XG5cbmNvbnN0IF9jb21wdXRlSGFsZkV4dGVudHMgPSBmdW5jdGlvbihib3VuZHMsIG1pbkhhbGZFeHRlbnQsIG1heEhhbGZFeHRlbnQpIHtcbiAgY29uc3QgaGFsZkV4dGVudHMgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICByZXR1cm4gaGFsZkV4dGVudHNcbiAgICAuc3ViVmVjdG9ycyhib3VuZHMubWF4LCBib3VuZHMubWluKVxuICAgIC5tdWx0aXBseVNjYWxhcigwLjUpXG4gICAgLmNsYW1wU2NhbGFyKG1pbkhhbGZFeHRlbnQsIG1heEhhbGZFeHRlbnQpO1xufTtcblxuY29uc3QgX2NvbXB1dGVMb2NhbE9mZnNldCA9IGZ1bmN0aW9uKG1hdHJpeCwgYm91bmRzLCB0YXJnZXQpIHtcbiAgdGFyZ2V0XG4gICAgLmFkZFZlY3RvcnMoYm91bmRzLm1heCwgYm91bmRzLm1pbilcbiAgICAubXVsdGlwbHlTY2FsYXIoMC41KVxuICAgIC5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgcmV0dXJuIHRhcmdldDtcbn07XG5cbi8vIHJldHVybnMgdGhlIGJvdW5kaW5nIGJveCBmb3IgdGhlIGdlb21ldHJpZXMgdW5kZXJuZWF0aCBgcm9vdGAuXG5jb25zdCBfY29tcHV0ZUJvdW5kcyA9IGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXRyaWNlcykge1xuICBjb25zdCBib3VuZHMgPSBuZXcgVEhSRUUuQm94MygpO1xuICBsZXQgbWluWCA9ICtJbmZpbml0eTtcbiAgbGV0IG1pblkgPSArSW5maW5pdHk7XG4gIGxldCBtaW5aID0gK0luZmluaXR5O1xuICBsZXQgbWF4WCA9IC1JbmZpbml0eTtcbiAgbGV0IG1heFkgPSAtSW5maW5pdHk7XG4gIGxldCBtYXhaID0gLUluZmluaXR5O1xuICBib3VuZHMubWluLnNldCgwLCAwLCAwKTtcbiAgYm91bmRzLm1heC5zZXQoMCwgMCwgMCk7XG5cbiAgX2l0ZXJhdGVWZXJ0aWNlcyh2ZXJ0aWNlcywgbWF0cmljZXMsIHYgPT4ge1xuICAgIGlmICh2LnggPCBtaW5YKSBtaW5YID0gdi54O1xuICAgIGlmICh2LnkgPCBtaW5ZKSBtaW5ZID0gdi55O1xuICAgIGlmICh2LnogPCBtaW5aKSBtaW5aID0gdi56O1xuICAgIGlmICh2LnggPiBtYXhYKSBtYXhYID0gdi54O1xuICAgIGlmICh2LnkgPiBtYXhZKSBtYXhZID0gdi55O1xuICAgIGlmICh2LnogPiBtYXhaKSBtYXhaID0gdi56O1xuICB9KTtcblxuICBib3VuZHMubWluLnNldChtaW5YLCBtaW5ZLCBtaW5aKTtcbiAgYm91bmRzLm1heC5zZXQobWF4WCwgbWF4WSwgbWF4Wik7XG4gIHJldHVybiBib3VuZHM7XG59O1xuXG5jb25zdCBfaXRlcmF0ZVZlcnRpY2VzID0gKGZ1bmN0aW9uKCkge1xuICBjb25zdCB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICByZXR1cm4gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBjYikge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG1hdHJpeC5mcm9tQXJyYXkobWF0cmljZXNbaV0pO1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCB2ZXJ0aWNlc1tpXS5sZW5ndGg7IGogKz0gMykge1xuICAgICAgICB2ZXJ0ZXguc2V0KHZlcnRpY2VzW2ldW2pdLCB2ZXJ0aWNlc1tpXVtqICsgMV0sIHZlcnRpY2VzW2ldW2ogKyAyXSkuYXBwbHlNYXRyaXg0KG1hdHJpeCk7XG4gICAgICAgIGNiKHZlcnRleCk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufSkoKTtcbiIsIi8qIGdsb2JhbCBBbW1vICovXG5jb25zdCBDT05TVFJBSU5UID0gcmVxdWlyZShcIi4uL2NvbnN0YW50c1wiKS5DT05TVFJBSU5UO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFGUkFNRS5yZWdpc3RlckNvbXBvbmVudChcImFtbW8tY29uc3RyYWludFwiLCB7XG4gIG11bHRpcGxlOiB0cnVlLFxuXG4gIHNjaGVtYToge1xuICAgIC8vIFR5cGUgb2YgY29uc3RyYWludC5cbiAgICB0eXBlOiB7XG4gICAgICBkZWZhdWx0OiBDT05TVFJBSU5ULkxPQ0ssXG4gICAgICBvbmVPZjogW1xuICAgICAgICBDT05TVFJBSU5ULkxPQ0ssXG4gICAgICAgIENPTlNUUkFJTlQuRklYRUQsXG4gICAgICAgIENPTlNUUkFJTlQuU1BSSU5HLFxuICAgICAgICBDT05TVFJBSU5ULlNMSURFUixcbiAgICAgICAgQ09OU1RSQUlOVC5ISU5HRSxcbiAgICAgICAgQ09OU1RSQUlOVC5DT05FX1RXSVNULFxuICAgICAgICBDT05TVFJBSU5ULlBPSU5UX1RPX1BPSU5UXG4gICAgICBdXG4gICAgfSxcblxuICAgIC8vIFRhcmdldCAob3RoZXIpIGJvZHkgZm9yIHRoZSBjb25zdHJhaW50LlxuICAgIHRhcmdldDogeyB0eXBlOiBcInNlbGVjdG9yXCIgfSxcblxuICAgIC8vIE9mZnNldCBvZiB0aGUgaGluZ2Ugb3IgcG9pbnQtdG8tcG9pbnQgY29uc3RyYWludCwgZGVmaW5lZCBsb2NhbGx5IGluIHRoZSBib2R5LiBVc2VkIGZvciBoaW5nZSwgY29uZVR3aXN0IHBvaW50VG9Qb2ludCBjb25zdHJhaW50cy5cbiAgICBwaXZvdDogeyB0eXBlOiBcInZlYzNcIiB9LFxuICAgIHRhcmdldFBpdm90OiB7IHR5cGU6IFwidmVjM1wiIH0sXG5cbiAgICAvLyBBbiBheGlzIHRoYXQgZWFjaCBib2R5IGNhbiByb3RhdGUgYXJvdW5kLCBkZWZpbmVkIGxvY2FsbHkgdG8gdGhhdCBib2R5LiBVc2VkIGZvciBoaW5nZSBjb25zdHJhaW50cy5cbiAgICBheGlzOiB7IHR5cGU6IFwidmVjM1wiLCBkZWZhdWx0OiB7IHg6IDAsIHk6IDAsIHo6IDEgfSB9LFxuICAgIHRhcmdldEF4aXM6IHsgdHlwZTogXCJ2ZWMzXCIsIGRlZmF1bHQ6IHsgeDogMCwgeTogMCwgejogMSB9IH0sXG5cbiAgICAvLyBkYW1waW5nICYgc3R1ZmZuZXNzIC0gdXNlZCBmb3Igc3ByaW5nIGNvbnRyYWludHMgb25seVxuICAgIGRhbXBpbmc6IHsgdHlwZTogXCJudW1iZXJcIiwgZGVmYXVsdDogMSB9LFxuICAgIHN0aWZmbmVzczogeyB0eXBlOiBcIm51bWJlclwiLCBkZWZhdWx0OiAxMDAgfSxcbiAgfSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN5c3RlbSA9IHRoaXMuZWwuc2NlbmVFbC5zeXN0ZW1zLnBoeXNpY3M7XG4gICAgdGhpcy5jb25zdHJhaW50ID0gbnVsbDtcbiAgfSxcblxuICByZW1vdmU6IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5jb25zdHJhaW50KSByZXR1cm47XG5cbiAgICB0aGlzLnN5c3RlbS5yZW1vdmVDb25zdHJhaW50KHRoaXMuY29uc3RyYWludCk7XG4gICAgdGhpcy5jb25zdHJhaW50ID0gbnVsbDtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGVsID0gdGhpcy5lbCxcbiAgICAgIGRhdGEgPSB0aGlzLmRhdGE7XG5cbiAgICB0aGlzLnJlbW92ZSgpO1xuXG4gICAgaWYgKCFlbC5ib2R5IHx8ICFkYXRhLnRhcmdldC5ib2R5KSB7XG4gICAgICAoZWwuYm9keSA/IGRhdGEudGFyZ2V0IDogZWwpLmFkZEV2ZW50TGlzdGVuZXIoXCJib2R5LWxvYWRlZFwiLCB0aGlzLnVwZGF0ZS5iaW5kKHRoaXMsIHt9KSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY29uc3RyYWludCA9IHRoaXMuY3JlYXRlQ29uc3RyYWludCgpO1xuICAgIHRoaXMuc3lzdGVtLmFkZENvbnN0cmFpbnQodGhpcy5jb25zdHJhaW50KTtcbiAgfSxcblxuICAvKipcbiAgICogQHJldHVybiB7QW1tby5idFR5cGVkQ29uc3RyYWludH1cbiAgICovXG4gIGNyZWF0ZUNvbnN0cmFpbnQ6IGZ1bmN0aW9uKCkge1xuICAgIGxldCBjb25zdHJhaW50O1xuICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGEsXG4gICAgICBib2R5ID0gdGhpcy5lbC5ib2R5LFxuICAgICAgdGFyZ2V0Qm9keSA9IGRhdGEudGFyZ2V0LmJvZHk7XG5cbiAgICBjb25zdCBib2R5VHJhbnNmb3JtID0gYm9keVxuICAgICAgLmdldENlbnRlck9mTWFzc1RyYW5zZm9ybSgpXG4gICAgICAuaW52ZXJzZSgpXG4gICAgICAub3BfbXVsKHRhcmdldEJvZHkuZ2V0V29ybGRUcmFuc2Zvcm0oKSk7XG4gICAgY29uc3QgdGFyZ2V0VHJhbnNmb3JtID0gbmV3IEFtbW8uYnRUcmFuc2Zvcm0oKTtcbiAgICB0YXJnZXRUcmFuc2Zvcm0uc2V0SWRlbnRpdHkoKTtcblxuICAgIHN3aXRjaCAoZGF0YS50eXBlKSB7XG4gICAgICBjYXNlIENPTlNUUkFJTlQuTE9DSzoge1xuICAgICAgICBjb25zdHJhaW50ID0gbmV3IEFtbW8uYnRHZW5lcmljNkRvZkNvbnN0cmFpbnQoYm9keSwgdGFyZ2V0Qm9keSwgYm9keVRyYW5zZm9ybSwgdGFyZ2V0VHJhbnNmb3JtLCB0cnVlKTtcbiAgICAgICAgY29uc3QgemVybyA9IG5ldyBBbW1vLmJ0VmVjdG9yMygwLCAwLCAwKTtcbiAgICAgICAgLy9UT0RPOiBhbGxvdyB0aGVzZSB0byBiZSBjb25maWd1cmFibGVcbiAgICAgICAgY29uc3RyYWludC5zZXRMaW5lYXJMb3dlckxpbWl0KHplcm8pO1xuICAgICAgICBjb25zdHJhaW50LnNldExpbmVhclVwcGVyTGltaXQoemVybyk7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0QW5ndWxhckxvd2VyTGltaXQoemVybyk7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0QW5ndWxhclVwcGVyTGltaXQoemVybyk7XG4gICAgICAgIEFtbW8uZGVzdHJveSh6ZXJvKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICAvL1RPRE86IHRlc3QgYW5kIHZlcmlmeSBhbGwgb3RoZXIgY29uc3RyYWludCB0eXBlc1xuICAgICAgY2FzZSBDT05TVFJBSU5ULkZJWEVEOiB7XG4gICAgICAgIC8vYnRGaXhlZENvbnN0cmFpbnQgZG9lcyBub3Qgc2VlbSB0byBkZWJ1ZyByZW5kZXJcbiAgICAgICAgYm9keVRyYW5zZm9ybS5zZXRSb3RhdGlvbihib2R5LmdldFdvcmxkVHJhbnNmb3JtKCkuZ2V0Um90YXRpb24oKSk7XG4gICAgICAgIHRhcmdldFRyYW5zZm9ybS5zZXRSb3RhdGlvbih0YXJnZXRCb2R5LmdldFdvcmxkVHJhbnNmb3JtKCkuZ2V0Um90YXRpb24oKSk7XG4gICAgICAgIGNvbnN0cmFpbnQgPSBuZXcgQW1tby5idEZpeGVkQ29uc3RyYWludChib2R5LCB0YXJnZXRCb2R5LCBib2R5VHJhbnNmb3JtLCB0YXJnZXRUcmFuc2Zvcm0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgQ09OU1RSQUlOVC5TUFJJTkc6IHtcbiAgICAgICAgY29uc3RyYWludCA9IG5ldyBBbW1vLmJ0R2VuZXJpYzZEb2ZTcHJpbmdDb25zdHJhaW50KGJvZHksIHRhcmdldEJvZHksIGJvZHlUcmFuc2Zvcm0sIHRhcmdldFRyYW5zZm9ybSwgdHJ1ZSk7XG5cbiAgICAgICAgLy8gVmVyeSBsaW1pdGVkIGluaXRpYWwgaW1wbGVtZW50YXRpb24gb2Ygc3ByaW5nIGNvbnN0cmFpbnQuXG4gICAgICAgIC8vIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL241cm8vYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL2lzc3Vlcy8xNzFcbiAgICAgICAgZm9yICh2YXIgaSBpbiBbMCwxLDIsMyw0LDVdKSB7XG4gICAgICAgICAgY29uc3RyYWludC5lbmFibGVTcHJpbmcoMSwgdHJ1ZSlcbiAgICAgICAgICBjb25zdHJhaW50LnNldFN0aWZmbmVzcygxLCB0aGlzLmRhdGEuc3RpZmZuZXNzKVxuICAgICAgICAgIGNvbnN0cmFpbnQuc2V0RGFtcGluZygxLCB0aGlzLmRhdGEuZGFtcGluZylcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB1cHBlciA9IG5ldyBBbW1vLmJ0VmVjdG9yMygtMSwgLTEsIC0xKTtcbiAgICAgICAgY29uc3QgbG93ZXIgPSBuZXcgQW1tby5idFZlY3RvcjMoMSwgMSwgMSk7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0TGluZWFyVXBwZXJMaW1pdCh1cHBlcik7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0TGluZWFyTG93ZXJMaW1pdChsb3dlcilcbiAgICAgICAgQW1tby5kZXN0cm95KHVwcGVyKTtcbiAgICAgICAgQW1tby5kZXN0cm95KGxvd2VyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIENPTlNUUkFJTlQuU0xJREVSOiB7XG4gICAgICAgIC8vVE9ETzogc3VwcG9ydCBzZXR0aW5nIGxpbmVhciBhbmQgYW5ndWxhciBsaW1pdHNcbiAgICAgICAgY29uc3RyYWludCA9IG5ldyBBbW1vLmJ0U2xpZGVyQ29uc3RyYWludChib2R5LCB0YXJnZXRCb2R5LCBib2R5VHJhbnNmb3JtLCB0YXJnZXRUcmFuc2Zvcm0sIHRydWUpO1xuICAgICAgICBjb25zdHJhaW50LnNldExvd2VyTGluTGltaXQoLTEpO1xuICAgICAgICBjb25zdHJhaW50LnNldFVwcGVyTGluTGltaXQoMSk7XG4gICAgICAgIC8vIGNvbnN0cmFpbnQuc2V0TG93ZXJBbmdMaW1pdCgpO1xuICAgICAgICAvLyBjb25zdHJhaW50LnNldFVwcGVyQW5nTGltaXQoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIENPTlNUUkFJTlQuSElOR0U6IHtcbiAgICAgICAgY29uc3QgcGl2b3QgPSBuZXcgQW1tby5idFZlY3RvcjMoZGF0YS5waXZvdC54LCBkYXRhLnBpdm90LnksIGRhdGEucGl2b3Queik7XG4gICAgICAgIGNvbnN0IHRhcmdldFBpdm90ID0gbmV3IEFtbW8uYnRWZWN0b3IzKGRhdGEudGFyZ2V0UGl2b3QueCwgZGF0YS50YXJnZXRQaXZvdC55LCBkYXRhLnRhcmdldFBpdm90LnopO1xuXG4gICAgICAgIGNvbnN0IGF4aXMgPSBuZXcgQW1tby5idFZlY3RvcjMoZGF0YS5heGlzLngsIGRhdGEuYXhpcy55LCBkYXRhLmF4aXMueik7XG4gICAgICAgIGNvbnN0IHRhcmdldEF4aXMgPSBuZXcgQW1tby5idFZlY3RvcjMoZGF0YS50YXJnZXRBeGlzLngsIGRhdGEudGFyZ2V0QXhpcy55LCBkYXRhLnRhcmdldEF4aXMueik7XG5cbiAgICAgICAgY29uc3RyYWludCA9IG5ldyBBbW1vLmJ0SGluZ2VDb25zdHJhaW50KGJvZHksIHRhcmdldEJvZHksIHBpdm90LCB0YXJnZXRQaXZvdCwgYXhpcywgdGFyZ2V0QXhpcywgdHJ1ZSk7XG5cbiAgICAgICAgQW1tby5kZXN0cm95KHBpdm90KTtcbiAgICAgICAgQW1tby5kZXN0cm95KHRhcmdldFBpdm90KTtcbiAgICAgICAgQW1tby5kZXN0cm95KGF4aXMpO1xuICAgICAgICBBbW1vLmRlc3Ryb3kodGFyZ2V0QXhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBDT05TVFJBSU5ULkNPTkVfVFdJU1Q6IHtcbiAgICAgICAgY29uc3QgcGl2b3RUcmFuc2Zvcm0gPSBuZXcgQW1tby5idFRyYW5zZm9ybSgpO1xuICAgICAgICBwaXZvdFRyYW5zZm9ybS5zZXRJZGVudGl0eSgpO1xuICAgICAgICBwaXZvdFRyYW5zZm9ybS5nZXRPcmlnaW4oKS5zZXRWYWx1ZShkYXRhLnBpdm90LngsIGRhdGEucGl2b3QueSwgZGF0YS5waXZvdC56KTtcbiAgICAgICAgY29uc3QgdGFyZ2V0UGl2b3RUcmFuc2Zvcm0gPSBuZXcgQW1tby5idFRyYW5zZm9ybSgpO1xuICAgICAgICB0YXJnZXRQaXZvdFRyYW5zZm9ybS5zZXRJZGVudGl0eSgpO1xuICAgICAgICB0YXJnZXRQaXZvdFRyYW5zZm9ybS5nZXRPcmlnaW4oKS5zZXRWYWx1ZShkYXRhLnRhcmdldFBpdm90LngsIGRhdGEudGFyZ2V0UGl2b3QueSwgZGF0YS50YXJnZXRQaXZvdC56KTtcbiAgICAgICAgY29uc3RyYWludCA9IG5ldyBBbW1vLmJ0Q29uZVR3aXN0Q29uc3RyYWludChib2R5LCB0YXJnZXRCb2R5LCBwaXZvdFRyYW5zZm9ybSwgdGFyZ2V0UGl2b3RUcmFuc2Zvcm0pO1xuICAgICAgICBBbW1vLmRlc3Ryb3kocGl2b3RUcmFuc2Zvcm0pO1xuICAgICAgICBBbW1vLmRlc3Ryb3kodGFyZ2V0UGl2b3RUcmFuc2Zvcm0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgQ09OU1RSQUlOVC5QT0lOVF9UT19QT0lOVDoge1xuICAgICAgICBjb25zdCBwaXZvdCA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhkYXRhLnBpdm90LngsIGRhdGEucGl2b3QueSwgZGF0YS5waXZvdC56KTtcbiAgICAgICAgY29uc3QgdGFyZ2V0UGl2b3QgPSBuZXcgQW1tby5idFZlY3RvcjMoZGF0YS50YXJnZXRQaXZvdC54LCBkYXRhLnRhcmdldFBpdm90LnksIGRhdGEudGFyZ2V0UGl2b3Queik7XG5cbiAgICAgICAgY29uc3RyYWludCA9IG5ldyBBbW1vLmJ0UG9pbnQyUG9pbnRDb25zdHJhaW50KGJvZHksIHRhcmdldEJvZHksIHBpdm90LCB0YXJnZXRQaXZvdCk7XG5cbiAgICAgICAgQW1tby5kZXN0cm95KHBpdm90KTtcbiAgICAgICAgQW1tby5kZXN0cm95KHRhcmdldFBpdm90KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJbY29uc3RyYWludF0gVW5leHBlY3RlZCB0eXBlOiBcIiArIGRhdGEudHlwZSk7XG4gICAgfVxuXG4gICAgQW1tby5kZXN0cm95KHRhcmdldFRyYW5zZm9ybSk7XG5cbiAgICByZXR1cm4gY29uc3RyYWludDtcbiAgfVxufSk7XG4iLCIvKiBnbG9iYWwgQW1tbyxUSFJFRSAqL1xuY29uc3QgQW1tb0RlYnVnRHJhd2VyID0gcmVxdWlyZShcImFtbW8tZGVidWctZHJhd2VyXCIpO1xuY29uc3QgdGhyZWVUb0FtbW8gPSByZXF1aXJlKFwidGhyZWUtdG8tYW1tb1wiKTtcbmNvbnN0IENPTlNUQU5UUyA9IHJlcXVpcmUoXCIuLi8uLi9jb25zdGFudHNcIiksXG4gIEFDVElWQVRJT05fU1RBVEUgPSBDT05TVEFOVFMuQUNUSVZBVElPTl9TVEFURSxcbiAgQ09MTElTSU9OX0ZMQUcgPSBDT05TVEFOVFMuQ09MTElTSU9OX0ZMQUcsXG4gIFNIQVBFID0gQ09OU1RBTlRTLlNIQVBFLFxuICBUWVBFID0gQ09OU1RBTlRTLlRZUEUsXG4gIEZJVCA9IENPTlNUQU5UUy5GSVQ7XG5cbmNvbnN0IEFDVElWQVRJT05fU1RBVEVTID0gW1xuICBBQ1RJVkFUSU9OX1NUQVRFLkFDVElWRV9UQUcsXG4gIEFDVElWQVRJT05fU1RBVEUuSVNMQU5EX1NMRUVQSU5HLFxuICBBQ1RJVkFUSU9OX1NUQVRFLldBTlRTX0RFQUNUSVZBVElPTixcbiAgQUNUSVZBVElPTl9TVEFURS5ESVNBQkxFX0RFQUNUSVZBVElPTixcbiAgQUNUSVZBVElPTl9TVEFURS5ESVNBQkxFX1NJTVVMQVRJT05cbl07XG5cbmNvbnN0IFJJR0lEX0JPRFlfRkxBR1MgPSB7XG4gIE5PTkU6IDAsXG4gIERJU0FCTEVfV09STERfR1JBVklUWTogMVxufTtcblxuZnVuY3Rpb24gYWxtb3N0RXF1YWxzVmVjdG9yMyhlcHNpbG9uLCB1LCB2KSB7XG4gIHJldHVybiBNYXRoLmFicyh1LnggLSB2LngpIDwgZXBzaWxvbiAmJiBNYXRoLmFicyh1LnkgLSB2LnkpIDwgZXBzaWxvbiAmJiBNYXRoLmFicyh1LnogLSB2LnopIDwgZXBzaWxvbjtcbn1cblxuZnVuY3Rpb24gYWxtb3N0RXF1YWxzQnRWZWN0b3IzKGVwc2lsb24sIHUsIHYpIHtcbiAgcmV0dXJuIE1hdGguYWJzKHUueCgpIC0gdi54KCkpIDwgZXBzaWxvbiAmJiBNYXRoLmFicyh1LnkoKSAtIHYueSgpKSA8IGVwc2lsb24gJiYgTWF0aC5hYnModS56KCkgLSB2LnooKSkgPCBlcHNpbG9uO1xufVxuXG5mdW5jdGlvbiBhbG1vc3RFcXVhbHNRdWF0ZXJuaW9uKGVwc2lsb24sIHUsIHYpIHtcbiAgcmV0dXJuIChcbiAgICAoTWF0aC5hYnModS54IC0gdi54KSA8IGVwc2lsb24gJiZcbiAgICAgIE1hdGguYWJzKHUueSAtIHYueSkgPCBlcHNpbG9uICYmXG4gICAgICBNYXRoLmFicyh1LnogLSB2LnopIDwgZXBzaWxvbiAmJlxuICAgICAgTWF0aC5hYnModS53IC0gdi53KSA8IGVwc2lsb24pIHx8XG4gICAgKE1hdGguYWJzKHUueCArIHYueCkgPCBlcHNpbG9uICYmXG4gICAgICBNYXRoLmFicyh1LnkgKyB2LnkpIDwgZXBzaWxvbiAmJlxuICAgICAgTWF0aC5hYnModS56ICsgdi56KSA8IGVwc2lsb24gJiZcbiAgICAgIE1hdGguYWJzKHUudyArIHYudykgPCBlcHNpbG9uKVxuICApO1xufVxuXG5sZXQgQW1tb0JvZHkgPSB7XG4gIHNjaGVtYToge1xuICAgIGxvYWRlZEV2ZW50OiB7IGRlZmF1bHQ6IFwiXCIgfSxcbiAgICBtYXNzOiB7IGRlZmF1bHQ6IDEgfSxcbiAgICBncmF2aXR5OiB7IHR5cGU6IFwidmVjM1wiLCBkZWZhdWx0OiBudWxsIH0sXG4gICAgbGluZWFyRGFtcGluZzogeyBkZWZhdWx0OiAwLjAxIH0sXG4gICAgYW5ndWxhckRhbXBpbmc6IHsgZGVmYXVsdDogMC4wMSB9LFxuICAgIGxpbmVhclNsZWVwaW5nVGhyZXNob2xkOiB7IGRlZmF1bHQ6IDEuNiB9LFxuICAgIGFuZ3VsYXJTbGVlcGluZ1RocmVzaG9sZDogeyBkZWZhdWx0OiAyLjUgfSxcbiAgICBhbmd1bGFyRmFjdG9yOiB7IHR5cGU6IFwidmVjM1wiLCBkZWZhdWx0OiB7IHg6IDEsIHk6IDEsIHo6IDEgfSB9LFxuICAgIGFjdGl2YXRpb25TdGF0ZToge1xuICAgICAgZGVmYXVsdDogQUNUSVZBVElPTl9TVEFURS5BQ1RJVkVfVEFHLFxuICAgICAgb25lT2Y6IEFDVElWQVRJT05fU1RBVEVTXG4gICAgfSxcbiAgICB0eXBlOiB7IGRlZmF1bHQ6IFwiZHluYW1pY1wiLCBvbmVPZjogW1RZUEUuU1RBVElDLCBUWVBFLkRZTkFNSUMsIFRZUEUuS0lORU1BVElDXSB9LFxuICAgIGVtaXRDb2xsaXNpb25FdmVudHM6IHsgZGVmYXVsdDogZmFsc2UgfSxcbiAgICBkaXNhYmxlQ29sbGlzaW9uOiB7IGRlZmF1bHQ6IGZhbHNlIH0sXG4gICAgY29sbGlzaW9uRmlsdGVyR3JvdXA6IHsgZGVmYXVsdDogMSB9LCAvLzMyLWJpdCBtYXNrLFxuICAgIGNvbGxpc2lvbkZpbHRlck1hc2s6IHsgZGVmYXVsdDogMSB9LCAvLzMyLWJpdCBtYXNrXG4gICAgc2NhbGVBdXRvVXBkYXRlOiB7IGRlZmF1bHQ6IHRydWUgfSxcbiAgICByZXN0aXR1dGlvbjoge2RlZmF1bHQ6IDB9IC8vIGRvZXMgbm90IHN1cHBvcnQgdXBkYXRlc1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBhIGJvZHkgY29tcG9uZW50LCBhc3NpZ25pbmcgaXQgdG8gdGhlIHBoeXNpY3Mgc3lzdGVtIGFuZCBiaW5kaW5nIGxpc3RlbmVycyBmb3JcbiAgICogcGFyc2luZyB0aGUgZWxlbWVudHMgZ2VvbWV0cnkuXG4gICAqL1xuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN5c3RlbSA9IHRoaXMuZWwuc2NlbmVFbC5zeXN0ZW1zLnBoeXNpY3M7XG4gICAgdGhpcy5zaGFwZUNvbXBvbmVudHMgPSBbXTtcblxuICAgIGlmICh0aGlzLmRhdGEubG9hZGVkRXZlbnQgPT09IFwiXCIpIHtcbiAgICAgIHRoaXMubG9hZGVkRXZlbnRGaXJlZCA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgICAgdGhpcy5kYXRhLmxvYWRlZEV2ZW50LFxuICAgICAgICAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2FkZWRFdmVudEZpcmVkID0gdHJ1ZTtcbiAgICAgICAgfSxcbiAgICAgICAgeyBvbmNlOiB0cnVlIH1cbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3lzdGVtLmluaXRpYWxpemVkICYmIHRoaXMubG9hZGVkRXZlbnRGaXJlZCkge1xuICAgICAgdGhpcy5pbml0Qm9keSgpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogUGFyc2VzIGFuIGVsZW1lbnQncyBnZW9tZXRyeSBhbmQgY29tcG9uZW50IG1ldGFkYXRhIHRvIGNyZWF0ZSBhbiBBbW1vIGJvZHkgaW5zdGFuY2UgZm9yIHRoZVxuICAgKiBjb21wb25lbnQuXG4gICAqL1xuICBpbml0Qm9keTogKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHBvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgY29uc3QgcXVhdCA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gICAgY29uc3QgYm91bmRpbmdCb3ggPSBuZXcgVEhSRUUuQm94MygpO1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgZWwgPSB0aGlzLmVsLFxuICAgICAgICBkYXRhID0gdGhpcy5kYXRhO1xuICAgICAgY29uc3QgY2xhbXAgPSAobnVtLCBtaW4sIG1heCkgPT4gTWF0aC5taW4oTWF0aC5tYXgobnVtLCBtaW4pLCBtYXgpXG5cbiAgICAgIHRoaXMubG9jYWxTY2FsaW5nID0gbmV3IEFtbW8uYnRWZWN0b3IzKCk7XG5cbiAgICAgIGNvbnN0IG9iaiA9IHRoaXMuZWwub2JqZWN0M0Q7XG4gICAgICBvYmouZ2V0V29ybGRQb3NpdGlvbihwb3MpO1xuICAgICAgb2JqLmdldFdvcmxkUXVhdGVybmlvbihxdWF0KTtcblxuICAgICAgdGhpcy5wcmV2U2NhbGUgPSBuZXcgVEhSRUUuVmVjdG9yMygxLCAxLCAxKTtcbiAgICAgIHRoaXMucHJldk51bUNoaWxkU2hhcGVzID0gMDtcblxuICAgICAgdGhpcy5tc1RyYW5zZm9ybSA9IG5ldyBBbW1vLmJ0VHJhbnNmb3JtKCk7XG4gICAgICB0aGlzLm1zVHJhbnNmb3JtLnNldElkZW50aXR5KCk7XG4gICAgICB0aGlzLnJvdGF0aW9uID0gbmV3IEFtbW8uYnRRdWF0ZXJuaW9uKHF1YXQueCwgcXVhdC55LCBxdWF0LnosIHF1YXQudyk7XG5cbiAgICAgIHRoaXMubXNUcmFuc2Zvcm0uZ2V0T3JpZ2luKCkuc2V0VmFsdWUocG9zLngsIHBvcy55LCBwb3Mueik7XG4gICAgICB0aGlzLm1zVHJhbnNmb3JtLnNldFJvdGF0aW9uKHRoaXMucm90YXRpb24pO1xuXG4gICAgICB0aGlzLm1vdGlvblN0YXRlID0gbmV3IEFtbW8uYnREZWZhdWx0TW90aW9uU3RhdGUodGhpcy5tc1RyYW5zZm9ybSk7XG5cbiAgICAgIHRoaXMubG9jYWxJbmVydGlhID0gbmV3IEFtbW8uYnRWZWN0b3IzKDAsIDAsIDApO1xuXG4gICAgICB0aGlzLmNvbXBvdW5kU2hhcGUgPSBuZXcgQW1tby5idENvbXBvdW5kU2hhcGUodHJ1ZSk7XG5cbiAgICAgIHRoaXMucmJJbmZvID0gbmV3IEFtbW8uYnRSaWdpZEJvZHlDb25zdHJ1Y3Rpb25JbmZvKFxuICAgICAgICBkYXRhLm1hc3MsXG4gICAgICAgIHRoaXMubW90aW9uU3RhdGUsXG4gICAgICAgIHRoaXMuY29tcG91bmRTaGFwZSxcbiAgICAgICAgdGhpcy5sb2NhbEluZXJ0aWFcbiAgICAgICk7XG4gICAgICB0aGlzLnJiSW5mby5tX3Jlc3RpdHV0aW9uID0gY2xhbXAodGhpcy5kYXRhLnJlc3RpdHV0aW9uLCAwLCAxKTtcbiAgICAgIHRoaXMuYm9keSA9IG5ldyBBbW1vLmJ0UmlnaWRCb2R5KHRoaXMucmJJbmZvKTtcbiAgICAgIHRoaXMuYm9keS5zZXRBY3RpdmF0aW9uU3RhdGUoQUNUSVZBVElPTl9TVEFURVMuaW5kZXhPZihkYXRhLmFjdGl2YXRpb25TdGF0ZSkgKyAxKTtcbiAgICAgIHRoaXMuYm9keS5zZXRTbGVlcGluZ1RocmVzaG9sZHMoZGF0YS5saW5lYXJTbGVlcGluZ1RocmVzaG9sZCwgZGF0YS5hbmd1bGFyU2xlZXBpbmdUaHJlc2hvbGQpO1xuXG4gICAgICB0aGlzLmJvZHkuc2V0RGFtcGluZyhkYXRhLmxpbmVhckRhbXBpbmcsIGRhdGEuYW5ndWxhckRhbXBpbmcpO1xuXG4gICAgICBjb25zdCBhbmd1bGFyRmFjdG9yID0gbmV3IEFtbW8uYnRWZWN0b3IzKGRhdGEuYW5ndWxhckZhY3Rvci54LCBkYXRhLmFuZ3VsYXJGYWN0b3IueSwgZGF0YS5hbmd1bGFyRmFjdG9yLnopO1xuICAgICAgdGhpcy5ib2R5LnNldEFuZ3VsYXJGYWN0b3IoYW5ndWxhckZhY3Rvcik7XG4gICAgICBBbW1vLmRlc3Ryb3koYW5ndWxhckZhY3Rvcik7XG5cbiAgICAgIHRoaXMuX3VwZGF0ZUJvZHlHcmF2aXR5KGRhdGEuZ3Jhdml0eSlcblxuICAgICAgdGhpcy51cGRhdGVDb2xsaXNpb25GbGFncygpO1xuXG4gICAgICB0aGlzLmVsLmJvZHkgPSB0aGlzLmJvZHk7XG4gICAgICB0aGlzLmJvZHkuZWwgPSBlbDtcblxuICAgICAgdGhpcy5pc0xvYWRlZCA9IHRydWU7XG5cbiAgICAgIHRoaXMuZWwuZW1pdChcImJvZHktbG9hZGVkXCIsIHsgYm9keTogdGhpcy5lbC5ib2R5IH0pO1xuXG4gICAgICB0aGlzLl9hZGRUb1N5c3RlbSgpO1xuICAgIH07XG4gIH0pKCksXG5cbiAgdGljazogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuc3lzdGVtLmluaXRpYWxpemVkICYmICF0aGlzLmlzTG9hZGVkICYmIHRoaXMubG9hZGVkRXZlbnRGaXJlZCkge1xuICAgICAgdGhpcy5pbml0Qm9keSgpO1xuICAgIH1cbiAgfSxcblxuICBfdXBkYXRlQm9keUdyYXZpdHkoZ3Jhdml0eSkge1xuXG4gICAgaWYgKGdyYXZpdHkueCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIGdyYXZpdHkueSAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIGdyYXZpdHkueiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBncmF2aXR5QnRWZWMgPSBuZXcgQW1tby5idFZlY3RvcjMoZ3Jhdml0eS54LCBncmF2aXR5LnksIGdyYXZpdHkueik7XG4gICAgICBpZiAoIWFsbW9zdEVxdWFsc0J0VmVjdG9yMygwLjAwMSwgZ3Jhdml0eUJ0VmVjLCB0aGlzLnN5c3RlbS5kcml2ZXIucGh5c2ljc1dvcmxkLmdldEdyYXZpdHkoKSkpIHtcbiAgICAgICAgdGhpcy5ib2R5LnNldEZsYWdzKFJJR0lEX0JPRFlfRkxBR1MuRElTQUJMRV9XT1JMRF9HUkFWSVRZKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYm9keS5zZXRGbGFncyhSSUdJRF9CT0RZX0ZMQUdTLk5PTkUpO1xuICAgICAgfVxuICAgICAgdGhpcy5ib2R5LnNldEdyYXZpdHkoZ3Jhdml0eUJ0VmVjKTtcbiAgICAgIEFtbW8uZGVzdHJveShncmF2aXR5QnRWZWMpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIC8vIG5vIHBlci1ib2R5IGdyYXZpdHkgc3BlY2lmaWVkIC0ganVzdCB1c2Ugd29ybGQgZ3Jhdml0eVxuICAgICAgdGhpcy5ib2R5LnNldEZsYWdzKFJJR0lEX0JPRFlfRkxBR1MuTk9ORSk7XG4gICAgfVxuICB9LFxuXG4gIF91cGRhdGVTaGFwZXM6IChmdW5jdGlvbigpIHtcbiAgICBjb25zdCBuZWVkc1BvbHloZWRyYWxJbml0aWFsaXphdGlvbiA9IFtTSEFQRS5IVUxMLCBTSEFQRS5IQUNELCBTSEFQRS5WSEFDRF07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgbGV0IHVwZGF0ZWQgPSBmYWxzZTtcblxuICAgICAgY29uc3Qgb2JqID0gdGhpcy5lbC5vYmplY3QzRDtcbiAgICAgIGlmICh0aGlzLmRhdGEuc2NhbGVBdXRvVXBkYXRlICYmIHRoaXMucHJldlNjYWxlICYmICFhbG1vc3RFcXVhbHNWZWN0b3IzKDAuMDAxLCBvYmouc2NhbGUsIHRoaXMucHJldlNjYWxlKSkge1xuICAgICAgICB0aGlzLnByZXZTY2FsZS5jb3B5KG9iai5zY2FsZSk7XG4gICAgICAgIHVwZGF0ZWQgPSB0cnVlO1xuXG4gICAgICAgIHRoaXMubG9jYWxTY2FsaW5nLnNldFZhbHVlKHRoaXMucHJldlNjYWxlLngsIHRoaXMucHJldlNjYWxlLnksIHRoaXMucHJldlNjYWxlLnopO1xuICAgICAgICB0aGlzLmNvbXBvdW5kU2hhcGUuc2V0TG9jYWxTY2FsaW5nKHRoaXMubG9jYWxTY2FsaW5nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuc2hhcGVDb21wb25lbnRzQ2hhbmdlZCkge1xuICAgICAgICB0aGlzLnNoYXBlQ29tcG9uZW50c0NoYW5nZWQgPSBmYWxzZTtcbiAgICAgICAgdXBkYXRlZCA9IHRydWU7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zaGFwZUNvbXBvbmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBzaGFwZUNvbXBvbmVudCA9IHRoaXMuc2hhcGVDb21wb25lbnRzW2ldO1xuICAgICAgICAgIGlmIChzaGFwZUNvbXBvbmVudC5nZXRTaGFwZXMoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuX2NyZWF0ZUNvbGxpc2lvblNoYXBlKHNoYXBlQ29tcG9uZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgY29sbGlzaW9uU2hhcGVzID0gc2hhcGVDb21wb25lbnQuZ2V0U2hhcGVzKCk7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb2xsaXNpb25TaGFwZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbGxpc2lvblNoYXBlID0gY29sbGlzaW9uU2hhcGVzW2pdO1xuICAgICAgICAgICAgaWYgKCFjb2xsaXNpb25TaGFwZS5hZGRlZCkge1xuICAgICAgICAgICAgICB0aGlzLmNvbXBvdW5kU2hhcGUuYWRkQ2hpbGRTaGFwZShjb2xsaXNpb25TaGFwZS5sb2NhbFRyYW5zZm9ybSwgY29sbGlzaW9uU2hhcGUpO1xuICAgICAgICAgICAgICBjb2xsaXNpb25TaGFwZS5hZGRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuZGF0YS50eXBlID09PSBUWVBFLkRZTkFNSUMpIHtcbiAgICAgICAgICB0aGlzLnVwZGF0ZU1hc3MoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuc3lzdGVtLmRyaXZlci51cGRhdGVCb2R5KHRoaXMuYm9keSk7XG4gICAgICB9XG5cbiAgICAgIC8vY2FsbCBpbml0aWFsaXplUG9seWhlZHJhbEZlYXR1cmVzIGZvciBodWxsIHNoYXBlcyBpZiBkZWJ1ZyBpcyB0dXJuZWQgb24gYW5kL29yIHNjYWxlIGNoYW5nZXNcbiAgICAgIGlmICh0aGlzLnN5c3RlbS5kZWJ1ZyAmJiAodXBkYXRlZCB8fCAhdGhpcy5wb2x5SGVkcmFsRmVhdHVyZXNJbml0aWFsaXplZCkpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNoYXBlQ29tcG9uZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGNvbGxpc2lvblNoYXBlcyA9IHRoaXMuc2hhcGVDb21wb25lbnRzW2ldLmdldFNoYXBlcygpO1xuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29sbGlzaW9uU2hhcGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBjb25zdCBjb2xsaXNpb25TaGFwZSA9IGNvbGxpc2lvblNoYXBlc1tqXTtcbiAgICAgICAgICAgIGlmIChuZWVkc1BvbHloZWRyYWxJbml0aWFsaXphdGlvbi5pbmRleE9mKGNvbGxpc2lvblNoYXBlLnR5cGUpICE9PSAtMSkge1xuICAgICAgICAgICAgICBjb2xsaXNpb25TaGFwZS5pbml0aWFsaXplUG9seWhlZHJhbEZlYXR1cmVzKDApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBvbHlIZWRyYWxGZWF0dXJlc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9O1xuICB9KSgpLFxuXG4gIF9jcmVhdGVDb2xsaXNpb25TaGFwZTogZnVuY3Rpb24oc2hhcGVDb21wb25lbnQpIHtcbiAgICBjb25zdCBkYXRhID0gc2hhcGVDb21wb25lbnQuZGF0YTtcbiAgICBjb25zdCB2ZXJ0aWNlcyA9IFtdO1xuICAgIGNvbnN0IG1hdHJpY2VzID0gW107XG4gICAgY29uc3QgaW5kZXhlcyA9IFtdO1xuXG4gICAgY29uc3Qgcm9vdCA9IHNoYXBlQ29tcG9uZW50LmVsLm9iamVjdDNEO1xuICAgIGNvbnN0IG1hdHJpeFdvcmxkID0gcm9vdC5tYXRyaXhXb3JsZDtcblxuICAgIHRocmVlVG9BbW1vLml0ZXJhdGVHZW9tZXRyaWVzKHJvb3QsIGRhdGEsICh2ZXJ0ZXhBcnJheSwgbWF0cml4QXJyYXksIGluZGV4QXJyYXkpID0+IHtcbiAgICAgIHZlcnRpY2VzLnB1c2godmVydGV4QXJyYXkpO1xuICAgICAgbWF0cmljZXMucHVzaChtYXRyaXhBcnJheSk7XG4gICAgICBpbmRleGVzLnB1c2goaW5kZXhBcnJheSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBjb2xsaXNpb25TaGFwZXMgPSB0aHJlZVRvQW1tby5jcmVhdGVDb2xsaXNpb25TaGFwZXModmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZC5lbGVtZW50cywgZGF0YSk7XG4gICAgc2hhcGVDb21wb25lbnQuYWRkU2hhcGVzKGNvbGxpc2lvblNoYXBlcyk7XG4gICAgcmV0dXJuO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBwaHlzaWNzIHN5c3RlbS5cbiAgICovXG4gIHBsYXk6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlzTG9hZGVkKSB7XG4gICAgICB0aGlzLl9hZGRUb1N5c3RlbSgpO1xuICAgIH1cbiAgfSxcblxuICBfYWRkVG9TeXN0ZW06IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5hZGRlZFRvU3lzdGVtKSB7XG4gICAgICB0aGlzLnN5c3RlbS5hZGRCb2R5KHRoaXMuYm9keSwgdGhpcy5kYXRhLmNvbGxpc2lvbkZpbHRlckdyb3VwLCB0aGlzLmRhdGEuY29sbGlzaW9uRmlsdGVyTWFzayk7XG5cbiAgICAgIGlmICh0aGlzLmRhdGEuZW1pdENvbGxpc2lvbkV2ZW50cykge1xuICAgICAgICB0aGlzLnN5c3RlbS5kcml2ZXIuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmJvZHkpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN5c3RlbS5hZGRDb21wb25lbnQodGhpcyk7XG4gICAgICB0aGlzLmFkZGVkVG9TeXN0ZW0gPSB0cnVlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogVW5yZWdpc3RlcnMgdGhlIGNvbXBvbmVudCB3aXRoIHRoZSBwaHlzaWNzIHN5c3RlbS5cbiAgICovXG4gIHBhdXNlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5hZGRlZFRvU3lzdGVtKSB7XG4gICAgICB0aGlzLnN5c3RlbS5yZW1vdmVDb21wb25lbnQodGhpcyk7XG4gICAgICB0aGlzLnN5c3RlbS5yZW1vdmVCb2R5KHRoaXMuYm9keSk7XG4gICAgICB0aGlzLmFkZGVkVG9TeXN0ZW0gPSBmYWxzZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHJpZ2lkIGJvZHkgaW5zdGFuY2UsIHdoZXJlIHBvc3NpYmxlLlxuICAgKi9cbiAgdXBkYXRlOiBmdW5jdGlvbihwcmV2RGF0YSkge1xuICAgIGlmICh0aGlzLmlzTG9hZGVkKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzVXBkYXRlZCkge1xuICAgICAgICAvL3NraXAgdGhlIGZpcnN0IHVwZGF0ZVxuICAgICAgICB0aGlzLmhhc1VwZGF0ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGE7XG5cbiAgICAgIGlmIChwcmV2RGF0YS50eXBlICE9PSBkYXRhLnR5cGUgfHwgcHJldkRhdGEuZGlzYWJsZUNvbGxpc2lvbiAhPT0gZGF0YS5kaXNhYmxlQ29sbGlzaW9uKSB7XG4gICAgICAgIHRoaXMudXBkYXRlQ29sbGlzaW9uRmxhZ3MoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByZXZEYXRhLmFjdGl2YXRpb25TdGF0ZSAhPT0gZGF0YS5hY3RpdmF0aW9uU3RhdGUpIHtcbiAgICAgICAgdGhpcy5ib2R5LmZvcmNlQWN0aXZhdGlvblN0YXRlKEFDVElWQVRJT05fU1RBVEVTLmluZGV4T2YoZGF0YS5hY3RpdmF0aW9uU3RhdGUpICsgMSk7XG4gICAgICAgIGlmIChkYXRhLmFjdGl2YXRpb25TdGF0ZSA9PT0gQUNUSVZBVElPTl9TVEFURS5BQ1RJVkVfVEFHKSB7XG4gICAgICAgICAgdGhpcy5ib2R5LmFjdGl2YXRlKHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChcbiAgICAgICAgcHJldkRhdGEuY29sbGlzaW9uRmlsdGVyR3JvdXAgIT09IGRhdGEuY29sbGlzaW9uRmlsdGVyR3JvdXAgfHxcbiAgICAgICAgcHJldkRhdGEuY29sbGlzaW9uRmlsdGVyTWFzayAhPT0gZGF0YS5jb2xsaXNpb25GaWx0ZXJNYXNrXG4gICAgICApIHtcbiAgICAgICAgY29uc3QgYnJvYWRwaGFzZVByb3h5ID0gdGhpcy5ib2R5LmdldEJyb2FkcGhhc2VQcm94eSgpO1xuICAgICAgICBicm9hZHBoYXNlUHJveHkuc2V0X21fY29sbGlzaW9uRmlsdGVyR3JvdXAoZGF0YS5jb2xsaXNpb25GaWx0ZXJHcm91cCk7XG4gICAgICAgIGJyb2FkcGhhc2VQcm94eS5zZXRfbV9jb2xsaXNpb25GaWx0ZXJNYXNrKGRhdGEuY29sbGlzaW9uRmlsdGVyTWFzayk7XG4gICAgICAgIHRoaXMuc3lzdGVtLmRyaXZlci5icm9hZHBoYXNlXG4gICAgICAgICAgLmdldE92ZXJsYXBwaW5nUGFpckNhY2hlKClcbiAgICAgICAgICAucmVtb3ZlT3ZlcmxhcHBpbmdQYWlyc0NvbnRhaW5pbmdQcm94eShicm9hZHBoYXNlUHJveHksIHRoaXMuc3lzdGVtLmRyaXZlci5kaXNwYXRjaGVyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByZXZEYXRhLmxpbmVhckRhbXBpbmcgIT0gZGF0YS5saW5lYXJEYW1waW5nIHx8IHByZXZEYXRhLmFuZ3VsYXJEYW1waW5nICE9IGRhdGEuYW5ndWxhckRhbXBpbmcpIHtcbiAgICAgICAgdGhpcy5ib2R5LnNldERhbXBpbmcoZGF0YS5saW5lYXJEYW1waW5nLCBkYXRhLmFuZ3VsYXJEYW1waW5nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFhbG1vc3RFcXVhbHNWZWN0b3IzKDAuMDAxLCBwcmV2RGF0YS5ncmF2aXR5LCBkYXRhLmdyYXZpdHkpKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZUJvZHlHcmF2aXR5KGRhdGEuZ3Jhdml0eSlcbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBwcmV2RGF0YS5saW5lYXJTbGVlcGluZ1RocmVzaG9sZCAhPSBkYXRhLmxpbmVhclNsZWVwaW5nVGhyZXNob2xkIHx8XG4gICAgICAgIHByZXZEYXRhLmFuZ3VsYXJTbGVlcGluZ1RocmVzaG9sZCAhPSBkYXRhLmFuZ3VsYXJTbGVlcGluZ1RocmVzaG9sZFxuICAgICAgKSB7XG4gICAgICAgIHRoaXMuYm9keS5zZXRTbGVlcGluZ1RocmVzaG9sZHMoZGF0YS5saW5lYXJTbGVlcGluZ1RocmVzaG9sZCwgZGF0YS5hbmd1bGFyU2xlZXBpbmdUaHJlc2hvbGQpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFsbW9zdEVxdWFsc1ZlY3RvcjMoMC4wMDEsIHByZXZEYXRhLmFuZ3VsYXJGYWN0b3IsIGRhdGEuYW5ndWxhckZhY3RvcikpIHtcbiAgICAgICAgY29uc3QgYW5ndWxhckZhY3RvciA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhkYXRhLmFuZ3VsYXJGYWN0b3IueCwgZGF0YS5hbmd1bGFyRmFjdG9yLnksIGRhdGEuYW5ndWxhckZhY3Rvci56KTtcbiAgICAgICAgdGhpcy5ib2R5LnNldEFuZ3VsYXJGYWN0b3IoYW5ndWxhckZhY3Rvcik7XG4gICAgICAgIEFtbW8uZGVzdHJveShhbmd1bGFyRmFjdG9yKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHByZXZEYXRhLnJlc3RpdHV0aW9uICE9IGRhdGEucmVzdGl0dXRpb24gKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcImFtbW8tYm9keSByZXN0aXR1dGlvbiBjYW5ub3QgYmUgdXBkYXRlZCBmcm9tIGl0cyBpbml0aWFsIHZhbHVlLlwiKVxuICAgICAgfVxuXG4gICAgICAvL1RPRE86IHN1cHBvcnQgZHluYW1pYyB1cGRhdGUgZm9yIG90aGVyIHByb3BlcnRpZXNcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgdGhlIGNvbXBvbmVudCBhbmQgYWxsIHBoeXNpY3MgYW5kIHNjZW5lIHNpZGUgZWZmZWN0cy5cbiAgICovXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMudHJpTWVzaCkgQW1tby5kZXN0cm95KHRoaXMudHJpTWVzaCk7XG4gICAgaWYgKHRoaXMubG9jYWxTY2FsaW5nKSBBbW1vLmRlc3Ryb3kodGhpcy5sb2NhbFNjYWxpbmcpO1xuICAgIGlmICh0aGlzLmNvbXBvdW5kU2hhcGUpIEFtbW8uZGVzdHJveSh0aGlzLmNvbXBvdW5kU2hhcGUpO1xuICAgIGlmICh0aGlzLmJvZHkpIHtcbiAgICAgIEFtbW8uZGVzdHJveSh0aGlzLmJvZHkpO1xuICAgICAgZGVsZXRlIHRoaXMuYm9keTtcbiAgICB9XG4gICAgQW1tby5kZXN0cm95KHRoaXMucmJJbmZvKTtcbiAgICBBbW1vLmRlc3Ryb3kodGhpcy5tc1RyYW5zZm9ybSk7XG4gICAgQW1tby5kZXN0cm95KHRoaXMubW90aW9uU3RhdGUpO1xuICAgIEFtbW8uZGVzdHJveSh0aGlzLmxvY2FsSW5lcnRpYSk7XG4gICAgQW1tby5kZXN0cm95KHRoaXMucm90YXRpb24pO1xuICB9LFxuXG4gIGJlZm9yZVN0ZXA6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3VwZGF0ZVNoYXBlcygpO1xuICAgIC8vIE5vdGUgdGhhdCBzaW5jZSBzdGF0aWMgb2JqZWN0cyBkb24ndCBtb3ZlLFxuICAgIC8vIHdlIGRvbid0IHN5bmMgdGhlbSB0byBwaHlzaWNzIG9uIGEgcm91dGluZSBiYXNpcy5cbiAgICBpZiAodGhpcy5kYXRhLnR5cGUgPT09IFRZUEUuS0lORU1BVElDKSB7XG4gICAgICB0aGlzLnN5bmNUb1BoeXNpY3MoKTtcbiAgICB9XG4gIH0sXG5cbiAgc3RlcDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS50eXBlID09PSBUWVBFLkRZTkFNSUMpIHtcbiAgICAgIHRoaXMuc3luY0Zyb21QaHlzaWNzKCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSByaWdpZCBib2R5J3MgcG9zaXRpb24sIHZlbG9jaXR5LCBhbmQgcm90YXRpb24sIGJhc2VkIG9uIHRoZSBzY2VuZS5cbiAgICovXG4gIHN5bmNUb1BoeXNpY3M6IChmdW5jdGlvbigpIHtcbiAgICBjb25zdCBxID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgICBjb25zdCB2ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICBjb25zdCBxMiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgY29uc3QgdjIgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGVsID0gdGhpcy5lbCxcbiAgICAgICAgcGFyZW50RWwgPSBlbC5wYXJlbnRFbCxcbiAgICAgICAgYm9keSA9IHRoaXMuYm9keTtcblxuICAgICAgaWYgKCFib2R5KSByZXR1cm47XG5cbiAgICAgIHRoaXMubW90aW9uU3RhdGUuZ2V0V29ybGRUcmFuc2Zvcm0odGhpcy5tc1RyYW5zZm9ybSk7XG5cbiAgICAgIGlmIChwYXJlbnRFbC5pc1NjZW5lKSB7XG4gICAgICAgIHYuY29weShlbC5vYmplY3QzRC5wb3NpdGlvbik7XG4gICAgICAgIHEuY29weShlbC5vYmplY3QzRC5xdWF0ZXJuaW9uKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLm9iamVjdDNELmdldFdvcmxkUG9zaXRpb24odik7XG4gICAgICAgIGVsLm9iamVjdDNELmdldFdvcmxkUXVhdGVybmlvbihxKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcG9zaXRpb24gPSB0aGlzLm1zVHJhbnNmb3JtLmdldE9yaWdpbigpO1xuICAgICAgdjIuc2V0KHBvc2l0aW9uLngoKSwgcG9zaXRpb24ueSgpLCBwb3NpdGlvbi56KCkpO1xuXG4gICAgICBjb25zdCBxdWF0ZXJuaW9uID0gdGhpcy5tc1RyYW5zZm9ybS5nZXRSb3RhdGlvbigpO1xuICAgICAgcTIuc2V0KHF1YXRlcm5pb24ueCgpLCBxdWF0ZXJuaW9uLnkoKSwgcXVhdGVybmlvbi56KCksIHF1YXRlcm5pb24udygpKTtcblxuICAgICAgaWYgKCFhbG1vc3RFcXVhbHNWZWN0b3IzKDAuMDAxLCB2LCB2MikgfHwgIWFsbW9zdEVxdWFsc1F1YXRlcm5pb24oMC4wMDEsIHEsIHEyKSkge1xuICAgICAgICBpZiAoIXRoaXMuYm9keS5pc0FjdGl2ZSgpKSB7XG4gICAgICAgICAgdGhpcy5ib2R5LmFjdGl2YXRlKHRydWUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMubXNUcmFuc2Zvcm0uZ2V0T3JpZ2luKCkuc2V0VmFsdWUodi54LCB2LnksIHYueik7XG4gICAgICAgIHRoaXMucm90YXRpb24uc2V0VmFsdWUocS54LCBxLnksIHEueiwgcS53KTtcbiAgICAgICAgdGhpcy5tc1RyYW5zZm9ybS5zZXRSb3RhdGlvbih0aGlzLnJvdGF0aW9uKTtcbiAgICAgICAgdGhpcy5tb3Rpb25TdGF0ZS5zZXRXb3JsZFRyYW5zZm9ybSh0aGlzLm1zVHJhbnNmb3JtKTtcblxuICAgICAgICBpZiAodGhpcy5kYXRhLnR5cGUgIT09IFRZUEUuS0lORU1BVElDKSB7XG4gICAgICAgICAgdGhpcy5ib2R5LnNldENlbnRlck9mTWFzc1RyYW5zZm9ybSh0aGlzLm1zVHJhbnNmb3JtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH0pKCksXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHNjZW5lIG9iamVjdCdzIHBvc2l0aW9uIGFuZCByb3RhdGlvbiwgYmFzZWQgb24gdGhlIHBoeXNpY3Mgc2ltdWxhdGlvbi5cbiAgICovXG4gIHN5bmNGcm9tUGh5c2ljczogKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHYgPSBuZXcgVEhSRUUuVmVjdG9yMygpLFxuICAgICAgcTEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLFxuICAgICAgcTIgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMubW90aW9uU3RhdGUuZ2V0V29ybGRUcmFuc2Zvcm0odGhpcy5tc1RyYW5zZm9ybSk7XG4gICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMubXNUcmFuc2Zvcm0uZ2V0T3JpZ2luKCk7XG4gICAgICBjb25zdCBxdWF0ZXJuaW9uID0gdGhpcy5tc1RyYW5zZm9ybS5nZXRSb3RhdGlvbigpO1xuXG4gICAgICBjb25zdCBlbCA9IHRoaXMuZWwsXG4gICAgICAgIGJvZHkgPSB0aGlzLmJvZHk7XG5cbiAgICAgIC8vIEZvciB0aGUgcGFyZW50LCBwcmVmZXIgdG8gdXNlIHRoZSBUSEhSRUUuanMgc2NlbmUgZ3JhcGggcGFyZW50IChpZiBpdCBjYW4gYmUgZGV0ZXJtaW5lZClcbiAgICAgIC8vIGFuZCBvbmx5IHVzZSB0aGUgSFRNTCBzY2VuZSBncmFwaCBwYXJlbnQgYXMgYSBmYWxsYmFjay5cbiAgICAgIC8vIFVzdWFsbHkgdGhlc2UgYXJlIHRoZSBzYW1lLCBidXQgdGhlcmUgYXJlIHZhcmlvdXMgY2FzZXMgd2hlcmUgaXQncyB1c2VmdWwgdG8gbW9kaWZ5IHRoZSBUSFJFRS5qc1xuICAgICAgLy8gc2NlbmUgZ3JhcGggc28gdGhhdCBpdCBkZXZpYXRlcyBmcm9tIHRoZSBIVE1MLlxuICAgICAgLy8gSW4gdGhlc2UgY2FzZXMgdGhlIFRIUkVFLmpzIHNjZW5lIGdyYXBoIHNob3VsZCBiZSBjb25zaWRlcmVkIHRoZSBkZWZpbml0aXZlIHJlZmVyZW5jZSBpbiB0ZXJtc1xuICAgICAgLy8gb2Ygb2JqZWN0IHBvc2l0aW9uaW5nIGV0Yy5cbiAgICAgIC8vIEZvciBzcGVjaWZpYyBleGFtcGxlcywgYW5kIG1vcmUgZGlzY3Vzc2lvbiwgc2VlOlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2MtZnJhbWUvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3B1bGwvMSNpc3N1ZWNvbW1lbnQtMTI2NDY4NjQzM1xuICAgICAgY29uc3QgcGFyZW50RWwgPSBlbC5vYmplY3QzRC5wYXJlbnQuZWwgPyBlbC5vYmplY3QzRC5wYXJlbnQuZWwgOiBlbC5wYXJlbnRFbDtcblxuICAgICAgaWYgKCFib2R5KSByZXR1cm47XG4gICAgICBpZiAoIXBhcmVudEVsKSByZXR1cm47XG5cbiAgICAgIGlmIChwYXJlbnRFbC5pc1NjZW5lKSB7XG4gICAgICAgIGVsLm9iamVjdDNELnBvc2l0aW9uLnNldChwb3NpdGlvbi54KCksIHBvc2l0aW9uLnkoKSwgcG9zaXRpb24ueigpKTtcbiAgICAgICAgZWwub2JqZWN0M0QucXVhdGVybmlvbi5zZXQocXVhdGVybmlvbi54KCksIHF1YXRlcm5pb24ueSgpLCBxdWF0ZXJuaW9uLnooKSwgcXVhdGVybmlvbi53KCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcTEuc2V0KHF1YXRlcm5pb24ueCgpLCBxdWF0ZXJuaW9uLnkoKSwgcXVhdGVybmlvbi56KCksIHF1YXRlcm5pb24udygpKTtcbiAgICAgICAgcGFyZW50RWwub2JqZWN0M0QuZ2V0V29ybGRRdWF0ZXJuaW9uKHEyKTtcbiAgICAgICAgcTEubXVsdGlwbHkocTIuaW52ZXJ0KCkpO1xuICAgICAgICBlbC5vYmplY3QzRC5xdWF0ZXJuaW9uLmNvcHkocTEpO1xuXG4gICAgICAgIHYuc2V0KHBvc2l0aW9uLngoKSwgcG9zaXRpb24ueSgpLCBwb3NpdGlvbi56KCkpO1xuICAgICAgICBwYXJlbnRFbC5vYmplY3QzRC53b3JsZFRvTG9jYWwodik7XG4gICAgICAgIGVsLm9iamVjdDNELnBvc2l0aW9uLmNvcHkodik7XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKSxcblxuICBhZGRTaGFwZUNvbXBvbmVudDogZnVuY3Rpb24oc2hhcGVDb21wb25lbnQpIHtcbiAgICBpZiAoc2hhcGVDb21wb25lbnQuZGF0YS50eXBlID09PSBTSEFQRS5NRVNIICYmIHRoaXMuZGF0YS50eXBlICE9PSBUWVBFLlNUQVRJQykge1xuICAgICAgY29uc29sZS53YXJuKFwibm9uLXN0YXRpYyBtZXNoIGNvbGxpZGVycyBub3Qgc3VwcG9ydGVkXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuc2hhcGVDb21wb25lbnRzLnB1c2goc2hhcGVDb21wb25lbnQpO1xuICAgIHRoaXMuc2hhcGVDb21wb25lbnRzQ2hhbmdlZCA9IHRydWU7XG4gIH0sXG5cbiAgcmVtb3ZlU2hhcGVDb21wb25lbnQ6IGZ1bmN0aW9uKHNoYXBlQ29tcG9uZW50KSB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLnNoYXBlQ29tcG9uZW50cy5pbmRleE9mKHNoYXBlQ29tcG9uZW50KTtcbiAgICBpZiAodGhpcy5jb21wb3VuZFNoYXBlICYmIGluZGV4ICE9PSAtMSAmJiB0aGlzLmJvZHkpIHtcbiAgICAgIGNvbnN0IHNoYXBlcyA9IHNoYXBlQ29tcG9uZW50LmdldFNoYXBlcygpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaGFwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdGhpcy5jb21wb3VuZFNoYXBlLnJlbW92ZUNoaWxkU2hhcGUoc2hhcGVzW2ldKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2hhcGVDb21wb25lbnRzQ2hhbmdlZCA9IHRydWU7XG4gICAgICB0aGlzLnNoYXBlQ29tcG9uZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgfSxcblxuICB1cGRhdGVNYXNzOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBzaGFwZSA9IHRoaXMuYm9keS5nZXRDb2xsaXNpb25TaGFwZSgpO1xuICAgIGNvbnN0IG1hc3MgPSB0aGlzLmRhdGEudHlwZSA9PT0gVFlQRS5EWU5BTUlDID8gdGhpcy5kYXRhLm1hc3MgOiAwO1xuICAgIHNoYXBlLmNhbGN1bGF0ZUxvY2FsSW5lcnRpYShtYXNzLCB0aGlzLmxvY2FsSW5lcnRpYSk7XG4gICAgdGhpcy5ib2R5LnNldE1hc3NQcm9wcyhtYXNzLCB0aGlzLmxvY2FsSW5lcnRpYSk7XG4gICAgdGhpcy5ib2R5LnVwZGF0ZUluZXJ0aWFUZW5zb3IoKTtcbiAgfSxcblxuICB1cGRhdGVDb2xsaXNpb25GbGFnczogZnVuY3Rpb24oKSB7XG4gICAgbGV0IGZsYWdzID0gdGhpcy5kYXRhLmRpc2FibGVDb2xsaXNpb24gPyA0IDogMDtcbiAgICBzd2l0Y2ggKHRoaXMuZGF0YS50eXBlKSB7XG4gICAgICBjYXNlIFRZUEUuU1RBVElDOlxuICAgICAgICBmbGFncyB8PSBDT0xMSVNJT05fRkxBRy5TVEFUSUNfT0JKRUNUO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgVFlQRS5LSU5FTUFUSUM6XG4gICAgICAgIGZsYWdzIHw9IENPTExJU0lPTl9GTEFHLktJTkVNQVRJQ19PQkpFQ1Q7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5ib2R5LmFwcGx5R3Jhdml0eSgpO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgdGhpcy5ib2R5LnNldENvbGxpc2lvbkZsYWdzKGZsYWdzKTtcblxuICAgIHRoaXMudXBkYXRlTWFzcygpO1xuXG4gICAgLy8gVE9ETzogZW5hYmxlIENDRCBpZiBkeW5hbWljP1xuICAgIC8vIHRoaXMuYm9keS5zZXRDY2RNb3Rpb25UaHJlc2hvbGQoMC4wMDEpO1xuICAgIC8vIHRoaXMuYm9keS5zZXRDY2RTd2VwdFNwaGVyZVJhZGl1cygwLjAwMSk7XG5cbiAgICB0aGlzLnN5c3RlbS5kcml2ZXIudXBkYXRlQm9keSh0aGlzLmJvZHkpO1xuICB9LFxuXG4gIGdldFZlbG9jaXR5OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5ib2R5LmdldExpbmVhclZlbG9jaXR5KCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmRlZmluaXRpb24gPSBBbW1vQm9keTtcbm1vZHVsZS5leHBvcnRzLkNvbXBvbmVudCA9IEFGUkFNRS5yZWdpc3RlckNvbXBvbmVudChcImFtbW8tYm9keVwiLCBBbW1vQm9keSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgJ3ZlbG9jaXR5JzogICByZXF1aXJlKCcuL3ZlbG9jaXR5JyksXG5cbiAgcmVnaXN0ZXJBbGw6IGZ1bmN0aW9uIChBRlJBTUUpIHtcbiAgICBpZiAodGhpcy5fcmVnaXN0ZXJlZCkgcmV0dXJuO1xuXG4gICAgQUZSQU1FID0gQUZSQU1FIHx8IHdpbmRvdy5BRlJBTUU7XG5cbiAgICBpZiAoIUFGUkFNRS5jb21wb25lbnRzWyd2ZWxvY2l0eSddKSAgICBBRlJBTUUucmVnaXN0ZXJDb21wb25lbnQoJ3ZlbG9jaXR5JywgICB0aGlzLnZlbG9jaXR5KTtcblxuICAgIHRoaXMuX3JlZ2lzdGVyZWQgPSB0cnVlO1xuICB9XG59O1xuIiwiLyoqXG4gKiBWZWxvY2l0eSwgaW4gbS9zLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgndmVsb2NpdHknLCB7XG4gIHNjaGVtYToge3R5cGU6ICd2ZWMzJ30sXG5cbiAgaW5pdDogZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuc3lzdGVtID0gdGhpcy5lbC5zY2VuZUVsLnN5c3RlbXMucGh5c2ljcztcblxuICAgIGlmICh0aGlzLnN5c3RlbSkge1xuICAgICAgdGhpcy5zeXN0ZW0uYWRkQ29tcG9uZW50KHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICByZW1vdmU6IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy5zeXN0ZW0pIHtcbiAgICAgIHRoaXMuc3lzdGVtLnJlbW92ZUNvbXBvbmVudCh0aGlzKTtcbiAgICB9XG4gIH0sXG5cbiAgdGljazogZnVuY3Rpb24gKHQsIGR0KSB7XG4gICAgaWYgKCFkdCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLnN5c3RlbSkgcmV0dXJuO1xuICAgIHRoaXMuYWZ0ZXJTdGVwKHQsIGR0KTtcbiAgfSxcblxuICBhZnRlclN0ZXA6IGZ1bmN0aW9uICh0LCBkdCkge1xuICAgIGlmICghZHQpIHJldHVybjtcblxuICAgIHZhciBwaHlzaWNzID0gdGhpcy5lbC5zY2VuZUVsLnN5c3RlbXMucGh5c2ljcyB8fCB7ZGF0YToge21heEludGVydmFsOiAxIC8gNjB9fSxcblxuICAgIC8vIFRPRE8gLSBUaGVyZSdzIGRlZmluaXRlbHkgYSBidWcgd2l0aCBnZXRDb21wdXRlZEF0dHJpYnV0ZSBhbmQgZWwuZGF0YS5cbiAgICB2ZWxvY2l0eSA9IHRoaXMuZWwuZ2V0QXR0cmlidXRlKCd2ZWxvY2l0eScpIHx8IHt4OiAwLCB5OiAwLCB6OiAwfSxcbiAgICBwb3NpdGlvbiA9IHRoaXMuZWwub2JqZWN0M0QucG9zaXRpb24gfHwge3g6IDAsIHk6IDAsIHo6IDB9O1xuXG4gICAgZHQgPSBNYXRoLm1pbihkdCwgcGh5c2ljcy5kYXRhLm1heEludGVydmFsICogMTAwMCk7XG5cbiAgICB0aGlzLmVsLm9iamVjdDNELnBvc2l0aW9uLnNldChcbiAgICAgIHBvc2l0aW9uLnggKyB2ZWxvY2l0eS54ICogZHQgLyAxMDAwLFxuICAgICAgcG9zaXRpb24ueSArIHZlbG9jaXR5LnkgKiBkdCAvIDEwMDAsXG4gICAgICBwb3NpdGlvbi56ICsgdmVsb2NpdHkueiAqIGR0IC8gMTAwMFxuICAgICk7XG4gIH1cbn0pO1xuIiwiLyogZ2xvYmFsIEFtbW8sVEhSRUUgKi9cbmNvbnN0IHRocmVlVG9BbW1vID0gcmVxdWlyZShcInRocmVlLXRvLWFtbW9cIik7XG5jb25zdCBDT05TVEFOVFMgPSByZXF1aXJlKFwiLi4vLi4vY29uc3RhbnRzXCIpLFxuICBTSEFQRSA9IENPTlNUQU5UUy5TSEFQRSxcbiAgRklUID0gQ09OU1RBTlRTLkZJVDtcblxudmFyIEFtbW9TaGFwZSA9IHtcbiAgc2NoZW1hOiB7XG4gICAgdHlwZToge1xuICAgICAgZGVmYXVsdDogU0hBUEUuSFVMTCxcbiAgICAgIG9uZU9mOiBbXG4gICAgICAgIFNIQVBFLkJPWCxcbiAgICAgICAgU0hBUEUuQ1lMSU5ERVIsXG4gICAgICAgIFNIQVBFLlNQSEVSRSxcbiAgICAgICAgU0hBUEUuQ0FQU1VMRSxcbiAgICAgICAgU0hBUEUuQ09ORSxcbiAgICAgICAgU0hBUEUuSFVMTCxcbiAgICAgICAgU0hBUEUuSEFDRCxcbiAgICAgICAgU0hBUEUuVkhBQ0QsXG4gICAgICAgIFNIQVBFLk1FU0gsXG4gICAgICAgIFNIQVBFLkhFSUdIVEZJRUxEXG4gICAgICBdXG4gICAgfSxcbiAgICBmaXQ6IHsgZGVmYXVsdDogRklULkFMTCwgb25lT2Y6IFtGSVQuQUxMLCBGSVQuTUFOVUFMXSB9LFxuICAgIGhhbGZFeHRlbnRzOiB7IHR5cGU6IFwidmVjM1wiLCBkZWZhdWx0OiB7IHg6IDEsIHk6IDEsIHo6IDEgfSB9LFxuICAgIG1pbkhhbGZFeHRlbnQ6IHsgZGVmYXVsdDogMCB9LFxuICAgIG1heEhhbGZFeHRlbnQ6IHsgZGVmYXVsdDogTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZIH0sXG4gICAgc3BoZXJlUmFkaXVzOiB7IGRlZmF1bHQ6IE5hTiB9LFxuICAgIGN5bGluZGVyQXhpczogeyBkZWZhdWx0OiBcInlcIiwgb25lT2Y6IFtcInhcIiwgXCJ5XCIsIFwielwiXSB9LFxuICAgIG1hcmdpbjogeyBkZWZhdWx0OiAwLjAxIH0sXG4gICAgb2Zmc2V0OiB7IHR5cGU6IFwidmVjM1wiLCBkZWZhdWx0OiB7IHg6IDAsIHk6IDAsIHo6IDAgfSB9LFxuICAgIG9yaWVudGF0aW9uOiB7IHR5cGU6IFwidmVjNFwiLCBkZWZhdWx0OiB7IHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSB9LFxuICAgIGhlaWdodGZpZWxkRGF0YTogeyBkZWZhdWx0OiBbXSB9LFxuICAgIGhlaWdodGZpZWxkRGlzdGFuY2U6IHsgZGVmYXVsdDogMSB9LFxuICAgIGluY2x1ZGVJbnZpc2libGU6IHsgZGVmYXVsdDogZmFsc2UgfVxuICB9LFxuXG4gIG11bHRpcGxlOiB0cnVlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmRhdGEuZml0ICE9PSBGSVQuTUFOVUFMKSB7XG4gICAgICBpZiAodGhpcy5lbC5vYmplY3QzRE1hcC5tZXNoKSB7XG5cdHRoaXMubWVzaCA9IHRoaXMuZWwub2JqZWN0M0RNYXAubWVzaDtcbiAgICAgIH0gZWxzZSB7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHR0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJvYmplY3QzZHNldFwiLCBmdW5jdGlvbiAoZSkge1xuXHQgIGlmIChlLmRldGFpbC50eXBlID09PSBcIm1lc2hcIikge1xuXHQgICAgc2VsZi5pbml0KCk7XG5cdCAgfVxuXHR9KTtcblx0Y29uc29sZS5sb2coXCJDYW5ub3QgdXNlIEZJVC5BTEwgd2l0aG91dCBvYmplY3QzRE1hcC5tZXNoLiBXYWl0aW5nIGZvciBpdCB0byBiZSBzZXQuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zeXN0ZW0gPSB0aGlzLmVsLnNjZW5lRWwuc3lzdGVtcy5waHlzaWNzO1xuICAgIHRoaXMuY29sbGlzaW9uU2hhcGVzID0gW107XG5cbiAgICBsZXQgYm9keUVsID0gdGhpcy5lbDtcbiAgICB0aGlzLmJvZHkgPSBib2R5RWwuY29tcG9uZW50c1tcImFtbW8tYm9keVwiXSB8fCBudWxsO1xuICAgIHdoaWxlICghdGhpcy5ib2R5ICYmIGJvZHlFbC5wYXJlbnROb2RlICE9IHRoaXMuZWwuc2NlbmVFbCkge1xuICAgICAgYm9keUVsID0gYm9keUVsLnBhcmVudE5vZGU7XG4gICAgICBpZiAoYm9keUVsLmNvbXBvbmVudHNbXCJhbW1vLWJvZHlcIl0pIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gYm9keUVsLmNvbXBvbmVudHNbXCJhbW1vLWJvZHlcIl07XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghdGhpcy5ib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJib2R5IG5vdCBmb3VuZFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5ib2R5LmFkZFNoYXBlQ29tcG9uZW50KHRoaXMpO1xuICB9LFxuXG4gIGdldE1lc2g6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLm1lc2ggfHwgbnVsbDtcbiAgfSxcblxuICBhZGRTaGFwZXM6IGZ1bmN0aW9uKGNvbGxpc2lvblNoYXBlcykge1xuICAgIHRoaXMuY29sbGlzaW9uU2hhcGVzID0gY29sbGlzaW9uU2hhcGVzO1xuICB9LFxuXG4gIGdldFNoYXBlczogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuY29sbGlzaW9uU2hhcGVzO1xuICB9LFxuXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmJvZHkpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmJvZHkucmVtb3ZlU2hhcGVDb21wb25lbnQodGhpcyk7XG5cbiAgICB3aGlsZSAodGhpcy5jb2xsaXNpb25TaGFwZXMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgY29sbGlzaW9uU2hhcGUgPSB0aGlzLmNvbGxpc2lvblNoYXBlcy5wb3AoKTtcbiAgICAgIGNvbGxpc2lvblNoYXBlLmRlc3Ryb3koKTtcbiAgICAgIEFtbW8uZGVzdHJveShjb2xsaXNpb25TaGFwZS5sb2NhbFRyYW5zZm9ybSk7XG4gICAgfVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cy5kZWZpbml0aW9uID0gQW1tb1NoYXBlO1xubW9kdWxlLmV4cG9ydHMuQ29tcG9uZW50ID0gQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KFwiYW1tby1zaGFwZVwiLCBBbW1vU2hhcGUpO1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIEdSQVZJVFk6IC05LjgsXG4gIE1BWF9JTlRFUlZBTDogNCAvIDYwLFxuICBJVEVSQVRJT05TOiAxMCxcbiAgQ09OVEFDVF9NQVRFUklBTDoge1xuICAgIGZyaWN0aW9uOiAwLjAxLFxuICAgIHJlc3RpdHV0aW9uOiAwLjMsXG4gICAgY29udGFjdEVxdWF0aW9uU3RpZmZuZXNzOiAxZTgsXG4gICAgY29udGFjdEVxdWF0aW9uUmVsYXhhdGlvbjogMyxcbiAgICBmcmljdGlvbkVxdWF0aW9uU3RpZmZuZXNzOiAxZTgsXG4gICAgZnJpY3Rpb25FcXVhdGlvblJlZ3VsYXJpemF0aW9uOiAzXG4gIH0sXG4gIEFDVElWQVRJT05fU1RBVEU6IHtcbiAgICBBQ1RJVkVfVEFHOiBcImFjdGl2ZVwiLFxuICAgIElTTEFORF9TTEVFUElORzogXCJpc2xhbmRTbGVlcGluZ1wiLFxuICAgIFdBTlRTX0RFQUNUSVZBVElPTjogXCJ3YW50c0RlYWN0aXZhdGlvblwiLFxuICAgIERJU0FCTEVfREVBQ1RJVkFUSU9OOiBcImRpc2FibGVEZWFjdGl2YXRpb25cIixcbiAgICBESVNBQkxFX1NJTVVMQVRJT046IFwiZGlzYWJsZVNpbXVsYXRpb25cIlxuICB9LFxuICBDT0xMSVNJT05fRkxBRzoge1xuICAgIFNUQVRJQ19PQkpFQ1Q6IDEsXG4gICAgS0lORU1BVElDX09CSkVDVDogMixcbiAgICBOT19DT05UQUNUX1JFU1BPTlNFOiA0LFxuICAgIENVU1RPTV9NQVRFUklBTF9DQUxMQkFDSzogOCwgLy90aGlzIGFsbG93cyBwZXItdHJpYW5nbGUgbWF0ZXJpYWwgKGZyaWN0aW9uL3Jlc3RpdHV0aW9uKVxuICAgIENIQVJBQ1RFUl9PQkpFQ1Q6IDE2LFxuICAgIERJU0FCTEVfVklTVUFMSVpFX09CSkVDVDogMzIsIC8vZGlzYWJsZSBkZWJ1ZyBkcmF3aW5nXG4gICAgRElTQUJMRV9TUFVfQ09MTElTSU9OX1BST0NFU1NJTkc6IDY0IC8vZGlzYWJsZSBwYXJhbGxlbC9TUFUgcHJvY2Vzc2luZ1xuICB9LFxuICBUWVBFOiB7XG4gICAgU1RBVElDOiBcInN0YXRpY1wiLFxuICAgIERZTkFNSUM6IFwiZHluYW1pY1wiLFxuICAgIEtJTkVNQVRJQzogXCJraW5lbWF0aWNcIlxuICB9LFxuICBTSEFQRToge1xuICAgIEJPWDogXCJib3hcIixcbiAgICBDWUxJTkRFUjogXCJjeWxpbmRlclwiLFxuICAgIFNQSEVSRTogXCJzcGhlcmVcIixcbiAgICBDQVBTVUxFOiBcImNhcHN1bGVcIixcbiAgICBDT05FOiBcImNvbmVcIixcbiAgICBIVUxMOiBcImh1bGxcIixcbiAgICBIQUNEOiBcImhhY2RcIixcbiAgICBWSEFDRDogXCJ2aGFjZFwiLFxuICAgIE1FU0g6IFwibWVzaFwiLFxuICAgIEhFSUdIVEZJRUxEOiBcImhlaWdodGZpZWxkXCJcbiAgfSxcbiAgRklUOiB7XG4gICAgQUxMOiBcImFsbFwiLFxuICAgIE1BTlVBTDogXCJtYW51YWxcIlxuICB9LFxuICBDT05TVFJBSU5UOiB7XG4gICAgTE9DSzogXCJsb2NrXCIsXG4gICAgRklYRUQ6IFwiZml4ZWRcIixcbiAgICBTUFJJTkc6IFwic3ByaW5nXCIsXG4gICAgU0xJREVSOiBcInNsaWRlclwiLFxuICAgIEhJTkdFOiBcImhpbmdlXCIsXG4gICAgQ09ORV9UV0lTVDogXCJjb25lVHdpc3RcIixcbiAgICBQT0lOVF9UT19QT0lOVDogXCJwb2ludFRvUG9pbnRcIlxuICB9XG59O1xuIiwiLyogZ2xvYmFsIFRIUkVFICovXG5jb25zdCBEcml2ZXIgPSByZXF1aXJlKFwiLi9kcml2ZXJcIik7XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuICB3aW5kb3cuQW1tb01vZHVsZSA9IHdpbmRvdy5BbW1vO1xuICB3aW5kb3cuQW1tbyA9IG51bGw7XG59XG5cbmNvbnN0IEVQUyA9IDEwZS02O1xuXG5mdW5jdGlvbiBBbW1vRHJpdmVyKCkge1xuICB0aGlzLmNvbGxpc2lvbkNvbmZpZ3VyYXRpb24gPSBudWxsO1xuICB0aGlzLmRpc3BhdGNoZXIgPSBudWxsO1xuICB0aGlzLmJyb2FkcGhhc2UgPSBudWxsO1xuICB0aGlzLnNvbHZlciA9IG51bGw7XG4gIHRoaXMucGh5c2ljc1dvcmxkID0gbnVsbDtcbiAgdGhpcy5kZWJ1Z0RyYXdlciA9IG51bGw7XG5cbiAgdGhpcy5lbHMgPSBuZXcgTWFwKCk7XG4gIHRoaXMuZXZlbnRMaXN0ZW5lcnMgPSBbXTtcbiAgdGhpcy5jb2xsaXNpb25zID0gbmV3IE1hcCgpO1xuICB0aGlzLmNvbGxpc2lvbktleXMgPSBbXTtcbiAgdGhpcy5jdXJyZW50Q29sbGlzaW9ucyA9IG5ldyBNYXAoKTtcbn1cblxuQW1tb0RyaXZlci5wcm90b3R5cGUgPSBuZXcgRHJpdmVyKCk7XG5BbW1vRHJpdmVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEFtbW9Ecml2ZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gQW1tb0RyaXZlcjtcblxuLyogQHBhcmFtIHtvYmplY3R9IHdvcmxkQ29uZmlnICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24od29ybGRDb25maWcpIHtcbiAgLy9FbXNjcmlwdGVuIGRvZXNuJ3QgdXNlIHJlYWwgcHJvbWlzZXMsIGp1c3QgYSAudGhlbigpIGNhbGxiYWNrLCBzbyBpdCBuZWNlc3NhcnkgdG8gd3JhcCBpbiBhIHJlYWwgcHJvbWlzZS5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgIEFtbW9Nb2R1bGUoKS50aGVuKHJlc3VsdCA9PiB7XG4gICAgICBBbW1vID0gcmVzdWx0O1xuICAgICAgdGhpcy5lcHNpbG9uID0gd29ybGRDb25maWcuZXBzaWxvbiB8fCBFUFM7XG4gICAgICB0aGlzLmRlYnVnRHJhd01vZGUgPSB3b3JsZENvbmZpZy5kZWJ1Z0RyYXdNb2RlIHx8IFRIUkVFLkFtbW9EZWJ1Z0NvbnN0YW50cy5Ob0RlYnVnO1xuICAgICAgdGhpcy5tYXhTdWJTdGVwcyA9IHdvcmxkQ29uZmlnLm1heFN1YlN0ZXBzIHx8IDQ7XG4gICAgICB0aGlzLmZpeGVkVGltZVN0ZXAgPSB3b3JsZENvbmZpZy5maXhlZFRpbWVTdGVwIHx8IDEgLyA2MDtcbiAgICAgIHRoaXMuY29sbGlzaW9uQ29uZmlndXJhdGlvbiA9IG5ldyBBbW1vLmJ0RGVmYXVsdENvbGxpc2lvbkNvbmZpZ3VyYXRpb24oKTtcbiAgICAgIHRoaXMuZGlzcGF0Y2hlciA9IG5ldyBBbW1vLmJ0Q29sbGlzaW9uRGlzcGF0Y2hlcih0aGlzLmNvbGxpc2lvbkNvbmZpZ3VyYXRpb24pO1xuICAgICAgdGhpcy5icm9hZHBoYXNlID0gbmV3IEFtbW8uYnREYnZ0QnJvYWRwaGFzZSgpO1xuICAgICAgdGhpcy5zb2x2ZXIgPSBuZXcgQW1tby5idFNlcXVlbnRpYWxJbXB1bHNlQ29uc3RyYWludFNvbHZlcigpO1xuICAgICAgdGhpcy5waHlzaWNzV29ybGQgPSBuZXcgQW1tby5idERpc2NyZXRlRHluYW1pY3NXb3JsZChcbiAgICAgICAgdGhpcy5kaXNwYXRjaGVyLFxuICAgICAgICB0aGlzLmJyb2FkcGhhc2UsXG4gICAgICAgIHRoaXMuc29sdmVyLFxuICAgICAgICB0aGlzLmNvbGxpc2lvbkNvbmZpZ3VyYXRpb25cbiAgICAgICk7XG4gICAgICB0aGlzLnBoeXNpY3NXb3JsZC5zZXRGb3JjZVVwZGF0ZUFsbEFhYmJzKGZhbHNlKTtcbiAgICAgIHRoaXMucGh5c2ljc1dvcmxkLnNldEdyYXZpdHkoXG4gICAgICAgIG5ldyBBbW1vLmJ0VmVjdG9yMygwLCB3b3JsZENvbmZpZy5oYXNPd25Qcm9wZXJ0eShcImdyYXZpdHlcIikgPyB3b3JsZENvbmZpZy5ncmF2aXR5IDogLTkuOCwgMClcbiAgICAgICk7XG4gICAgICB0aGlzLnBoeXNpY3NXb3JsZC5nZXRTb2x2ZXJJbmZvKCkuc2V0X21fbnVtSXRlcmF0aW9ucyh3b3JsZENvbmZpZy5zb2x2ZXJJdGVyYXRpb25zKTtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vKiBAcGFyYW0ge0FtbW8uYnRDb2xsaXNpb25PYmplY3R9IGJvZHkgKi9cbkFtbW9Ecml2ZXIucHJvdG90eXBlLmFkZEJvZHkgPSBmdW5jdGlvbihib2R5LCBncm91cCwgbWFzaykge1xuICB0aGlzLnBoeXNpY3NXb3JsZC5hZGRSaWdpZEJvZHkoYm9keSwgZ3JvdXAsIG1hc2spO1xuICBjb25zdCBib2R5cHRyID0gQW1tby5nZXRQb2ludGVyKGJvZHkpO1xuICB0aGlzLmVscy5zZXQoYm9keXB0ciwgYm9keS5lbCk7XG4gIHRoaXMuY29sbGlzaW9ucy5zZXQoYm9keXB0ciwgW10pO1xuICB0aGlzLmNvbGxpc2lvbktleXMucHVzaChib2R5cHRyKTtcbiAgdGhpcy5jdXJyZW50Q29sbGlzaW9ucy5zZXQoYm9keXB0ciwgbmV3IFNldCgpKTtcbn07XG5cbi8qIEBwYXJhbSB7QW1tby5idENvbGxpc2lvbk9iamVjdH0gYm9keSAqL1xuQW1tb0RyaXZlci5wcm90b3R5cGUucmVtb3ZlQm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgdGhpcy5waHlzaWNzV29ybGQucmVtb3ZlUmlnaWRCb2R5KGJvZHkpO1xuICB0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIoYm9keSk7XG4gIGNvbnN0IGJvZHlwdHIgPSBBbW1vLmdldFBvaW50ZXIoYm9keSk7XG4gIHRoaXMuZWxzLmRlbGV0ZShib2R5cHRyKTtcbiAgdGhpcy5jb2xsaXNpb25zLmRlbGV0ZShib2R5cHRyKTtcbiAgdGhpcy5jb2xsaXNpb25LZXlzLnNwbGljZSh0aGlzLmNvbGxpc2lvbktleXMuaW5kZXhPZihib2R5cHRyKSwgMSk7XG4gIHRoaXMuY3VycmVudENvbGxpc2lvbnMuZGVsZXRlKGJvZHlwdHIpO1xufTtcblxuQW1tb0RyaXZlci5wcm90b3R5cGUudXBkYXRlQm9keSA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgaWYgKHRoaXMuZWxzLmhhcyhBbW1vLmdldFBvaW50ZXIoYm9keSkpKSB7XG4gICAgdGhpcy5waHlzaWNzV29ybGQudXBkYXRlU2luZ2xlQWFiYihib2R5KTtcbiAgfVxufTtcblxuLyogQHBhcmFtIHtudW1iZXJ9IGRlbHRhVGltZSAqL1xuQW1tb0RyaXZlci5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uKGRlbHRhVGltZSkge1xuICB0aGlzLnBoeXNpY3NXb3JsZC5zdGVwU2ltdWxhdGlvbihkZWx0YVRpbWUsIHRoaXMubWF4U3ViU3RlcHMsIHRoaXMuZml4ZWRUaW1lU3RlcCk7XG5cbiAgY29uc3QgbnVtTWFuaWZvbGRzID0gdGhpcy5kaXNwYXRjaGVyLmdldE51bU1hbmlmb2xkcygpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bU1hbmlmb2xkczsgaSsrKSB7XG4gICAgY29uc3QgcGVyc2lzdGVudE1hbmlmb2xkID0gdGhpcy5kaXNwYXRjaGVyLmdldE1hbmlmb2xkQnlJbmRleEludGVybmFsKGkpO1xuICAgIGNvbnN0IG51bUNvbnRhY3RzID0gcGVyc2lzdGVudE1hbmlmb2xkLmdldE51bUNvbnRhY3RzKCk7XG4gICAgY29uc3QgYm9keTBwdHIgPSBBbW1vLmdldFBvaW50ZXIocGVyc2lzdGVudE1hbmlmb2xkLmdldEJvZHkwKCkpO1xuICAgIGNvbnN0IGJvZHkxcHRyID0gQW1tby5nZXRQb2ludGVyKHBlcnNpc3RlbnRNYW5pZm9sZC5nZXRCb2R5MSgpKTtcbiAgICBsZXQgY29sbGlkZWQgPSBmYWxzZTtcblxuICAgIGZvciAobGV0IGogPSAwOyBqIDwgbnVtQ29udGFjdHM7IGorKykge1xuICAgICAgY29uc3QgbWFuaWZvbGRQb2ludCA9IHBlcnNpc3RlbnRNYW5pZm9sZC5nZXRDb250YWN0UG9pbnQoaik7XG4gICAgICBjb25zdCBkaXN0YW5jZSA9IG1hbmlmb2xkUG9pbnQuZ2V0RGlzdGFuY2UoKTtcbiAgICAgIGlmIChkaXN0YW5jZSA8PSB0aGlzLmVwc2lsb24pIHtcbiAgICAgICAgY29sbGlkZWQgPSB0cnVlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY29sbGlkZWQpIHtcbiAgICAgIGlmICh0aGlzLmNvbGxpc2lvbnMuZ2V0KGJvZHkwcHRyKS5pbmRleE9mKGJvZHkxcHRyKSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5jb2xsaXNpb25zLmdldChib2R5MHB0cikucHVzaChib2R5MXB0cik7XG4gICAgICAgIGlmICh0aGlzLmV2ZW50TGlzdGVuZXJzLmluZGV4T2YoYm9keTBwdHIpICE9PSAtMSkge1xuICAgICAgICAgIHRoaXMuZWxzLmdldChib2R5MHB0cikuZW1pdChcImNvbGxpZGVzdGFydFwiLCB7IHRhcmdldEVsOiB0aGlzLmVscy5nZXQoYm9keTFwdHIpIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmV2ZW50TGlzdGVuZXJzLmluZGV4T2YoYm9keTFwdHIpICE9PSAtMSkge1xuICAgICAgICAgIHRoaXMuZWxzLmdldChib2R5MXB0cikuZW1pdChcImNvbGxpZGVzdGFydFwiLCB7IHRhcmdldEVsOiB0aGlzLmVscy5nZXQoYm9keTBwdHIpIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLmN1cnJlbnRDb2xsaXNpb25zLmdldChib2R5MHB0cikuYWRkKGJvZHkxcHRyKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY29sbGlzaW9uS2V5cy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGJvZHkwcHRyID0gdGhpcy5jb2xsaXNpb25LZXlzW2ldO1xuICAgIGNvbnN0IGJvZHkxcHRycyA9IHRoaXMuY29sbGlzaW9ucy5nZXQoYm9keTBwdHIpO1xuICAgIGZvciAobGV0IGogPSBib2R5MXB0cnMubGVuZ3RoIC0gMTsgaiA+PSAwOyBqLS0pIHtcbiAgICAgIGNvbnN0IGJvZHkxcHRyID0gYm9keTFwdHJzW2pdO1xuICAgICAgaWYgKHRoaXMuY3VycmVudENvbGxpc2lvbnMuZ2V0KGJvZHkwcHRyKS5oYXMoYm9keTFwdHIpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihib2R5MHB0cikgIT09IC0xKSB7XG4gICAgICAgIHRoaXMuZWxzLmdldChib2R5MHB0cikuZW1pdChcImNvbGxpZGVlbmRcIiwgeyB0YXJnZXRFbDogdGhpcy5lbHMuZ2V0KGJvZHkxcHRyKSB9KTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLmV2ZW50TGlzdGVuZXJzLmluZGV4T2YoYm9keTFwdHIpICE9PSAtMSkge1xuICAgICAgICB0aGlzLmVscy5nZXQoYm9keTFwdHIpLmVtaXQoXCJjb2xsaWRlZW5kXCIsIHsgdGFyZ2V0RWw6IHRoaXMuZWxzLmdldChib2R5MHB0cikgfSk7XG4gICAgICB9XG4gICAgICBib2R5MXB0cnMuc3BsaWNlKGosIDEpO1xuICAgIH1cbiAgICB0aGlzLmN1cnJlbnRDb2xsaXNpb25zLmdldChib2R5MHB0cikuY2xlYXIoKTtcbiAgfVxuXG4gIGlmICh0aGlzLmRlYnVnRHJhd2VyKSB7XG4gICAgdGhpcy5kZWJ1Z0RyYXdlci51cGRhdGUoKTtcbiAgfVxufTtcblxuLyogQHBhcmFtIHs/fSBjb25zdHJhaW50ICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5hZGRDb25zdHJhaW50ID0gZnVuY3Rpb24oY29uc3RyYWludCkge1xuICB0aGlzLnBoeXNpY3NXb3JsZC5hZGRDb25zdHJhaW50KGNvbnN0cmFpbnQsIGZhbHNlKTtcbn07XG5cbi8qIEBwYXJhbSB7P30gY29uc3RyYWludCAqL1xuQW1tb0RyaXZlci5wcm90b3R5cGUucmVtb3ZlQ29uc3RyYWludCA9IGZ1bmN0aW9uKGNvbnN0cmFpbnQpIHtcbiAgdGhpcy5waHlzaWNzV29ybGQucmVtb3ZlQ29uc3RyYWludChjb25zdHJhaW50KTtcbn07XG5cbi8qIEBwYXJhbSB7QW1tby5idENvbGxpc2lvbk9iamVjdH0gYm9keSAqL1xuQW1tb0RyaXZlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgdGhpcy5ldmVudExpc3RlbmVycy5wdXNoKEFtbW8uZ2V0UG9pbnRlcihib2R5KSk7XG59O1xuXG4vKiBAcGFyYW0ge0FtbW8uYnRDb2xsaXNpb25PYmplY3R9IGJvZHkgKi9cbkFtbW9Ecml2ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihib2R5KSB7XG4gIGNvbnN0IHB0ciA9IEFtbW8uZ2V0UG9pbnRlcihib2R5KTtcbiAgaWYgKHRoaXMuZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihwdHIpICE9PSAtMSkge1xuICAgIHRoaXMuZXZlbnRMaXN0ZW5lcnMuc3BsaWNlKHRoaXMuZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihwdHIpLCAxKTtcbiAgfVxufTtcblxuQW1tb0RyaXZlci5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICBBbW1vLmRlc3Ryb3kodGhpcy5jb2xsaXNpb25Db25maWd1cmF0aW9uKTtcbiAgQW1tby5kZXN0cm95KHRoaXMuZGlzcGF0Y2hlcik7XG4gIEFtbW8uZGVzdHJveSh0aGlzLmJyb2FkcGhhc2UpO1xuICBBbW1vLmRlc3Ryb3kodGhpcy5zb2x2ZXIpO1xuICBBbW1vLmRlc3Ryb3kodGhpcy5waHlzaWNzV29ybGQpO1xuICBBbW1vLmRlc3Ryb3kodGhpcy5kZWJ1Z0RyYXdlcik7XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7VEhSRUUuU2NlbmV9IHNjZW5lXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5nZXREZWJ1Z0RyYXdlciA9IGZ1bmN0aW9uKHNjZW5lLCBvcHRpb25zKSB7XG4gIGlmICghdGhpcy5kZWJ1Z0RyYXdlcikge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuZGVidWdEcmF3TW9kZSA9IG9wdGlvbnMuZGVidWdEcmF3TW9kZSB8fCB0aGlzLmRlYnVnRHJhd01vZGU7XG4gICAgdGhpcy5kZWJ1Z0RyYXdlciA9IG5ldyBUSFJFRS5BbW1vRGVidWdEcmF3ZXIoc2NlbmUsIHRoaXMucGh5c2ljc1dvcmxkLCBvcHRpb25zKTtcbiAgfVxuICByZXR1cm4gdGhpcy5kZWJ1Z0RyYXdlcjtcbn07XG4iLCIvKipcbiAqIERyaXZlciAtIGRlZmluZXMgbGltaXRlZCBBUEkgdG8gbG9jYWwgYW5kIHJlbW90ZSBwaHlzaWNzIGNvbnRyb2xsZXJzLlxuICovXG5cbmZ1bmN0aW9uIERyaXZlciAoKSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IERyaXZlcjtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTGlmZWN5Y2xlXG4gKi9cblxuLyogQHBhcmFtIHtvYmplY3R9IHdvcmxkQ29uZmlnICovXG5Ecml2ZXIucHJvdG90eXBlLmluaXQgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyogQHBhcmFtIHtudW1iZXJ9IGRlbHRhTVMgKi9cbkRyaXZlci5wcm90b3R5cGUuc3RlcCA9IGFic3RyYWN0TWV0aG9kO1xuXG5Ecml2ZXIucHJvdG90eXBlLmRlc3Ryb3kgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogQm9kaWVzXG4gKi9cblxuLyogQHBhcmFtIHtDQU5OT04uQm9keX0gYm9keSAqL1xuRHJpdmVyLnByb3RvdHlwZS5hZGRCb2R5ID0gYWJzdHJhY3RNZXRob2Q7XG5cbi8qIEBwYXJhbSB7Q0FOTk9OLkJvZHl9IGJvZHkgKi9cbkRyaXZlci5wcm90b3R5cGUucmVtb3ZlQm9keSA9IGFic3RyYWN0TWV0aG9kO1xuXG4vKipcbiAqIEBwYXJhbSB7Q0FOTk9OLkJvZHl9IGJvZHlcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXRob2ROYW1lXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzXG4gKi9cbkRyaXZlci5wcm90b3R5cGUuYXBwbHlCb2R5TWV0aG9kID0gYWJzdHJhY3RNZXRob2Q7XG5cbi8qKiBAcGFyYW0ge0NBTk5PTi5Cb2R5fSBib2R5ICovXG5Ecml2ZXIucHJvdG90eXBlLnVwZGF0ZUJvZHlQcm9wZXJ0aWVzID0gYWJzdHJhY3RNZXRob2Q7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIE1hdGVyaWFsc1xuICovXG5cbi8qKiBAcGFyYW0ge29iamVjdH0gbWF0ZXJpYWxDb25maWcgKi9cbkRyaXZlci5wcm90b3R5cGUuYWRkTWF0ZXJpYWwgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gbWF0ZXJpYWxOYW1lMVxuICogQHBhcmFtIHtzdHJpbmd9IG1hdGVyaWFsTmFtZTJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb250YWN0TWF0ZXJpYWxDb25maWdcbiAqL1xuRHJpdmVyLnByb3RvdHlwZS5hZGRDb250YWN0TWF0ZXJpYWwgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogQ29uc3RyYWludHNcbiAqL1xuXG4vKiBAcGFyYW0ge0NBTk5PTi5Db25zdHJhaW50fSBjb25zdHJhaW50ICovXG5Ecml2ZXIucHJvdG90eXBlLmFkZENvbnN0cmFpbnQgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyogQHBhcmFtIHtDQU5OT04uQ29uc3RyYWludH0gY29uc3RyYWludCAqL1xuRHJpdmVyLnByb3RvdHlwZS5yZW1vdmVDb25zdHJhaW50ID0gYWJzdHJhY3RNZXRob2Q7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIENvbnRhY3RzXG4gKi9cblxuLyoqIEByZXR1cm4ge0FycmF5PG9iamVjdD59ICovXG5Ecml2ZXIucHJvdG90eXBlLmdldENvbnRhY3RzID0gYWJzdHJhY3RNZXRob2Q7XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZnVuY3Rpb24gYWJzdHJhY3RNZXRob2QgKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBub3QgaW1wbGVtZW50ZWQuJyk7XG59XG4iLCIvKiBnbG9iYWwgVEhSRUUgKi9cbnZhciBDT05TVEFOVFMgPSByZXF1aXJlKCcuL2NvbnN0YW50cycpLFxuICAgIENfR1JBViA9IENPTlNUQU5UUy5HUkFWSVRZLFxuICAgIENfTUFUID0gQ09OU1RBTlRTLkNPTlRBQ1RfTUFURVJJQUw7XG5cbmNvbnN0IHsgVFlQRSB9ID0gcmVxdWlyZSgnLi9jb25zdGFudHMnKTtcbnZhciBBbW1vRHJpdmVyID0gcmVxdWlyZSgnLi9kcml2ZXJzL2FtbW8tZHJpdmVyJyk7XG5yZXF1aXJlKCdhZnJhbWUtc3RhdHMtcGFuZWwnKVxuXG4vKipcbiAqIFBoeXNpY3Mgc3lzdGVtLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IEFGUkFNRS5yZWdpc3RlclN5c3RlbSgncGh5c2ljcycsIHtcbiAgc2NoZW1hOiB7XG4gICAgZHJpdmVyOiAgICAgICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6ICdhbW1vJywgb25lT2Y6IFsnYW1tbyddIH0sXG4gICAgbmV0d29ya1VybDogICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6ICcnLCBpZjoge2RyaXZlcjogJ25ldHdvcmsnfSB9LFxuXG4gICAgZ3Jhdml0eTogICAgICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6IENfR1JBViB9LFxuICAgIGl0ZXJhdGlvbnM6ICAgICAgICAgICAgICAgICAgICAgeyBkZWZhdWx0OiBDT05TVEFOVFMuSVRFUkFUSU9OUyB9LFxuICAgIGZyaWN0aW9uOiAgICAgICAgICAgICAgICAgICAgICAgeyBkZWZhdWx0OiBDX01BVC5mcmljdGlvbiB9LFxuICAgIHJlc3RpdHV0aW9uOiAgICAgICAgICAgICAgICAgICAgeyBkZWZhdWx0OiBDX01BVC5yZXN0aXR1dGlvbiB9LFxuICAgIGNvbnRhY3RFcXVhdGlvblN0aWZmbmVzczogICAgICAgeyBkZWZhdWx0OiBDX01BVC5jb250YWN0RXF1YXRpb25TdGlmZm5lc3MgfSxcbiAgICBjb250YWN0RXF1YXRpb25SZWxheGF0aW9uOiAgICAgIHsgZGVmYXVsdDogQ19NQVQuY29udGFjdEVxdWF0aW9uUmVsYXhhdGlvbiB9LFxuICAgIGZyaWN0aW9uRXF1YXRpb25TdGlmZm5lc3M6ICAgICAgeyBkZWZhdWx0OiBDX01BVC5mcmljdGlvbkVxdWF0aW9uU3RpZmZuZXNzIH0sXG4gICAgZnJpY3Rpb25FcXVhdGlvblJlZ3VsYXJpemF0aW9uOiB7IGRlZmF1bHQ6IENfTUFULmZyaWN0aW9uRXF1YXRpb25SZWd1bGFyaXphdGlvbiB9LFxuXG4gICAgLy8gTmV2ZXIgc3RlcCBtb3JlIHRoYW4gZm91ciBmcmFtZXMgYXQgb25jZS4gRWZmZWN0aXZlbHkgcGF1c2VzIHRoZSBzY2VuZVxuICAgIC8vIHdoZW4gb3V0IG9mIGZvY3VzLCBhbmQgcHJldmVudHMgd2VpcmQgXCJqdW1wc1wiIHdoZW4gZm9jdXMgcmV0dXJucy5cbiAgICBtYXhJbnRlcnZhbDogICAgICAgICAgICAgICAgICAgIHsgZGVmYXVsdDogNCAvIDYwIH0sXG5cbiAgICAvLyBJZiB0cnVlLCBzaG93IHdpcmVmcmFtZXMgYXJvdW5kIHBoeXNpY3MgYm9kaWVzLlxuICAgIGRlYnVnOiAgICAgICAgICAgICAgICAgICAgICAgICAgeyBkZWZhdWx0OiBmYWxzZSB9LFxuXG4gICAgLy8gSWYgdXNpbmcgYW1tbywgc2V0IHRoZSBkZWZhdWx0IHJlbmRlcmluZyBtb2RlIGZvciBkZWJ1Z1xuICAgIGRlYnVnRHJhd01vZGU6IHsgZGVmYXVsdDogVEhSRUUuQW1tb0RlYnVnQ29uc3RhbnRzLk5vRGVidWcgfSxcbiAgICAvLyBJZiB1c2luZyBhbW1vLCBzZXQgdGhlIG1heCBudW1iZXIgb2Ygc3RlcHMgcGVyIGZyYW1lIFxuICAgIG1heFN1YlN0ZXBzOiB7IGRlZmF1bHQ6IDQgfSxcbiAgICAvLyBJZiB1c2luZyBhbW1vLCBzZXQgdGhlIGZyYW1lcmF0ZSBvZiB0aGUgc2ltdWxhdGlvblxuICAgIGZpeGVkVGltZVN0ZXA6IHsgZGVmYXVsdDogMSAvIDYwIH0sXG4gICAgLy8gV2hldGhlciB0byBvdXRwdXQgc3RhdHMsIGFuZCBob3cgdG8gb3V0cHV0IHRoZW0uICBPbmUgb3IgbW9yZSBvZiBcImNvbnNvbGVcIiwgXCJldmVudHNcIiwgXCJwYW5lbFwiXG4gICAgc3RhdHM6IHt0eXBlOiAnYXJyYXknLCBkZWZhdWx0OiBbXX1cbiAgfSxcblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgdGhlIHBoeXNpY3Mgc3lzdGVtLlxuICAgKi9cbiAgYXN5bmMgaW5pdCgpIHtcbiAgICB2YXIgZGF0YSA9IHRoaXMuZGF0YTtcblxuICAgIC8vIElmIHRydWUsIHNob3cgd2lyZWZyYW1lcyBhcm91bmQgcGh5c2ljcyBib2RpZXMuXG4gICAgdGhpcy5kZWJ1ZyA9IGRhdGEuZGVidWc7XG4gICAgdGhpcy5pbml0U3RhdHMoKTtcblxuICAgIHRoaXMuY2FsbGJhY2tzID0ge2JlZm9yZVN0ZXA6IFtdLCBzdGVwOiBbXSwgYWZ0ZXJTdGVwOiBbXX07XG5cbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuXG4gICAgdGhpcy5kcml2ZXIgPSBuZXcgQW1tb0RyaXZlcigpO1xuXG4gICAgYXdhaXQgdGhpcy5kcml2ZXIuaW5pdCh7XG4gICAgICBncmF2aXR5OiBkYXRhLmdyYXZpdHksXG4gICAgICBkZWJ1Z0RyYXdNb2RlOiBkYXRhLmRlYnVnRHJhd01vZGUsXG4gICAgICBzb2x2ZXJJdGVyYXRpb25zOiBkYXRhLml0ZXJhdGlvbnMsXG4gICAgICBtYXhTdWJTdGVwczogZGF0YS5tYXhTdWJTdGVwcyxcbiAgICAgIGZpeGVkVGltZVN0ZXA6IGRhdGEuZml4ZWRUaW1lU3RlcFxuICAgIH0pO1xuXG4gICAgdGhpcy5pbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICBpZiAodGhpcy5kZWJ1Zykge1xuICAgICAgdGhpcy5zZXREZWJ1Zyh0cnVlKTtcbiAgICB9XG4gIH0sXG5cbiAgaW5pdFN0YXRzKCkge1xuICAgIC8vIERhdGEgdXNlZCBmb3IgcGVyZm9ybWFuY2UgbW9uaXRvcmluZy5cbiAgICB0aGlzLnN0YXRzVG9Db25zb2xlID0gdGhpcy5kYXRhLnN0YXRzLmluY2x1ZGVzKFwiY29uc29sZVwiKVxuICAgIHRoaXMuc3RhdHNUb0V2ZW50cyA9IHRoaXMuZGF0YS5zdGF0cy5pbmNsdWRlcyhcImV2ZW50c1wiKVxuICAgIHRoaXMuc3RhdHNUb1BhbmVsID0gdGhpcy5kYXRhLnN0YXRzLmluY2x1ZGVzKFwicGFuZWxcIilcblxuICAgIGlmICh0aGlzLnN0YXRzVG9Db25zb2xlIHx8IHRoaXMuc3RhdHNUb0V2ZW50cyB8fCB0aGlzLnN0YXRzVG9QYW5lbCkge1xuICAgICAgdGhpcy50cmFja1BlcmYgPSB0cnVlO1xuICAgICAgdGhpcy50aWNrQ291bnRlciA9IDA7XG4gICAgICBcbiAgICAgIHRoaXMuc3RhdHNUaWNrRGF0YSA9IHt9O1xuICAgICAgdGhpcy5zdGF0c0JvZHlEYXRhID0ge307XG5cbiAgICAgIHRoaXMuY291bnRCb2RpZXMgPSB7XG4gICAgICAgIFwiYW1tb1wiOiAoKSA9PiB0aGlzLmNvdW50Qm9kaWVzQW1tbygpLFxuICAgICAgfVxuXG4gICAgICB0aGlzLmJvZHlUeXBlVG9TdGF0c1Byb3BlcnR5TWFwID0ge1xuICAgICAgICBcImFtbW9cIjoge1xuICAgICAgICAgIFtUWVBFLlNUQVRJQ10gOiBcInN0YXRpY0JvZGllc1wiLFxuICAgICAgICAgIFtUWVBFLktJTkVNQVRJQ10gOiBcImtpbmVtYXRpY0JvZGllc1wiLFxuICAgICAgICAgIFtUWVBFLkRZTkFNSUNdIDogXCJkeW5hbWljQm9kaWVzXCIsXG4gICAgICAgIH0sIFxuICAgICAgfVxuICAgICAgXG4gICAgICBjb25zdCBzY2VuZSA9IHRoaXMuZWwuc2NlbmVFbDtcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLWNvbGxlY3RvclwiLCBgaW5FdmVudDogcGh5c2ljcy10aWNrLWRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBiZWZvcmUsIGFmdGVyLCBlbmdpbmUsIHRvdGFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3V0cHV0RnJlcXVlbmN5OiAxMDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRFdmVudDogcGh5c2ljcy10aWNrLXN1bW1hcnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRzOiBwZXJjZW50aWxlX181MCwgcGVyY2VudGlsZV9fOTAsIG1heGApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnN0YXRzVG9QYW5lbCkge1xuICAgICAgY29uc3Qgc2NlbmUgPSB0aGlzLmVsLnNjZW5lRWw7XG4gICAgICBjb25zdCBzcGFjZSA9IFwiJm5ic3AmbmJzcCZuYnNwXCJcbiAgICBcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXBhbmVsXCIsIFwiXCIpXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1ncm91cF9fYm9kaWVzXCIsIGBsYWJlbDogUGh5c2ljcyBCb2RpZXNgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X19iMVwiLCBgZ3JvdXA6IGJvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDpwaHlzaWNzLWJvZHktZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBzdGF0aWNCb2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFN0YXRpY2ApXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1yb3dfX2IyXCIsIGBncm91cDogYm9kaWVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OnBoeXNpY3MtYm9keS1kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGR5bmFtaWNCb2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IER5bmFtaWNgKVxuXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1yb3dfX2IzXCIsIGBncm91cDogYm9kaWVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6cGh5c2ljcy1ib2R5LWRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBraW5lbWF0aWNCb2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogS2luZW1hdGljYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fYjRcIiwgYGdyb3VwOiBib2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogcGh5c2ljcy1ib2R5LWRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBtYW5pZm9sZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogTWFuaWZvbGRzYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fYjVcIiwgYGdyb3VwOiBib2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogcGh5c2ljcy1ib2R5LWRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBtYW5pZm9sZENvbnRhY3RzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IENvbnRhY3RzYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fYjZcIiwgYGdyb3VwOiBib2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDogcGh5c2ljcy1ib2R5LWRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBjb2xsaXNpb25zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IENvbGxpc2lvbnNgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X19iN1wiLCBgZ3JvdXA6IGJvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBwaHlzaWNzLWJvZHktZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGNvbGxpc2lvbktleXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogQ29sbCBLZXlzYClcblxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtZ3JvdXBfX3RpY2tcIiwgYGxhYmVsOiBQaHlzaWNzIFRpY2tzOiBNZWRpYW4ke3NwYWNlfTkwdGglJHtzcGFjZX05OXRoJWApXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1yb3dfXzFcIiwgYGdyb3VwOiB0aWNrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6cGh5c2ljcy10aWNrLXN1bW1hcnk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBiZWZvcmUucGVyY2VudGlsZV9fNTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlLnBlcmNlbnRpbGVfXzkwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlZm9yZS5tYXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogQmVmb3JlYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fMlwiLCBgZ3JvdXA6IHRpY2s7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDpwaHlzaWNzLXRpY2stc3VtbWFyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGFmdGVyLnBlcmNlbnRpbGVfXzUwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyLnBlcmNlbnRpbGVfXzkwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFmdGVyLm1heDsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogQWZ0ZXJgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X18zXCIsIGBncm91cDogdGljazsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDpwaHlzaWNzLXRpY2stc3VtbWFyeTsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBlbmdpbmUucGVyY2VudGlsZV9fNTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5naW5lLnBlcmNlbnRpbGVfXzkwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZ2luZS5tYXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogRW5naW5lYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fNFwiLCBgZ3JvdXA6IHRpY2s7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDpwaHlzaWNzLXRpY2stc3VtbWFyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHRvdGFsLnBlcmNlbnRpbGVfXzUwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLnBlcmNlbnRpbGVfXzkwLCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsLm1heDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBUb3RhbGApXG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVcGRhdGVzIHRoZSBwaHlzaWNzIHdvcmxkIG9uIGVhY2ggdGljayBvZiB0aGUgQS1GcmFtZSBzY2VuZS4gSXQgd291bGQgYmVcbiAgICogZW50aXJlbHkgcG9zc2libGUgdG8gc2VwYXJhdGUgdGhlIHR3byDigJMgdXBkYXRpbmcgcGh5c2ljcyBtb3JlIG9yIGxlc3NcbiAgICogZnJlcXVlbnRseSB0aGFuIHRoZSBzY2VuZSDigJMgaWYgZ3JlYXRlciBwcmVjaXNpb24gb3IgcGVyZm9ybWFuY2Ugd2VyZVxuICAgKiBuZWNlc3NhcnkuXG4gICAqIEBwYXJhbSAge251bWJlcn0gdFxuICAgKiBAcGFyYW0gIHtudW1iZXJ9IGR0XG4gICAqL1xuICB0aWNrOiBmdW5jdGlvbiAodCwgZHQpIHtcbiAgICBpZiAoIXRoaXMuaW5pdGlhbGl6ZWQgfHwgIWR0KSByZXR1cm47XG5cbiAgICBjb25zdCBiZWZvcmVTdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgIHZhciBpO1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmNhbGxiYWNrcztcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0aGlzLmNhbGxiYWNrcy5iZWZvcmVTdGVwLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmNhbGxiYWNrcy5iZWZvcmVTdGVwW2ldLmJlZm9yZVN0ZXAodCwgZHQpO1xuICAgIH1cblxuICAgIGNvbnN0IGVuZ2luZVN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgdGhpcy5kcml2ZXIuc3RlcChNYXRoLm1pbihkdCAvIDEwMDAsIHRoaXMuZGF0YS5tYXhJbnRlcnZhbCkpO1xuXG4gICAgY29uc3QgZW5naW5lRW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGNhbGxiYWNrcy5zdGVwLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjYWxsYmFja3Muc3RlcFtpXS5zdGVwKHQsIGR0KTtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY2FsbGJhY2tzLmFmdGVyU3RlcC5sZW5ndGg7IGkrKykge1xuICAgICAgY2FsbGJhY2tzLmFmdGVyU3RlcFtpXS5hZnRlclN0ZXAodCwgZHQpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRyYWNrUGVyZikge1xuICAgICAgY29uc3QgYWZ0ZXJFbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cbiAgICAgIHRoaXMuc3RhdHNUaWNrRGF0YS5iZWZvcmUgPSBlbmdpbmVTdGFydFRpbWUgLSBiZWZvcmVTdGFydFRpbWVcbiAgICAgIHRoaXMuc3RhdHNUaWNrRGF0YS5lbmdpbmUgPSBlbmdpbmVFbmRUaW1lIC0gZW5naW5lU3RhcnRUaW1lXG4gICAgICB0aGlzLnN0YXRzVGlja0RhdGEuYWZ0ZXIgPSBhZnRlckVuZFRpbWUgLSBlbmdpbmVFbmRUaW1lXG4gICAgICB0aGlzLnN0YXRzVGlja0RhdGEudG90YWwgPSBhZnRlckVuZFRpbWUgLSBiZWZvcmVTdGFydFRpbWVcblxuICAgICAgdGhpcy5lbC5lbWl0KFwicGh5c2ljcy10aWNrLWRhdGFcIiwgdGhpcy5zdGF0c1RpY2tEYXRhKVxuXG4gICAgICB0aGlzLnRpY2tDb3VudGVyKys7XG5cbiAgICAgIGlmICh0aGlzLnRpY2tDb3VudGVyID09PSAxMDApIHtcblxuICAgICAgICB0aGlzLmNvdW50Qm9kaWVzW3RoaXMuZGF0YS5kcml2ZXJdKClcblxuICAgICAgICBpZiAodGhpcy5zdGF0c1RvQ29uc29sZSkge1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiUGh5c2ljcyBib2R5IHN0YXRzOlwiLCB0aGlzLnN0YXRzQm9keURhdGEpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zdGF0c1RvRXZlbnRzICB8fCB0aGlzLnN0YXRzVG9QYW5lbCkge1xuICAgICAgICAgIHRoaXMuZWwuZW1pdChcInBoeXNpY3MtYm9keS1kYXRhXCIsIHRoaXMuc3RhdHNCb2R5RGF0YSlcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRpY2tDb3VudGVyID0gMDtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgY291bnRCb2RpZXNBbW1vKCkge1xuXG4gICAgY29uc3Qgc3RhdHNEYXRhID0gdGhpcy5zdGF0c0JvZHlEYXRhXG4gICAgc3RhdHNEYXRhLm1hbmlmb2xkcyA9IHRoaXMuZHJpdmVyLmRpc3BhdGNoZXIuZ2V0TnVtTWFuaWZvbGRzKCk7XG4gICAgc3RhdHNEYXRhLm1hbmlmb2xkQ29udGFjdHMgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc3RhdHNEYXRhLm1hbmlmb2xkczsgaSsrKSB7XG4gICAgICBjb25zdCBtYW5pZm9sZCA9IHRoaXMuZHJpdmVyLmRpc3BhdGNoZXIuZ2V0TWFuaWZvbGRCeUluZGV4SW50ZXJuYWwoaSk7XG4gICAgICBzdGF0c0RhdGEubWFuaWZvbGRDb250YWN0cyArPSBtYW5pZm9sZC5nZXROdW1Db250YWN0cygpO1xuICAgIH1cbiAgICBzdGF0c0RhdGEuY29sbGlzaW9ucyA9IHRoaXMuZHJpdmVyLmNvbGxpc2lvbnMuc2l6ZTtcbiAgICBzdGF0c0RhdGEuY29sbGlzaW9uS2V5cyA9IHRoaXMuZHJpdmVyLmNvbGxpc2lvbktleXMubGVuZ3RoO1xuICAgIHN0YXRzRGF0YS5zdGF0aWNCb2RpZXMgPSAwXG4gICAgc3RhdHNEYXRhLmtpbmVtYXRpY0JvZGllcyA9IDBcbiAgICBzdGF0c0RhdGEuZHluYW1pY0JvZGllcyA9IDBcbiAgICBcbiAgICBmdW5jdGlvbiB0eXBlKGVsKSB7XG4gICAgICByZXR1cm4gZWwuY29tcG9uZW50c1snYW1tby1ib2R5J10uZGF0YS50eXBlXG4gICAgfVxuXG4gICAgdGhpcy5kcml2ZXIuZWxzLmZvckVhY2goKGVsKSA9PiB7XG4gICAgICBjb25zdCBwcm9wZXJ0eSA9IHRoaXMuYm9keVR5cGVUb1N0YXRzUHJvcGVydHlNYXBbXCJhbW1vXCJdW3R5cGUoZWwpXVxuICAgICAgc3RhdHNEYXRhW3Byb3BlcnR5XSsrXG4gICAgfSlcbiAgfSxcblxuICBzZXREZWJ1ZzogZnVuY3Rpb24oZGVidWcpIHtcbiAgICB0aGlzLmRlYnVnID0gZGVidWc7XG4gICAgaWYgKHRoaXMuZGF0YS5kcml2ZXIgPT09ICdhbW1vJyAmJiB0aGlzLmluaXRpYWxpemVkKSB7XG4gICAgICBpZiAoZGVidWcgJiYgIXRoaXMuZGVidWdEcmF3ZXIpIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0RyYXdlciA9IHRoaXMuZHJpdmVyLmdldERlYnVnRHJhd2VyKHRoaXMuZWwub2JqZWN0M0QpO1xuICAgICAgICB0aGlzLmRlYnVnRHJhd2VyLmVuYWJsZSgpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmRlYnVnRHJhd2VyKSB7XG4gICAgICAgIHRoaXMuZGVidWdEcmF3ZXIuZGlzYWJsZSgpO1xuICAgICAgICB0aGlzLmRlYnVnRHJhd2VyID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgYSBib2R5IHRvIHRoZSBzY2VuZSwgYW5kIGJpbmRzIHByb3hpZWQgbWV0aG9kcyB0byB0aGUgZHJpdmVyLlxuICAgKi9cbiAgYWRkQm9keTogZnVuY3Rpb24gKGJvZHksIGdyb3VwLCBtYXNrKSB7XG4gICAgdmFyIGRyaXZlciA9IHRoaXMuZHJpdmVyO1xuXG4gICAgdGhpcy5kcml2ZXIuYWRkQm9keShib2R5LCBncm91cCwgbWFzayk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBib2R5IGFuZCBpdHMgcHJveGllZCBtZXRob2RzLlxuICAgKi9cbiAgcmVtb3ZlQm9keTogZnVuY3Rpb24gKGJvZHkpIHtcbiAgICB0aGlzLmRyaXZlci5yZW1vdmVCb2R5KGJvZHkpO1xuICB9LFxuXG4gIC8qKiBAcGFyYW0ge0FtbW8uYnRUeXBlZENvbnN0cmFpbnR9IGNvbnN0cmFpbnQgKi9cbiAgYWRkQ29uc3RyYWludDogZnVuY3Rpb24gKGNvbnN0cmFpbnQpIHtcbiAgICB0aGlzLmRyaXZlci5hZGRDb25zdHJhaW50KGNvbnN0cmFpbnQpO1xuICB9LFxuXG4gIC8qKiBAcGFyYW0ge0FtbW8uYnRUeXBlZENvbnN0cmFpbnR9IGNvbnN0cmFpbnQgKi9cbiAgcmVtb3ZlQ29uc3RyYWludDogZnVuY3Rpb24gKGNvbnN0cmFpbnQpIHtcbiAgICB0aGlzLmRyaXZlci5yZW1vdmVDb25zdHJhaW50KGNvbnN0cmFpbnQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBZGRzIGEgY29tcG9uZW50IGluc3RhbmNlIHRvIHRoZSBzeXN0ZW0gYW5kIHNjaGVkdWxlcyBpdHMgdXBkYXRlIG1ldGhvZHMgdG8gYmUgY2FsbGVkXG4gICAqIHRoZSBnaXZlbiBwaGFzZS5cbiAgICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGhhc2VcbiAgICovXG4gIGFkZENvbXBvbmVudDogZnVuY3Rpb24gKGNvbXBvbmVudCkge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmNhbGxiYWNrcztcbiAgICBpZiAoY29tcG9uZW50LmJlZm9yZVN0ZXApIGNhbGxiYWNrcy5iZWZvcmVTdGVwLnB1c2goY29tcG9uZW50KTtcbiAgICBpZiAoY29tcG9uZW50LnN0ZXApICAgICAgIGNhbGxiYWNrcy5zdGVwLnB1c2goY29tcG9uZW50KTtcbiAgICBpZiAoY29tcG9uZW50LmFmdGVyU3RlcCkgIGNhbGxiYWNrcy5hZnRlclN0ZXAucHVzaChjb21wb25lbnQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY29tcG9uZW50IGluc3RhbmNlIGZyb20gdGhlIHN5c3RlbS5cbiAgICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICAgKiBAcGFyYW0ge3N0cmluZ30gcGhhc2VcbiAgICovXG4gIHJlbW92ZUNvbXBvbmVudDogZnVuY3Rpb24gKGNvbXBvbmVudCkge1xuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLmNhbGxiYWNrcztcbiAgICBpZiAoY29tcG9uZW50LmJlZm9yZVN0ZXApIHtcbiAgICAgIGNhbGxiYWNrcy5iZWZvcmVTdGVwLnNwbGljZShjYWxsYmFja3MuYmVmb3JlU3RlcC5pbmRleE9mKGNvbXBvbmVudCksIDEpO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50LnN0ZXApIHtcbiAgICAgIGNhbGxiYWNrcy5zdGVwLnNwbGljZShjYWxsYmFja3Muc3RlcC5pbmRleE9mKGNvbXBvbmVudCksIDEpO1xuICAgIH1cbiAgICBpZiAoY29tcG9uZW50LmFmdGVyU3RlcCkge1xuICAgICAgY2FsbGJhY2tzLmFmdGVyU3RlcC5zcGxpY2UoY2FsbGJhY2tzLmFmdGVyU3RlcC5pbmRleE9mKGNvbXBvbmVudCksIDEpO1xuICAgIH1cbiAgfSxcblxuICAvKiogQHJldHVybiB7QXJyYXk8b2JqZWN0Pn0gKi9cbiAgZ2V0Q29udGFjdHM6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5kcml2ZXIuZ2V0Q29udGFjdHMoKTtcbiAgfSxcblxuICBnZXRNYXRlcmlhbDogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5kcml2ZXIuZ2V0TWF0ZXJpYWwobmFtZSk7XG4gIH1cbn0pO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBUSFJFRTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbl9fd2VicGFja19yZXF1aXJlX18ubiA9IChtb2R1bGUpID0+IHtcblx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG5cdFx0KCkgPT4gKG1vZHVsZVsnZGVmYXVsdCddKSA6XG5cdFx0KCkgPT4gKG1vZHVsZSk7XG5cdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsIHsgYTogZ2V0dGVyIH0pO1xuXHRyZXR1cm4gZ2V0dGVyO1xufTsiLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiIiwiLy8gc3RhcnR1cFxuLy8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4vLyBUaGlzIGVudHJ5IG1vZHVsZSBpcyByZWZlcmVuY2VkIGJ5IG90aGVyIG1vZHVsZXMgc28gaXQgY2FuJ3QgYmUgaW5saW5lZFxudmFyIF9fd2VicGFja19leHBvcnRzX18gPSBfX3dlYnBhY2tfcmVxdWlyZV9fKFwiLi9pbmRleC5qc1wiKTtcbiIsIiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==
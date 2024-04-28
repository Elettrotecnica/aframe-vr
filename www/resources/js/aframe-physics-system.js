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

    this.updateData = this.updateData.bind(this)
    this.el.addEventListener(this.data.event, this.updateData)

    this.splitCache = {}
  },

  updateData(e) {
    
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

    this.updateData(e.detail)

    this.counter++ 
    if (this.counter === this.data.outputFrequency) {
      this.outputData()
      this.resetData()
    }
  },

  updateData(detail) {

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
	    const vertices = [];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7Ozs7Ozs7Ozs7QUN2UkQ7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxXQUFXLGFBQWE7QUFDeEIsV0FBVyx1QkFBdUI7QUFDbEMsV0FBVyxRQUFRO0FBQ25CO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDbkthO0FBQ2I7QUFD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QUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTs7QUFFQSxvQ0FBb0Msb0JBQW9COztBQUV4RDtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUTtBQUNSO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixpQ0FBaUM7QUFDekQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLDBCQUEwQiw0QkFBNEI7QUFDdEQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLHdCQUF3QixpQ0FBaUM7QUFDekQ7QUFDQSwwQkFBMEIsNEJBQTRCO0FBQ3REO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxHQUFHOztBQUVIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSDtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFFBQVE7QUFDUjtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztB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QUc7O0FBRUg7QUFDQTtBQUNBLGFBQWEsV0FBVztBQUN4QixhQUFhLFFBQVE7QUFDckI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRzs7QUFFSCxlQUFlLGVBQWU7QUFDOUI7QUFDQTtBQUNBLEdBQUc7O0FBRUg7QUFDQTtBQUNBO0FBQ0EsQ0FBQzs7Ozs7Ozs7Ozs7O0FDaFZEOzs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsaUNBQWlDLFdBQVc7V0FDNUM7V0FDQTs7Ozs7V0NQQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBOzs7OztXQ1BBOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RDs7Ozs7VUVOQTtVQUNBO1VBQ0E7VUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9pbmRleC5qcyIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtLy4vbm9kZV9tb2R1bGVzL2FmcmFtZS1zdGF0cy1wYW5lbC9pbmRleC5qcyIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtLy4vbm9kZV9tb2R1bGVzL2FtbW8tZGVidWctZHJhd2VyL0FtbW9EZWJ1Z0RyYXdlci5qcyIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtLy4vbm9kZV9tb2R1bGVzL3RocmVlLXRvLWFtbW8vaW5kZXguanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9jb21wb25lbnRzL2FtbW8tY29uc3RyYWludC5qcyIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtLy4vc3JjL2NvbXBvbmVudHMvYm9keS9hbW1vLWJvZHkuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9jb21wb25lbnRzL21hdGgvaW5kZXguanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9jb21wb25lbnRzL21hdGgvdmVsb2NpdHkuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9jb21wb25lbnRzL3NoYXBlL2FtbW8tc2hhcGUuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9jb25zdGFudHMuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9kcml2ZXJzL2FtbW8tZHJpdmVyLmpzIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vLi9zcmMvZHJpdmVycy9kcml2ZXIuanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS8uL3NyYy9zeXN0ZW0uanMiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS9leHRlcm5hbCB2YXIgXCJUSFJFRVwiIiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vQEVsZXR0cm90ZWNuaWNhL2FmcmFtZS1waHlzaWNzLXN5c3RlbS93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL0BFbGV0dHJvdGVjbmljYS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vd2VicGFjay9iZWZvcmUtc3RhcnR1cCIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3dlYnBhY2svc3RhcnR1cCIsIndlYnBhY2s6Ly9ARWxldHRyb3RlY25pY2EvYWZyYW1lLXBoeXNpY3Mtc3lzdGVtL3dlYnBhY2svYWZ0ZXItc3RhcnR1cCJdLCJzb3VyY2VzQ29udGVudCI6WyJyZXF1aXJlKCcuL3NyYy9jb21wb25lbnRzL21hdGgnKTtcbnJlcXVpcmUoJy4vc3JjL2NvbXBvbmVudHMvYm9keS9hbW1vLWJvZHknKTtcbnJlcXVpcmUoJy4vc3JjL2NvbXBvbmVudHMvc2hhcGUvYW1tby1zaGFwZScpXG5yZXF1aXJlKCcuL3NyYy9jb21wb25lbnRzL2FtbW8tY29uc3RyYWludCcpO1xucmVxdWlyZSgnLi9zcmMvc3lzdGVtJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICByZWdpc3RlckFsbDogZnVuY3Rpb24gKCkge1xuICAgIGNvbnNvbGUud2FybigncmVnaXN0ZXJBbGwoKSBpcyBkZXByZWNhdGVkLiBDb21wb25lbnRzIGFyZSBhdXRvbWF0aWNhbGx5IHJlZ2lzdGVyZWQuJyk7XG4gIH1cbn07XG4iLCJBRlJBTUUucmVnaXN0ZXJDb21wb25lbnQoJ3N0YXRzLXBhbmVsJywge1xyXG4gIHNjaGVtYToge1xyXG4gICAgbWVyZ2U6IHt0eXBlOiAnYm9vbGVhbicsIGRlZmF1bHQ6IHRydWV9XHJcbiAgfSxcclxuXHJcbiAgaW5pdCgpIHtcclxuXHJcbiAgICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcucnMtY29udGFpbmVyJylcclxuXHJcbiAgICBpZiAoY29udGFpbmVyICYmIHRoaXMuZGF0YS5tZXJnZSkge1xyXG4gICAgICAvL3N0YXRzIHBhbmVsIGV4aXN0cywganVzdCBtZXJnZSBpbnRvIGl0LlxyXG4gICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lclxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgc3RhdHMgcGFuZWwgZG9lc24ndCBleGlzdCwgYWRkIG9uZSB0byBzdXBwb3J0IG91ciBjdXN0b20gc3RhdHMuXHJcbiAgICB0aGlzLmJhc2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGhpcy5iYXNlLmNsYXNzTGlzdC5hZGQoJ3JzLWJhc2UnKVxyXG4gICAgY29uc3QgYm9keSA9IGRvY3VtZW50LmJvZHkgfHwgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXVxyXG5cclxuICAgIGlmIChjb250YWluZXIgJiYgIXRoaXMuZGF0YS5tZXJnZSkge1xyXG4gICAgICB0aGlzLmJhc2Uuc3R5bGUudG9wID0gXCJhdXRvXCJcclxuICAgICAgdGhpcy5iYXNlLnN0eWxlLmJvdHRvbSA9IFwiMjBweFwiXHJcbiAgICB9XHJcblxyXG4gICAgYm9keS5hcHBlbmRDaGlsZCh0aGlzLmJhc2UpXHJcblxyXG4gICAgdGhpcy5jb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG4gICAgdGhpcy5jb250YWluZXIuY2xhc3NMaXN0LmFkZCgncnMtY29udGFpbmVyJylcclxuICAgIHRoaXMuYmFzZS5hcHBlbmRDaGlsZCh0aGlzLmNvbnRhaW5lcilcclxuICB9XHJcbn0pO1xyXG5cclxuQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KCdzdGF0cy1ncm91cCcsIHtcclxuICBtdWx0aXBsZTogdHJ1ZSxcclxuICBzY2hlbWE6IHtcclxuICAgIGxhYmVsOiB7dHlwZTogJ3N0cmluZyd9XHJcbiAgfSxcclxuXHJcbiAgaW5pdCgpIHtcclxuXHJcbiAgICBsZXQgY29udGFpbmVyXHJcbiAgICBjb25zdCBiYXNlQ29tcG9uZW50ID0gdGhpcy5lbC5jb21wb25lbnRzWydzdGF0cy1wYW5lbCddXHJcbiAgICBpZiAoYmFzZUNvbXBvbmVudCkge1xyXG4gICAgICBjb250YWluZXIgPSBiYXNlQ29tcG9uZW50LmNvbnRhaW5lclxyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5ycy1jb250YWluZXInKVxyXG4gICAgfVxyXG5cclxuICAgIGlmICghY29udGFpbmVyKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgQ291bGRuJ3QgZmluZCBzdGF0cyBjb250YWluZXIgdG8gYWRkIHN0YXRzIHRvLlxyXG4gICAgICAgICAgICAgICAgICAgIEFkZCBlaXRoZXIgc3RhdHMgb3Igc3RhdHMtcGFuZWwgY29tcG9uZW50IHRvIGEtc2NlbmVgKVxyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRoaXMuZ3JvdXBIZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdoMScpXHJcbiAgICB0aGlzLmdyb3VwSGVhZGVyLmlubmVySFRNTCA9IHRoaXMuZGF0YS5sYWJlbFxyXG4gICAgY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuZ3JvdXBIZWFkZXIpXHJcblxyXG4gICAgdGhpcy5ncm91cCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICB0aGlzLmdyb3VwLmNsYXNzTGlzdC5hZGQoJ3JzLWdyb3VwJylcclxuICAgIC8vIHJzLWdyb3VwIGhzIHN0eWxlIGZsZXgtZGlyZWN0aW9uIG9mICdjb2x1bW4tcmV2ZXJzZSdcclxuICAgIC8vIE5vIGlkZWEgd2h5IGl0J3MgbGlrZSB0aGF0LCBidXQgaXQncyBub3Qgd2hhdCB3ZSB3YW50IGZvciBvdXIgc3RhdHMuXHJcbiAgICAvLyBXZSBwcmVmZXIgdGhlbSByZW5kZXJlZCBpbiB0aGUgb3JkZXIgc3BlaWZpZWQuXHJcbiAgICAvLyBTbyBvdmVycmlkZSB0aGlzIHN0eWxlLlxyXG4gICAgdGhpcy5ncm91cC5zdHlsZS5mbGV4RGlyZWN0aW9uID0gJ2NvbHVtbidcclxuICAgIHRoaXMuZ3JvdXAuc3R5bGUud2ViS2l0RmxleERpcmVjdGlvbiA9ICdjb2x1bW4nXHJcbiAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQodGhpcy5ncm91cClcclxuICB9XHJcbn0pO1xyXG5cclxuQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KCdzdGF0cy1yb3cnLCB7XHJcbiAgbXVsdGlwbGU6IHRydWUsXHJcbiAgc2NoZW1hOiB7XHJcbiAgICAvLyBuYW1lIG9mIHRoZSBncm91cCB0byBhZGQgdGhlIHN0YXRzIHJvdyB0by5cclxuICAgIGdyb3VwOiB7dHlwZTogJ3N0cmluZyd9LFxyXG5cclxuICAgIC8vIG5hbWUgb2YgYW4gZXZlbnQgdG8gbGlzdGVuIGZvclxyXG4gICAgZXZlbnQ6IHt0eXBlOiAnc3RyaW5nJ30sXHJcblxyXG4gICAgLy8gcHJvcGVydHkgZnJvbSBldmVudCB0byBvdXRwdXQgaW4gc3RhdHMgcGFuZWxcclxuICAgIHByb3BlcnRpZXM6IHt0eXBlOiAnYXJyYXknfSxcclxuXHJcbiAgICAvLyBsYWJlbCBmb3IgdGhlIHJvdyBpbiB0aGUgc3RhdHMgcGFuZWxcclxuICAgIGxhYmVsOiB7dHlwZTogJ3N0cmluZyd9XHJcbiAgfSxcclxuXHJcbiAgaW5pdCAoKSB7XHJcblxyXG4gICAgY29uc3QgZ3JvdXBDb21wb25lbnROYW1lID0gXCJzdGF0cy1ncm91cF9fXCIgKyB0aGlzLmRhdGEuZ3JvdXBcclxuICAgIGNvbnN0IGdyb3VwQ29tcG9uZW50ID0gdGhpcy5lbC5jb21wb25lbnRzW2dyb3VwQ29tcG9uZW50TmFtZV0gfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lbC5zY2VuZUVsLmNvbXBvbmVudHNbZ3JvdXBDb21wb25lbnROYW1lXSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsLmNvbXBvbmVudHNbXCJzdGF0cy1ncm91cFwiXSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmVsLnNjZW5lRWwuY29tcG9uZW50c1tcInN0YXRzLWdyb3VwXCJdXHJcblxyXG4gICAgaWYgKCFncm91cENvbXBvbmVudCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oYENvdWxkbid0IGZpbmQgc3RhdHMgZ3JvdXAgJHtncm91cENvbXBvbmVudE5hbWV9YClcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gIFxyXG4gICAgdGhpcy5jb3VudGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRoaXMuY291bnRlci5jbGFzc0xpc3QuYWRkKCdycy1jb3VudGVyLWJhc2UnKVxyXG4gICAgZ3JvdXBDb21wb25lbnQuZ3JvdXAuYXBwZW5kQ2hpbGQodGhpcy5jb3VudGVyKVxyXG5cclxuICAgIHRoaXMuY291bnRlcklkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuICAgIHRoaXMuY291bnRlcklkLmNsYXNzTGlzdC5hZGQoJ3JzLWNvdW50ZXItaWQnKVxyXG4gICAgdGhpcy5jb3VudGVySWQuaW5uZXJIVE1MID0gdGhpcy5kYXRhLmxhYmVsXHJcbiAgICB0aGlzLmNvdW50ZXIuYXBwZW5kQ2hpbGQodGhpcy5jb3VudGVySWQpXHJcblxyXG4gICAgdGhpcy5jb3VudGVyVmFsdWVzID0ge31cclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIGNvbnN0IGNvdW50ZXJWYWx1ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXHJcbiAgICAgIGNvdW50ZXJWYWx1ZS5jbGFzc0xpc3QuYWRkKCdycy1jb3VudGVyLXZhbHVlJylcclxuICAgICAgY291bnRlclZhbHVlLmlubmVySFRNTCA9IFwiLi4uXCJcclxuICAgICAgdGhpcy5jb3VudGVyLmFwcGVuZENoaWxkKGNvdW50ZXJWYWx1ZSlcclxuICAgICAgdGhpcy5jb3VudGVyVmFsdWVzW3Byb3BlcnR5XSA9IGNvdW50ZXJWYWx1ZVxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLnVwZGF0ZURhdGEgPSB0aGlzLnVwZGF0ZURhdGEuYmluZCh0aGlzKVxyXG4gICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKHRoaXMuZGF0YS5ldmVudCwgdGhpcy51cGRhdGVEYXRhKVxyXG5cclxuICAgIHRoaXMuc3BsaXRDYWNoZSA9IHt9XHJcbiAgfSxcclxuXHJcbiAgdXBkYXRlRGF0YShlKSB7XHJcbiAgICBcclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIGNvbnN0IHNwbGl0ID0gdGhpcy5zcGxpdERvdChwcm9wZXJ0eSk7XHJcbiAgICAgIGxldCB2YWx1ZSA9IGUuZGV0YWlsO1xyXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgc3BsaXQubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YWx1ZSA9IHZhbHVlW3NwbGl0W2ldXTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLmNvdW50ZXJWYWx1ZXNbcHJvcGVydHldLmlubmVySFRNTCA9IHZhbHVlXHJcbiAgICB9KVxyXG4gIH0sXHJcblxyXG4gIHNwbGl0RG90IChwYXRoKSB7XHJcbiAgICBpZiAocGF0aCBpbiB0aGlzLnNwbGl0Q2FjaGUpIHsgcmV0dXJuIHRoaXMuc3BsaXRDYWNoZVtwYXRoXTsgfVxyXG4gICAgdGhpcy5zcGxpdENhY2hlW3BhdGhdID0gcGF0aC5zcGxpdCgnLicpO1xyXG4gICAgcmV0dXJuIHRoaXMuc3BsaXRDYWNoZVtwYXRoXTtcclxuICB9XHJcblxyXG59KTtcclxuXHJcbkFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgnc3RhdHMtY29sbGVjdG9yJywge1xyXG4gIG11bHRpcGxlOiB0cnVlLFxyXG5cclxuICBzY2hlbWE6IHtcclxuICAgIC8vIG5hbWUgb2YgYW4gZXZlbnQgdG8gbGlzdGVuIGZvclxyXG4gICAgaW5FdmVudDoge3R5cGU6ICdzdHJpbmcnfSxcclxuXHJcbiAgICAvLyBwcm9wZXJ0eSBmcm9tIGV2ZW50IHRvIG91dHB1dCBpbiBzdGF0cyBwYW5lbFxyXG4gICAgcHJvcGVydGllczoge3R5cGU6ICdhcnJheSd9LFxyXG5cclxuICAgIC8vIGZyZXF1ZW5jeSBvZiBvdXRwdXQgaW4gdGVybXMgb2YgZXZlbnRzIHJlY2VpdmVkLlxyXG4gICAgb3V0cHV0RnJlcXVlbmN5OiB7dHlwZTogJ251bWJlcicsIGRlZmF1bHQ6IDEwMH0sXHJcblxyXG4gICAgLy8gbmFtZSBvZiBldmVudCB0byBlbWl0XHJcbiAgICBvdXRFdmVudDoge3R5cGU6ICdzdHJpbmcnfSxcclxuICAgIFxyXG4gICAgLy8gb3V0cHV0cyAoZ2VuZXJhdGVkIGZvciBlYWNoIHByb3BlcnR5KVxyXG4gICAgLy8gQ29tYmluYXRpb24gb2Y6IG1lYW4sIG1heCwgcGVyY2VudGlsZV9fWFguWCAod2hlcmUgWFguWCBpcyBhIG51bWJlcilcclxuICAgIG91dHB1dHM6IHt0eXBlOiAnYXJyYXknfSxcclxuXHJcbiAgICAvLyBXaGV0aGVyIHRvIG91dHB1dCB0byBjb25zb2xlIGFzIHdlbGwgYXMgZ2VuZXJhdGluZyBldmVudHNcclxuICAgIC8vIElmIGEgc3RyaW5nIGlzIHNwZWNpZmllZCwgdGhpcyBpcyBvdXRwdXQgdG8gY29uc29sZSwgdG9nZXRoZXIgd2l0aCB0aGUgZXZlbnQgZGF0YVxyXG4gICAgLy8gSWYgbm8gc3RyaW5nIGlzIHNwZWNpZmllZCwgbm90aGluZyBpcyBvdXRwdXQgdG8gY29uc29sZS5cclxuICAgIG91dHB1dFRvQ29uc29sZToge3R5cGU6ICdzdHJpbmcnfVxyXG4gIH0sXHJcblxyXG4gIGluaXQoKSB7XHJcbiAgICBcclxuICAgIHRoaXMuc3RhdHNEYXRhID0ge31cclxuICAgIHRoaXMucmVzZXREYXRhKClcclxuICAgIHRoaXMub3V0cHV0RGV0YWlsID0ge31cclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIHRoaXMub3V0cHV0RGV0YWlsW3Byb3BlcnR5XSA9IHt9XHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMuc3RhdHNSZWNlaXZlZCA9IHRoaXMuc3RhdHNSZWNlaXZlZC5iaW5kKHRoaXMpXHJcbiAgICB0aGlzLmVsLmFkZEV2ZW50TGlzdGVuZXIodGhpcy5kYXRhLmluRXZlbnQsIHRoaXMuc3RhdHNSZWNlaXZlZClcclxuICB9LFxyXG4gIFxyXG4gIHJlc2V0RGF0YSgpIHtcclxuXHJcbiAgICB0aGlzLmNvdW50ZXIgPSAwXHJcbiAgICB0aGlzLmRhdGEucHJvcGVydGllcy5mb3JFYWNoKChwcm9wZXJ0eSkgPT4ge1xyXG4gICAgICBcclxuICAgICAgLy8gRm9yIGNhbGN1bGF0aW5nIHBlcmNlbnRpbGVzIGxpa2UgMC4wMSBhbmQgOTkuOSUgd2UnbGwgd2FudCB0byBzdG9yZVxyXG4gICAgICAvLyBhZGRpdGlvbmFsIGRhdGEgLSBzb21ldGhpbmcgbGlrZSB0aGlzLi4uXHJcbiAgICAgIC8vIFN0b3JlIG9mZiBvdXRsaWVycywgYW5kIGRpc2NhcmQgZGF0YS5cclxuICAgICAgLy8gY29uc3QgbWluID0gTWF0aC5taW4oLi4udGhpcy5zdGF0c0RhdGFbcHJvcGVydHldKVxyXG4gICAgICAvLyB0aGlzLmxvd091dGxpZXJzW3Byb3BlcnR5XS5wdXNoKG1pbilcclxuICAgICAgLy8gY29uc3QgbWF4ID0gTWF0aC5tYXgoLi4udGhpcy5zdGF0c0RhdGFbcHJvcGVydHldKVxyXG4gICAgICAvLyB0aGlzLmhpZ2hPdXRsaWVyc1twcm9wZXJ0eV0ucHVzaChtYXgpXHJcblxyXG4gICAgICB0aGlzLnN0YXRzRGF0YVtwcm9wZXJ0eV0gPSBbXVxyXG4gICAgfSlcclxuICB9LFxyXG5cclxuICBzdGF0c1JlY2VpdmVkKGUpIHtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZURhdGEoZS5kZXRhaWwpXHJcblxyXG4gICAgdGhpcy5jb3VudGVyKysgXHJcbiAgICBpZiAodGhpcy5jb3VudGVyID09PSB0aGlzLmRhdGEub3V0cHV0RnJlcXVlbmN5KSB7XHJcbiAgICAgIHRoaXMub3V0cHV0RGF0YSgpXHJcbiAgICAgIHRoaXMucmVzZXREYXRhKClcclxuICAgIH1cclxuICB9LFxyXG5cclxuICB1cGRhdGVEYXRhKGRldGFpbCkge1xyXG5cclxuICAgIHRoaXMuZGF0YS5wcm9wZXJ0aWVzLmZvckVhY2goKHByb3BlcnR5KSA9PiB7XHJcbiAgICAgIGxldCB2YWx1ZSA9IGRldGFpbDtcclxuICAgICAgdmFsdWUgPSB2YWx1ZVtwcm9wZXJ0eV07XHJcbiAgICAgIHRoaXMuc3RhdHNEYXRhW3Byb3BlcnR5XS5wdXNoKHZhbHVlKVxyXG4gICAgfSlcclxuICB9LFxyXG5cclxuICBvdXRwdXREYXRhKCkge1xyXG4gICAgdGhpcy5kYXRhLnByb3BlcnRpZXMuZm9yRWFjaCgocHJvcGVydHkpID0+IHtcclxuICAgICAgdGhpcy5kYXRhLm91dHB1dHMuZm9yRWFjaCgob3V0cHV0KSA9PiB7XHJcbiAgICAgICAgdGhpcy5vdXRwdXREZXRhaWxbcHJvcGVydHldW291dHB1dF0gPSB0aGlzLmNvbXB1dGVPdXRwdXQob3V0cHV0LCB0aGlzLnN0YXRzRGF0YVtwcm9wZXJ0eV0pXHJcbiAgICAgIH0pXHJcbiAgICB9KVxyXG5cclxuICAgIGlmICh0aGlzLmRhdGEub3V0RXZlbnQpIHtcclxuICAgICAgdGhpcy5lbC5lbWl0KHRoaXMuZGF0YS5vdXRFdmVudCwgdGhpcy5vdXRwdXREZXRhaWwpXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuZGF0YS5vdXRwdXRUb0NvbnNvbGUpIHtcclxuICAgICAgY29uc29sZS5sb2codGhpcy5kYXRhLm91dHB1dFRvQ29uc29sZSwgdGhpcy5vdXRwdXREZXRhaWwpXHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgY29tcHV0ZU91dHB1dChvdXRwdXRJbnN0cnVjdGlvbiwgZGF0YSkge1xyXG5cclxuICAgIGNvbnN0IG91dHB1dEluc3RydWN0aW9ucyA9IG91dHB1dEluc3RydWN0aW9uLnNwbGl0KFwiX19cIilcclxuICAgIGNvbnN0IG91dHB1dFR5cGUgPSBvdXRwdXRJbnN0cnVjdGlvbnNbMF1cclxuICAgIGxldCBvdXRwdXRcclxuXHJcbiAgICBzd2l0Y2ggKG91dHB1dFR5cGUpIHtcclxuICAgICAgY2FzZSBcIm1lYW5cIjpcclxuICAgICAgICBvdXRwdXQgPSBkYXRhLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIFxyXG4gICAgICBjYXNlIFwibWF4XCI6XHJcbiAgICAgICAgb3V0cHV0ID0gTWF0aC5tYXgoLi4uZGF0YSlcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgXCJtaW5cIjpcclxuICAgICAgICBvdXRwdXQgPSBNYXRoLm1pbiguLi5kYXRhKVxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSBcInBlcmNlbnRpbGVcIjpcclxuICAgICAgICBjb25zdCBzb3J0ZWQgPSBkYXRhLnNvcnQoKGEsIGIpID0+IGEgLSBiKVxyXG4gICAgICAgIC8vIGRlY2ltYWwgcGVyY2VudGlsZXMgZW5jb2RlZCBsaWtlIDk5KzkgcmF0aGVyIHRoYW4gOTkuOSBkdWUgdG8gXCIuXCIgYmVpbmcgdXNlZCBhcyBhIFxyXG4gICAgICAgIC8vIHNlcGFyYXRvciBmb3IgbmVzdGVkIHByb3BlcnRpZXMuXHJcbiAgICAgICAgY29uc3QgcGVyY2VudGlsZVN0cmluZyA9IG91dHB1dEluc3RydWN0aW9uc1sxXS5yZXBsYWNlKFwiX1wiLCBcIi5cIilcclxuICAgICAgICBjb25zdCBwcm9wb3J0aW9uID0gK3BlcmNlbnRpbGVTdHJpbmcgLyAxMDBcclxuXHJcbiAgICAgICAgLy8gTm90ZSB0aGF0IHRoaXMgY2FsY3VsYXRpb24gb2YgdGhlIHBlcmNlbnRpbGUgaXMgaW5hY2N1cmF0ZSB3aGVuIHRoZXJlIGlzIGluc3VmZmljaWVudCBkYXRhXHJcbiAgICAgICAgLy8gZS5nLiBmb3IgMC4xdGggb3IgOTkuOXRoIHBlcmNlbnRpbGUgd2hlbiBvbmx5IDEwMCBkYXRhIHBvaW50cy5cclxuICAgICAgICAvLyBHcmVhdGVyIGFjY3VyYWN5IHdvdWxkIHJlcXVpcmUgc3RvcmluZyBvZmYgbW9yZSBkYXRhIChzcGVjaWZpY2FsbHkgb3V0bGllcnMpIGFuZCBmb2xkaW5nIHRoZXNlXHJcbiAgICAgICAgLy8gaW50byB0aGUgY29tcHV0YXRpb24uXHJcbiAgICAgICAgY29uc3QgcG9zaXRpb24gPSAoZGF0YS5sZW5ndGggLSAxKSAqIHByb3BvcnRpb25cclxuICAgICAgICBjb25zdCBiYXNlID0gTWF0aC5mbG9vcihwb3NpdGlvbilcclxuICAgICAgICBjb25zdCBkZWx0YSA9IHBvc2l0aW9uIC0gYmFzZTtcclxuICAgICAgICBpZiAoc29ydGVkW2Jhc2UgKyAxXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIG91dHB1dCA9IHNvcnRlZFtiYXNlXSArIGRlbHRhICogKHNvcnRlZFtiYXNlICsgMV0gLSBzb3J0ZWRbYmFzZV0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG91dHB1dCA9IHNvcnRlZFtiYXNlXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3V0cHV0LnRvRml4ZWQoMilcclxuICB9XHJcbn0pO1xyXG4iLCIvKiBnbG9iYWwgQW1tbyxUSFJFRSAqL1xuXG5USFJFRS5BbW1vRGVidWdDb25zdGFudHMgPSB7XG4gIE5vRGVidWc6IDAsXG4gIERyYXdXaXJlZnJhbWU6IDEsXG4gIERyYXdBYWJiOiAyLFxuICBEcmF3RmVhdHVyZXNUZXh0OiA0LFxuICBEcmF3Q29udGFjdFBvaW50czogOCxcbiAgTm9EZWFjdGl2YXRpb246IDE2LFxuICBOb0hlbHBUZXh0OiAzMixcbiAgRHJhd1RleHQ6IDY0LFxuICBQcm9maWxlVGltaW5nczogMTI4LFxuICBFbmFibGVTYXRDb21wYXJpc29uOiAyNTYsXG4gIERpc2FibGVCdWxsZXRMQ1A6IDUxMixcbiAgRW5hYmxlQ0NEOiAxMDI0LFxuICBEcmF3Q29uc3RyYWludHM6IDEgPDwgMTEsIC8vMjA0OFxuICBEcmF3Q29uc3RyYWludExpbWl0czogMSA8PCAxMiwgLy80MDk2XG4gIEZhc3RXaXJlZnJhbWU6IDEgPDwgMTMsIC8vODE5MlxuICBEcmF3Tm9ybWFsczogMSA8PCAxNCwgLy8xNjM4NFxuICBEcmF3T25Ub3A6IDEgPDwgMTUsIC8vMzI3NjhcbiAgTUFYX0RFQlVHX0RSQVdfTU9ERTogMHhmZmZmZmZmZlxufTtcblxuLyoqXG4gKiBBbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgYnRJRGVidWdEcmF3IGludGVyZmFjZSBpbiBBbW1vLmpzLCBmb3IgZGVidWcgcmVuZGVyaW5nIG9mIEFtbW8gc2hhcGVzXG4gKiBAY2xhc3MgQW1tb0RlYnVnRHJhd2VyXG4gKiBAcGFyYW0ge1RIUkVFLlNjZW5lfSBzY2VuZVxuICogQHBhcmFtIHtBbW1vLmJ0Q29sbGlzaW9uV29ybGR9IHdvcmxkXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gKi9cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlciA9IGZ1bmN0aW9uKHNjZW5lLCB3b3JsZCwgb3B0aW9ucykge1xuICB0aGlzLnNjZW5lID0gc2NlbmU7XG4gIHRoaXMud29ybGQgPSB3b3JsZDtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdGhpcy5kZWJ1Z0RyYXdNb2RlID0gb3B0aW9ucy5kZWJ1Z0RyYXdNb2RlIHx8IFRIUkVFLkFtbW9EZWJ1Z0NvbnN0YW50cy5EcmF3V2lyZWZyYW1lO1xuICB2YXIgZHJhd09uVG9wID0gdGhpcy5kZWJ1Z0RyYXdNb2RlICYgVEhSRUUuQW1tb0RlYnVnQ29uc3RhbnRzLkRyYXdPblRvcCB8fCBmYWxzZTtcbiAgdmFyIG1heEJ1ZmZlclNpemUgPSBvcHRpb25zLm1heEJ1ZmZlclNpemUgfHwgMTAwMDAwMDtcblxuICB0aGlzLmdlb21ldHJ5ID0gbmV3IFRIUkVFLkJ1ZmZlckdlb21ldHJ5KCk7XG4gIHZhciB2ZXJ0aWNlcyA9IG5ldyBGbG9hdDMyQXJyYXkobWF4QnVmZmVyU2l6ZSAqIDMpO1xuICB2YXIgY29sb3JzID0gbmV3IEZsb2F0MzJBcnJheShtYXhCdWZmZXJTaXplICogMyk7XG5cbiAgdGhpcy5nZW9tZXRyeS5zZXRBdHRyaWJ1dGUoXCJwb3NpdGlvblwiLCBuZXcgVEhSRUUuQnVmZmVyQXR0cmlidXRlKHZlcnRpY2VzLCAzKS5zZXRVc2FnZShUSFJFRS5EeW5hbWljRHJhd1VzYWdlKSk7XG4gIHRoaXMuZ2VvbWV0cnkuc2V0QXR0cmlidXRlKFwiY29sb3JcIiwgbmV3IFRIUkVFLkJ1ZmZlckF0dHJpYnV0ZShjb2xvcnMsIDMpLnNldFVzYWdlKFRIUkVFLkR5bmFtaWNEcmF3VXNhZ2UpKTtcblxuICB0aGlzLmluZGV4ID0gMDtcblxuICB2YXIgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTGluZUJhc2ljTWF0ZXJpYWwoe1xuICAgIHZlcnRleENvbG9yczogdHJ1ZSxcbiAgICBkZXB0aFRlc3Q6ICFkcmF3T25Ub3BcbiAgfSk7XG5cbiAgdGhpcy5tZXNoID0gbmV3IFRIUkVFLkxpbmVTZWdtZW50cyh0aGlzLmdlb21ldHJ5LCBtYXRlcmlhbCk7XG4gIGlmIChkcmF3T25Ub3ApIHRoaXMubWVzaC5yZW5kZXJPcmRlciA9IDk5OTtcbiAgdGhpcy5tZXNoLmZydXN0dW1DdWxsZWQgPSBmYWxzZTtcblxuICB0aGlzLmVuYWJsZWQgPSBmYWxzZTtcblxuICB0aGlzLmRlYnVnRHJhd2VyID0gbmV3IEFtbW8uRGVidWdEcmF3ZXIoKTtcbiAgdGhpcy5kZWJ1Z0RyYXdlci5kcmF3TGluZSA9IHRoaXMuZHJhd0xpbmUuYmluZCh0aGlzKTtcbiAgdGhpcy5kZWJ1Z0RyYXdlci5kcmF3Q29udGFjdFBvaW50ID0gdGhpcy5kcmF3Q29udGFjdFBvaW50LmJpbmQodGhpcyk7XG4gIHRoaXMuZGVidWdEcmF3ZXIucmVwb3J0RXJyb3JXYXJuaW5nID0gdGhpcy5yZXBvcnRFcnJvcldhcm5pbmcuYmluZCh0aGlzKTtcbiAgdGhpcy5kZWJ1Z0RyYXdlci5kcmF3M2RUZXh0ID0gdGhpcy5kcmF3M2RUZXh0LmJpbmQodGhpcyk7XG4gIHRoaXMuZGVidWdEcmF3ZXIuc2V0RGVidWdNb2RlID0gdGhpcy5zZXREZWJ1Z01vZGUuYmluZCh0aGlzKTtcbiAgdGhpcy5kZWJ1Z0RyYXdlci5nZXREZWJ1Z01vZGUgPSB0aGlzLmdldERlYnVnTW9kZS5iaW5kKHRoaXMpO1xuICB0aGlzLmRlYnVnRHJhd2VyLmVuYWJsZSA9IHRoaXMuZW5hYmxlLmJpbmQodGhpcyk7XG4gIHRoaXMuZGVidWdEcmF3ZXIuZGlzYWJsZSA9IHRoaXMuZGlzYWJsZS5iaW5kKHRoaXMpO1xuICB0aGlzLmRlYnVnRHJhd2VyLnVwZGF0ZSA9IHRoaXMudXBkYXRlLmJpbmQodGhpcyk7XG5cbiAgdGhpcy53b3JsZC5zZXREZWJ1Z0RyYXdlcih0aGlzLmRlYnVnRHJhd2VyKTtcbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZGVidWdEcmF3ZXI7XG59O1xuXG5USFJFRS5BbW1vRGVidWdEcmF3ZXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmVuYWJsZWQgPSB0cnVlO1xuICB0aGlzLnNjZW5lLmFkZCh0aGlzLm1lc2gpO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZW5hYmxlZCA9IGZhbHNlO1xuICB0aGlzLnNjZW5lLnJlbW92ZSh0aGlzLm1lc2gpO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCF0aGlzLmVuYWJsZWQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAodGhpcy5pbmRleCAhPSAwKSB7XG4gICAgdGhpcy5nZW9tZXRyeS5hdHRyaWJ1dGVzLnBvc2l0aW9uLm5lZWRzVXBkYXRlID0gdHJ1ZTtcbiAgICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMuY29sb3IubmVlZHNVcGRhdGUgPSB0cnVlO1xuICB9XG5cbiAgdGhpcy5pbmRleCA9IDA7XG5cbiAgdGhpcy53b3JsZC5kZWJ1Z0RyYXdXb3JsZCgpO1xuXG4gIHRoaXMuZ2VvbWV0cnkuc2V0RHJhd1JhbmdlKDAsIHRoaXMuaW5kZXgpO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5kcmF3TGluZSA9IGZ1bmN0aW9uKGZyb20sIHRvLCBjb2xvcikge1xuICBjb25zdCBoZWFwID0gQW1tby5IRUFQRjMyO1xuICBjb25zdCByID0gaGVhcFsoY29sb3IgKyAwKSAvIDRdO1xuICBjb25zdCBnID0gaGVhcFsoY29sb3IgKyA0KSAvIDRdO1xuICBjb25zdCBiID0gaGVhcFsoY29sb3IgKyA4KSAvIDRdO1xuXG4gIGNvbnN0IGZyb21YID0gaGVhcFsoZnJvbSArIDApIC8gNF07XG4gIGNvbnN0IGZyb21ZID0gaGVhcFsoZnJvbSArIDQpIC8gNF07XG4gIGNvbnN0IGZyb21aID0gaGVhcFsoZnJvbSArIDgpIC8gNF07XG4gIHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5wb3NpdGlvbi5zZXRYWVoodGhpcy5pbmRleCwgZnJvbVgsIGZyb21ZLCBmcm9tWik7XG4gIHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5jb2xvci5zZXRYWVoodGhpcy5pbmRleCsrLCByLCBnLCBiKTtcblxuICBjb25zdCB0b1ggPSBoZWFwWyh0byArIDApIC8gNF07XG4gIGNvbnN0IHRvWSA9IGhlYXBbKHRvICsgNCkgLyA0XTtcbiAgY29uc3QgdG9aID0gaGVhcFsodG8gKyA4KSAvIDRdO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb24uc2V0WFlaKHRoaXMuaW5kZXgsIHRvWCwgdG9ZLCB0b1opO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMuY29sb3Iuc2V0WFlaKHRoaXMuaW5kZXgrKywgciwgZywgYik7XG59O1xuXG4vL1RPRE86IGZpZ3VyZSBvdXQgaG93IHRvIG1ha2UgbGlmZVRpbWUgd29ya1xuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5kcmF3Q29udGFjdFBvaW50ID0gZnVuY3Rpb24ocG9pbnRPbkIsIG5vcm1hbE9uQiwgZGlzdGFuY2UsIGxpZmVUaW1lLCBjb2xvcikge1xuICBjb25zdCBoZWFwID0gQW1tby5IRUFQRjMyO1xuICBjb25zdCByID0gaGVhcFsoY29sb3IgKyAwKSAvIDRdO1xuICBjb25zdCBnID0gaGVhcFsoY29sb3IgKyA0KSAvIDRdO1xuICBjb25zdCBiID0gaGVhcFsoY29sb3IgKyA4KSAvIDRdO1xuXG4gIGNvbnN0IHggPSBoZWFwWyhwb2ludE9uQiArIDApIC8gNF07XG4gIGNvbnN0IHkgPSBoZWFwWyhwb2ludE9uQiArIDQpIC8gNF07XG4gIGNvbnN0IHogPSBoZWFwWyhwb2ludE9uQiArIDgpIC8gNF07XG4gIHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5wb3NpdGlvbi5zZXRYWVoodGhpcy5pbmRleCwgeCwgeSwgeik7XG4gIHRoaXMuZ2VvbWV0cnkuYXR0cmlidXRlcy5jb2xvci5zZXRYWVoodGhpcy5pbmRleCsrLCByLCBnLCBiKTtcblxuICBjb25zdCBkeCA9IGhlYXBbKG5vcm1hbE9uQiArIDApIC8gNF0gKiBkaXN0YW5jZTtcbiAgY29uc3QgZHkgPSBoZWFwWyhub3JtYWxPbkIgKyA0KSAvIDRdICogZGlzdGFuY2U7XG4gIGNvbnN0IGR6ID0gaGVhcFsobm9ybWFsT25CICsgOCkgLyA0XSAqIGRpc3RhbmNlO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMucG9zaXRpb24uc2V0WFlaKHRoaXMuaW5kZXgsIHggKyBkeCwgeSArIGR5LCB6ICsgZHopO1xuICB0aGlzLmdlb21ldHJ5LmF0dHJpYnV0ZXMuY29sb3Iuc2V0WFlaKHRoaXMuaW5kZXgrKywgciwgZywgYik7XG59O1xuXG5USFJFRS5BbW1vRGVidWdEcmF3ZXIucHJvdG90eXBlLnJlcG9ydEVycm9yV2FybmluZyA9IGZ1bmN0aW9uKHdhcm5pbmdTdHJpbmcpIHtcbiAgaWYgKEFtbW8uaGFzT3duUHJvcGVydHkoXCJQb2ludGVyX3N0cmluZ2lmeVwiKSkge1xuICAgIGNvbnNvbGUud2FybihBbW1vLlBvaW50ZXJfc3RyaW5naWZ5KHdhcm5pbmdTdHJpbmcpKTtcbiAgfSBlbHNlIGlmICghdGhpcy53YXJuZWRPbmNlKSB7XG4gICAgdGhpcy53YXJuZWRPbmNlID0gdHJ1ZTtcbiAgICBjb25zb2xlLndhcm4oXCJDYW5ub3QgcHJpbnQgd2FybmluZ1N0cmluZywgcGxlYXNlIHJlYnVpbGQgQW1tby5qcyB1c2luZyAnZGVidWcnIGZsYWdcIik7XG4gIH1cbn07XG5cblRIUkVFLkFtbW9EZWJ1Z0RyYXdlci5wcm90b3R5cGUuZHJhdzNkVGV4dCA9IGZ1bmN0aW9uKGxvY2F0aW9uLCB0ZXh0U3RyaW5nKSB7XG4gIC8vVE9ET1xuICBjb25zb2xlLndhcm4oXCJUT0RPOiBkcmF3M2RUZXh0XCIpO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5zZXREZWJ1Z01vZGUgPSBmdW5jdGlvbihkZWJ1Z01vZGUpIHtcbiAgdGhpcy5kZWJ1Z0RyYXdNb2RlID0gZGVidWdNb2RlO1xufTtcblxuVEhSRUUuQW1tb0RlYnVnRHJhd2VyLnByb3RvdHlwZS5nZXREZWJ1Z01vZGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuZGVidWdEcmF3TW9kZTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcbi8qIGdsb2JhbCBBbW1vICovXG5pbXBvcnQgKiBhcyBUSFJFRSBmcm9tIFwidGhyZWVcIjtcblxuZXhwb3J0IGNvbnN0IFRZUEUgPSB7XG4gIEJPWDogXCJib3hcIixcbiAgQ1lMSU5ERVI6IFwiY3lsaW5kZXJcIixcbiAgU1BIRVJFOiBcInNwaGVyZVwiLFxuICBDQVBTVUxFOiBcImNhcHN1bGVcIixcbiAgQ09ORTogXCJjb25lXCIsXG4gIEhVTEw6IFwiaHVsbFwiLFxuICBIQUNEOiBcImhhY2RcIiwgLy9IaWVyYXJjaGljYWwgQXBwcm94aW1hdGUgQ29udmV4IERlY29tcG9zaXRpb25cbiAgVkhBQ0Q6IFwidmhhY2RcIiwgLy9Wb2x1bWV0cmljIEhpZXJhcmNoaWNhbCBBcHByb3hpbWF0ZSBDb252ZXggRGVjb21wb3NpdGlvblxuICBNRVNIOiBcIm1lc2hcIixcbiAgSEVJR0hURklFTEQ6IFwiaGVpZ2h0ZmllbGRcIlxufTtcblxuZXhwb3J0IGNvbnN0IEZJVCA9IHtcbiAgQUxMOiBcImFsbFwiLCAvL0Egc2luZ2xlIHNoYXBlIGlzIGF1dG9tYXRpY2FsbHkgc2l6ZWQgdG8gYm91bmQgYWxsIG1lc2hlcyB3aXRoaW4gdGhlIGVudGl0eS5cbiAgTUFOVUFMOiBcIm1hbnVhbFwiIC8vQSBzaW5nbGUgc2hhcGUgaXMgc2l6ZWQgbWFudWFsbHkuIFJlcXVpcmVzIGhhbGZFeHRlbnRzIG9yIHNwaGVyZVJhZGl1cy5cbn07XG5cbmV4cG9ydCBjb25zdCBIRUlHSFRGSUVMRF9EQVRBX1RZUEUgPSB7XG4gIHNob3J0OiBcInNob3J0XCIsXG4gIGZsb2F0OiBcImZsb2F0XCJcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVDb2xsaXNpb25TaGFwZXMgPSBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIGluZGV4ZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgc3dpdGNoIChvcHRpb25zLnR5cGUpIHtcbiAgICBjYXNlIFRZUEUuQk9YOlxuICAgICAgcmV0dXJuIFtjcmVhdGVCb3hTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLkNZTElOREVSOlxuICAgICAgcmV0dXJuIFtjcmVhdGVDeWxpbmRlclNoYXBlKHZlcnRpY2VzLCBtYXRyaWNlcywgbWF0cml4V29ybGQsIG9wdGlvbnMpXTtcbiAgICBjYXNlIFRZUEUuQ0FQU1VMRTpcbiAgICAgIHJldHVybiBbY3JlYXRlQ2Fwc3VsZVNoYXBlKHZlcnRpY2VzLCBtYXRyaWNlcywgbWF0cml4V29ybGQsIG9wdGlvbnMpXTtcbiAgICBjYXNlIFRZUEUuQ09ORTpcbiAgICAgIHJldHVybiBbY3JlYXRlQ29uZVNoYXBlKHZlcnRpY2VzLCBtYXRyaWNlcywgbWF0cml4V29ybGQsIG9wdGlvbnMpXTtcbiAgICBjYXNlIFRZUEUuU1BIRVJFOlxuICAgICAgcmV0dXJuIFtjcmVhdGVTcGhlcmVTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLkhVTEw6XG4gICAgICByZXR1cm4gW2NyZWF0ZUh1bGxTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLkhBQ0Q6XG4gICAgICByZXR1cm4gY3JlYXRlSEFDRFNoYXBlcyh2ZXJ0aWNlcywgbWF0cmljZXMsIGluZGV4ZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKTtcbiAgICBjYXNlIFRZUEUuVkhBQ0Q6XG4gICAgICByZXR1cm4gY3JlYXRlVkhBQ0RTaGFwZXModmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyk7XG4gICAgY2FzZSBUWVBFLk1FU0g6XG4gICAgICByZXR1cm4gW2NyZWF0ZVRyaU1lc2hTaGFwZSh2ZXJ0aWNlcywgbWF0cmljZXMsIGluZGV4ZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zKV07XG4gICAgY2FzZSBUWVBFLkhFSUdIVEZJRUxEOlxuICAgICAgcmV0dXJuIFtjcmVhdGVIZWlnaHRmaWVsZFRlcnJhaW5TaGFwZShvcHRpb25zKV07XG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUud2FybihvcHRpb25zLnR5cGUgKyBcIiBpcyBub3QgY3VycmVudGx5IHN1cHBvcnRlZFwiKTtcbiAgICAgIHJldHVybiBbXTtcbiAgfVxufTtcblxuLy9UT0RPOiBzdXBwb3J0IGdpbXBhY3QgKGR5bmFtaWMgdHJpbWVzaCkgYW5kIGhlaWdodG1hcFxuXG5leHBvcnQgY29uc3QgY3JlYXRlQm94U2hhcGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgb3B0aW9ucy50eXBlID0gVFlQRS5CT1g7XG4gIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zLmZpdCA9PT0gRklULkFMTCkge1xuICAgIG9wdGlvbnMuaGFsZkV4dGVudHMgPSBfY29tcHV0ZUhhbGZFeHRlbnRzKFxuICAgICAgX2NvbXB1dGVCb3VuZHModmVydGljZXMsIG1hdHJpY2VzKSxcbiAgICAgIG9wdGlvbnMubWluSGFsZkV4dGVudCxcbiAgICAgIG9wdGlvbnMubWF4SGFsZkV4dGVudFxuICAgICk7XG4gIH1cblxuICBjb25zdCBidEhhbGZFeHRlbnRzID0gbmV3IEFtbW8uYnRWZWN0b3IzKG9wdGlvbnMuaGFsZkV4dGVudHMueCwgb3B0aW9ucy5oYWxmRXh0ZW50cy55LCBvcHRpb25zLmhhbGZFeHRlbnRzLnopO1xuICBjb25zdCBjb2xsaXNpb25TaGFwZSA9IG5ldyBBbW1vLmJ0Qm94U2hhcGUoYnRIYWxmRXh0ZW50cyk7XG4gIEFtbW8uZGVzdHJveShidEhhbGZFeHRlbnRzKTtcblxuICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoY29sbGlzaW9uU2hhcGUsIG9wdGlvbnMsIF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpKTtcbiAgcmV0dXJuIGNvbGxpc2lvblNoYXBlO1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUN5bGluZGVyU2hhcGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgb3B0aW9ucy50eXBlID0gVFlQRS5DWUxJTkRFUjtcbiAgX3NldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuQUxMKSB7XG4gICAgb3B0aW9ucy5oYWxmRXh0ZW50cyA9IF9jb21wdXRlSGFsZkV4dGVudHMoXG4gICAgICBfY29tcHV0ZUJvdW5kcyh2ZXJ0aWNlcywgbWF0cmljZXMpLFxuICAgICAgb3B0aW9ucy5taW5IYWxmRXh0ZW50LFxuICAgICAgb3B0aW9ucy5tYXhIYWxmRXh0ZW50XG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IGJ0SGFsZkV4dGVudHMgPSBuZXcgQW1tby5idFZlY3RvcjMob3B0aW9ucy5oYWxmRXh0ZW50cy54LCBvcHRpb25zLmhhbGZFeHRlbnRzLnksIG9wdGlvbnMuaGFsZkV4dGVudHMueik7XG4gIGNvbnN0IGNvbGxpc2lvblNoYXBlID0gKCgpID0+IHtcbiAgICBzd2l0Y2ggKG9wdGlvbnMuY3lsaW5kZXJBeGlzKSB7XG4gICAgICBjYXNlIFwieVwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDeWxpbmRlclNoYXBlKGJ0SGFsZkV4dGVudHMpO1xuICAgICAgY2FzZSBcInhcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q3lsaW5kZXJTaGFwZVgoYnRIYWxmRXh0ZW50cyk7XG4gICAgICBjYXNlIFwielwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDeWxpbmRlclNoYXBlWihidEhhbGZFeHRlbnRzKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pKCk7XG4gIEFtbW8uZGVzdHJveShidEhhbGZFeHRlbnRzKTtcblxuICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoY29sbGlzaW9uU2hhcGUsIG9wdGlvbnMsIF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpKTtcbiAgcmV0dXJuIGNvbGxpc2lvblNoYXBlO1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUNhcHN1bGVTaGFwZSA9IGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXRyaWNlcywgbWF0cml4V29ybGQsIG9wdGlvbnMgPSB7fSkge1xuICBvcHRpb25zLnR5cGUgPSBUWVBFLkNBUFNVTEU7XG4gIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gIGlmIChvcHRpb25zLmZpdCA9PT0gRklULkFMTCkge1xuICAgIG9wdGlvbnMuaGFsZkV4dGVudHMgPSBfY29tcHV0ZUhhbGZFeHRlbnRzKFxuICAgICAgX2NvbXB1dGVCb3VuZHModmVydGljZXMsIG1hdHJpY2VzKSxcbiAgICAgIG9wdGlvbnMubWluSGFsZkV4dGVudCxcbiAgICAgIG9wdGlvbnMubWF4SGFsZkV4dGVudFxuICAgICk7XG4gIH1cblxuICBjb25zdCB7IHgsIHksIHogfSA9IG9wdGlvbnMuaGFsZkV4dGVudHM7XG4gIGNvbnN0IGNvbGxpc2lvblNoYXBlID0gKCgpID0+IHtcbiAgICBzd2l0Y2ggKG9wdGlvbnMuY3lsaW5kZXJBeGlzKSB7XG4gICAgICBjYXNlIFwieVwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDYXBzdWxlU2hhcGUoTWF0aC5tYXgoeCwgeiksIHkgKiAyKTtcbiAgICAgIGNhc2UgXCJ4XCI6XG4gICAgICAgIHJldHVybiBuZXcgQW1tby5idENhcHN1bGVTaGFwZVgoTWF0aC5tYXgoeSwgeiksIHggKiAyKTtcbiAgICAgIGNhc2UgXCJ6XCI6XG4gICAgICAgIHJldHVybiBuZXcgQW1tby5idENhcHN1bGVTaGFwZVooTWF0aC5tYXgoeCwgeSksIHogKiAyKTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pKCk7XG5cbiAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zLCBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKSk7XG4gIHJldHVybiBjb2xsaXNpb25TaGFwZTtcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVDb25lU2hhcGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgb3B0aW9ucy50eXBlID0gVFlQRS5DT05FO1xuICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5BTEwpIHtcbiAgICBvcHRpb25zLmhhbGZFeHRlbnRzID0gX2NvbXB1dGVIYWxmRXh0ZW50cyhcbiAgICAgIF9jb21wdXRlQm91bmRzKHZlcnRpY2VzLCBtYXRyaWNlcyksXG4gICAgICBvcHRpb25zLm1pbkhhbGZFeHRlbnQsXG4gICAgICBvcHRpb25zLm1heEhhbGZFeHRlbnRcbiAgICApO1xuICB9XG5cbiAgY29uc3QgeyB4LCB5LCB6IH0gPSBvcHRpb25zLmhhbGZFeHRlbnRzO1xuICBjb25zdCBjb2xsaXNpb25TaGFwZSA9ICgoKSA9PiB7XG4gICAgc3dpdGNoIChvcHRpb25zLmN5bGluZGVyQXhpcykge1xuICAgICAgY2FzZSBcInlcIjpcbiAgICAgICAgcmV0dXJuIG5ldyBBbW1vLmJ0Q29uZVNoYXBlKE1hdGgubWF4KHgsIHopLCB5ICogMik7XG4gICAgICBjYXNlIFwieFwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDb25lU2hhcGVYKE1hdGgubWF4KHksIHopLCB4ICogMik7XG4gICAgICBjYXNlIFwielwiOlxuICAgICAgICByZXR1cm4gbmV3IEFtbW8uYnRDb25lU2hhcGVaKE1hdGgubWF4KHgsIHkpLCB6ICogMik7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9KSgpO1xuXG4gIF9maW5pc2hDb2xsaXNpb25TaGFwZShjb2xsaXNpb25TaGFwZSwgb3B0aW9ucywgX2NvbXB1dGVTY2FsZShtYXRyaXhXb3JsZCwgb3B0aW9ucykpO1xuICByZXR1cm4gY29sbGlzaW9uU2hhcGU7XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlU3BoZXJlU2hhcGUgPSBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgb3B0aW9ucy50eXBlID0gVFlQRS5TUEhFUkU7XG4gIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gIGxldCByYWRpdXM7XG4gIGlmIChvcHRpb25zLmZpdCA9PT0gRklULk1BTlVBTCAmJiAhaXNOYU4ob3B0aW9ucy5zcGhlcmVSYWRpdXMpKSB7XG4gICAgcmFkaXVzID0gb3B0aW9ucy5zcGhlcmVSYWRpdXM7XG4gIH0gZWxzZSB7XG4gICAgcmFkaXVzID0gX2NvbXB1dGVSYWRpdXModmVydGljZXMsIG1hdHJpY2VzLCBfY29tcHV0ZUJvdW5kcyh2ZXJ0aWNlcywgbWF0cmljZXMpKTtcbiAgfVxuXG4gIGNvbnN0IGNvbGxpc2lvblNoYXBlID0gbmV3IEFtbW8uYnRTcGhlcmVTaGFwZShyYWRpdXMpO1xuICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoY29sbGlzaW9uU2hhcGUsIG9wdGlvbnMsIF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpKTtcblxuICByZXR1cm4gY29sbGlzaW9uU2hhcGU7XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlSHVsbFNoYXBlID0gKGZ1bmN0aW9uKCkge1xuICBjb25zdCB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBjZW50ZXIgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICByZXR1cm4gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgb3B0aW9ucy50eXBlID0gVFlQRS5IVUxMO1xuICAgIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuTUFOVUFMKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjYW5ub3QgdXNlIGZpdDogbWFudWFsIHdpdGggdHlwZTogaHVsbFwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGJvdW5kcyA9IF9jb21wdXRlQm91bmRzKHZlcnRpY2VzLCBtYXRyaWNlcyk7XG5cbiAgICBjb25zdCBidFZlcnRleCA9IG5ldyBBbW1vLmJ0VmVjdG9yMygpO1xuICAgIGNvbnN0IG9yaWdpbmFsSHVsbCA9IG5ldyBBbW1vLmJ0Q29udmV4SHVsbFNoYXBlKCk7XG4gICAgb3JpZ2luYWxIdWxsLnNldE1hcmdpbihvcHRpb25zLm1hcmdpbik7XG4gICAgY2VudGVyLmFkZFZlY3RvcnMoYm91bmRzLm1heCwgYm91bmRzLm1pbikubXVsdGlwbHlTY2FsYXIoMC41KTtcblxuICAgIGxldCB2ZXJ0ZXhDb3VudCA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmVydGV4Q291bnQgKz0gdmVydGljZXNbaV0ubGVuZ3RoIC8gMztcbiAgICB9XG5cbiAgICBjb25zdCBtYXhWZXJ0aWNlcyA9IG9wdGlvbnMuaHVsbE1heFZlcnRpY2VzIHx8IDEwMDAwMDtcbiAgICAvLyB0b2RvOiBtaWdodCB3YW50IHRvIGltcGxlbWVudCB0aGlzIGluIGEgZGV0ZXJtaW5pc3RpYyB3YXkgdGhhdCBkb2Vzbid0IGRvIE8odmVydHMpIGNhbGxzIHRvIE1hdGgucmFuZG9tXG4gICAgaWYgKHZlcnRleENvdW50ID4gbWF4VmVydGljZXMpIHtcbiAgICAgIGNvbnNvbGUud2FybihgdG9vIG1hbnkgdmVydGljZXMgZm9yIGh1bGwgc2hhcGU7IHNhbXBsaW5nIH4ke21heFZlcnRpY2VzfSBmcm9tIH4ke3ZlcnRleENvdW50fSB2ZXJ0aWNlc2ApO1xuICAgIH1cbiAgICBjb25zdCBwID0gTWF0aC5taW4oMSwgbWF4VmVydGljZXMgLyB2ZXJ0ZXhDb3VudCk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjb21wb25lbnRzID0gdmVydGljZXNbaV07XG4gICAgICBtYXRyaXguZnJvbUFycmF5KG1hdHJpY2VzW2ldKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29tcG9uZW50cy5sZW5ndGg7IGogKz0gMykge1xuICAgICAgICBjb25zdCBpc0xhc3RWZXJ0ZXggPSBpID09PSB2ZXJ0aWNlcy5sZW5ndGggLSAxICYmIGogPT09IGNvbXBvbmVudHMubGVuZ3RoIC0gMztcbiAgICAgICAgaWYgKE1hdGgucmFuZG9tKCkgPD0gcCB8fCBpc0xhc3RWZXJ0ZXgpIHtcbiAgICAgICAgICAvLyBhbHdheXMgaW5jbHVkZSB0aGUgbGFzdCB2ZXJ0ZXhcbiAgICAgICAgICB2ZXJ0ZXhcbiAgICAgICAgICAgIC5zZXQoY29tcG9uZW50c1tqXSwgY29tcG9uZW50c1tqICsgMV0sIGNvbXBvbmVudHNbaiArIDJdKVxuICAgICAgICAgICAgLmFwcGx5TWF0cml4NChtYXRyaXgpXG4gICAgICAgICAgICAuc3ViKGNlbnRlcik7XG4gICAgICAgICAgYnRWZXJ0ZXguc2V0VmFsdWUodmVydGV4LngsIHZlcnRleC55LCB2ZXJ0ZXgueik7XG4gICAgICAgICAgb3JpZ2luYWxIdWxsLmFkZFBvaW50KGJ0VmVydGV4LCBpc0xhc3RWZXJ0ZXgpOyAvLyByZWNhbGMgQUFCQiBvbmx5IG9uIGxhc3QgZ2VvbWV0cnlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb2xsaXNpb25TaGFwZSA9IG9yaWdpbmFsSHVsbDtcbiAgICBpZiAob3JpZ2luYWxIdWxsLmdldE51bVZlcnRpY2VzKCkgPj0gMTAwKSB7XG4gICAgICAvL0J1bGxldCBkb2N1bWVudGF0aW9uIHNheXMgZG9uJ3QgdXNlIGNvbnZleEh1bGxzIHdpdGggMTAwIHZlcnRzIG9yIG1vcmVcbiAgICAgIGNvbnN0IHNoYXBlSHVsbCA9IG5ldyBBbW1vLmJ0U2hhcGVIdWxsKG9yaWdpbmFsSHVsbCk7XG4gICAgICBzaGFwZUh1bGwuYnVpbGRIdWxsKG9wdGlvbnMubWFyZ2luKTtcbiAgICAgIEFtbW8uZGVzdHJveShvcmlnaW5hbEh1bGwpO1xuICAgICAgY29sbGlzaW9uU2hhcGUgPSBuZXcgQW1tby5idENvbnZleEh1bGxTaGFwZShcbiAgICAgICAgQW1tby5nZXRQb2ludGVyKHNoYXBlSHVsbC5nZXRWZXJ0ZXhQb2ludGVyKCkpLFxuICAgICAgICBzaGFwZUh1bGwubnVtVmVydGljZXMoKVxuICAgICAgKTtcbiAgICAgIEFtbW8uZGVzdHJveShzaGFwZUh1bGwpOyAvLyBidENvbnZleEh1bGxTaGFwZSBtYWtlcyBhIGNvcHlcbiAgICB9XG5cbiAgICBBbW1vLmRlc3Ryb3koYnRWZXJ0ZXgpO1xuXG4gICAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zLCBfY29tcHV0ZVNjYWxlKG1hdHJpeFdvcmxkLCBvcHRpb25zKSk7XG4gICAgcmV0dXJuIGNvbGxpc2lvblNoYXBlO1xuICB9O1xufSkoKTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUhBQ0RTaGFwZXMgPSAoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IHZlY3RvciA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IGNlbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IG1hdHJpeCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG4gIHJldHVybiBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIGluZGV4ZXMsIG1hdHJpeFdvcmxkLCBvcHRpb25zID0ge30pIHtcbiAgICBvcHRpb25zLnR5cGUgPSBUWVBFLkhBQ0Q7XG4gICAgX3NldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5NQU5VQUwpIHtcbiAgICAgIGNvbnNvbGUud2FybihcImNhbm5vdCB1c2UgZml0OiBtYW51YWwgd2l0aCB0eXBlOiBoYWNkXCIpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIGlmICghQW1tby5oYXNPd25Qcm9wZXJ0eShcIkhBQ0RcIikpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgXCJIQUNEIHVuYXZhaWxhYmxlIGluIGluY2x1ZGVkIGJ1aWxkIG9mIEFtbW8uanMuIFZpc2l0IGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhcmVhbGl0eS9hbW1vLmpzIGZvciB0aGUgbGF0ZXN0IHZlcnNpb24uXCJcbiAgICAgICk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgYm91bmRzID0gX2NvbXB1dGVCb3VuZHModmVydGljZXMsIG1hdHJpY2VzKTtcbiAgICBjb25zdCBzY2FsZSA9IF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpO1xuXG4gICAgbGV0IHZlcnRleENvdW50ID0gMDtcbiAgICBsZXQgdHJpQ291bnQgPSAwO1xuICAgIGNlbnRlci5hZGRWZWN0b3JzKGJvdW5kcy5tYXgsIGJvdW5kcy5taW4pLm11bHRpcGx5U2NhbGFyKDAuNSk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2ZXJ0ZXhDb3VudCArPSB2ZXJ0aWNlc1tpXS5sZW5ndGggLyAzO1xuICAgICAgaWYgKGluZGV4ZXMgJiYgaW5kZXhlc1tpXSkge1xuICAgICAgICB0cmlDb3VudCArPSBpbmRleGVzW2ldLmxlbmd0aCAvIDM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmlDb3VudCArPSB2ZXJ0aWNlc1tpXS5sZW5ndGggLyA5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGhhY2QgPSBuZXcgQW1tby5IQUNEKCk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJjb21wYWNpdHlXZWlnaHRcIikpIGhhY2QuU2V0Q29tcGFjaXR5V2VpZ2h0KG9wdGlvbnMuY29tcGFjaXR5V2VpZ2h0KTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcInZvbHVtZVdlaWdodFwiKSkgaGFjZC5TZXRWb2x1bWVXZWlnaHQob3B0aW9ucy52b2x1bWVXZWlnaHQpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwibkNsdXN0ZXJzXCIpKSBoYWNkLlNldE5DbHVzdGVycyhvcHRpb25zLm5DbHVzdGVycyk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJuVmVydGljZXNQZXJDSFwiKSkgaGFjZC5TZXROVmVydGljZXNQZXJDSChvcHRpb25zLm5WZXJ0aWNlc1BlckNIKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImNvbmNhdml0eVwiKSkgaGFjZC5TZXRDb25jYXZpdHkob3B0aW9ucy5jb25jYXZpdHkpO1xuXG4gICAgY29uc3QgcG9pbnRzID0gQW1tby5fbWFsbG9jKHZlcnRleENvdW50ICogMyAqIDgpO1xuICAgIGNvbnN0IHRyaWFuZ2xlcyA9IEFtbW8uX21hbGxvYyh0cmlDb3VudCAqIDMgKiA0KTtcbiAgICBoYWNkLlNldFBvaW50cyhwb2ludHMpO1xuICAgIGhhY2QuU2V0VHJpYW5nbGVzKHRyaWFuZ2xlcyk7XG4gICAgaGFjZC5TZXROUG9pbnRzKHZlcnRleENvdW50KTtcbiAgICBoYWNkLlNldE5UcmlhbmdsZXModHJpQ291bnQpO1xuXG4gICAgbGV0IHBwdHIgPSBwb2ludHMgLyA4LFxuICAgICAgdHB0ciA9IHRyaWFuZ2xlcyAvIDQ7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjb21wb25lbnRzID0gdmVydGljZXNbaV07XG4gICAgICBtYXRyaXguZnJvbUFycmF5KG1hdHJpY2VzW2ldKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgY29tcG9uZW50cy5sZW5ndGg7IGogKz0gMykge1xuICAgICAgICB2ZWN0b3JcbiAgICAgICAgICAuc2V0KGNvbXBvbmVudHNbaiArIDBdLCBjb21wb25lbnRzW2ogKyAxXSwgY29tcG9uZW50c1tqICsgMl0pXG4gICAgICAgICAgLmFwcGx5TWF0cml4NChtYXRyaXgpXG4gICAgICAgICAgLnN1YihjZW50ZXIpO1xuICAgICAgICBBbW1vLkhFQVBGNjRbcHB0ciArIDBdID0gdmVjdG9yLng7XG4gICAgICAgIEFtbW8uSEVBUEY2NFtwcHRyICsgMV0gPSB2ZWN0b3IueTtcbiAgICAgICAgQW1tby5IRUFQRjY0W3BwdHIgKyAyXSA9IHZlY3Rvci56O1xuICAgICAgICBwcHRyICs9IDM7XG4gICAgICB9XG4gICAgICBpZiAoaW5kZXhlc1tpXSkge1xuICAgICAgICBjb25zdCBpbmRpY2VzID0gaW5kZXhlc1tpXTtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBpbmRpY2VzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgQW1tby5IRUFQMzJbdHB0cl0gPSBpbmRpY2VzW2pdO1xuICAgICAgICAgIHRwdHIrKztcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb21wb25lbnRzLmxlbmd0aCAvIDM7IGorKykge1xuICAgICAgICAgIEFtbW8uSEVBUDMyW3RwdHJdID0gajtcbiAgICAgICAgICB0cHRyKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBoYWNkLkNvbXB1dGUoKTtcbiAgICBBbW1vLl9mcmVlKHBvaW50cyk7XG4gICAgQW1tby5fZnJlZSh0cmlhbmdsZXMpO1xuICAgIGNvbnN0IG5DbHVzdGVycyA9IGhhY2QuR2V0TkNsdXN0ZXJzKCk7XG5cbiAgICBjb25zdCBzaGFwZXMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5DbHVzdGVyczsgaSsrKSB7XG4gICAgICBjb25zdCBodWxsID0gbmV3IEFtbW8uYnRDb252ZXhIdWxsU2hhcGUoKTtcbiAgICAgIGh1bGwuc2V0TWFyZ2luKG9wdGlvbnMubWFyZ2luKTtcbiAgICAgIGNvbnN0IG5Qb2ludHMgPSBoYWNkLkdldE5Qb2ludHNDSChpKTtcbiAgICAgIGNvbnN0IG5UcmlhbmdsZXMgPSBoYWNkLkdldE5UcmlhbmdsZXNDSChpKTtcbiAgICAgIGNvbnN0IGh1bGxQb2ludHMgPSBBbW1vLl9tYWxsb2MoblBvaW50cyAqIDMgKiA4KTtcbiAgICAgIGNvbnN0IGh1bGxUcmlhbmdsZXMgPSBBbW1vLl9tYWxsb2MoblRyaWFuZ2xlcyAqIDMgKiA0KTtcbiAgICAgIGhhY2QuR2V0Q0goaSwgaHVsbFBvaW50cywgaHVsbFRyaWFuZ2xlcyk7XG5cbiAgICAgIGNvbnN0IHBwdHIgPSBodWxsUG9pbnRzIC8gODtcbiAgICAgIGZvciAobGV0IHBpID0gMDsgcGkgPCBuUG9pbnRzOyBwaSsrKSB7XG4gICAgICAgIGNvbnN0IGJ0VmVydGV4ID0gbmV3IEFtbW8uYnRWZWN0b3IzKCk7XG4gICAgICAgIGNvbnN0IHB4ID0gQW1tby5IRUFQRjY0W3BwdHIgKyBwaSAqIDMgKyAwXTtcbiAgICAgICAgY29uc3QgcHkgPSBBbW1vLkhFQVBGNjRbcHB0ciArIHBpICogMyArIDFdO1xuICAgICAgICBjb25zdCBweiA9IEFtbW8uSEVBUEY2NFtwcHRyICsgcGkgKiAzICsgMl07XG4gICAgICAgIGJ0VmVydGV4LnNldFZhbHVlKHB4LCBweSwgcHopO1xuICAgICAgICBodWxsLmFkZFBvaW50KGJ0VmVydGV4LCBwaSA9PT0gblBvaW50cyAtIDEpO1xuICAgICAgICBBbW1vLmRlc3Ryb3koYnRWZXJ0ZXgpO1xuICAgICAgfVxuXG4gICAgICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoaHVsbCwgb3B0aW9ucywgc2NhbGUpO1xuICAgICAgc2hhcGVzLnB1c2goaHVsbCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNoYXBlcztcbiAgfTtcbn0pKCk7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVWSEFDRFNoYXBlcyA9IChmdW5jdGlvbigpIHtcbiAgY29uc3QgdmVjdG9yID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgbWF0cml4ID0gbmV3IFRIUkVFLk1hdHJpeDQoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXRyaWNlcywgaW5kZXhlcywgbWF0cml4V29ybGQsIG9wdGlvbnMgPSB7fSkge1xuICAgIG9wdGlvbnMudHlwZSA9IFRZUEUuVkhBQ0Q7XG4gICAgX3NldE9wdGlvbnMob3B0aW9ucyk7XG5cbiAgICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5NQU5VQUwpIHtcbiAgICAgIGNvbnNvbGUud2FybihcImNhbm5vdCB1c2UgZml0OiBtYW51YWwgd2l0aCB0eXBlOiB2aGFjZFwiKTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICBpZiAoIUFtbW8uaGFzT3duUHJvcGVydHkoXCJWSEFDRFwiKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBcIlZIQUNEIHVuYXZhaWxhYmxlIGluIGluY2x1ZGVkIGJ1aWxkIG9mIEFtbW8uanMuIFZpc2l0IGh0dHBzOi8vZ2l0aHViLmNvbS9tb3ppbGxhcmVhbGl0eS9hbW1vLmpzIGZvciB0aGUgbGF0ZXN0IHZlcnNpb24uXCJcbiAgICAgICk7XG4gICAgICByZXR1cm4gW107XG4gICAgfVxuXG4gICAgY29uc3QgYm91bmRzID0gX2NvbXB1dGVCb3VuZHModmVydGljZXMsIG1hdHJpY2VzKTtcbiAgICBjb25zdCBzY2FsZSA9IF9jb21wdXRlU2NhbGUobWF0cml4V29ybGQsIG9wdGlvbnMpO1xuXG4gICAgbGV0IHZlcnRleENvdW50ID0gMDtcbiAgICBsZXQgdHJpQ291bnQgPSAwO1xuICAgIGNlbnRlci5hZGRWZWN0b3JzKGJvdW5kcy5tYXgsIGJvdW5kcy5taW4pLm11bHRpcGx5U2NhbGFyKDAuNSk7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2ZXJ0ZXhDb3VudCArPSB2ZXJ0aWNlc1tpXS5sZW5ndGggLyAzO1xuICAgICAgaWYgKGluZGV4ZXMgJiYgaW5kZXhlc1tpXSkge1xuICAgICAgICB0cmlDb3VudCArPSBpbmRleGVzW2ldLmxlbmd0aCAvIDM7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0cmlDb3VudCArPSB2ZXJ0aWNlc1tpXS5sZW5ndGggLyA5O1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHZoYWNkID0gbmV3IEFtbW8uVkhBQ0QoKTtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgQW1tby5QYXJhbWV0ZXJzKCk7XG4gICAgLy9odHRwczovL2ttYW1vdS5ibG9nc3BvdC5jb20vMjAxNC8xMi92LWhhY2QtMjAtcGFyYW1ldGVycy1kZXNjcmlwdGlvbi5odG1sXG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJyZXNvbHV0aW9uXCIpKSBwYXJhbXMuc2V0X21fcmVzb2x1dGlvbihvcHRpb25zLnJlc29sdXRpb24pO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiZGVwdGhcIikpIHBhcmFtcy5zZXRfbV9kZXB0aChvcHRpb25zLmRlcHRoKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImNvbmNhdml0eVwiKSkgcGFyYW1zLnNldF9tX2NvbmNhdml0eShvcHRpb25zLmNvbmNhdml0eSk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJwbGFuZURvd25zYW1wbGluZ1wiKSkgcGFyYW1zLnNldF9tX3BsYW5lRG93bnNhbXBsaW5nKG9wdGlvbnMucGxhbmVEb3duc2FtcGxpbmcpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiY29udmV4aHVsbERvd25zYW1wbGluZ1wiKSlcbiAgICAgIHBhcmFtcy5zZXRfbV9jb252ZXhodWxsRG93bnNhbXBsaW5nKG9wdGlvbnMuY29udmV4aHVsbERvd25zYW1wbGluZyk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJhbHBoYVwiKSkgcGFyYW1zLnNldF9tX2FscGhhKG9wdGlvbnMuYWxwaGEpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiYmV0YVwiKSkgcGFyYW1zLnNldF9tX2JldGEob3B0aW9ucy5iZXRhKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImdhbW1hXCIpKSBwYXJhbXMuc2V0X21fZ2FtbWEob3B0aW9ucy5nYW1tYSk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJwY2FcIikpIHBhcmFtcy5zZXRfbV9wY2Eob3B0aW9ucy5wY2EpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwibW9kZVwiKSkgcGFyYW1zLnNldF9tX21vZGUob3B0aW9ucy5tb2RlKTtcbiAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcIm1heE51bVZlcnRpY2VzUGVyQ0hcIikpIHBhcmFtcy5zZXRfbV9tYXhOdW1WZXJ0aWNlc1BlckNIKG9wdGlvbnMubWF4TnVtVmVydGljZXNQZXJDSCk7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJtaW5Wb2x1bWVQZXJDSFwiKSkgcGFyYW1zLnNldF9tX21pblZvbHVtZVBlckNIKG9wdGlvbnMubWluVm9sdW1lUGVyQ0gpO1xuICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KFwiY29udmV4aHVsbEFwcHJveGltYXRpb25cIikpXG4gICAgICBwYXJhbXMuc2V0X21fY29udmV4aHVsbEFwcHJveGltYXRpb24ob3B0aW9ucy5jb252ZXhodWxsQXBwcm94aW1hdGlvbik7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJvY2xBY2NlbGVyYXRpb25cIikpIHBhcmFtcy5zZXRfbV9vY2xBY2NlbGVyYXRpb24ob3B0aW9ucy5vY2xBY2NlbGVyYXRpb24pO1xuXG4gICAgY29uc3QgcG9pbnRzID0gQW1tby5fbWFsbG9jKHZlcnRleENvdW50ICogMyAqIDggKyAzKTtcbiAgICBjb25zdCB0cmlhbmdsZXMgPSBBbW1vLl9tYWxsb2ModHJpQ291bnQgKiAzICogNCk7XG5cbiAgICBsZXQgcHB0ciA9IHBvaW50cyAvIDgsXG4gICAgICB0cHRyID0gdHJpYW5nbGVzIC8gNDtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdmVydGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGNvbXBvbmVudHMgPSB2ZXJ0aWNlc1tpXTtcbiAgICAgIG1hdHJpeC5mcm9tQXJyYXkobWF0cmljZXNbaV0pO1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb21wb25lbnRzLmxlbmd0aDsgaiArPSAzKSB7XG4gICAgICAgIHZlY3RvclxuICAgICAgICAgIC5zZXQoY29tcG9uZW50c1tqICsgMF0sIGNvbXBvbmVudHNbaiArIDFdLCBjb21wb25lbnRzW2ogKyAyXSlcbiAgICAgICAgICAuYXBwbHlNYXRyaXg0KG1hdHJpeClcbiAgICAgICAgICAuc3ViKGNlbnRlcik7XG4gICAgICAgIEFtbW8uSEVBUEY2NFtwcHRyICsgMF0gPSB2ZWN0b3IueDtcbiAgICAgICAgQW1tby5IRUFQRjY0W3BwdHIgKyAxXSA9IHZlY3Rvci55O1xuICAgICAgICBBbW1vLkhFQVBGNjRbcHB0ciArIDJdID0gdmVjdG9yLno7XG4gICAgICAgIHBwdHIgKz0gMztcbiAgICAgIH1cbiAgICAgIGlmIChpbmRleGVzW2ldKSB7XG4gICAgICAgIGNvbnN0IGluZGljZXMgPSBpbmRleGVzW2ldO1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGluZGljZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICBBbW1vLkhFQVAzMlt0cHRyXSA9IGluZGljZXNbal07XG4gICAgICAgICAgdHB0cisrO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNvbXBvbmVudHMubGVuZ3RoIC8gMzsgaisrKSB7XG4gICAgICAgICAgQW1tby5IRUFQMzJbdHB0cl0gPSBqO1xuICAgICAgICAgIHRwdHIrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2aGFjZC5Db21wdXRlKHBvaW50cywgMywgdmVydGV4Q291bnQsIHRyaWFuZ2xlcywgMywgdHJpQ291bnQsIHBhcmFtcyk7XG4gICAgQW1tby5fZnJlZShwb2ludHMpO1xuICAgIEFtbW8uX2ZyZWUodHJpYW5nbGVzKTtcbiAgICBjb25zdCBuSHVsbHMgPSB2aGFjZC5HZXROQ29udmV4SHVsbHMoKTtcblxuICAgIGNvbnN0IHNoYXBlcyA9IFtdO1xuICAgIGNvbnN0IGNoID0gbmV3IEFtbW8uQ29udmV4SHVsbCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbkh1bGxzOyBpKyspIHtcbiAgICAgIHZoYWNkLkdldENvbnZleEh1bGwoaSwgY2gpO1xuICAgICAgY29uc3QgblBvaW50cyA9IGNoLmdldF9tX25Qb2ludHMoKTtcbiAgICAgIGNvbnN0IGh1bGxQb2ludHMgPSBjaC5nZXRfbV9wb2ludHMoKTtcblxuICAgICAgY29uc3QgaHVsbCA9IG5ldyBBbW1vLmJ0Q29udmV4SHVsbFNoYXBlKCk7XG4gICAgICBodWxsLnNldE1hcmdpbihvcHRpb25zLm1hcmdpbik7XG5cbiAgICAgIGZvciAobGV0IHBpID0gMDsgcGkgPCBuUG9pbnRzOyBwaSsrKSB7XG4gICAgICAgIGNvbnN0IGJ0VmVydGV4ID0gbmV3IEFtbW8uYnRWZWN0b3IzKCk7XG4gICAgICAgIGNvbnN0IHB4ID0gY2guZ2V0X21fcG9pbnRzKHBpICogMyArIDApO1xuICAgICAgICBjb25zdCBweSA9IGNoLmdldF9tX3BvaW50cyhwaSAqIDMgKyAxKTtcbiAgICAgICAgY29uc3QgcHogPSBjaC5nZXRfbV9wb2ludHMocGkgKiAzICsgMik7XG4gICAgICAgIGJ0VmVydGV4LnNldFZhbHVlKHB4LCBweSwgcHopO1xuICAgICAgICBodWxsLmFkZFBvaW50KGJ0VmVydGV4LCBwaSA9PT0gblBvaW50cyAtIDEpO1xuICAgICAgICBBbW1vLmRlc3Ryb3koYnRWZXJ0ZXgpO1xuICAgICAgfVxuXG4gICAgICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoaHVsbCwgb3B0aW9ucywgc2NhbGUpO1xuICAgICAgc2hhcGVzLnB1c2goaHVsbCk7XG4gICAgfVxuICAgIEFtbW8uZGVzdHJveShjaCk7XG4gICAgQW1tby5kZXN0cm95KHZoYWNkKTtcblxuICAgIHJldHVybiBzaGFwZXM7XG4gIH07XG59KSgpO1xuXG5leHBvcnQgY29uc3QgY3JlYXRlVHJpTWVzaFNoYXBlID0gKGZ1bmN0aW9uKCkge1xuICBjb25zdCB2YSA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IHZiID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgY29uc3QgdmMgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICBjb25zdCBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICByZXR1cm4gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzLCBpbmRleGVzLCBtYXRyaXhXb3JsZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgb3B0aW9ucy50eXBlID0gVFlQRS5NRVNIO1xuICAgIF9zZXRPcHRpb25zKG9wdGlvbnMpO1xuXG4gICAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuTUFOVUFMKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJjYW5ub3QgdXNlIGZpdDogbWFudWFsIHdpdGggdHlwZTogbWVzaFwiKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IHNjYWxlID0gX2NvbXB1dGVTY2FsZShtYXRyaXhXb3JsZCwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCBidGEgPSBuZXcgQW1tby5idFZlY3RvcjMoKTtcbiAgICBjb25zdCBidGIgPSBuZXcgQW1tby5idFZlY3RvcjMoKTtcbiAgICBjb25zdCBidGMgPSBuZXcgQW1tby5idFZlY3RvcjMoKTtcbiAgICBjb25zdCB0cmlNZXNoID0gbmV3IEFtbW8uYnRUcmlhbmdsZU1lc2godHJ1ZSwgZmFsc2UpO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgY29tcG9uZW50cyA9IHZlcnRpY2VzW2ldO1xuICAgICAgY29uc3QgaW5kZXggPSBpbmRleGVzW2ldID8gaW5kZXhlc1tpXSA6IG51bGw7XG4gICAgICBtYXRyaXguZnJvbUFycmF5KG1hdHJpY2VzW2ldKTtcbiAgICAgIGlmIChpbmRleCkge1xuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGluZGV4Lmxlbmd0aDsgaiArPSAzKSB7XG4gICAgICAgICAgY29uc3QgYWkgPSBpbmRleFtqXSAqIDM7XG4gICAgICAgICAgY29uc3QgYmkgPSBpbmRleFtqICsgMV0gKiAzO1xuICAgICAgICAgIGNvbnN0IGNpID0gaW5kZXhbaiArIDJdICogMztcbiAgICAgICAgICB2YS5zZXQoY29tcG9uZW50c1thaV0sIGNvbXBvbmVudHNbYWkgKyAxXSwgY29tcG9uZW50c1thaSArIDJdKS5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgICAgICAgICB2Yi5zZXQoY29tcG9uZW50c1tiaV0sIGNvbXBvbmVudHNbYmkgKyAxXSwgY29tcG9uZW50c1tiaSArIDJdKS5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgICAgICAgICB2Yy5zZXQoY29tcG9uZW50c1tjaV0sIGNvbXBvbmVudHNbY2kgKyAxXSwgY29tcG9uZW50c1tjaSArIDJdKS5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgICAgICAgICBidGEuc2V0VmFsdWUodmEueCwgdmEueSwgdmEueik7XG4gICAgICAgICAgYnRiLnNldFZhbHVlKHZiLngsIHZiLnksIHZiLnopO1xuICAgICAgICAgIGJ0Yy5zZXRWYWx1ZSh2Yy54LCB2Yy55LCB2Yy56KTtcbiAgICAgICAgICB0cmlNZXNoLmFkZFRyaWFuZ2xlKGJ0YSwgYnRiLCBidGMsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb21wb25lbnRzLmxlbmd0aDsgaiArPSA5KSB7XG4gICAgICAgICAgdmEuc2V0KGNvbXBvbmVudHNbaiArIDBdLCBjb21wb25lbnRzW2ogKyAxXSwgY29tcG9uZW50c1tqICsgMl0pLmFwcGx5TWF0cml4NChtYXRyaXgpO1xuICAgICAgICAgIHZiLnNldChjb21wb25lbnRzW2ogKyAzXSwgY29tcG9uZW50c1tqICsgNF0sIGNvbXBvbmVudHNbaiArIDVdKS5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgICAgICAgICB2Yy5zZXQoY29tcG9uZW50c1tqICsgNl0sIGNvbXBvbmVudHNbaiArIDddLCBjb21wb25lbnRzW2ogKyA4XSkuYXBwbHlNYXRyaXg0KG1hdHJpeCk7XG4gICAgICAgICAgYnRhLnNldFZhbHVlKHZhLngsIHZhLnksIHZhLnopO1xuICAgICAgICAgIGJ0Yi5zZXRWYWx1ZSh2Yi54LCB2Yi55LCB2Yi56KTtcbiAgICAgICAgICBidGMuc2V0VmFsdWUodmMueCwgdmMueSwgdmMueik7XG4gICAgICAgICAgdHJpTWVzaC5hZGRUcmlhbmdsZShidGEsIGJ0YiwgYnRjLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBsb2NhbFNjYWxlID0gbmV3IEFtbW8uYnRWZWN0b3IzKHNjYWxlLngsIHNjYWxlLnksIHNjYWxlLnopO1xuICAgIHRyaU1lc2guc2V0U2NhbGluZyhsb2NhbFNjYWxlKTtcbiAgICBBbW1vLmRlc3Ryb3kobG9jYWxTY2FsZSk7XG5cbiAgICBjb25zdCBjb2xsaXNpb25TaGFwZSA9IG5ldyBBbW1vLmJ0QnZoVHJpYW5nbGVNZXNoU2hhcGUodHJpTWVzaCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgY29sbGlzaW9uU2hhcGUucmVzb3VyY2VzID0gW3RyaU1lc2hdO1xuXG4gICAgQW1tby5kZXN0cm95KGJ0YSk7XG4gICAgQW1tby5kZXN0cm95KGJ0Yik7XG4gICAgQW1tby5kZXN0cm95KGJ0Yyk7XG5cbiAgICBfZmluaXNoQ29sbGlzaW9uU2hhcGUoY29sbGlzaW9uU2hhcGUsIG9wdGlvbnMpO1xuICAgIHJldHVybiBjb2xsaXNpb25TaGFwZTtcbiAgfTtcbn0pKCk7XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVIZWlnaHRmaWVsZFRlcnJhaW5TaGFwZSA9IGZ1bmN0aW9uKG9wdGlvbnMgPSB7fSkge1xuICBfc2V0T3B0aW9ucyhvcHRpb25zKTtcblxuICBpZiAob3B0aW9ucy5maXQgPT09IEZJVC5BTEwpIHtcbiAgICBjb25zb2xlLndhcm4oXCJjYW5ub3QgdXNlIGZpdDogYWxsIHdpdGggdHlwZTogaGVpZ2h0ZmllbGRcIik7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgY29uc3QgaGVpZ2h0ZmllbGREaXN0YW5jZSA9IG9wdGlvbnMuaGVpZ2h0ZmllbGREaXN0YW5jZSB8fCAxO1xuICBjb25zdCBoZWlnaHRmaWVsZERhdGEgPSBvcHRpb25zLmhlaWdodGZpZWxkRGF0YSB8fCBbXTtcbiAgY29uc3QgaGVpZ2h0U2NhbGUgPSBvcHRpb25zLmhlaWdodFNjYWxlIHx8IDA7XG4gIGNvbnN0IHVwQXhpcyA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJ1cEF4aXNcIikgPyBvcHRpb25zLnVwQXhpcyA6IDE7IC8vIHggPSAwOyB5ID0gMTsgeiA9IDJcbiAgY29uc3QgaGR0ID0gKCgpID0+IHtcbiAgICBzd2l0Y2ggKG9wdGlvbnMuaGVpZ2h0RGF0YVR5cGUpIHtcbiAgICAgIGNhc2UgXCJzaG9ydFwiOlxuICAgICAgICByZXR1cm4gQW1tby5QSFlfU0hPUlQ7XG4gICAgICBjYXNlIFwiZmxvYXRcIjpcbiAgICAgICAgcmV0dXJuIEFtbW8uUEhZX0ZMT0FUO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIEFtbW8uUEhZX0ZMT0FUO1xuICAgIH1cbiAgfSkoKTtcbiAgY29uc3QgZmxpcFF1YWRFZGdlcyA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJmbGlwUXVhZEVkZ2VzXCIpID8gb3B0aW9ucy5mbGlwUXVhZEVkZ2VzIDogdHJ1ZTtcblxuICBjb25zdCBoZWlnaHRTdGlja0xlbmd0aCA9IGhlaWdodGZpZWxkRGF0YS5sZW5ndGg7XG4gIGNvbnN0IGhlaWdodFN0aWNrV2lkdGggPSBoZWlnaHRTdGlja0xlbmd0aCA+IDAgPyBoZWlnaHRmaWVsZERhdGFbMF0ubGVuZ3RoIDogMDtcblxuICBjb25zdCBkYXRhID0gQW1tby5fbWFsbG9jKGhlaWdodFN0aWNrTGVuZ3RoICogaGVpZ2h0U3RpY2tXaWR0aCAqIDQpO1xuICBjb25zdCBwdHIgPSBkYXRhIC8gNDtcblxuICBsZXQgbWluSGVpZ2h0ID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuICBsZXQgbWF4SGVpZ2h0ID0gTnVtYmVyLk5FR0FUSVZFX0lORklOSVRZO1xuICBsZXQgaW5kZXggPSAwO1xuICBmb3IgKGxldCBsID0gMDsgbCA8IGhlaWdodFN0aWNrTGVuZ3RoOyBsKyspIHtcbiAgICBmb3IgKGxldCB3ID0gMDsgdyA8IGhlaWdodFN0aWNrV2lkdGg7IHcrKykge1xuICAgICAgY29uc3QgaGVpZ2h0ID0gaGVpZ2h0ZmllbGREYXRhW2xdW3ddO1xuICAgICAgQW1tby5IRUFQRjMyW3B0ciArIGluZGV4XSA9IGhlaWdodDtcbiAgICAgIGluZGV4Kys7XG4gICAgICBtaW5IZWlnaHQgPSBNYXRoLm1pbihtaW5IZWlnaHQsIGhlaWdodCk7XG4gICAgICBtYXhIZWlnaHQgPSBNYXRoLm1heChtYXhIZWlnaHQsIGhlaWdodCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY29sbGlzaW9uU2hhcGUgPSBuZXcgQW1tby5idEhlaWdodGZpZWxkVGVycmFpblNoYXBlKFxuICAgIGhlaWdodFN0aWNrV2lkdGgsXG4gICAgaGVpZ2h0U3RpY2tMZW5ndGgsXG4gICAgZGF0YSxcbiAgICBoZWlnaHRTY2FsZSxcbiAgICBtaW5IZWlnaHQsXG4gICAgbWF4SGVpZ2h0LFxuICAgIHVwQXhpcyxcbiAgICBoZHQsXG4gICAgZmxpcFF1YWRFZGdlc1xuICApO1xuXG4gIGNvbnN0IHNjYWxlID0gbmV3IEFtbW8uYnRWZWN0b3IzKGhlaWdodGZpZWxkRGlzdGFuY2UsIDEsIGhlaWdodGZpZWxkRGlzdGFuY2UpO1xuICBjb2xsaXNpb25TaGFwZS5zZXRMb2NhbFNjYWxpbmcoc2NhbGUpO1xuICBBbW1vLmRlc3Ryb3koc2NhbGUpO1xuXG4gIGNvbGxpc2lvblNoYXBlLmhlaWdodGZpZWxkRGF0YSA9IGRhdGE7XG5cbiAgX2ZpbmlzaENvbGxpc2lvblNoYXBlKGNvbGxpc2lvblNoYXBlLCBvcHRpb25zKTtcbiAgcmV0dXJuIGNvbGxpc2lvblNoYXBlO1xufTtcblxuZnVuY3Rpb24gX3NldE9wdGlvbnMob3B0aW9ucykge1xuICBvcHRpb25zLmZpdCA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJmaXRcIikgPyBvcHRpb25zLmZpdCA6IEZJVC5BTEw7XG4gIG9wdGlvbnMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCBUWVBFLkhVTEw7XG4gIG9wdGlvbnMubWluSGFsZkV4dGVudCA9IG9wdGlvbnMuaGFzT3duUHJvcGVydHkoXCJtaW5IYWxmRXh0ZW50XCIpID8gb3B0aW9ucy5taW5IYWxmRXh0ZW50IDogMDtcbiAgb3B0aW9ucy5tYXhIYWxmRXh0ZW50ID0gb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcIm1heEhhbGZFeHRlbnRcIikgPyBvcHRpb25zLm1heEhhbGZFeHRlbnQgOiBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gIG9wdGlvbnMuY3lsaW5kZXJBeGlzID0gb3B0aW9ucy5jeWxpbmRlckF4aXMgfHwgXCJ5XCI7XG4gIG9wdGlvbnMubWFyZ2luID0gb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcIm1hcmdpblwiKSA/IG9wdGlvbnMubWFyZ2luIDogMC4wMTtcbiAgb3B0aW9ucy5pbmNsdWRlSW52aXNpYmxlID0gb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShcImluY2x1ZGVJbnZpc2libGVcIikgPyBvcHRpb25zLmluY2x1ZGVJbnZpc2libGUgOiBmYWxzZTtcblxuICBpZiAoIW9wdGlvbnMub2Zmc2V0KSB7XG4gICAgb3B0aW9ucy5vZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zLm9yaWVudGF0aW9uKSB7XG4gICAgb3B0aW9ucy5vcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gIH1cbn1cblxuY29uc3QgX2ZpbmlzaENvbGxpc2lvblNoYXBlID0gZnVuY3Rpb24oY29sbGlzaW9uU2hhcGUsIG9wdGlvbnMsIHNjYWxlKSB7XG4gIGNvbGxpc2lvblNoYXBlLnR5cGUgPSBvcHRpb25zLnR5cGU7XG4gIGNvbGxpc2lvblNoYXBlLnNldE1hcmdpbihvcHRpb25zLm1hcmdpbik7XG4gIGNvbGxpc2lvblNoYXBlLmRlc3Ryb3kgPSAoKSA9PiB7XG4gICAgZm9yIChsZXQgcmVzIG9mIGNvbGxpc2lvblNoYXBlLnJlc291cmNlcyB8fCBbXSkge1xuICAgICAgQW1tby5kZXN0cm95KHJlcyk7XG4gICAgfVxuICAgIGlmIChjb2xsaXNpb25TaGFwZS5oZWlnaHRmaWVsZERhdGEpIHtcbiAgICAgIEFtbW8uX2ZyZWUoY29sbGlzaW9uU2hhcGUuaGVpZ2h0ZmllbGREYXRhKTtcbiAgICB9XG4gICAgQW1tby5kZXN0cm95KGNvbGxpc2lvblNoYXBlKTtcbiAgfTtcblxuICBjb25zdCBsb2NhbFRyYW5zZm9ybSA9IG5ldyBBbW1vLmJ0VHJhbnNmb3JtKCk7XG4gIGNvbnN0IHJvdGF0aW9uID0gbmV3IEFtbW8uYnRRdWF0ZXJuaW9uKCk7XG4gIGxvY2FsVHJhbnNmb3JtLnNldElkZW50aXR5KCk7XG5cbiAgbG9jYWxUcmFuc2Zvcm0uZ2V0T3JpZ2luKCkuc2V0VmFsdWUob3B0aW9ucy5vZmZzZXQueCwgb3B0aW9ucy5vZmZzZXQueSwgb3B0aW9ucy5vZmZzZXQueik7XG4gIHJvdGF0aW9uLnNldFZhbHVlKG9wdGlvbnMub3JpZW50YXRpb24ueCwgb3B0aW9ucy5vcmllbnRhdGlvbi55LCBvcHRpb25zLm9yaWVudGF0aW9uLnosIG9wdGlvbnMub3JpZW50YXRpb24udyk7XG5cbiAgbG9jYWxUcmFuc2Zvcm0uc2V0Um90YXRpb24ocm90YXRpb24pO1xuICBBbW1vLmRlc3Ryb3kocm90YXRpb24pO1xuXG4gIGlmIChzY2FsZSkge1xuICAgIGNvbnN0IGxvY2FsU2NhbGUgPSBuZXcgQW1tby5idFZlY3RvcjMoc2NhbGUueCwgc2NhbGUueSwgc2NhbGUueik7XG4gICAgY29sbGlzaW9uU2hhcGUuc2V0TG9jYWxTY2FsaW5nKGxvY2FsU2NhbGUpO1xuICAgIEFtbW8uZGVzdHJveShsb2NhbFNjYWxlKTtcbiAgfVxuXG4gIGNvbGxpc2lvblNoYXBlLmxvY2FsVHJhbnNmb3JtID0gbG9jYWxUcmFuc2Zvcm07XG59O1xuXG5leHBvcnQgY29uc3QgaXRlcmF0ZUdlb21ldHJpZXMgPSAoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGludmVyc2UgPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICBjb25zdCB2ZXJ0aWNlcyA9IFtdO1xuICByZXR1cm4gZnVuY3Rpb24ocm9vdCwgb3B0aW9ucywgY2IpIHtcbiAgICBpbnZlcnNlLmNvcHkocm9vdC5tYXRyaXhXb3JsZCkuaW52ZXJ0KCk7XG4gICAgcm9vdC50cmF2ZXJzZShtZXNoID0+IHtcbiAgICAgIGNvbnN0IHRyYW5zZm9ybSA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG4gICAgICBpZiAoXG4gICAgICAgIG1lc2guaXNNZXNoICYmXG4gICAgICAgIG1lc2gubmFtZSAhPT0gXCJTa3lcIiAmJlxuICAgICAgICAob3B0aW9ucy5pbmNsdWRlSW52aXNpYmxlIHx8IChtZXNoLmVsICYmIG1lc2guZWwub2JqZWN0M0QudmlzaWJsZSkgfHwgbWVzaC52aXNpYmxlKVxuICAgICAgKSB7XG4gICAgICAgIGlmIChtZXNoID09PSByb290KSB7XG4gICAgICAgICAgdHJhbnNmb3JtLmlkZW50aXR5KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbWVzaC51cGRhdGVXb3JsZE1hdHJpeCh0cnVlKTtcbiAgICAgICAgICB0cmFuc2Zvcm0ubXVsdGlwbHlNYXRyaWNlcyhpbnZlcnNlLCBtZXNoLm1hdHJpeFdvcmxkKTtcbiAgICAgICAgfVxuICAgICAgICAvLyB0b2RvOiBtaWdodCB3YW50IHRvIHJldHVybiBudWxsIHhmb3JtIGlmIHRoaXMgaXMgdGhlIHJvb3Qgc28gdGhhdCBjYWxsZXJzIGNhbiBhdm9pZCBtdWx0aXBseWluZ1xuICAgICAgICAvLyB0aGluZ3MgYnkgdGhlIGlkZW50aXR5IG1hdHJpeFxuXG4gICAgICAgIGxldCB1bkludGVybGVhdmVkVmVydGljZXM7XG4gICAgICAgIGlmIChtZXNoLmdlb21ldHJ5LmlzQnVmZmVyR2VvbWV0cnkpIHtcbiAgICAgICAgICBjb25zdCB2ZXJ0aWNlc0F0dHJpYnV0ZSA9IG1lc2guZ2VvbWV0cnkuYXR0cmlidXRlcy5wb3NpdGlvbjtcbiAgICAgICAgICBpZiAodmVydGljZXNBdHRyaWJ1dGUuaXNJbnRlcmxlYXZlZEJ1ZmZlckF0dHJpYnV0ZSkge1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIEFuIGludGVybGVhdmVkIGJ1ZmZlciBhdHRyaWJ1dGUgc2hhcmVzIHRoZSB1bmRlcmx5aW5nXG4gICAgICAgICAgICAvLyBhcnJheSB3aXRoIG90aGVyIGF0dHJpYnV0ZXMuIFdlIHRyYW5zbGF0ZSBpdCB0byBhXG4gICAgICAgICAgICAvLyByZWd1bGFyIGFycmF5IGhlcmUgdG8gbm90IGNhcnJ5IHRoaXMgbG9naWMgYXJvdW5kIGluXG4gICAgICAgICAgICAvLyB0aGUgc2hhcGUgYXBpLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHZlcnRpY2VzLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHZlcnRpY2VzQXR0cmlidXRlLmNvdW50OyBpICs9IDMpIHtcbiAgICAgICAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0aWNlc0F0dHJpYnV0ZS5nZXRYKGkpKTtcbiAgICAgICAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0aWNlc0F0dHJpYnV0ZS5nZXRZKGkpKTtcbiAgICAgICAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0aWNlc0F0dHJpYnV0ZS5nZXRaKGkpKTtcbiAgICAgICAgICAgIH1cblx0ICAgIHVuSW50ZXJsZWF2ZWRWZXJ0aWNlcyA9IHZlcnRpY2VzO1xuICAgICAgICAgIH0gZWxzZSB7XG5cdCAgICB1bkludGVybGVhdmVkVmVydGljZXMgPSB2ZXJ0aWNlc0F0dHJpYnV0ZS5hcnJheTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdW5JbnRlcmxlYXZlZFZlcnRpY2VzID0gbWVzaC5nZW9tZXRyeS52ZXJ0aWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIGNiKFxuICAgICAgICAgIHVuSW50ZXJsZWF2ZWRWZXJ0aWNlcyxcbiAgICAgICAgICB0cmFuc2Zvcm0uZWxlbWVudHMsXG4gICAgICAgICAgbWVzaC5nZW9tZXRyeS5pbmRleCA/IG1lc2guZ2VvbWV0cnkuaW5kZXguYXJyYXkgOiBudWxsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59KSgpO1xuXG5jb25zdCBfY29tcHV0ZVNjYWxlID0gKGZ1bmN0aW9uKCkge1xuICBjb25zdCBtYXRyaXggPSBuZXcgVEhSRUUuTWF0cml4NCgpO1xuICByZXR1cm4gZnVuY3Rpb24obWF0cml4V29ybGQsIG9wdGlvbnMgPSB7fSkge1xuICAgIGNvbnN0IHNjYWxlID0gbmV3IFRIUkVFLlZlY3RvcjMoMSwgMSwgMSk7XG4gICAgaWYgKG9wdGlvbnMuZml0ID09PSBGSVQuQUxMKSB7XG4gICAgICBtYXRyaXguZnJvbUFycmF5KG1hdHJpeFdvcmxkKTtcbiAgICAgIHNjYWxlLnNldEZyb21NYXRyaXhTY2FsZShtYXRyaXgpO1xuICAgIH1cbiAgICByZXR1cm4gc2NhbGU7XG4gIH07XG59KSgpO1xuXG5jb25zdCBfY29tcHV0ZVJhZGl1cyA9IChmdW5jdGlvbigpIHtcbiAgY29uc3QgY2VudGVyID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZlcnRpY2VzLCBtYXRyaWNlcywgYm91bmRzKSB7XG4gICAgbGV0IG1heFJhZGl1c1NxID0gMDtcbiAgICBsZXQgeyB4OiBjeCwgeTogY3ksIHo6IGN6IH0gPSBib3VuZHMuZ2V0Q2VudGVyKGNlbnRlcik7XG5cbiAgICBfaXRlcmF0ZVZlcnRpY2VzKHZlcnRpY2VzLCBtYXRyaWNlcywgdiA9PiB7XG4gICAgICBjb25zdCBkeCA9IGN4IC0gdi54O1xuICAgICAgY29uc3QgZHkgPSBjeSAtIHYueTtcbiAgICAgIGNvbnN0IGR6ID0gY3ogLSB2Lno7XG4gICAgICBtYXhSYWRpdXNTcSA9IE1hdGgubWF4KG1heFJhZGl1c1NxLCBkeCAqIGR4ICsgZHkgKiBkeSArIGR6ICogZHopO1xuICAgIH0pO1xuICAgIHJldHVybiBNYXRoLnNxcnQobWF4UmFkaXVzU3EpO1xuICB9O1xufSkoKTtcblxuY29uc3QgX2NvbXB1dGVIYWxmRXh0ZW50cyA9IGZ1bmN0aW9uKGJvdW5kcywgbWluSGFsZkV4dGVudCwgbWF4SGFsZkV4dGVudCkge1xuICBjb25zdCBoYWxmRXh0ZW50cyA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIHJldHVybiBoYWxmRXh0ZW50c1xuICAgIC5zdWJWZWN0b3JzKGJvdW5kcy5tYXgsIGJvdW5kcy5taW4pXG4gICAgLm11bHRpcGx5U2NhbGFyKDAuNSlcbiAgICAuY2xhbXBTY2FsYXIobWluSGFsZkV4dGVudCwgbWF4SGFsZkV4dGVudCk7XG59O1xuXG5jb25zdCBfY29tcHV0ZUxvY2FsT2Zmc2V0ID0gZnVuY3Rpb24obWF0cml4LCBib3VuZHMsIHRhcmdldCkge1xuICB0YXJnZXRcbiAgICAuYWRkVmVjdG9ycyhib3VuZHMubWF4LCBib3VuZHMubWluKVxuICAgIC5tdWx0aXBseVNjYWxhcigwLjUpXG4gICAgLmFwcGx5TWF0cml4NChtYXRyaXgpO1xuICByZXR1cm4gdGFyZ2V0O1xufTtcblxuLy8gcmV0dXJucyB0aGUgYm91bmRpbmcgYm94IGZvciB0aGUgZ2VvbWV0cmllcyB1bmRlcm5lYXRoIGByb290YC5cbmNvbnN0IF9jb21wdXRlQm91bmRzID0gZnVuY3Rpb24odmVydGljZXMsIG1hdHJpY2VzKSB7XG4gIGNvbnN0IGJvdW5kcyA9IG5ldyBUSFJFRS5Cb3gzKCk7XG4gIGxldCBtaW5YID0gK0luZmluaXR5O1xuICBsZXQgbWluWSA9ICtJbmZpbml0eTtcbiAgbGV0IG1pblogPSArSW5maW5pdHk7XG4gIGxldCBtYXhYID0gLUluZmluaXR5O1xuICBsZXQgbWF4WSA9IC1JbmZpbml0eTtcbiAgbGV0IG1heFogPSAtSW5maW5pdHk7XG4gIGJvdW5kcy5taW4uc2V0KDAsIDAsIDApO1xuICBib3VuZHMubWF4LnNldCgwLCAwLCAwKTtcblxuICBfaXRlcmF0ZVZlcnRpY2VzKHZlcnRpY2VzLCBtYXRyaWNlcywgdiA9PiB7XG4gICAgaWYgKHYueCA8IG1pblgpIG1pblggPSB2Lng7XG4gICAgaWYgKHYueSA8IG1pblkpIG1pblkgPSB2Lnk7XG4gICAgaWYgKHYueiA8IG1pblopIG1pblogPSB2Lno7XG4gICAgaWYgKHYueCA+IG1heFgpIG1heFggPSB2Lng7XG4gICAgaWYgKHYueSA+IG1heFkpIG1heFkgPSB2Lnk7XG4gICAgaWYgKHYueiA+IG1heFopIG1heFogPSB2Lno7XG4gIH0pO1xuXG4gIGJvdW5kcy5taW4uc2V0KG1pblgsIG1pblksIG1pblopO1xuICBib3VuZHMubWF4LnNldChtYXhYLCBtYXhZLCBtYXhaKTtcbiAgcmV0dXJuIGJvdW5kcztcbn07XG5cbmNvbnN0IF9pdGVyYXRlVmVydGljZXMgPSAoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IHZlcnRleCA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gIGNvbnN0IG1hdHJpeCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG4gIHJldHVybiBmdW5jdGlvbih2ZXJ0aWNlcywgbWF0cmljZXMsIGNiKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZXJ0aWNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgbWF0cml4LmZyb21BcnJheShtYXRyaWNlc1tpXSk7XG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHZlcnRpY2VzW2ldLmxlbmd0aDsgaiArPSAzKSB7XG4gICAgICAgIHZlcnRleC5zZXQodmVydGljZXNbaV1bal0sIHZlcnRpY2VzW2ldW2ogKyAxXSwgdmVydGljZXNbaV1baiArIDJdKS5hcHBseU1hdHJpeDQobWF0cml4KTtcbiAgICAgICAgY2IodmVydGV4KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59KSgpO1xuIiwiLyogZ2xvYmFsIEFtbW8gKi9cbmNvbnN0IENPTlNUUkFJTlQgPSByZXF1aXJlKFwiLi4vY29uc3RhbnRzXCIpLkNPTlNUUkFJTlQ7XG5cbm1vZHVsZS5leHBvcnRzID0gQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KFwiYW1tby1jb25zdHJhaW50XCIsIHtcbiAgbXVsdGlwbGU6IHRydWUsXG5cbiAgc2NoZW1hOiB7XG4gICAgLy8gVHlwZSBvZiBjb25zdHJhaW50LlxuICAgIHR5cGU6IHtcbiAgICAgIGRlZmF1bHQ6IENPTlNUUkFJTlQuTE9DSyxcbiAgICAgIG9uZU9mOiBbXG4gICAgICAgIENPTlNUUkFJTlQuTE9DSyxcbiAgICAgICAgQ09OU1RSQUlOVC5GSVhFRCxcbiAgICAgICAgQ09OU1RSQUlOVC5TUFJJTkcsXG4gICAgICAgIENPTlNUUkFJTlQuU0xJREVSLFxuICAgICAgICBDT05TVFJBSU5ULkhJTkdFLFxuICAgICAgICBDT05TVFJBSU5ULkNPTkVfVFdJU1QsXG4gICAgICAgIENPTlNUUkFJTlQuUE9JTlRfVE9fUE9JTlRcbiAgICAgIF1cbiAgICB9LFxuXG4gICAgLy8gVGFyZ2V0IChvdGhlcikgYm9keSBmb3IgdGhlIGNvbnN0cmFpbnQuXG4gICAgdGFyZ2V0OiB7IHR5cGU6IFwic2VsZWN0b3JcIiB9LFxuXG4gICAgLy8gT2Zmc2V0IG9mIHRoZSBoaW5nZSBvciBwb2ludC10by1wb2ludCBjb25zdHJhaW50LCBkZWZpbmVkIGxvY2FsbHkgaW4gdGhlIGJvZHkuIFVzZWQgZm9yIGhpbmdlLCBjb25lVHdpc3QgcG9pbnRUb1BvaW50IGNvbnN0cmFpbnRzLlxuICAgIHBpdm90OiB7IHR5cGU6IFwidmVjM1wiIH0sXG4gICAgdGFyZ2V0UGl2b3Q6IHsgdHlwZTogXCJ2ZWMzXCIgfSxcblxuICAgIC8vIEFuIGF4aXMgdGhhdCBlYWNoIGJvZHkgY2FuIHJvdGF0ZSBhcm91bmQsIGRlZmluZWQgbG9jYWxseSB0byB0aGF0IGJvZHkuIFVzZWQgZm9yIGhpbmdlIGNvbnN0cmFpbnRzLlxuICAgIGF4aXM6IHsgdHlwZTogXCJ2ZWMzXCIsIGRlZmF1bHQ6IHsgeDogMCwgeTogMCwgejogMSB9IH0sXG4gICAgdGFyZ2V0QXhpczogeyB0eXBlOiBcInZlYzNcIiwgZGVmYXVsdDogeyB4OiAwLCB5OiAwLCB6OiAxIH0gfSxcblxuICAgIC8vIGRhbXBpbmcgJiBzdHVmZm5lc3MgLSB1c2VkIGZvciBzcHJpbmcgY29udHJhaW50cyBvbmx5XG4gICAgZGFtcGluZzogeyB0eXBlOiBcIm51bWJlclwiLCBkZWZhdWx0OiAxIH0sXG4gICAgc3RpZmZuZXNzOiB7IHR5cGU6IFwibnVtYmVyXCIsIGRlZmF1bHQ6IDEwMCB9LFxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3lzdGVtID0gdGhpcy5lbC5zY2VuZUVsLnN5c3RlbXMucGh5c2ljcztcbiAgICB0aGlzLmNvbnN0cmFpbnQgPSBudWxsO1xuICB9LFxuXG4gIHJlbW92ZTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmNvbnN0cmFpbnQpIHJldHVybjtcblxuICAgIHRoaXMuc3lzdGVtLnJlbW92ZUNvbnN0cmFpbnQodGhpcy5jb25zdHJhaW50KTtcbiAgICB0aGlzLmNvbnN0cmFpbnQgPSBudWxsO1xuICB9LFxuXG4gIHVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgZWwgPSB0aGlzLmVsLFxuICAgICAgZGF0YSA9IHRoaXMuZGF0YTtcblxuICAgIHRoaXMucmVtb3ZlKCk7XG5cbiAgICBpZiAoIWVsLmJvZHkgfHwgIWRhdGEudGFyZ2V0LmJvZHkpIHtcbiAgICAgIChlbC5ib2R5ID8gZGF0YS50YXJnZXQgOiBlbCkuYWRkRXZlbnRMaXN0ZW5lcihcImJvZHktbG9hZGVkXCIsIHRoaXMudXBkYXRlLmJpbmQodGhpcywge30pLCB7IG9uY2U6IHRydWUgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5jb25zdHJhaW50ID0gdGhpcy5jcmVhdGVDb25zdHJhaW50KCk7XG4gICAgdGhpcy5zeXN0ZW0uYWRkQ29uc3RyYWludCh0aGlzLmNvbnN0cmFpbnQpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBAcmV0dXJuIHtBbW1vLmJ0VHlwZWRDb25zdHJhaW50fVxuICAgKi9cbiAgY3JlYXRlQ29uc3RyYWludDogZnVuY3Rpb24oKSB7XG4gICAgbGV0IGNvbnN0cmFpbnQ7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YSxcbiAgICAgIGJvZHkgPSB0aGlzLmVsLmJvZHksXG4gICAgICB0YXJnZXRCb2R5ID0gZGF0YS50YXJnZXQuYm9keTtcblxuICAgIGNvbnN0IGJvZHlUcmFuc2Zvcm0gPSBib2R5XG4gICAgICAuZ2V0Q2VudGVyT2ZNYXNzVHJhbnNmb3JtKClcbiAgICAgIC5pbnZlcnNlKClcbiAgICAgIC5vcF9tdWwodGFyZ2V0Qm9keS5nZXRXb3JsZFRyYW5zZm9ybSgpKTtcbiAgICBjb25zdCB0YXJnZXRUcmFuc2Zvcm0gPSBuZXcgQW1tby5idFRyYW5zZm9ybSgpO1xuICAgIHRhcmdldFRyYW5zZm9ybS5zZXRJZGVudGl0eSgpO1xuXG4gICAgc3dpdGNoIChkYXRhLnR5cGUpIHtcbiAgICAgIGNhc2UgQ09OU1RSQUlOVC5MT0NLOiB7XG4gICAgICAgIGNvbnN0cmFpbnQgPSBuZXcgQW1tby5idEdlbmVyaWM2RG9mQ29uc3RyYWludChib2R5LCB0YXJnZXRCb2R5LCBib2R5VHJhbnNmb3JtLCB0YXJnZXRUcmFuc2Zvcm0sIHRydWUpO1xuICAgICAgICBjb25zdCB6ZXJvID0gbmV3IEFtbW8uYnRWZWN0b3IzKDAsIDAsIDApO1xuICAgICAgICAvL1RPRE86IGFsbG93IHRoZXNlIHRvIGJlIGNvbmZpZ3VyYWJsZVxuICAgICAgICBjb25zdHJhaW50LnNldExpbmVhckxvd2VyTGltaXQoemVybyk7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0TGluZWFyVXBwZXJMaW1pdCh6ZXJvKTtcbiAgICAgICAgY29uc3RyYWludC5zZXRBbmd1bGFyTG93ZXJMaW1pdCh6ZXJvKTtcbiAgICAgICAgY29uc3RyYWludC5zZXRBbmd1bGFyVXBwZXJMaW1pdCh6ZXJvKTtcbiAgICAgICAgQW1tby5kZXN0cm95KHplcm8pO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIC8vVE9ETzogdGVzdCBhbmQgdmVyaWZ5IGFsbCBvdGhlciBjb25zdHJhaW50IHR5cGVzXG4gICAgICBjYXNlIENPTlNUUkFJTlQuRklYRUQ6IHtcbiAgICAgICAgLy9idEZpeGVkQ29uc3RyYWludCBkb2VzIG5vdCBzZWVtIHRvIGRlYnVnIHJlbmRlclxuICAgICAgICBib2R5VHJhbnNmb3JtLnNldFJvdGF0aW9uKGJvZHkuZ2V0V29ybGRUcmFuc2Zvcm0oKS5nZXRSb3RhdGlvbigpKTtcbiAgICAgICAgdGFyZ2V0VHJhbnNmb3JtLnNldFJvdGF0aW9uKHRhcmdldEJvZHkuZ2V0V29ybGRUcmFuc2Zvcm0oKS5nZXRSb3RhdGlvbigpKTtcbiAgICAgICAgY29uc3RyYWludCA9IG5ldyBBbW1vLmJ0Rml4ZWRDb25zdHJhaW50KGJvZHksIHRhcmdldEJvZHksIGJvZHlUcmFuc2Zvcm0sIHRhcmdldFRyYW5zZm9ybSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBDT05TVFJBSU5ULlNQUklORzoge1xuICAgICAgICBjb25zdHJhaW50ID0gbmV3IEFtbW8uYnRHZW5lcmljNkRvZlNwcmluZ0NvbnN0cmFpbnQoYm9keSwgdGFyZ2V0Qm9keSwgYm9keVRyYW5zZm9ybSwgdGFyZ2V0VHJhbnNmb3JtLCB0cnVlKTtcblxuICAgICAgICAvLyBWZXJ5IGxpbWl0ZWQgaW5pdGlhbCBpbXBsZW1lbnRhdGlvbiBvZiBzcHJpbmcgY29uc3RyYWludC5cbiAgICAgICAgLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vbjVyby9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vaXNzdWVzLzE3MVxuICAgICAgICBmb3IgKHZhciBpIGluIFswLDEsMiwzLDQsNV0pIHtcbiAgICAgICAgICBjb25zdHJhaW50LmVuYWJsZVNwcmluZygxLCB0cnVlKVxuICAgICAgICAgIGNvbnN0cmFpbnQuc2V0U3RpZmZuZXNzKDEsIHRoaXMuZGF0YS5zdGlmZm5lc3MpXG4gICAgICAgICAgY29uc3RyYWludC5zZXREYW1waW5nKDEsIHRoaXMuZGF0YS5kYW1waW5nKVxuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHVwcGVyID0gbmV3IEFtbW8uYnRWZWN0b3IzKC0xLCAtMSwgLTEpO1xuICAgICAgICBjb25zdCBsb3dlciA9IG5ldyBBbW1vLmJ0VmVjdG9yMygxLCAxLCAxKTtcbiAgICAgICAgY29uc3RyYWludC5zZXRMaW5lYXJVcHBlckxpbWl0KHVwcGVyKTtcbiAgICAgICAgY29uc3RyYWludC5zZXRMaW5lYXJMb3dlckxpbWl0KGxvd2VyKVxuICAgICAgICBBbW1vLmRlc3Ryb3kodXBwZXIpO1xuICAgICAgICBBbW1vLmRlc3Ryb3kobG93ZXIpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgQ09OU1RSQUlOVC5TTElERVI6IHtcbiAgICAgICAgLy9UT0RPOiBzdXBwb3J0IHNldHRpbmcgbGluZWFyIGFuZCBhbmd1bGFyIGxpbWl0c1xuICAgICAgICBjb25zdHJhaW50ID0gbmV3IEFtbW8uYnRTbGlkZXJDb25zdHJhaW50KGJvZHksIHRhcmdldEJvZHksIGJvZHlUcmFuc2Zvcm0sIHRhcmdldFRyYW5zZm9ybSwgdHJ1ZSk7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0TG93ZXJMaW5MaW1pdCgtMSk7XG4gICAgICAgIGNvbnN0cmFpbnQuc2V0VXBwZXJMaW5MaW1pdCgxKTtcbiAgICAgICAgLy8gY29uc3RyYWludC5zZXRMb3dlckFuZ0xpbWl0KCk7XG4gICAgICAgIC8vIGNvbnN0cmFpbnQuc2V0VXBwZXJBbmdMaW1pdCgpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGNhc2UgQ09OU1RSQUlOVC5ISU5HRToge1xuICAgICAgICBjb25zdCBwaXZvdCA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhkYXRhLnBpdm90LngsIGRhdGEucGl2b3QueSwgZGF0YS5waXZvdC56KTtcbiAgICAgICAgY29uc3QgdGFyZ2V0UGl2b3QgPSBuZXcgQW1tby5idFZlY3RvcjMoZGF0YS50YXJnZXRQaXZvdC54LCBkYXRhLnRhcmdldFBpdm90LnksIGRhdGEudGFyZ2V0UGl2b3Queik7XG5cbiAgICAgICAgY29uc3QgYXhpcyA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhkYXRhLmF4aXMueCwgZGF0YS5heGlzLnksIGRhdGEuYXhpcy56KTtcbiAgICAgICAgY29uc3QgdGFyZ2V0QXhpcyA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhkYXRhLnRhcmdldEF4aXMueCwgZGF0YS50YXJnZXRBeGlzLnksIGRhdGEudGFyZ2V0QXhpcy56KTtcblxuICAgICAgICBjb25zdHJhaW50ID0gbmV3IEFtbW8uYnRIaW5nZUNvbnN0cmFpbnQoYm9keSwgdGFyZ2V0Qm9keSwgcGl2b3QsIHRhcmdldFBpdm90LCBheGlzLCB0YXJnZXRBeGlzLCB0cnVlKTtcblxuICAgICAgICBBbW1vLmRlc3Ryb3kocGl2b3QpO1xuICAgICAgICBBbW1vLmRlc3Ryb3kodGFyZ2V0UGl2b3QpO1xuICAgICAgICBBbW1vLmRlc3Ryb3koYXhpcyk7XG4gICAgICAgIEFtbW8uZGVzdHJveSh0YXJnZXRBeGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBjYXNlIENPTlNUUkFJTlQuQ09ORV9UV0lTVDoge1xuICAgICAgICBjb25zdCBwaXZvdFRyYW5zZm9ybSA9IG5ldyBBbW1vLmJ0VHJhbnNmb3JtKCk7XG4gICAgICAgIHBpdm90VHJhbnNmb3JtLnNldElkZW50aXR5KCk7XG4gICAgICAgIHBpdm90VHJhbnNmb3JtLmdldE9yaWdpbigpLnNldFZhbHVlKGRhdGEucGl2b3QueCwgZGF0YS5waXZvdC55LCBkYXRhLnBpdm90LnopO1xuICAgICAgICBjb25zdCB0YXJnZXRQaXZvdFRyYW5zZm9ybSA9IG5ldyBBbW1vLmJ0VHJhbnNmb3JtKCk7XG4gICAgICAgIHRhcmdldFBpdm90VHJhbnNmb3JtLnNldElkZW50aXR5KCk7XG4gICAgICAgIHRhcmdldFBpdm90VHJhbnNmb3JtLmdldE9yaWdpbigpLnNldFZhbHVlKGRhdGEudGFyZ2V0UGl2b3QueCwgZGF0YS50YXJnZXRQaXZvdC55LCBkYXRhLnRhcmdldFBpdm90LnopO1xuICAgICAgICBjb25zdHJhaW50ID0gbmV3IEFtbW8uYnRDb25lVHdpc3RDb25zdHJhaW50KGJvZHksIHRhcmdldEJvZHksIHBpdm90VHJhbnNmb3JtLCB0YXJnZXRQaXZvdFRyYW5zZm9ybSk7XG4gICAgICAgIEFtbW8uZGVzdHJveShwaXZvdFRyYW5zZm9ybSk7XG4gICAgICAgIEFtbW8uZGVzdHJveSh0YXJnZXRQaXZvdFRyYW5zZm9ybSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgY2FzZSBDT05TVFJBSU5ULlBPSU5UX1RPX1BPSU5UOiB7XG4gICAgICAgIGNvbnN0IHBpdm90ID0gbmV3IEFtbW8uYnRWZWN0b3IzKGRhdGEucGl2b3QueCwgZGF0YS5waXZvdC55LCBkYXRhLnBpdm90LnopO1xuICAgICAgICBjb25zdCB0YXJnZXRQaXZvdCA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhkYXRhLnRhcmdldFBpdm90LngsIGRhdGEudGFyZ2V0UGl2b3QueSwgZGF0YS50YXJnZXRQaXZvdC56KTtcblxuICAgICAgICBjb25zdHJhaW50ID0gbmV3IEFtbW8uYnRQb2ludDJQb2ludENvbnN0cmFpbnQoYm9keSwgdGFyZ2V0Qm9keSwgcGl2b3QsIHRhcmdldFBpdm90KTtcblxuICAgICAgICBBbW1vLmRlc3Ryb3kocGl2b3QpO1xuICAgICAgICBBbW1vLmRlc3Ryb3kodGFyZ2V0UGl2b3QpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIltjb25zdHJhaW50XSBVbmV4cGVjdGVkIHR5cGU6IFwiICsgZGF0YS50eXBlKTtcbiAgICB9XG5cbiAgICBBbW1vLmRlc3Ryb3kodGFyZ2V0VHJhbnNmb3JtKTtcblxuICAgIHJldHVybiBjb25zdHJhaW50O1xuICB9XG59KTtcbiIsIi8qIGdsb2JhbCBBbW1vLFRIUkVFICovXG5jb25zdCBBbW1vRGVidWdEcmF3ZXIgPSByZXF1aXJlKFwiYW1tby1kZWJ1Zy1kcmF3ZXJcIik7XG5jb25zdCB0aHJlZVRvQW1tbyA9IHJlcXVpcmUoXCJ0aHJlZS10by1hbW1vXCIpO1xuY29uc3QgQ09OU1RBTlRTID0gcmVxdWlyZShcIi4uLy4uL2NvbnN0YW50c1wiKSxcbiAgQUNUSVZBVElPTl9TVEFURSA9IENPTlNUQU5UUy5BQ1RJVkFUSU9OX1NUQVRFLFxuICBDT0xMSVNJT05fRkxBRyA9IENPTlNUQU5UUy5DT0xMSVNJT05fRkxBRyxcbiAgU0hBUEUgPSBDT05TVEFOVFMuU0hBUEUsXG4gIFRZUEUgPSBDT05TVEFOVFMuVFlQRSxcbiAgRklUID0gQ09OU1RBTlRTLkZJVDtcblxuY29uc3QgQUNUSVZBVElPTl9TVEFURVMgPSBbXG4gIEFDVElWQVRJT05fU1RBVEUuQUNUSVZFX1RBRyxcbiAgQUNUSVZBVElPTl9TVEFURS5JU0xBTkRfU0xFRVBJTkcsXG4gIEFDVElWQVRJT05fU1RBVEUuV0FOVFNfREVBQ1RJVkFUSU9OLFxuICBBQ1RJVkFUSU9OX1NUQVRFLkRJU0FCTEVfREVBQ1RJVkFUSU9OLFxuICBBQ1RJVkFUSU9OX1NUQVRFLkRJU0FCTEVfU0lNVUxBVElPTlxuXTtcblxuY29uc3QgUklHSURfQk9EWV9GTEFHUyA9IHtcbiAgTk9ORTogMCxcbiAgRElTQUJMRV9XT1JMRF9HUkFWSVRZOiAxXG59O1xuXG5mdW5jdGlvbiBhbG1vc3RFcXVhbHNWZWN0b3IzKGVwc2lsb24sIHUsIHYpIHtcbiAgcmV0dXJuIE1hdGguYWJzKHUueCAtIHYueCkgPCBlcHNpbG9uICYmIE1hdGguYWJzKHUueSAtIHYueSkgPCBlcHNpbG9uICYmIE1hdGguYWJzKHUueiAtIHYueikgPCBlcHNpbG9uO1xufVxuXG5mdW5jdGlvbiBhbG1vc3RFcXVhbHNCdFZlY3RvcjMoZXBzaWxvbiwgdSwgdikge1xuICByZXR1cm4gTWF0aC5hYnModS54KCkgLSB2LngoKSkgPCBlcHNpbG9uICYmIE1hdGguYWJzKHUueSgpIC0gdi55KCkpIDwgZXBzaWxvbiAmJiBNYXRoLmFicyh1LnooKSAtIHYueigpKSA8IGVwc2lsb247XG59XG5cbmZ1bmN0aW9uIGFsbW9zdEVxdWFsc1F1YXRlcm5pb24oZXBzaWxvbiwgdSwgdikge1xuICByZXR1cm4gKFxuICAgIChNYXRoLmFicyh1LnggLSB2LngpIDwgZXBzaWxvbiAmJlxuICAgICAgTWF0aC5hYnModS55IC0gdi55KSA8IGVwc2lsb24gJiZcbiAgICAgIE1hdGguYWJzKHUueiAtIHYueikgPCBlcHNpbG9uICYmXG4gICAgICBNYXRoLmFicyh1LncgLSB2LncpIDwgZXBzaWxvbikgfHxcbiAgICAoTWF0aC5hYnModS54ICsgdi54KSA8IGVwc2lsb24gJiZcbiAgICAgIE1hdGguYWJzKHUueSArIHYueSkgPCBlcHNpbG9uICYmXG4gICAgICBNYXRoLmFicyh1LnogKyB2LnopIDwgZXBzaWxvbiAmJlxuICAgICAgTWF0aC5hYnModS53ICsgdi53KSA8IGVwc2lsb24pXG4gICk7XG59XG5cbmxldCBBbW1vQm9keSA9IHtcbiAgc2NoZW1hOiB7XG4gICAgbG9hZGVkRXZlbnQ6IHsgZGVmYXVsdDogXCJcIiB9LFxuICAgIG1hc3M6IHsgZGVmYXVsdDogMSB9LFxuICAgIGdyYXZpdHk6IHsgdHlwZTogXCJ2ZWMzXCIsIGRlZmF1bHQ6IG51bGwgfSxcbiAgICBsaW5lYXJEYW1waW5nOiB7IGRlZmF1bHQ6IDAuMDEgfSxcbiAgICBhbmd1bGFyRGFtcGluZzogeyBkZWZhdWx0OiAwLjAxIH0sXG4gICAgbGluZWFyU2xlZXBpbmdUaHJlc2hvbGQ6IHsgZGVmYXVsdDogMS42IH0sXG4gICAgYW5ndWxhclNsZWVwaW5nVGhyZXNob2xkOiB7IGRlZmF1bHQ6IDIuNSB9LFxuICAgIGFuZ3VsYXJGYWN0b3I6IHsgdHlwZTogXCJ2ZWMzXCIsIGRlZmF1bHQ6IHsgeDogMSwgeTogMSwgejogMSB9IH0sXG4gICAgYWN0aXZhdGlvblN0YXRlOiB7XG4gICAgICBkZWZhdWx0OiBBQ1RJVkFUSU9OX1NUQVRFLkFDVElWRV9UQUcsXG4gICAgICBvbmVPZjogQUNUSVZBVElPTl9TVEFURVNcbiAgICB9LFxuICAgIHR5cGU6IHsgZGVmYXVsdDogXCJkeW5hbWljXCIsIG9uZU9mOiBbVFlQRS5TVEFUSUMsIFRZUEUuRFlOQU1JQywgVFlQRS5LSU5FTUFUSUNdIH0sXG4gICAgZW1pdENvbGxpc2lvbkV2ZW50czogeyBkZWZhdWx0OiBmYWxzZSB9LFxuICAgIGRpc2FibGVDb2xsaXNpb246IHsgZGVmYXVsdDogZmFsc2UgfSxcbiAgICBjb2xsaXNpb25GaWx0ZXJHcm91cDogeyBkZWZhdWx0OiAxIH0sIC8vMzItYml0IG1hc2ssXG4gICAgY29sbGlzaW9uRmlsdGVyTWFzazogeyBkZWZhdWx0OiAxIH0sIC8vMzItYml0IG1hc2tcbiAgICBzY2FsZUF1dG9VcGRhdGU6IHsgZGVmYXVsdDogdHJ1ZSB9LFxuICAgIHJlc3RpdHV0aW9uOiB7ZGVmYXVsdDogMH0gLy8gZG9lcyBub3Qgc3VwcG9ydCB1cGRhdGVzXG4gIH0sXG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIGEgYm9keSBjb21wb25lbnQsIGFzc2lnbmluZyBpdCB0byB0aGUgcGh5c2ljcyBzeXN0ZW0gYW5kIGJpbmRpbmcgbGlzdGVuZXJzIGZvclxuICAgKiBwYXJzaW5nIHRoZSBlbGVtZW50cyBnZW9tZXRyeS5cbiAgICovXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3lzdGVtID0gdGhpcy5lbC5zY2VuZUVsLnN5c3RlbXMucGh5c2ljcztcbiAgICB0aGlzLnNoYXBlQ29tcG9uZW50cyA9IFtdO1xuXG4gICAgaWYgKHRoaXMuZGF0YS5sb2FkZWRFdmVudCA9PT0gXCJcIikge1xuICAgICAgdGhpcy5sb2FkZWRFdmVudEZpcmVkID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5lbC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgICB0aGlzLmRhdGEubG9hZGVkRXZlbnQsXG4gICAgICAgICgpID0+IHtcbiAgICAgICAgICB0aGlzLmxvYWRlZEV2ZW50RmlyZWQgPSB0cnVlO1xuICAgICAgICB9LFxuICAgICAgICB7IG9uY2U6IHRydWUgfVxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5zeXN0ZW0uaW5pdGlhbGl6ZWQgJiYgdGhpcy5sb2FkZWRFdmVudEZpcmVkKSB7XG4gICAgICB0aGlzLmluaXRCb2R5KCk7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYW4gZWxlbWVudCdzIGdlb21ldHJ5IGFuZCBjb21wb25lbnQgbWV0YWRhdGEgdG8gY3JlYXRlIGFuIEFtbW8gYm9keSBpbnN0YW5jZSBmb3IgdGhlXG4gICAqIGNvbXBvbmVudC5cbiAgICovXG4gIGluaXRCb2R5OiAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgcG9zID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICBjb25zdCBxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgICBjb25zdCBib3VuZGluZ0JveCA9IG5ldyBUSFJFRS5Cb3gzKCk7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBlbCA9IHRoaXMuZWwsXG4gICAgICAgIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICBjb25zdCBjbGFtcCA9IChudW0sIG1pbiwgbWF4KSA9PiBNYXRoLm1pbihNYXRoLm1heChudW0sIG1pbiksIG1heClcblxuICAgICAgdGhpcy5sb2NhbFNjYWxpbmcgPSBuZXcgQW1tby5idFZlY3RvcjMoKTtcblxuICAgICAgY29uc3Qgb2JqID0gdGhpcy5lbC5vYmplY3QzRDtcbiAgICAgIG9iai5nZXRXb3JsZFBvc2l0aW9uKHBvcyk7XG4gICAgICBvYmouZ2V0V29ybGRRdWF0ZXJuaW9uKHF1YXQpO1xuXG4gICAgICB0aGlzLnByZXZTY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDEsIDEpO1xuICAgICAgdGhpcy5wcmV2TnVtQ2hpbGRTaGFwZXMgPSAwO1xuXG4gICAgICB0aGlzLm1zVHJhbnNmb3JtID0gbmV3IEFtbW8uYnRUcmFuc2Zvcm0oKTtcbiAgICAgIHRoaXMubXNUcmFuc2Zvcm0uc2V0SWRlbnRpdHkoKTtcbiAgICAgIHRoaXMucm90YXRpb24gPSBuZXcgQW1tby5idFF1YXRlcm5pb24ocXVhdC54LCBxdWF0LnksIHF1YXQueiwgcXVhdC53KTtcblxuICAgICAgdGhpcy5tc1RyYW5zZm9ybS5nZXRPcmlnaW4oKS5zZXRWYWx1ZShwb3MueCwgcG9zLnksIHBvcy56KTtcbiAgICAgIHRoaXMubXNUcmFuc2Zvcm0uc2V0Um90YXRpb24odGhpcy5yb3RhdGlvbik7XG5cbiAgICAgIHRoaXMubW90aW9uU3RhdGUgPSBuZXcgQW1tby5idERlZmF1bHRNb3Rpb25TdGF0ZSh0aGlzLm1zVHJhbnNmb3JtKTtcblxuICAgICAgdGhpcy5sb2NhbEluZXJ0aWEgPSBuZXcgQW1tby5idFZlY3RvcjMoMCwgMCwgMCk7XG5cbiAgICAgIHRoaXMuY29tcG91bmRTaGFwZSA9IG5ldyBBbW1vLmJ0Q29tcG91bmRTaGFwZSh0cnVlKTtcblxuICAgICAgdGhpcy5yYkluZm8gPSBuZXcgQW1tby5idFJpZ2lkQm9keUNvbnN0cnVjdGlvbkluZm8oXG4gICAgICAgIGRhdGEubWFzcyxcbiAgICAgICAgdGhpcy5tb3Rpb25TdGF0ZSxcbiAgICAgICAgdGhpcy5jb21wb3VuZFNoYXBlLFxuICAgICAgICB0aGlzLmxvY2FsSW5lcnRpYVxuICAgICAgKTtcbiAgICAgIHRoaXMucmJJbmZvLm1fcmVzdGl0dXRpb24gPSBjbGFtcCh0aGlzLmRhdGEucmVzdGl0dXRpb24sIDAsIDEpO1xuICAgICAgdGhpcy5ib2R5ID0gbmV3IEFtbW8uYnRSaWdpZEJvZHkodGhpcy5yYkluZm8pO1xuICAgICAgdGhpcy5ib2R5LnNldEFjdGl2YXRpb25TdGF0ZShBQ1RJVkFUSU9OX1NUQVRFUy5pbmRleE9mKGRhdGEuYWN0aXZhdGlvblN0YXRlKSArIDEpO1xuICAgICAgdGhpcy5ib2R5LnNldFNsZWVwaW5nVGhyZXNob2xkcyhkYXRhLmxpbmVhclNsZWVwaW5nVGhyZXNob2xkLCBkYXRhLmFuZ3VsYXJTbGVlcGluZ1RocmVzaG9sZCk7XG5cbiAgICAgIHRoaXMuYm9keS5zZXREYW1waW5nKGRhdGEubGluZWFyRGFtcGluZywgZGF0YS5hbmd1bGFyRGFtcGluZyk7XG5cbiAgICAgIGNvbnN0IGFuZ3VsYXJGYWN0b3IgPSBuZXcgQW1tby5idFZlY3RvcjMoZGF0YS5hbmd1bGFyRmFjdG9yLngsIGRhdGEuYW5ndWxhckZhY3Rvci55LCBkYXRhLmFuZ3VsYXJGYWN0b3Iueik7XG4gICAgICB0aGlzLmJvZHkuc2V0QW5ndWxhckZhY3Rvcihhbmd1bGFyRmFjdG9yKTtcbiAgICAgIEFtbW8uZGVzdHJveShhbmd1bGFyRmFjdG9yKTtcblxuICAgICAgdGhpcy5fdXBkYXRlQm9keUdyYXZpdHkoZGF0YS5ncmF2aXR5KVxuXG4gICAgICB0aGlzLnVwZGF0ZUNvbGxpc2lvbkZsYWdzKCk7XG5cbiAgICAgIHRoaXMuZWwuYm9keSA9IHRoaXMuYm9keTtcbiAgICAgIHRoaXMuYm9keS5lbCA9IGVsO1xuXG4gICAgICB0aGlzLmlzTG9hZGVkID0gdHJ1ZTtcblxuICAgICAgdGhpcy5lbC5lbWl0KFwiYm9keS1sb2FkZWRcIiwgeyBib2R5OiB0aGlzLmVsLmJvZHkgfSk7XG5cbiAgICAgIHRoaXMuX2FkZFRvU3lzdGVtKCk7XG4gICAgfTtcbiAgfSkoKSxcblxuICB0aWNrOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zeXN0ZW0uaW5pdGlhbGl6ZWQgJiYgIXRoaXMuaXNMb2FkZWQgJiYgdGhpcy5sb2FkZWRFdmVudEZpcmVkKSB7XG4gICAgICB0aGlzLmluaXRCb2R5KCk7XG4gICAgfVxuICB9LFxuXG4gIF91cGRhdGVCb2R5R3Jhdml0eShncmF2aXR5KSB7XG5cbiAgICBpZiAoZ3Jhdml0eS54ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgZ3Jhdml0eS55ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgZ3Jhdml0eS56ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGdyYXZpdHlCdFZlYyA9IG5ldyBBbW1vLmJ0VmVjdG9yMyhncmF2aXR5LngsIGdyYXZpdHkueSwgZ3Jhdml0eS56KTtcbiAgICAgIGlmICghYWxtb3N0RXF1YWxzQnRWZWN0b3IzKDAuMDAxLCBncmF2aXR5QnRWZWMsIHRoaXMuc3lzdGVtLmRyaXZlci5waHlzaWNzV29ybGQuZ2V0R3Jhdml0eSgpKSkge1xuICAgICAgICB0aGlzLmJvZHkuc2V0RmxhZ3MoUklHSURfQk9EWV9GTEFHUy5ESVNBQkxFX1dPUkxEX0dSQVZJVFkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5ib2R5LnNldEZsYWdzKFJJR0lEX0JPRFlfRkxBR1MuTk9ORSk7XG4gICAgICB9XG4gICAgICB0aGlzLmJvZHkuc2V0R3Jhdml0eShncmF2aXR5QnRWZWMpO1xuICAgICAgQW1tby5kZXN0cm95KGdyYXZpdHlCdFZlYyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gbm8gcGVyLWJvZHkgZ3Jhdml0eSBzcGVjaWZpZWQgLSBqdXN0IHVzZSB3b3JsZCBncmF2aXR5XG4gICAgICB0aGlzLmJvZHkuc2V0RmxhZ3MoUklHSURfQk9EWV9GTEFHUy5OT05FKTtcbiAgICB9XG4gIH0sXG5cbiAgX3VwZGF0ZVNoYXBlczogKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IG5lZWRzUG9seWhlZHJhbEluaXRpYWxpemF0aW9uID0gW1NIQVBFLkhVTEwsIFNIQVBFLkhBQ0QsIFNIQVBFLlZIQUNEXTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgdXBkYXRlZCA9IGZhbHNlO1xuXG4gICAgICBjb25zdCBvYmogPSB0aGlzLmVsLm9iamVjdDNEO1xuICAgICAgaWYgKHRoaXMuZGF0YS5zY2FsZUF1dG9VcGRhdGUgJiYgdGhpcy5wcmV2U2NhbGUgJiYgIWFsbW9zdEVxdWFsc1ZlY3RvcjMoMC4wMDEsIG9iai5zY2FsZSwgdGhpcy5wcmV2U2NhbGUpKSB7XG4gICAgICAgIHRoaXMucHJldlNjYWxlLmNvcHkob2JqLnNjYWxlKTtcbiAgICAgICAgdXBkYXRlZCA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5sb2NhbFNjYWxpbmcuc2V0VmFsdWUodGhpcy5wcmV2U2NhbGUueCwgdGhpcy5wcmV2U2NhbGUueSwgdGhpcy5wcmV2U2NhbGUueik7XG4gICAgICAgIHRoaXMuY29tcG91bmRTaGFwZS5zZXRMb2NhbFNjYWxpbmcodGhpcy5sb2NhbFNjYWxpbmcpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5zaGFwZUNvbXBvbmVudHNDaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMuc2hhcGVDb21wb25lbnRzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICB1cGRhdGVkID0gdHJ1ZTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnNoYXBlQ29tcG9uZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvbnN0IHNoYXBlQ29tcG9uZW50ID0gdGhpcy5zaGFwZUNvbXBvbmVudHNbaV07XG4gICAgICAgICAgaWYgKHNoYXBlQ29tcG9uZW50LmdldFNoYXBlcygpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlQ29sbGlzaW9uU2hhcGUoc2hhcGVDb21wb25lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBjb2xsaXNpb25TaGFwZXMgPSBzaGFwZUNvbXBvbmVudC5nZXRTaGFwZXMoKTtcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGNvbGxpc2lvblNoYXBlcy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgY29uc3QgY29sbGlzaW9uU2hhcGUgPSBjb2xsaXNpb25TaGFwZXNbal07XG4gICAgICAgICAgICBpZiAoIWNvbGxpc2lvblNoYXBlLmFkZGVkKSB7XG4gICAgICAgICAgICAgIHRoaXMuY29tcG91bmRTaGFwZS5hZGRDaGlsZFNoYXBlKGNvbGxpc2lvblNoYXBlLmxvY2FsVHJhbnNmb3JtLCBjb2xsaXNpb25TaGFwZSk7XG4gICAgICAgICAgICAgIGNvbGxpc2lvblNoYXBlLmFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5kYXRhLnR5cGUgPT09IFRZUEUuRFlOQU1JQykge1xuICAgICAgICAgIHRoaXMudXBkYXRlTWFzcygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zeXN0ZW0uZHJpdmVyLnVwZGF0ZUJvZHkodGhpcy5ib2R5KTtcbiAgICAgIH1cblxuICAgICAgLy9jYWxsIGluaXRpYWxpemVQb2x5aGVkcmFsRmVhdHVyZXMgZm9yIGh1bGwgc2hhcGVzIGlmIGRlYnVnIGlzIHR1cm5lZCBvbiBhbmQvb3Igc2NhbGUgY2hhbmdlc1xuICAgICAgaWYgKHRoaXMuc3lzdGVtLmRlYnVnICYmICh1cGRhdGVkIHx8ICF0aGlzLnBvbHlIZWRyYWxGZWF0dXJlc0luaXRpYWxpemVkKSkge1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2hhcGVDb21wb25lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgY29sbGlzaW9uU2hhcGVzID0gdGhpcy5zaGFwZUNvbXBvbmVudHNbaV0uZ2V0U2hhcGVzKCk7XG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjb2xsaXNpb25TaGFwZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbGxpc2lvblNoYXBlID0gY29sbGlzaW9uU2hhcGVzW2pdO1xuICAgICAgICAgICAgaWYgKG5lZWRzUG9seWhlZHJhbEluaXRpYWxpemF0aW9uLmluZGV4T2YoY29sbGlzaW9uU2hhcGUudHlwZSkgIT09IC0xKSB7XG4gICAgICAgICAgICAgIGNvbGxpc2lvblNoYXBlLmluaXRpYWxpemVQb2x5aGVkcmFsRmVhdHVyZXMoMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucG9seUhlZHJhbEZlYXR1cmVzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCksXG5cbiAgX2NyZWF0ZUNvbGxpc2lvblNoYXBlOiBmdW5jdGlvbihzaGFwZUNvbXBvbmVudCkge1xuICAgIGNvbnN0IGRhdGEgPSBzaGFwZUNvbXBvbmVudC5kYXRhO1xuICAgIGNvbnN0IHZlcnRpY2VzID0gW107XG4gICAgY29uc3QgbWF0cmljZXMgPSBbXTtcbiAgICBjb25zdCBpbmRleGVzID0gW107XG5cbiAgICBjb25zdCByb290ID0gc2hhcGVDb21wb25lbnQuZWwub2JqZWN0M0Q7XG4gICAgY29uc3QgbWF0cml4V29ybGQgPSByb290Lm1hdHJpeFdvcmxkO1xuXG4gICAgdGhyZWVUb0FtbW8uaXRlcmF0ZUdlb21ldHJpZXMocm9vdCwgZGF0YSwgKHZlcnRleEFycmF5LCBtYXRyaXhBcnJheSwgaW5kZXhBcnJheSkgPT4ge1xuICAgICAgdmVydGljZXMucHVzaCh2ZXJ0ZXhBcnJheSk7XG4gICAgICBtYXRyaWNlcy5wdXNoKG1hdHJpeEFycmF5KTtcbiAgICAgIGluZGV4ZXMucHVzaChpbmRleEFycmF5KTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGNvbGxpc2lvblNoYXBlcyA9IHRocmVlVG9BbW1vLmNyZWF0ZUNvbGxpc2lvblNoYXBlcyh2ZXJ0aWNlcywgbWF0cmljZXMsIGluZGV4ZXMsIG1hdHJpeFdvcmxkLmVsZW1lbnRzLCBkYXRhKTtcbiAgICBzaGFwZUNvbXBvbmVudC5hZGRTaGFwZXMoY29sbGlzaW9uU2hhcGVzKTtcbiAgICByZXR1cm47XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyB0aGUgY29tcG9uZW50IHdpdGggdGhlIHBoeXNpY3Mgc3lzdGVtLlxuICAgKi9cbiAgcGxheTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaXNMb2FkZWQpIHtcbiAgICAgIHRoaXMuX2FkZFRvU3lzdGVtKCk7XG4gICAgfVxuICB9LFxuXG4gIF9hZGRUb1N5c3RlbTogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmFkZGVkVG9TeXN0ZW0pIHtcbiAgICAgIHRoaXMuc3lzdGVtLmFkZEJvZHkodGhpcy5ib2R5LCB0aGlzLmRhdGEuY29sbGlzaW9uRmlsdGVyR3JvdXAsIHRoaXMuZGF0YS5jb2xsaXNpb25GaWx0ZXJNYXNrKTtcblxuICAgICAgaWYgKHRoaXMuZGF0YS5lbWl0Q29sbGlzaW9uRXZlbnRzKSB7XG4gICAgICAgIHRoaXMuc3lzdGVtLmRyaXZlci5hZGRFdmVudExpc3RlbmVyKHRoaXMuYm9keSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3lzdGVtLmFkZENvbXBvbmVudCh0aGlzKTtcbiAgICAgIHRoaXMuYWRkZWRUb1N5c3RlbSA9IHRydWU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVycyB0aGUgY29tcG9uZW50IHdpdGggdGhlIHBoeXNpY3Mgc3lzdGVtLlxuICAgKi9cbiAgcGF1c2U6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmFkZGVkVG9TeXN0ZW0pIHtcbiAgICAgIHRoaXMuc3lzdGVtLnJlbW92ZUNvbXBvbmVudCh0aGlzKTtcbiAgICAgIHRoaXMuc3lzdGVtLnJlbW92ZUJvZHkodGhpcy5ib2R5KTtcbiAgICAgIHRoaXMuYWRkZWRUb1N5c3RlbSA9IGZhbHNlO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgcmlnaWQgYm9keSBpbnN0YW5jZSwgd2hlcmUgcG9zc2libGUuXG4gICAqL1xuICB1cGRhdGU6IGZ1bmN0aW9uKHByZXZEYXRhKSB7XG4gICAgaWYgKHRoaXMuaXNMb2FkZWQpIHtcbiAgICAgIGlmICghdGhpcy5oYXNVcGRhdGVkKSB7XG4gICAgICAgIC8vc2tpcCB0aGUgZmlyc3QgdXBkYXRlXG4gICAgICAgIHRoaXMuaGFzVXBkYXRlZCA9IHRydWU7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YTtcblxuICAgICAgaWYgKHByZXZEYXRhLnR5cGUgIT09IGRhdGEudHlwZSB8fCBwcmV2RGF0YS5kaXNhYmxlQ29sbGlzaW9uICE9PSBkYXRhLmRpc2FibGVDb2xsaXNpb24pIHtcbiAgICAgICAgdGhpcy51cGRhdGVDb2xsaXNpb25GbGFncygpO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJldkRhdGEuYWN0aXZhdGlvblN0YXRlICE9PSBkYXRhLmFjdGl2YXRpb25TdGF0ZSkge1xuICAgICAgICB0aGlzLmJvZHkuZm9yY2VBY3RpdmF0aW9uU3RhdGUoQUNUSVZBVElPTl9TVEFURVMuaW5kZXhPZihkYXRhLmFjdGl2YXRpb25TdGF0ZSkgKyAxKTtcbiAgICAgICAgaWYgKGRhdGEuYWN0aXZhdGlvblN0YXRlID09PSBBQ1RJVkFUSU9OX1NUQVRFLkFDVElWRV9UQUcpIHtcbiAgICAgICAgICB0aGlzLmJvZHkuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKFxuICAgICAgICBwcmV2RGF0YS5jb2xsaXNpb25GaWx0ZXJHcm91cCAhPT0gZGF0YS5jb2xsaXNpb25GaWx0ZXJHcm91cCB8fFxuICAgICAgICBwcmV2RGF0YS5jb2xsaXNpb25GaWx0ZXJNYXNrICE9PSBkYXRhLmNvbGxpc2lvbkZpbHRlck1hc2tcbiAgICAgICkge1xuICAgICAgICBjb25zdCBicm9hZHBoYXNlUHJveHkgPSB0aGlzLmJvZHkuZ2V0QnJvYWRwaGFzZVByb3h5KCk7XG4gICAgICAgIGJyb2FkcGhhc2VQcm94eS5zZXRfbV9jb2xsaXNpb25GaWx0ZXJHcm91cChkYXRhLmNvbGxpc2lvbkZpbHRlckdyb3VwKTtcbiAgICAgICAgYnJvYWRwaGFzZVByb3h5LnNldF9tX2NvbGxpc2lvbkZpbHRlck1hc2soZGF0YS5jb2xsaXNpb25GaWx0ZXJNYXNrKTtcbiAgICAgICAgdGhpcy5zeXN0ZW0uZHJpdmVyLmJyb2FkcGhhc2VcbiAgICAgICAgICAuZ2V0T3ZlcmxhcHBpbmdQYWlyQ2FjaGUoKVxuICAgICAgICAgIC5yZW1vdmVPdmVybGFwcGluZ1BhaXJzQ29udGFpbmluZ1Byb3h5KGJyb2FkcGhhc2VQcm94eSwgdGhpcy5zeXN0ZW0uZHJpdmVyLmRpc3BhdGNoZXIpO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJldkRhdGEubGluZWFyRGFtcGluZyAhPSBkYXRhLmxpbmVhckRhbXBpbmcgfHwgcHJldkRhdGEuYW5ndWxhckRhbXBpbmcgIT0gZGF0YS5hbmd1bGFyRGFtcGluZykge1xuICAgICAgICB0aGlzLmJvZHkuc2V0RGFtcGluZyhkYXRhLmxpbmVhckRhbXBpbmcsIGRhdGEuYW5ndWxhckRhbXBpbmcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWFsbW9zdEVxdWFsc1ZlY3RvcjMoMC4wMDEsIHByZXZEYXRhLmdyYXZpdHksIGRhdGEuZ3Jhdml0eSkpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlQm9keUdyYXZpdHkoZGF0YS5ncmF2aXR5KVxuICAgICAgfVxuXG4gICAgICBpZiAoXG4gICAgICAgIHByZXZEYXRhLmxpbmVhclNsZWVwaW5nVGhyZXNob2xkICE9IGRhdGEubGluZWFyU2xlZXBpbmdUaHJlc2hvbGQgfHxcbiAgICAgICAgcHJldkRhdGEuYW5ndWxhclNsZWVwaW5nVGhyZXNob2xkICE9IGRhdGEuYW5ndWxhclNsZWVwaW5nVGhyZXNob2xkXG4gICAgICApIHtcbiAgICAgICAgdGhpcy5ib2R5LnNldFNsZWVwaW5nVGhyZXNob2xkcyhkYXRhLmxpbmVhclNsZWVwaW5nVGhyZXNob2xkLCBkYXRhLmFuZ3VsYXJTbGVlcGluZ1RocmVzaG9sZCk7XG4gICAgICB9XG5cbiAgICAgIGlmICghYWxtb3N0RXF1YWxzVmVjdG9yMygwLjAwMSwgcHJldkRhdGEuYW5ndWxhckZhY3RvciwgZGF0YS5hbmd1bGFyRmFjdG9yKSkge1xuICAgICAgICBjb25zdCBhbmd1bGFyRmFjdG9yID0gbmV3IEFtbW8uYnRWZWN0b3IzKGRhdGEuYW5ndWxhckZhY3Rvci54LCBkYXRhLmFuZ3VsYXJGYWN0b3IueSwgZGF0YS5hbmd1bGFyRmFjdG9yLnopO1xuICAgICAgICB0aGlzLmJvZHkuc2V0QW5ndWxhckZhY3Rvcihhbmd1bGFyRmFjdG9yKTtcbiAgICAgICAgQW1tby5kZXN0cm95KGFuZ3VsYXJGYWN0b3IpO1xuICAgICAgfVxuXG4gICAgICBpZiAocHJldkRhdGEucmVzdGl0dXRpb24gIT0gZGF0YS5yZXN0aXR1dGlvbiApIHtcbiAgICAgICAgY29uc29sZS53YXJuKFwiYW1tby1ib2R5IHJlc3RpdHV0aW9uIGNhbm5vdCBiZSB1cGRhdGVkIGZyb20gaXRzIGluaXRpYWwgdmFsdWUuXCIpXG4gICAgICB9XG5cbiAgICAgIC8vVE9ETzogc3VwcG9ydCBkeW5hbWljIHVwZGF0ZSBmb3Igb3RoZXIgcHJvcGVydGllc1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyB0aGUgY29tcG9uZW50IGFuZCBhbGwgcGh5c2ljcyBhbmQgc2NlbmUgc2lkZSBlZmZlY3RzLlxuICAgKi9cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy50cmlNZXNoKSBBbW1vLmRlc3Ryb3kodGhpcy50cmlNZXNoKTtcbiAgICBpZiAodGhpcy5sb2NhbFNjYWxpbmcpIEFtbW8uZGVzdHJveSh0aGlzLmxvY2FsU2NhbGluZyk7XG4gICAgaWYgKHRoaXMuY29tcG91bmRTaGFwZSkgQW1tby5kZXN0cm95KHRoaXMuY29tcG91bmRTaGFwZSk7XG4gICAgaWYgKHRoaXMuYm9keSkge1xuICAgICAgQW1tby5kZXN0cm95KHRoaXMuYm9keSk7XG4gICAgICBkZWxldGUgdGhpcy5ib2R5O1xuICAgIH1cbiAgICBBbW1vLmRlc3Ryb3kodGhpcy5yYkluZm8pO1xuICAgIEFtbW8uZGVzdHJveSh0aGlzLm1zVHJhbnNmb3JtKTtcbiAgICBBbW1vLmRlc3Ryb3kodGhpcy5tb3Rpb25TdGF0ZSk7XG4gICAgQW1tby5kZXN0cm95KHRoaXMubG9jYWxJbmVydGlhKTtcbiAgICBBbW1vLmRlc3Ryb3kodGhpcy5yb3RhdGlvbik7XG4gIH0sXG5cbiAgYmVmb3JlU3RlcDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fdXBkYXRlU2hhcGVzKCk7XG4gICAgLy8gTm90ZSB0aGF0IHNpbmNlIHN0YXRpYyBvYmplY3RzIGRvbid0IG1vdmUsXG4gICAgLy8gd2UgZG9uJ3Qgc3luYyB0aGVtIHRvIHBoeXNpY3Mgb24gYSByb3V0aW5lIGJhc2lzLlxuICAgIGlmICh0aGlzLmRhdGEudHlwZSA9PT0gVFlQRS5LSU5FTUFUSUMpIHtcbiAgICAgIHRoaXMuc3luY1RvUGh5c2ljcygpO1xuICAgIH1cbiAgfSxcblxuICBzdGVwOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kYXRhLnR5cGUgPT09IFRZUEUuRFlOQU1JQykge1xuICAgICAgdGhpcy5zeW5jRnJvbVBoeXNpY3MoKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHJpZ2lkIGJvZHkncyBwb3NpdGlvbiwgdmVsb2NpdHksIGFuZCByb3RhdGlvbiwgYmFzZWQgb24gdGhlIHNjZW5lLlxuICAgKi9cbiAgc3luY1RvUGh5c2ljczogKGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuICAgIGNvbnN0IHYgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgIGNvbnN0IHEyID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcbiAgICBjb25zdCB2MiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgZWwgPSB0aGlzLmVsLFxuICAgICAgICBwYXJlbnRFbCA9IGVsLnBhcmVudEVsLFxuICAgICAgICBib2R5ID0gdGhpcy5ib2R5O1xuXG4gICAgICBpZiAoIWJvZHkpIHJldHVybjtcblxuICAgICAgdGhpcy5tb3Rpb25TdGF0ZS5nZXRXb3JsZFRyYW5zZm9ybSh0aGlzLm1zVHJhbnNmb3JtKTtcblxuICAgICAgaWYgKHBhcmVudEVsLmlzU2NlbmUpIHtcbiAgICAgICAgdi5jb3B5KGVsLm9iamVjdDNELnBvc2l0aW9uKTtcbiAgICAgICAgcS5jb3B5KGVsLm9iamVjdDNELnF1YXRlcm5pb24pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwub2JqZWN0M0QuZ2V0V29ybGRQb3NpdGlvbih2KTtcbiAgICAgICAgZWwub2JqZWN0M0QuZ2V0V29ybGRRdWF0ZXJuaW9uKHEpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwb3NpdGlvbiA9IHRoaXMubXNUcmFuc2Zvcm0uZ2V0T3JpZ2luKCk7XG4gICAgICB2Mi5zZXQocG9zaXRpb24ueCgpLCBwb3NpdGlvbi55KCksIHBvc2l0aW9uLnooKSk7XG5cbiAgICAgIGNvbnN0IHF1YXRlcm5pb24gPSB0aGlzLm1zVHJhbnNmb3JtLmdldFJvdGF0aW9uKCk7XG4gICAgICBxMi5zZXQocXVhdGVybmlvbi54KCksIHF1YXRlcm5pb24ueSgpLCBxdWF0ZXJuaW9uLnooKSwgcXVhdGVybmlvbi53KCkpO1xuXG4gICAgICBpZiAoIWFsbW9zdEVxdWFsc1ZlY3RvcjMoMC4wMDEsIHYsIHYyKSB8fCAhYWxtb3N0RXF1YWxzUXVhdGVybmlvbigwLjAwMSwgcSwgcTIpKSB7XG4gICAgICAgIGlmICghdGhpcy5ib2R5LmlzQWN0aXZlKCkpIHtcbiAgICAgICAgICB0aGlzLmJvZHkuYWN0aXZhdGUodHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5tc1RyYW5zZm9ybS5nZXRPcmlnaW4oKS5zZXRWYWx1ZSh2LngsIHYueSwgdi56KTtcbiAgICAgICAgdGhpcy5yb3RhdGlvbi5zZXRWYWx1ZShxLngsIHEueSwgcS56LCBxLncpO1xuICAgICAgICB0aGlzLm1zVHJhbnNmb3JtLnNldFJvdGF0aW9uKHRoaXMucm90YXRpb24pO1xuICAgICAgICB0aGlzLm1vdGlvblN0YXRlLnNldFdvcmxkVHJhbnNmb3JtKHRoaXMubXNUcmFuc2Zvcm0pO1xuXG4gICAgICAgIGlmICh0aGlzLmRhdGEudHlwZSAhPT0gVFlQRS5LSU5FTUFUSUMpIHtcbiAgICAgICAgICB0aGlzLmJvZHkuc2V0Q2VudGVyT2ZNYXNzVHJhbnNmb3JtKHRoaXMubXNUcmFuc2Zvcm0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfSkoKSxcblxuICAvKipcbiAgICogVXBkYXRlcyB0aGUgc2NlbmUgb2JqZWN0J3MgcG9zaXRpb24gYW5kIHJvdGF0aW9uLCBiYXNlZCBvbiB0aGUgcGh5c2ljcyBzaW11bGF0aW9uLlxuICAgKi9cbiAgc3luY0Zyb21QaHlzaWNzOiAoZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgdiA9IG5ldyBUSFJFRS5WZWN0b3IzKCksXG4gICAgICBxMSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCksXG4gICAgICBxMiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5tb3Rpb25TdGF0ZS5nZXRXb3JsZFRyYW5zZm9ybSh0aGlzLm1zVHJhbnNmb3JtKTtcbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gdGhpcy5tc1RyYW5zZm9ybS5nZXRPcmlnaW4oKTtcbiAgICAgIGNvbnN0IHF1YXRlcm5pb24gPSB0aGlzLm1zVHJhbnNmb3JtLmdldFJvdGF0aW9uKCk7XG5cbiAgICAgIGNvbnN0IGVsID0gdGhpcy5lbCxcbiAgICAgICAgYm9keSA9IHRoaXMuYm9keTtcblxuICAgICAgLy8gRm9yIHRoZSBwYXJlbnQsIHByZWZlciB0byB1c2UgdGhlIFRISFJFRS5qcyBzY2VuZSBncmFwaCBwYXJlbnQgKGlmIGl0IGNhbiBiZSBkZXRlcm1pbmVkKVxuICAgICAgLy8gYW5kIG9ubHkgdXNlIHRoZSBIVE1MIHNjZW5lIGdyYXBoIHBhcmVudCBhcyBhIGZhbGxiYWNrLlxuICAgICAgLy8gVXN1YWxseSB0aGVzZSBhcmUgdGhlIHNhbWUsIGJ1dCB0aGVyZSBhcmUgdmFyaW91cyBjYXNlcyB3aGVyZSBpdCdzIHVzZWZ1bCB0byBtb2RpZnkgdGhlIFRIUkVFLmpzXG4gICAgICAvLyBzY2VuZSBncmFwaCBzbyB0aGF0IGl0IGRldmlhdGVzIGZyb20gdGhlIEhUTUwuXG4gICAgICAvLyBJbiB0aGVzZSBjYXNlcyB0aGUgVEhSRUUuanMgc2NlbmUgZ3JhcGggc2hvdWxkIGJlIGNvbnNpZGVyZWQgdGhlIGRlZmluaXRpdmUgcmVmZXJlbmNlIGluIHRlcm1zXG4gICAgICAvLyBvZiBvYmplY3QgcG9zaXRpb25pbmcgZXRjLlxuICAgICAgLy8gRm9yIHNwZWNpZmljIGV4YW1wbGVzLCBhbmQgbW9yZSBkaXNjdXNzaW9uLCBzZWU6XG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYy1mcmFtZS9hZnJhbWUtcGh5c2ljcy1zeXN0ZW0vcHVsbC8xI2lzc3VlY29tbWVudC0xMjY0Njg2NDMzXG4gICAgICBjb25zdCBwYXJlbnRFbCA9IGVsLm9iamVjdDNELnBhcmVudC5lbCA/IGVsLm9iamVjdDNELnBhcmVudC5lbCA6IGVsLnBhcmVudEVsO1xuXG4gICAgICBpZiAoIWJvZHkpIHJldHVybjtcbiAgICAgIGlmICghcGFyZW50RWwpIHJldHVybjtcblxuICAgICAgaWYgKHBhcmVudEVsLmlzU2NlbmUpIHtcbiAgICAgICAgZWwub2JqZWN0M0QucG9zaXRpb24uc2V0KHBvc2l0aW9uLngoKSwgcG9zaXRpb24ueSgpLCBwb3NpdGlvbi56KCkpO1xuICAgICAgICBlbC5vYmplY3QzRC5xdWF0ZXJuaW9uLnNldChxdWF0ZXJuaW9uLngoKSwgcXVhdGVybmlvbi55KCksIHF1YXRlcm5pb24ueigpLCBxdWF0ZXJuaW9uLncoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxMS5zZXQocXVhdGVybmlvbi54KCksIHF1YXRlcm5pb24ueSgpLCBxdWF0ZXJuaW9uLnooKSwgcXVhdGVybmlvbi53KCkpO1xuICAgICAgICBwYXJlbnRFbC5vYmplY3QzRC5nZXRXb3JsZFF1YXRlcm5pb24ocTIpO1xuICAgICAgICBxMS5tdWx0aXBseShxMi5pbnZlcnQoKSk7XG4gICAgICAgIGVsLm9iamVjdDNELnF1YXRlcm5pb24uY29weShxMSk7XG5cbiAgICAgICAgdi5zZXQocG9zaXRpb24ueCgpLCBwb3NpdGlvbi55KCksIHBvc2l0aW9uLnooKSk7XG4gICAgICAgIHBhcmVudEVsLm9iamVjdDNELndvcmxkVG9Mb2NhbCh2KTtcbiAgICAgICAgZWwub2JqZWN0M0QucG9zaXRpb24uY29weSh2KTtcbiAgICAgIH1cbiAgICB9O1xuICB9KSgpLFxuXG4gIGFkZFNoYXBlQ29tcG9uZW50OiBmdW5jdGlvbihzaGFwZUNvbXBvbmVudCkge1xuICAgIGlmIChzaGFwZUNvbXBvbmVudC5kYXRhLnR5cGUgPT09IFNIQVBFLk1FU0ggJiYgdGhpcy5kYXRhLnR5cGUgIT09IFRZUEUuU1RBVElDKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJub24tc3RhdGljIG1lc2ggY29sbGlkZXJzIG5vdCBzdXBwb3J0ZWRcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zaGFwZUNvbXBvbmVudHMucHVzaChzaGFwZUNvbXBvbmVudCk7XG4gICAgdGhpcy5zaGFwZUNvbXBvbmVudHNDaGFuZ2VkID0gdHJ1ZTtcbiAgfSxcblxuICByZW1vdmVTaGFwZUNvbXBvbmVudDogZnVuY3Rpb24oc2hhcGVDb21wb25lbnQpIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuc2hhcGVDb21wb25lbnRzLmluZGV4T2Yoc2hhcGVDb21wb25lbnQpO1xuICAgIGlmICh0aGlzLmNvbXBvdW5kU2hhcGUgJiYgaW5kZXggIT09IC0xICYmIHRoaXMuYm9keSkge1xuICAgICAgY29uc3Qgc2hhcGVzID0gc2hhcGVDb21wb25lbnQuZ2V0U2hhcGVzKCk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNoYXBlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmNvbXBvdW5kU2hhcGUucmVtb3ZlQ2hpbGRTaGFwZShzaGFwZXNbaV0pO1xuICAgICAgfVxuICAgICAgdGhpcy5zaGFwZUNvbXBvbmVudHNDaGFuZ2VkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc2hhcGVDb21wb25lbnRzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9LFxuXG4gIHVwZGF0ZU1hc3M6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHNoYXBlID0gdGhpcy5ib2R5LmdldENvbGxpc2lvblNoYXBlKCk7XG4gICAgY29uc3QgbWFzcyA9IHRoaXMuZGF0YS50eXBlID09PSBUWVBFLkRZTkFNSUMgPyB0aGlzLmRhdGEubWFzcyA6IDA7XG4gICAgc2hhcGUuY2FsY3VsYXRlTG9jYWxJbmVydGlhKG1hc3MsIHRoaXMubG9jYWxJbmVydGlhKTtcbiAgICB0aGlzLmJvZHkuc2V0TWFzc1Byb3BzKG1hc3MsIHRoaXMubG9jYWxJbmVydGlhKTtcbiAgICB0aGlzLmJvZHkudXBkYXRlSW5lcnRpYVRlbnNvcigpO1xuICB9LFxuXG4gIHVwZGF0ZUNvbGxpc2lvbkZsYWdzOiBmdW5jdGlvbigpIHtcbiAgICBsZXQgZmxhZ3MgPSB0aGlzLmRhdGEuZGlzYWJsZUNvbGxpc2lvbiA/IDQgOiAwO1xuICAgIHN3aXRjaCAodGhpcy5kYXRhLnR5cGUpIHtcbiAgICAgIGNhc2UgVFlQRS5TVEFUSUM6XG4gICAgICAgIGZsYWdzIHw9IENPTExJU0lPTl9GTEFHLlNUQVRJQ19PQkpFQ1Q7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBUWVBFLktJTkVNQVRJQzpcbiAgICAgICAgZmxhZ3MgfD0gQ09MTElTSU9OX0ZMQUcuS0lORU1BVElDX09CSkVDVDtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLmJvZHkuYXBwbHlHcmF2aXR5KCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLmJvZHkuc2V0Q29sbGlzaW9uRmxhZ3MoZmxhZ3MpO1xuXG4gICAgdGhpcy51cGRhdGVNYXNzKCk7XG5cbiAgICAvLyBUT0RPOiBlbmFibGUgQ0NEIGlmIGR5bmFtaWM/XG4gICAgLy8gdGhpcy5ib2R5LnNldENjZE1vdGlvblRocmVzaG9sZCgwLjAwMSk7XG4gICAgLy8gdGhpcy5ib2R5LnNldENjZFN3ZXB0U3BoZXJlUmFkaXVzKDAuMDAxKTtcblxuICAgIHRoaXMuc3lzdGVtLmRyaXZlci51cGRhdGVCb2R5KHRoaXMuYm9keSk7XG4gIH0sXG5cbiAgZ2V0VmVsb2NpdHk6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmJvZHkuZ2V0TGluZWFyVmVsb2NpdHkoKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMuZGVmaW5pdGlvbiA9IEFtbW9Cb2R5O1xubW9kdWxlLmV4cG9ydHMuQ29tcG9uZW50ID0gQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KFwiYW1tby1ib2R5XCIsIEFtbW9Cb2R5KTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAndmVsb2NpdHknOiAgIHJlcXVpcmUoJy4vdmVsb2NpdHknKSxcblxuICByZWdpc3RlckFsbDogZnVuY3Rpb24gKEFGUkFNRSkge1xuICAgIGlmICh0aGlzLl9yZWdpc3RlcmVkKSByZXR1cm47XG5cbiAgICBBRlJBTUUgPSBBRlJBTUUgfHwgd2luZG93LkFGUkFNRTtcblxuICAgIGlmICghQUZSQU1FLmNvbXBvbmVudHNbJ3ZlbG9jaXR5J10pICAgIEFGUkFNRS5yZWdpc3RlckNvbXBvbmVudCgndmVsb2NpdHknLCAgIHRoaXMudmVsb2NpdHkpO1xuXG4gICAgdGhpcy5fcmVnaXN0ZXJlZCA9IHRydWU7XG4gIH1cbn07XG4iLCIvKipcbiAqIFZlbG9jaXR5LCBpbiBtL3MuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQUZSQU1FLnJlZ2lzdGVyQ29tcG9uZW50KCd2ZWxvY2l0eScsIHtcbiAgc2NoZW1hOiB7dHlwZTogJ3ZlYzMnfSxcblxuICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5zeXN0ZW0gPSB0aGlzLmVsLnNjZW5lRWwuc3lzdGVtcy5waHlzaWNzO1xuXG4gICAgaWYgKHRoaXMuc3lzdGVtKSB7XG4gICAgICB0aGlzLnN5c3RlbS5hZGRDb21wb25lbnQodGhpcyk7XG4gICAgfVxuICB9LFxuXG4gIHJlbW92ZTogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLnN5c3RlbSkge1xuICAgICAgdGhpcy5zeXN0ZW0ucmVtb3ZlQ29tcG9uZW50KHRoaXMpO1xuICAgIH1cbiAgfSxcblxuICB0aWNrOiBmdW5jdGlvbiAodCwgZHQpIHtcbiAgICBpZiAoIWR0KSByZXR1cm47XG4gICAgaWYgKHRoaXMuc3lzdGVtKSByZXR1cm47XG4gICAgdGhpcy5hZnRlclN0ZXAodCwgZHQpO1xuICB9LFxuXG4gIGFmdGVyU3RlcDogZnVuY3Rpb24gKHQsIGR0KSB7XG4gICAgaWYgKCFkdCkgcmV0dXJuO1xuXG4gICAgdmFyIHBoeXNpY3MgPSB0aGlzLmVsLnNjZW5lRWwuc3lzdGVtcy5waHlzaWNzIHx8IHtkYXRhOiB7bWF4SW50ZXJ2YWw6IDEgLyA2MH19LFxuXG4gICAgLy8gVE9ETyAtIFRoZXJlJ3MgZGVmaW5pdGVseSBhIGJ1ZyB3aXRoIGdldENvbXB1dGVkQXR0cmlidXRlIGFuZCBlbC5kYXRhLlxuICAgIHZlbG9jaXR5ID0gdGhpcy5lbC5nZXRBdHRyaWJ1dGUoJ3ZlbG9jaXR5JykgfHwge3g6IDAsIHk6IDAsIHo6IDB9LFxuICAgIHBvc2l0aW9uID0gdGhpcy5lbC5vYmplY3QzRC5wb3NpdGlvbiB8fCB7eDogMCwgeTogMCwgejogMH07XG5cbiAgICBkdCA9IE1hdGgubWluKGR0LCBwaHlzaWNzLmRhdGEubWF4SW50ZXJ2YWwgKiAxMDAwKTtcblxuICAgIHRoaXMuZWwub2JqZWN0M0QucG9zaXRpb24uc2V0KFxuICAgICAgcG9zaXRpb24ueCArIHZlbG9jaXR5LnggKiBkdCAvIDEwMDAsXG4gICAgICBwb3NpdGlvbi55ICsgdmVsb2NpdHkueSAqIGR0IC8gMTAwMCxcbiAgICAgIHBvc2l0aW9uLnogKyB2ZWxvY2l0eS56ICogZHQgLyAxMDAwXG4gICAgKTtcbiAgfVxufSk7XG4iLCIvKiBnbG9iYWwgQW1tbyxUSFJFRSAqL1xuY29uc3QgdGhyZWVUb0FtbW8gPSByZXF1aXJlKFwidGhyZWUtdG8tYW1tb1wiKTtcbmNvbnN0IENPTlNUQU5UUyA9IHJlcXVpcmUoXCIuLi8uLi9jb25zdGFudHNcIiksXG4gIFNIQVBFID0gQ09OU1RBTlRTLlNIQVBFLFxuICBGSVQgPSBDT05TVEFOVFMuRklUO1xuXG52YXIgQW1tb1NoYXBlID0ge1xuICBzY2hlbWE6IHtcbiAgICB0eXBlOiB7XG4gICAgICBkZWZhdWx0OiBTSEFQRS5IVUxMLFxuICAgICAgb25lT2Y6IFtcbiAgICAgICAgU0hBUEUuQk9YLFxuICAgICAgICBTSEFQRS5DWUxJTkRFUixcbiAgICAgICAgU0hBUEUuU1BIRVJFLFxuICAgICAgICBTSEFQRS5DQVBTVUxFLFxuICAgICAgICBTSEFQRS5DT05FLFxuICAgICAgICBTSEFQRS5IVUxMLFxuICAgICAgICBTSEFQRS5IQUNELFxuICAgICAgICBTSEFQRS5WSEFDRCxcbiAgICAgICAgU0hBUEUuTUVTSCxcbiAgICAgICAgU0hBUEUuSEVJR0hURklFTERcbiAgICAgIF1cbiAgICB9LFxuICAgIGZpdDogeyBkZWZhdWx0OiBGSVQuQUxMLCBvbmVPZjogW0ZJVC5BTEwsIEZJVC5NQU5VQUxdIH0sXG4gICAgaGFsZkV4dGVudHM6IHsgdHlwZTogXCJ2ZWMzXCIsIGRlZmF1bHQ6IHsgeDogMSwgeTogMSwgejogMSB9IH0sXG4gICAgbWluSGFsZkV4dGVudDogeyBkZWZhdWx0OiAwIH0sXG4gICAgbWF4SGFsZkV4dGVudDogeyBkZWZhdWx0OiBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFkgfSxcbiAgICBzcGhlcmVSYWRpdXM6IHsgZGVmYXVsdDogTmFOIH0sXG4gICAgY3lsaW5kZXJBeGlzOiB7IGRlZmF1bHQ6IFwieVwiLCBvbmVPZjogW1wieFwiLCBcInlcIiwgXCJ6XCJdIH0sXG4gICAgbWFyZ2luOiB7IGRlZmF1bHQ6IDAuMDEgfSxcbiAgICBvZmZzZXQ6IHsgdHlwZTogXCJ2ZWMzXCIsIGRlZmF1bHQ6IHsgeDogMCwgeTogMCwgejogMCB9IH0sXG4gICAgb3JpZW50YXRpb246IHsgdHlwZTogXCJ2ZWM0XCIsIGRlZmF1bHQ6IHsgeDogMCwgeTogMCwgejogMCwgdzogMSB9IH0sXG4gICAgaGVpZ2h0ZmllbGREYXRhOiB7IGRlZmF1bHQ6IFtdIH0sXG4gICAgaGVpZ2h0ZmllbGREaXN0YW5jZTogeyBkZWZhdWx0OiAxIH0sXG4gICAgaW5jbHVkZUludmlzaWJsZTogeyBkZWZhdWx0OiBmYWxzZSB9XG4gIH0sXG5cbiAgbXVsdGlwbGU6IHRydWUsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5maXQgIT09IEZJVC5NQU5VQUwpIHtcbiAgICAgIGlmICh0aGlzLmVsLm9iamVjdDNETWFwLm1lc2gpIHtcblx0dGhpcy5tZXNoID0gdGhpcy5lbC5vYmplY3QzRE1hcC5tZXNoO1xuICAgICAgfSBlbHNlIHtcblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdHRoaXMuZWwuYWRkRXZlbnRMaXN0ZW5lcihcIm9iamVjdDNkc2V0XCIsIGZ1bmN0aW9uIChlKSB7XG5cdCAgaWYgKGUuZGV0YWlsLnR5cGUgPT09IFwibWVzaFwiKSB7XG5cdCAgICBzZWxmLmluaXQoKTtcblx0ICB9XG5cdH0pO1xuXHRjb25zb2xlLmxvZyhcIkNhbm5vdCB1c2UgRklULkFMTCB3aXRob3V0IG9iamVjdDNETWFwLm1lc2guIFdhaXRpbmcgZm9yIGl0IHRvIGJlIHNldC5cIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnN5c3RlbSA9IHRoaXMuZWwuc2NlbmVFbC5zeXN0ZW1zLnBoeXNpY3M7XG4gICAgdGhpcy5jb2xsaXNpb25TaGFwZXMgPSBbXTtcblxuICAgIGxldCBib2R5RWwgPSB0aGlzLmVsO1xuICAgIHRoaXMuYm9keSA9IGJvZHlFbC5jb21wb25lbnRzW1wiYW1tby1ib2R5XCJdIHx8IG51bGw7XG4gICAgd2hpbGUgKCF0aGlzLmJvZHkgJiYgYm9keUVsLnBhcmVudE5vZGUgIT0gdGhpcy5lbC5zY2VuZUVsKSB7XG4gICAgICBib2R5RWwgPSBib2R5RWwucGFyZW50Tm9kZTtcbiAgICAgIGlmIChib2R5RWwuY29tcG9uZW50c1tcImFtbW8tYm9keVwiXSkge1xuICAgICAgICB0aGlzLmJvZHkgPSBib2R5RWwuY29tcG9uZW50c1tcImFtbW8tYm9keVwiXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCF0aGlzLmJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcImJvZHkgbm90IGZvdW5kXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmJvZHkuYWRkU2hhcGVDb21wb25lbnQodGhpcyk7XG4gIH0sXG5cbiAgZ2V0TWVzaDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWVzaCB8fCBudWxsO1xuICB9LFxuXG4gIGFkZFNoYXBlczogZnVuY3Rpb24oY29sbGlzaW9uU2hhcGVzKSB7XG4gICAgdGhpcy5jb2xsaXNpb25TaGFwZXMgPSBjb2xsaXNpb25TaGFwZXM7XG4gIH0sXG5cbiAgZ2V0U2hhcGVzOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5jb2xsaXNpb25TaGFwZXM7XG4gIH0sXG5cbiAgcmVtb3ZlOiBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuYm9keSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuYm9keS5yZW1vdmVTaGFwZUNvbXBvbmVudCh0aGlzKTtcblxuICAgIHdoaWxlICh0aGlzLmNvbGxpc2lvblNoYXBlcy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBjb2xsaXNpb25TaGFwZSA9IHRoaXMuY29sbGlzaW9uU2hhcGVzLnBvcCgpO1xuICAgICAgY29sbGlzaW9uU2hhcGUuZGVzdHJveSgpO1xuICAgICAgQW1tby5kZXN0cm95KGNvbGxpc2lvblNoYXBlLmxvY2FsVHJhbnNmb3JtKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzLmRlZmluaXRpb24gPSBBbW1vU2hhcGU7XG5tb2R1bGUuZXhwb3J0cy5Db21wb25lbnQgPSBBRlJBTUUucmVnaXN0ZXJDb21wb25lbnQoXCJhbW1vLXNoYXBlXCIsIEFtbW9TaGFwZSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgR1JBVklUWTogLTkuOCxcbiAgTUFYX0lOVEVSVkFMOiA0IC8gNjAsXG4gIElURVJBVElPTlM6IDEwLFxuICBDT05UQUNUX01BVEVSSUFMOiB7XG4gICAgZnJpY3Rpb246IDAuMDEsXG4gICAgcmVzdGl0dXRpb246IDAuMyxcbiAgICBjb250YWN0RXF1YXRpb25TdGlmZm5lc3M6IDFlOCxcbiAgICBjb250YWN0RXF1YXRpb25SZWxheGF0aW9uOiAzLFxuICAgIGZyaWN0aW9uRXF1YXRpb25TdGlmZm5lc3M6IDFlOCxcbiAgICBmcmljdGlvbkVxdWF0aW9uUmVndWxhcml6YXRpb246IDNcbiAgfSxcbiAgQUNUSVZBVElPTl9TVEFURToge1xuICAgIEFDVElWRV9UQUc6IFwiYWN0aXZlXCIsXG4gICAgSVNMQU5EX1NMRUVQSU5HOiBcImlzbGFuZFNsZWVwaW5nXCIsXG4gICAgV0FOVFNfREVBQ1RJVkFUSU9OOiBcIndhbnRzRGVhY3RpdmF0aW9uXCIsXG4gICAgRElTQUJMRV9ERUFDVElWQVRJT046IFwiZGlzYWJsZURlYWN0aXZhdGlvblwiLFxuICAgIERJU0FCTEVfU0lNVUxBVElPTjogXCJkaXNhYmxlU2ltdWxhdGlvblwiXG4gIH0sXG4gIENPTExJU0lPTl9GTEFHOiB7XG4gICAgU1RBVElDX09CSkVDVDogMSxcbiAgICBLSU5FTUFUSUNfT0JKRUNUOiAyLFxuICAgIE5PX0NPTlRBQ1RfUkVTUE9OU0U6IDQsXG4gICAgQ1VTVE9NX01BVEVSSUFMX0NBTExCQUNLOiA4LCAvL3RoaXMgYWxsb3dzIHBlci10cmlhbmdsZSBtYXRlcmlhbCAoZnJpY3Rpb24vcmVzdGl0dXRpb24pXG4gICAgQ0hBUkFDVEVSX09CSkVDVDogMTYsXG4gICAgRElTQUJMRV9WSVNVQUxJWkVfT0JKRUNUOiAzMiwgLy9kaXNhYmxlIGRlYnVnIGRyYXdpbmdcbiAgICBESVNBQkxFX1NQVV9DT0xMSVNJT05fUFJPQ0VTU0lORzogNjQgLy9kaXNhYmxlIHBhcmFsbGVsL1NQVSBwcm9jZXNzaW5nXG4gIH0sXG4gIFRZUEU6IHtcbiAgICBTVEFUSUM6IFwic3RhdGljXCIsXG4gICAgRFlOQU1JQzogXCJkeW5hbWljXCIsXG4gICAgS0lORU1BVElDOiBcImtpbmVtYXRpY1wiXG4gIH0sXG4gIFNIQVBFOiB7XG4gICAgQk9YOiBcImJveFwiLFxuICAgIENZTElOREVSOiBcImN5bGluZGVyXCIsXG4gICAgU1BIRVJFOiBcInNwaGVyZVwiLFxuICAgIENBUFNVTEU6IFwiY2Fwc3VsZVwiLFxuICAgIENPTkU6IFwiY29uZVwiLFxuICAgIEhVTEw6IFwiaHVsbFwiLFxuICAgIEhBQ0Q6IFwiaGFjZFwiLFxuICAgIFZIQUNEOiBcInZoYWNkXCIsXG4gICAgTUVTSDogXCJtZXNoXCIsXG4gICAgSEVJR0hURklFTEQ6IFwiaGVpZ2h0ZmllbGRcIlxuICB9LFxuICBGSVQ6IHtcbiAgICBBTEw6IFwiYWxsXCIsXG4gICAgTUFOVUFMOiBcIm1hbnVhbFwiXG4gIH0sXG4gIENPTlNUUkFJTlQ6IHtcbiAgICBMT0NLOiBcImxvY2tcIixcbiAgICBGSVhFRDogXCJmaXhlZFwiLFxuICAgIFNQUklORzogXCJzcHJpbmdcIixcbiAgICBTTElERVI6IFwic2xpZGVyXCIsXG4gICAgSElOR0U6IFwiaGluZ2VcIixcbiAgICBDT05FX1RXSVNUOiBcImNvbmVUd2lzdFwiLFxuICAgIFBPSU5UX1RPX1BPSU5UOiBcInBvaW50VG9Qb2ludFwiXG4gIH1cbn07XG4iLCIvKiBnbG9iYWwgVEhSRUUgKi9cbmNvbnN0IERyaXZlciA9IHJlcXVpcmUoXCIuL2RyaXZlclwiKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5BbW1vTW9kdWxlID0gd2luZG93LkFtbW87XG4gIHdpbmRvdy5BbW1vID0gbnVsbDtcbn1cblxuY29uc3QgRVBTID0gMTBlLTY7XG5cbmZ1bmN0aW9uIEFtbW9Ecml2ZXIoKSB7XG4gIHRoaXMuY29sbGlzaW9uQ29uZmlndXJhdGlvbiA9IG51bGw7XG4gIHRoaXMuZGlzcGF0Y2hlciA9IG51bGw7XG4gIHRoaXMuYnJvYWRwaGFzZSA9IG51bGw7XG4gIHRoaXMuc29sdmVyID0gbnVsbDtcbiAgdGhpcy5waHlzaWNzV29ybGQgPSBudWxsO1xuICB0aGlzLmRlYnVnRHJhd2VyID0gbnVsbDtcblxuICB0aGlzLmVscyA9IG5ldyBNYXAoKTtcbiAgdGhpcy5ldmVudExpc3RlbmVycyA9IFtdO1xuICB0aGlzLmNvbGxpc2lvbnMgPSBuZXcgTWFwKCk7XG4gIHRoaXMuY29sbGlzaW9uS2V5cyA9IFtdO1xuICB0aGlzLmN1cnJlbnRDb2xsaXNpb25zID0gbmV3IE1hcCgpO1xufVxuXG5BbW1vRHJpdmVyLnByb3RvdHlwZSA9IG5ldyBEcml2ZXIoKTtcbkFtbW9Ecml2ZXIucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQW1tb0RyaXZlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBBbW1vRHJpdmVyO1xuXG4vKiBAcGFyYW0ge29iamVjdH0gd29ybGRDb25maWcgKi9cbkFtbW9Ecml2ZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbih3b3JsZENvbmZpZykge1xuICAvL0Vtc2NyaXB0ZW4gZG9lc24ndCB1c2UgcmVhbCBwcm9taXNlcywganVzdCBhIC50aGVuKCkgY2FsbGJhY2ssIHNvIGl0IG5lY2Vzc2FyeSB0byB3cmFwIGluIGEgcmVhbCBwcm9taXNlLlxuICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgQW1tb01vZHVsZSgpLnRoZW4ocmVzdWx0ID0+IHtcbiAgICAgIEFtbW8gPSByZXN1bHQ7XG4gICAgICB0aGlzLmVwc2lsb24gPSB3b3JsZENvbmZpZy5lcHNpbG9uIHx8IEVQUztcbiAgICAgIHRoaXMuZGVidWdEcmF3TW9kZSA9IHdvcmxkQ29uZmlnLmRlYnVnRHJhd01vZGUgfHwgVEhSRUUuQW1tb0RlYnVnQ29uc3RhbnRzLk5vRGVidWc7XG4gICAgICB0aGlzLm1heFN1YlN0ZXBzID0gd29ybGRDb25maWcubWF4U3ViU3RlcHMgfHwgNDtcbiAgICAgIHRoaXMuZml4ZWRUaW1lU3RlcCA9IHdvcmxkQ29uZmlnLmZpeGVkVGltZVN0ZXAgfHwgMSAvIDYwO1xuICAgICAgdGhpcy5jb2xsaXNpb25Db25maWd1cmF0aW9uID0gbmV3IEFtbW8uYnREZWZhdWx0Q29sbGlzaW9uQ29uZmlndXJhdGlvbigpO1xuICAgICAgdGhpcy5kaXNwYXRjaGVyID0gbmV3IEFtbW8uYnRDb2xsaXNpb25EaXNwYXRjaGVyKHRoaXMuY29sbGlzaW9uQ29uZmlndXJhdGlvbik7XG4gICAgICB0aGlzLmJyb2FkcGhhc2UgPSBuZXcgQW1tby5idERidnRCcm9hZHBoYXNlKCk7XG4gICAgICB0aGlzLnNvbHZlciA9IG5ldyBBbW1vLmJ0U2VxdWVudGlhbEltcHVsc2VDb25zdHJhaW50U29sdmVyKCk7XG4gICAgICB0aGlzLnBoeXNpY3NXb3JsZCA9IG5ldyBBbW1vLmJ0RGlzY3JldGVEeW5hbWljc1dvcmxkKFxuICAgICAgICB0aGlzLmRpc3BhdGNoZXIsXG4gICAgICAgIHRoaXMuYnJvYWRwaGFzZSxcbiAgICAgICAgdGhpcy5zb2x2ZXIsXG4gICAgICAgIHRoaXMuY29sbGlzaW9uQ29uZmlndXJhdGlvblxuICAgICAgKTtcbiAgICAgIHRoaXMucGh5c2ljc1dvcmxkLnNldEZvcmNlVXBkYXRlQWxsQWFiYnMoZmFsc2UpO1xuICAgICAgdGhpcy5waHlzaWNzV29ybGQuc2V0R3Jhdml0eShcbiAgICAgICAgbmV3IEFtbW8uYnRWZWN0b3IzKDAsIHdvcmxkQ29uZmlnLmhhc093blByb3BlcnR5KFwiZ3Jhdml0eVwiKSA/IHdvcmxkQ29uZmlnLmdyYXZpdHkgOiAtOS44LCAwKVxuICAgICAgKTtcbiAgICAgIHRoaXMucGh5c2ljc1dvcmxkLmdldFNvbHZlckluZm8oKS5zZXRfbV9udW1JdGVyYXRpb25zKHdvcmxkQ29uZmlnLnNvbHZlckl0ZXJhdGlvbnMpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pO1xuICB9KTtcbn07XG5cbi8qIEBwYXJhbSB7QW1tby5idENvbGxpc2lvbk9iamVjdH0gYm9keSAqL1xuQW1tb0RyaXZlci5wcm90b3R5cGUuYWRkQm9keSA9IGZ1bmN0aW9uKGJvZHksIGdyb3VwLCBtYXNrKSB7XG4gIHRoaXMucGh5c2ljc1dvcmxkLmFkZFJpZ2lkQm9keShib2R5LCBncm91cCwgbWFzayk7XG4gIGNvbnN0IGJvZHlwdHIgPSBBbW1vLmdldFBvaW50ZXIoYm9keSk7XG4gIHRoaXMuZWxzLnNldChib2R5cHRyLCBib2R5LmVsKTtcbiAgdGhpcy5jb2xsaXNpb25zLnNldChib2R5cHRyLCBbXSk7XG4gIHRoaXMuY29sbGlzaW9uS2V5cy5wdXNoKGJvZHlwdHIpO1xuICB0aGlzLmN1cnJlbnRDb2xsaXNpb25zLnNldChib2R5cHRyLCBuZXcgU2V0KCkpO1xufTtcblxuLyogQHBhcmFtIHtBbW1vLmJ0Q29sbGlzaW9uT2JqZWN0fSBib2R5ICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5yZW1vdmVCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICB0aGlzLnBoeXNpY3NXb3JsZC5yZW1vdmVSaWdpZEJvZHkoYm9keSk7XG4gIHRoaXMucmVtb3ZlRXZlbnRMaXN0ZW5lcihib2R5KTtcbiAgY29uc3QgYm9keXB0ciA9IEFtbW8uZ2V0UG9pbnRlcihib2R5KTtcbiAgdGhpcy5lbHMuZGVsZXRlKGJvZHlwdHIpO1xuICB0aGlzLmNvbGxpc2lvbnMuZGVsZXRlKGJvZHlwdHIpO1xuICB0aGlzLmNvbGxpc2lvbktleXMuc3BsaWNlKHRoaXMuY29sbGlzaW9uS2V5cy5pbmRleE9mKGJvZHlwdHIpLCAxKTtcbiAgdGhpcy5jdXJyZW50Q29sbGlzaW9ucy5kZWxldGUoYm9keXB0cik7XG59O1xuXG5BbW1vRHJpdmVyLnByb3RvdHlwZS51cGRhdGVCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICBpZiAodGhpcy5lbHMuaGFzKEFtbW8uZ2V0UG9pbnRlcihib2R5KSkpIHtcbiAgICB0aGlzLnBoeXNpY3NXb3JsZC51cGRhdGVTaW5nbGVBYWJiKGJvZHkpO1xuICB9XG59O1xuXG4vKiBAcGFyYW0ge251bWJlcn0gZGVsdGFUaW1lICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24oZGVsdGFUaW1lKSB7XG4gIHRoaXMucGh5c2ljc1dvcmxkLnN0ZXBTaW11bGF0aW9uKGRlbHRhVGltZSwgdGhpcy5tYXhTdWJTdGVwcywgdGhpcy5maXhlZFRpbWVTdGVwKTtcblxuICBjb25zdCBudW1NYW5pZm9sZHMgPSB0aGlzLmRpc3BhdGNoZXIuZ2V0TnVtTWFuaWZvbGRzKCk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbnVtTWFuaWZvbGRzOyBpKyspIHtcbiAgICBjb25zdCBwZXJzaXN0ZW50TWFuaWZvbGQgPSB0aGlzLmRpc3BhdGNoZXIuZ2V0TWFuaWZvbGRCeUluZGV4SW50ZXJuYWwoaSk7XG4gICAgY29uc3QgbnVtQ29udGFjdHMgPSBwZXJzaXN0ZW50TWFuaWZvbGQuZ2V0TnVtQ29udGFjdHMoKTtcbiAgICBjb25zdCBib2R5MHB0ciA9IEFtbW8uZ2V0UG9pbnRlcihwZXJzaXN0ZW50TWFuaWZvbGQuZ2V0Qm9keTAoKSk7XG4gICAgY29uc3QgYm9keTFwdHIgPSBBbW1vLmdldFBvaW50ZXIocGVyc2lzdGVudE1hbmlmb2xkLmdldEJvZHkxKCkpO1xuICAgIGxldCBjb2xsaWRlZCA9IGZhbHNlO1xuXG4gICAgZm9yIChsZXQgaiA9IDA7IGogPCBudW1Db250YWN0czsgaisrKSB7XG4gICAgICBjb25zdCBtYW5pZm9sZFBvaW50ID0gcGVyc2lzdGVudE1hbmlmb2xkLmdldENvbnRhY3RQb2ludChqKTtcbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gbWFuaWZvbGRQb2ludC5nZXREaXN0YW5jZSgpO1xuICAgICAgaWYgKGRpc3RhbmNlIDw9IHRoaXMuZXBzaWxvbikge1xuICAgICAgICBjb2xsaWRlZCA9IHRydWU7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2xsaWRlZCkge1xuICAgICAgaWYgKHRoaXMuY29sbGlzaW9ucy5nZXQoYm9keTBwdHIpLmluZGV4T2YoYm9keTFwdHIpID09PSAtMSkge1xuICAgICAgICB0aGlzLmNvbGxpc2lvbnMuZ2V0KGJvZHkwcHRyKS5wdXNoKGJvZHkxcHRyKTtcbiAgICAgICAgaWYgKHRoaXMuZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihib2R5MHB0cikgIT09IC0xKSB7XG4gICAgICAgICAgdGhpcy5lbHMuZ2V0KGJvZHkwcHRyKS5lbWl0KFwiY29sbGlkZXN0YXJ0XCIsIHsgdGFyZ2V0RWw6IHRoaXMuZWxzLmdldChib2R5MXB0cikgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihib2R5MXB0cikgIT09IC0xKSB7XG4gICAgICAgICAgdGhpcy5lbHMuZ2V0KGJvZHkxcHRyKS5lbWl0KFwiY29sbGlkZXN0YXJ0XCIsIHsgdGFyZ2V0RWw6IHRoaXMuZWxzLmdldChib2R5MHB0cikgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuY3VycmVudENvbGxpc2lvbnMuZ2V0KGJvZHkwcHRyKS5hZGQoYm9keTFwdHIpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jb2xsaXNpb25LZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYm9keTBwdHIgPSB0aGlzLmNvbGxpc2lvbktleXNbaV07XG4gICAgY29uc3QgYm9keTFwdHJzID0gdGhpcy5jb2xsaXNpb25zLmdldChib2R5MHB0cik7XG4gICAgZm9yIChsZXQgaiA9IGJvZHkxcHRycy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgY29uc3QgYm9keTFwdHIgPSBib2R5MXB0cnNbal07XG4gICAgICBpZiAodGhpcy5jdXJyZW50Q29sbGlzaW9ucy5nZXQoYm9keTBwdHIpLmhhcyhib2R5MXB0cikpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5ldmVudExpc3RlbmVycy5pbmRleE9mKGJvZHkwcHRyKSAhPT0gLTEpIHtcbiAgICAgICAgdGhpcy5lbHMuZ2V0KGJvZHkwcHRyKS5lbWl0KFwiY29sbGlkZWVuZFwiLCB7IHRhcmdldEVsOiB0aGlzLmVscy5nZXQoYm9keTFwdHIpIH0pO1xuICAgICAgfVxuICAgICAgaWYgKHRoaXMuZXZlbnRMaXN0ZW5lcnMuaW5kZXhPZihib2R5MXB0cikgIT09IC0xKSB7XG4gICAgICAgIHRoaXMuZWxzLmdldChib2R5MXB0cikuZW1pdChcImNvbGxpZGVlbmRcIiwgeyB0YXJnZXRFbDogdGhpcy5lbHMuZ2V0KGJvZHkwcHRyKSB9KTtcbiAgICAgIH1cbiAgICAgIGJvZHkxcHRycy5zcGxpY2UoaiwgMSk7XG4gICAgfVxuICAgIHRoaXMuY3VycmVudENvbGxpc2lvbnMuZ2V0KGJvZHkwcHRyKS5jbGVhcigpO1xuICB9XG5cbiAgaWYgKHRoaXMuZGVidWdEcmF3ZXIpIHtcbiAgICB0aGlzLmRlYnVnRHJhd2VyLnVwZGF0ZSgpO1xuICB9XG59O1xuXG4vKiBAcGFyYW0gez99IGNvbnN0cmFpbnQgKi9cbkFtbW9Ecml2ZXIucHJvdG90eXBlLmFkZENvbnN0cmFpbnQgPSBmdW5jdGlvbihjb25zdHJhaW50KSB7XG4gIHRoaXMucGh5c2ljc1dvcmxkLmFkZENvbnN0cmFpbnQoY29uc3RyYWludCwgZmFsc2UpO1xufTtcblxuLyogQHBhcmFtIHs/fSBjb25zdHJhaW50ICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5yZW1vdmVDb25zdHJhaW50ID0gZnVuY3Rpb24oY29uc3RyYWludCkge1xuICB0aGlzLnBoeXNpY3NXb3JsZC5yZW1vdmVDb25zdHJhaW50KGNvbnN0cmFpbnQpO1xufTtcblxuLyogQHBhcmFtIHtBbW1vLmJ0Q29sbGlzaW9uT2JqZWN0fSBib2R5ICovXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oYm9keSkge1xuICB0aGlzLmV2ZW50TGlzdGVuZXJzLnB1c2goQW1tby5nZXRQb2ludGVyKGJvZHkpKTtcbn07XG5cbi8qIEBwYXJhbSB7QW1tby5idENvbGxpc2lvbk9iamVjdH0gYm9keSAqL1xuQW1tb0RyaXZlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGJvZHkpIHtcbiAgY29uc3QgcHRyID0gQW1tby5nZXRQb2ludGVyKGJvZHkpO1xuICBpZiAodGhpcy5ldmVudExpc3RlbmVycy5pbmRleE9mKHB0cikgIT09IC0xKSB7XG4gICAgdGhpcy5ldmVudExpc3RlbmVycy5zcGxpY2UodGhpcy5ldmVudExpc3RlbmVycy5pbmRleE9mKHB0ciksIDEpO1xuICB9XG59O1xuXG5BbW1vRHJpdmVyLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gIEFtbW8uZGVzdHJveSh0aGlzLmNvbGxpc2lvbkNvbmZpZ3VyYXRpb24pO1xuICBBbW1vLmRlc3Ryb3kodGhpcy5kaXNwYXRjaGVyKTtcbiAgQW1tby5kZXN0cm95KHRoaXMuYnJvYWRwaGFzZSk7XG4gIEFtbW8uZGVzdHJveSh0aGlzLnNvbHZlcik7XG4gIEFtbW8uZGVzdHJveSh0aGlzLnBoeXNpY3NXb3JsZCk7XG4gIEFtbW8uZGVzdHJveSh0aGlzLmRlYnVnRHJhd2VyKTtcbn07XG5cbi8qKlxuICogQHBhcmFtIHtUSFJFRS5TY2VuZX0gc2NlbmVcbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKi9cbkFtbW9Ecml2ZXIucHJvdG90eXBlLmdldERlYnVnRHJhd2VyID0gZnVuY3Rpb24oc2NlbmUsIG9wdGlvbnMpIHtcbiAgaWYgKCF0aGlzLmRlYnVnRHJhd2VyKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5kZWJ1Z0RyYXdNb2RlID0gb3B0aW9ucy5kZWJ1Z0RyYXdNb2RlIHx8IHRoaXMuZGVidWdEcmF3TW9kZTtcbiAgICB0aGlzLmRlYnVnRHJhd2VyID0gbmV3IFRIUkVFLkFtbW9EZWJ1Z0RyYXdlcihzY2VuZSwgdGhpcy5waHlzaWNzV29ybGQsIG9wdGlvbnMpO1xuICB9XG4gIHJldHVybiB0aGlzLmRlYnVnRHJhd2VyO1xufTtcbiIsIi8qKlxuICogRHJpdmVyIC0gZGVmaW5lcyBsaW1pdGVkIEFQSSB0byBsb2NhbCBhbmQgcmVtb3RlIHBoeXNpY3MgY29udHJvbGxlcnMuXG4gKi9cblxuZnVuY3Rpb24gRHJpdmVyICgpIHt9XG5cbm1vZHVsZS5leHBvcnRzID0gRHJpdmVyO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBMaWZlY3ljbGVcbiAqL1xuXG4vKiBAcGFyYW0ge29iamVjdH0gd29ybGRDb25maWcgKi9cbkRyaXZlci5wcm90b3R5cGUuaW5pdCA9IGFic3RyYWN0TWV0aG9kO1xuXG4vKiBAcGFyYW0ge251bWJlcn0gZGVsdGFNUyAqL1xuRHJpdmVyLnByb3RvdHlwZS5zdGVwID0gYWJzdHJhY3RNZXRob2Q7XG5cbkRyaXZlci5wcm90b3R5cGUuZGVzdHJveSA9IGFic3RyYWN0TWV0aG9kO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBCb2RpZXNcbiAqL1xuXG4vKiBAcGFyYW0ge0NBTk5PTi5Cb2R5fSBib2R5ICovXG5Ecml2ZXIucHJvdG90eXBlLmFkZEJvZHkgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyogQHBhcmFtIHtDQU5OT04uQm9keX0gYm9keSAqL1xuRHJpdmVyLnByb3RvdHlwZS5yZW1vdmVCb2R5ID0gYWJzdHJhY3RNZXRob2Q7XG5cbi8qKlxuICogQHBhcmFtIHtDQU5OT04uQm9keX0gYm9keVxuICogQHBhcmFtIHtzdHJpbmd9IG1ldGhvZE5hbWVcbiAqIEBwYXJhbSB7QXJyYXl9IGFyZ3NcbiAqL1xuRHJpdmVyLnByb3RvdHlwZS5hcHBseUJvZHlNZXRob2QgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqIEBwYXJhbSB7Q0FOTk9OLkJvZHl9IGJvZHkgKi9cbkRyaXZlci5wcm90b3R5cGUudXBkYXRlQm9keVByb3BlcnRpZXMgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogTWF0ZXJpYWxzXG4gKi9cblxuLyoqIEBwYXJhbSB7b2JqZWN0fSBtYXRlcmlhbENvbmZpZyAqL1xuRHJpdmVyLnByb3RvdHlwZS5hZGRNYXRlcmlhbCA9IGFic3RyYWN0TWV0aG9kO1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBtYXRlcmlhbE5hbWUxXG4gKiBAcGFyYW0ge3N0cmluZ30gbWF0ZXJpYWxOYW1lMlxuICogQHBhcmFtIHtvYmplY3R9IGNvbnRhY3RNYXRlcmlhbENvbmZpZ1xuICovXG5Ecml2ZXIucHJvdG90eXBlLmFkZENvbnRhY3RNYXRlcmlhbCA9IGFic3RyYWN0TWV0aG9kO1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKiBDb25zdHJhaW50c1xuICovXG5cbi8qIEBwYXJhbSB7Q0FOTk9OLkNvbnN0cmFpbnR9IGNvbnN0cmFpbnQgKi9cbkRyaXZlci5wcm90b3R5cGUuYWRkQ29uc3RyYWludCA9IGFic3RyYWN0TWV0aG9kO1xuXG4vKiBAcGFyYW0ge0NBTk5PTi5Db25zdHJhaW50fSBjb25zdHJhaW50ICovXG5Ecml2ZXIucHJvdG90eXBlLnJlbW92ZUNvbnN0cmFpbnQgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogQ29udGFjdHNcbiAqL1xuXG4vKiogQHJldHVybiB7QXJyYXk8b2JqZWN0Pn0gKi9cbkRyaXZlci5wcm90b3R5cGUuZ2V0Q29udGFjdHMgPSBhYnN0cmFjdE1ldGhvZDtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5mdW5jdGlvbiBhYnN0cmFjdE1ldGhvZCAoKSB7XG4gIHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcbn1cbiIsIi8qIGdsb2JhbCBUSFJFRSAqL1xudmFyIENPTlNUQU5UUyA9IHJlcXVpcmUoJy4vY29uc3RhbnRzJyksXG4gICAgQ19HUkFWID0gQ09OU1RBTlRTLkdSQVZJVFksXG4gICAgQ19NQVQgPSBDT05TVEFOVFMuQ09OVEFDVF9NQVRFUklBTDtcblxuY29uc3QgeyBUWVBFIH0gPSByZXF1aXJlKCcuL2NvbnN0YW50cycpO1xudmFyIEFtbW9Ecml2ZXIgPSByZXF1aXJlKCcuL2RyaXZlcnMvYW1tby1kcml2ZXInKTtcbnJlcXVpcmUoJ2FmcmFtZS1zdGF0cy1wYW5lbCcpXG5cbi8qKlxuICogUGh5c2ljcyBzeXN0ZW0uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQUZSQU1FLnJlZ2lzdGVyU3lzdGVtKCdwaHlzaWNzJywge1xuICBzY2hlbWE6IHtcbiAgICBkcml2ZXI6ICAgICAgICAgICAgICAgICAgICAgICAgIHsgZGVmYXVsdDogJ2FtbW8nLCBvbmVPZjogWydhbW1vJ10gfSxcbiAgICBuZXR3b3JrVXJsOiAgICAgICAgICAgICAgICAgICAgIHsgZGVmYXVsdDogJycsIGlmOiB7ZHJpdmVyOiAnbmV0d29yayd9IH0sXG5cbiAgICBncmF2aXR5OiAgICAgICAgICAgICAgICAgICAgICAgIHsgZGVmYXVsdDogQ19HUkFWIH0sXG4gICAgaXRlcmF0aW9uczogICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6IENPTlNUQU5UUy5JVEVSQVRJT05TIH0sXG4gICAgZnJpY3Rpb246ICAgICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6IENfTUFULmZyaWN0aW9uIH0sXG4gICAgcmVzdGl0dXRpb246ICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6IENfTUFULnJlc3RpdHV0aW9uIH0sXG4gICAgY29udGFjdEVxdWF0aW9uU3RpZmZuZXNzOiAgICAgICB7IGRlZmF1bHQ6IENfTUFULmNvbnRhY3RFcXVhdGlvblN0aWZmbmVzcyB9LFxuICAgIGNvbnRhY3RFcXVhdGlvblJlbGF4YXRpb246ICAgICAgeyBkZWZhdWx0OiBDX01BVC5jb250YWN0RXF1YXRpb25SZWxheGF0aW9uIH0sXG4gICAgZnJpY3Rpb25FcXVhdGlvblN0aWZmbmVzczogICAgICB7IGRlZmF1bHQ6IENfTUFULmZyaWN0aW9uRXF1YXRpb25TdGlmZm5lc3MgfSxcbiAgICBmcmljdGlvbkVxdWF0aW9uUmVndWxhcml6YXRpb246IHsgZGVmYXVsdDogQ19NQVQuZnJpY3Rpb25FcXVhdGlvblJlZ3VsYXJpemF0aW9uIH0sXG5cbiAgICAvLyBOZXZlciBzdGVwIG1vcmUgdGhhbiBmb3VyIGZyYW1lcyBhdCBvbmNlLiBFZmZlY3RpdmVseSBwYXVzZXMgdGhlIHNjZW5lXG4gICAgLy8gd2hlbiBvdXQgb2YgZm9jdXMsIGFuZCBwcmV2ZW50cyB3ZWlyZCBcImp1bXBzXCIgd2hlbiBmb2N1cyByZXR1cm5zLlxuICAgIG1heEludGVydmFsOiAgICAgICAgICAgICAgICAgICAgeyBkZWZhdWx0OiA0IC8gNjAgfSxcblxuICAgIC8vIElmIHRydWUsIHNob3cgd2lyZWZyYW1lcyBhcm91bmQgcGh5c2ljcyBib2RpZXMuXG4gICAgZGVidWc6ICAgICAgICAgICAgICAgICAgICAgICAgICB7IGRlZmF1bHQ6IGZhbHNlIH0sXG5cbiAgICAvLyBJZiB1c2luZyBhbW1vLCBzZXQgdGhlIGRlZmF1bHQgcmVuZGVyaW5nIG1vZGUgZm9yIGRlYnVnXG4gICAgZGVidWdEcmF3TW9kZTogeyBkZWZhdWx0OiBUSFJFRS5BbW1vRGVidWdDb25zdGFudHMuTm9EZWJ1ZyB9LFxuICAgIC8vIElmIHVzaW5nIGFtbW8sIHNldCB0aGUgbWF4IG51bWJlciBvZiBzdGVwcyBwZXIgZnJhbWUgXG4gICAgbWF4U3ViU3RlcHM6IHsgZGVmYXVsdDogNCB9LFxuICAgIC8vIElmIHVzaW5nIGFtbW8sIHNldCB0aGUgZnJhbWVyYXRlIG9mIHRoZSBzaW11bGF0aW9uXG4gICAgZml4ZWRUaW1lU3RlcDogeyBkZWZhdWx0OiAxIC8gNjAgfSxcbiAgICAvLyBXaGV0aGVyIHRvIG91dHB1dCBzdGF0cywgYW5kIGhvdyB0byBvdXRwdXQgdGhlbS4gIE9uZSBvciBtb3JlIG9mIFwiY29uc29sZVwiLCBcImV2ZW50c1wiLCBcInBhbmVsXCJcbiAgICBzdGF0czoge3R5cGU6ICdhcnJheScsIGRlZmF1bHQ6IFtdfVxuICB9LFxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyB0aGUgcGh5c2ljcyBzeXN0ZW0uXG4gICAqL1xuICBhc3luYyBpbml0KCkge1xuICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuXG4gICAgLy8gSWYgdHJ1ZSwgc2hvdyB3aXJlZnJhbWVzIGFyb3VuZCBwaHlzaWNzIGJvZGllcy5cbiAgICB0aGlzLmRlYnVnID0gZGF0YS5kZWJ1ZztcbiAgICB0aGlzLmluaXRTdGF0cygpO1xuXG4gICAgdGhpcy5jYWxsYmFja3MgPSB7YmVmb3JlU3RlcDogW10sIHN0ZXA6IFtdLCBhZnRlclN0ZXA6IFtdfTtcblxuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG5cbiAgICB0aGlzLmRyaXZlciA9IG5ldyBBbW1vRHJpdmVyKCk7XG5cbiAgICBhd2FpdCB0aGlzLmRyaXZlci5pbml0KHtcbiAgICAgIGdyYXZpdHk6IGRhdGEuZ3Jhdml0eSxcbiAgICAgIGRlYnVnRHJhd01vZGU6IGRhdGEuZGVidWdEcmF3TW9kZSxcbiAgICAgIHNvbHZlckl0ZXJhdGlvbnM6IGRhdGEuaXRlcmF0aW9ucyxcbiAgICAgIG1heFN1YlN0ZXBzOiBkYXRhLm1heFN1YlN0ZXBzLFxuICAgICAgZml4ZWRUaW1lU3RlcDogZGF0YS5maXhlZFRpbWVTdGVwXG4gICAgfSk7XG5cbiAgICB0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICh0aGlzLmRlYnVnKSB7XG4gICAgICB0aGlzLnNldERlYnVnKHRydWUpO1xuICAgIH1cbiAgfSxcblxuICBpbml0U3RhdHMoKSB7XG4gICAgLy8gRGF0YSB1c2VkIGZvciBwZXJmb3JtYW5jZSBtb25pdG9yaW5nLlxuICAgIHRoaXMuc3RhdHNUb0NvbnNvbGUgPSB0aGlzLmRhdGEuc3RhdHMuaW5jbHVkZXMoXCJjb25zb2xlXCIpXG4gICAgdGhpcy5zdGF0c1RvRXZlbnRzID0gdGhpcy5kYXRhLnN0YXRzLmluY2x1ZGVzKFwiZXZlbnRzXCIpXG4gICAgdGhpcy5zdGF0c1RvUGFuZWwgPSB0aGlzLmRhdGEuc3RhdHMuaW5jbHVkZXMoXCJwYW5lbFwiKVxuXG4gICAgaWYgKHRoaXMuc3RhdHNUb0NvbnNvbGUgfHwgdGhpcy5zdGF0c1RvRXZlbnRzIHx8IHRoaXMuc3RhdHNUb1BhbmVsKSB7XG4gICAgICB0aGlzLnRyYWNrUGVyZiA9IHRydWU7XG4gICAgICB0aGlzLnRpY2tDb3VudGVyID0gMDtcbiAgICAgIFxuICAgICAgdGhpcy5zdGF0c1RpY2tEYXRhID0ge307XG4gICAgICB0aGlzLnN0YXRzQm9keURhdGEgPSB7fTtcblxuICAgICAgdGhpcy5jb3VudEJvZGllcyA9IHtcbiAgICAgICAgXCJhbW1vXCI6ICgpID0+IHRoaXMuY291bnRCb2RpZXNBbW1vKCksXG4gICAgICB9XG5cbiAgICAgIHRoaXMuYm9keVR5cGVUb1N0YXRzUHJvcGVydHlNYXAgPSB7XG4gICAgICAgIFwiYW1tb1wiOiB7XG4gICAgICAgICAgW1RZUEUuU1RBVElDXSA6IFwic3RhdGljQm9kaWVzXCIsXG4gICAgICAgICAgW1RZUEUuS0lORU1BVElDXSA6IFwia2luZW1hdGljQm9kaWVzXCIsXG4gICAgICAgICAgW1RZUEUuRFlOQU1JQ10gOiBcImR5bmFtaWNCb2RpZXNcIixcbiAgICAgICAgfSwgXG4gICAgICB9XG4gICAgICBcbiAgICAgIGNvbnN0IHNjZW5lID0gdGhpcy5lbC5zY2VuZUVsO1xuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtY29sbGVjdG9yXCIsIGBpbkV2ZW50OiBwaHlzaWNzLXRpY2stZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGJlZm9yZSwgYWZ0ZXIsIGVuZ2luZSwgdG90YWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvdXRwdXRGcmVxdWVuY3k6IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dEV2ZW50OiBwaHlzaWNzLXRpY2stc3VtbWFyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG91dHB1dHM6IHBlcmNlbnRpbGVfXzUwLCBwZXJjZW50aWxlX185MCwgbWF4YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhdHNUb1BhbmVsKSB7XG4gICAgICBjb25zdCBzY2VuZSA9IHRoaXMuZWwuc2NlbmVFbDtcbiAgICAgIGNvbnN0IHNwYWNlID0gXCImbmJzcCZuYnNwJm5ic3BcIlxuICAgIFxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcGFuZWxcIiwgXCJcIilcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLWdyb3VwX19ib2RpZXNcIiwgYGxhYmVsOiBQaHlzaWNzIEJvZGllc2ApXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1yb3dfX2IxXCIsIGBncm91cDogYm9kaWVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OnBoeXNpY3MtYm9keS1kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHN0YXRpY0JvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogU3RhdGljYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fYjJcIiwgYGdyb3VwOiBib2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6cGh5c2ljcy1ib2R5LWRhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogZHluYW1pY0JvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogRHluYW1pY2ApXG5cbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fYjNcIiwgYGdyb3VwOiBib2RpZXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDpwaHlzaWNzLWJvZHktZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGtpbmVtYXRpY0JvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBLaW5lbWF0aWNgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X19iNFwiLCBgZ3JvdXA6IGJvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBwaHlzaWNzLWJvZHktZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG1hbmlmb2xkcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBNYW5pZm9sZHNgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X19iNVwiLCBgZ3JvdXA6IGJvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBwaHlzaWNzLWJvZHktZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IG1hbmlmb2xkQ29udGFjdHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogQ29udGFjdHNgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X19iNlwiLCBgZ3JvdXA6IGJvZGllcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OiBwaHlzaWNzLWJvZHktZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGNvbGxpc2lvbnM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogQ29sbGlzaW9uc2ApXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1yb3dfX2I3XCIsIGBncm91cDogYm9kaWVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IHBoeXNpY3MtYm9keS1kYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogY29sbGlzaW9uS2V5cztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBDb2xsIEtleXNgKVxuXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1ncm91cF9fdGlja1wiLCBgbGFiZWw6IFBoeXNpY3MgVGlja3M6IE1lZGlhbiR7c3BhY2V9OTB0aCUke3NwYWNlfTk5dGglYClcbiAgICAgIHNjZW5lLnNldEF0dHJpYnV0ZShcInN0YXRzLXJvd19fMVwiLCBgZ3JvdXA6IHRpY2s7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudDpwaHlzaWNzLXRpY2stc3VtbWFyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGJlZm9yZS5wZXJjZW50aWxlX181MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZWZvcmUucGVyY2VudGlsZV9fOTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlLm1heDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBCZWZvcmVgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X18yXCIsIGBncm91cDogdGljaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OnBoeXNpY3MtdGljay1zdW1tYXJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogYWZ0ZXIucGVyY2VudGlsZV9fNTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXIucGVyY2VudGlsZV9fOTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWZ0ZXIubWF4OyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBBZnRlcmApXG4gICAgICBzY2VuZS5zZXRBdHRyaWJ1dGUoXCJzdGF0cy1yb3dfXzNcIiwgYGdyb3VwOiB0aWNrOyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OnBoeXNpY3MtdGljay1zdW1tYXJ5OyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IGVuZ2luZS5wZXJjZW50aWxlX181MCwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmdpbmUucGVyY2VudGlsZV9fOTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5naW5lLm1heDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiBFbmdpbmVgKVxuICAgICAgc2NlbmUuc2V0QXR0cmlidXRlKFwic3RhdHMtcm93X180XCIsIGBncm91cDogdGljaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50OnBoeXNpY3MtdGljay1zdW1tYXJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogdG90YWwucGVyY2VudGlsZV9fNTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWwucGVyY2VudGlsZV9fOTAsIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWwubWF4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IFRvdGFsYClcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIFVwZGF0ZXMgdGhlIHBoeXNpY3Mgd29ybGQgb24gZWFjaCB0aWNrIG9mIHRoZSBBLUZyYW1lIHNjZW5lLiBJdCB3b3VsZCBiZVxuICAgKiBlbnRpcmVseSBwb3NzaWJsZSB0byBzZXBhcmF0ZSB0aGUgdHdvIOKAkyB1cGRhdGluZyBwaHlzaWNzIG1vcmUgb3IgbGVzc1xuICAgKiBmcmVxdWVudGx5IHRoYW4gdGhlIHNjZW5lIOKAkyBpZiBncmVhdGVyIHByZWNpc2lvbiBvciBwZXJmb3JtYW5jZSB3ZXJlXG4gICAqIG5lY2Vzc2FyeS5cbiAgICogQHBhcmFtICB7bnVtYmVyfSB0XG4gICAqIEBwYXJhbSAge251bWJlcn0gZHRcbiAgICovXG4gIHRpY2s6IGZ1bmN0aW9uICh0LCBkdCkge1xuICAgIGlmICghdGhpcy5pbml0aWFsaXplZCB8fCAhZHQpIHJldHVybjtcblxuICAgIGNvbnN0IGJlZm9yZVN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xuXG4gICAgdmFyIGk7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRoaXMuY2FsbGJhY2tzLmJlZm9yZVN0ZXAubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRoaXMuY2FsbGJhY2tzLmJlZm9yZVN0ZXBbaV0uYmVmb3JlU3RlcCh0LCBkdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZW5naW5lU3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cbiAgICB0aGlzLmRyaXZlci5zdGVwKE1hdGgubWluKGR0IC8gMTAwMCwgdGhpcy5kYXRhLm1heEludGVydmFsKSk7XG5cbiAgICBjb25zdCBlbmdpbmVFbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY2FsbGJhY2tzLnN0ZXAubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNhbGxiYWNrcy5zdGVwW2ldLnN0ZXAodCwgZHQpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBjYWxsYmFja3MuYWZ0ZXJTdGVwLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjYWxsYmFja3MuYWZ0ZXJTdGVwW2ldLmFmdGVyU3RlcCh0LCBkdCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudHJhY2tQZXJmKSB7XG4gICAgICBjb25zdCBhZnRlckVuZFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgICAgdGhpcy5zdGF0c1RpY2tEYXRhLmJlZm9yZSA9IGVuZ2luZVN0YXJ0VGltZSAtIGJlZm9yZVN0YXJ0VGltZVxuICAgICAgdGhpcy5zdGF0c1RpY2tEYXRhLmVuZ2luZSA9IGVuZ2luZUVuZFRpbWUgLSBlbmdpbmVTdGFydFRpbWVcbiAgICAgIHRoaXMuc3RhdHNUaWNrRGF0YS5hZnRlciA9IGFmdGVyRW5kVGltZSAtIGVuZ2luZUVuZFRpbWVcbiAgICAgIHRoaXMuc3RhdHNUaWNrRGF0YS50b3RhbCA9IGFmdGVyRW5kVGltZSAtIGJlZm9yZVN0YXJ0VGltZVxuXG4gICAgICB0aGlzLmVsLmVtaXQoXCJwaHlzaWNzLXRpY2stZGF0YVwiLCB0aGlzLnN0YXRzVGlja0RhdGEpXG5cbiAgICAgIHRoaXMudGlja0NvdW50ZXIrKztcblxuICAgICAgaWYgKHRoaXMudGlja0NvdW50ZXIgPT09IDEwMCkge1xuXG4gICAgICAgIHRoaXMuY291bnRCb2RpZXNbdGhpcy5kYXRhLmRyaXZlcl0oKVxuXG4gICAgICAgIGlmICh0aGlzLnN0YXRzVG9Db25zb2xlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJQaHlzaWNzIGJvZHkgc3RhdHM6XCIsIHRoaXMuc3RhdHNCb2R5RGF0YSlcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnN0YXRzVG9FdmVudHMgIHx8IHRoaXMuc3RhdHNUb1BhbmVsKSB7XG4gICAgICAgICAgdGhpcy5lbC5lbWl0KFwicGh5c2ljcy1ib2R5LWRhdGFcIiwgdGhpcy5zdGF0c0JvZHlEYXRhKVxuICAgICAgICB9XG4gICAgICAgIHRoaXMudGlja0NvdW50ZXIgPSAwO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBjb3VudEJvZGllc0FtbW8oKSB7XG5cbiAgICBjb25zdCBzdGF0c0RhdGEgPSB0aGlzLnN0YXRzQm9keURhdGFcbiAgICBzdGF0c0RhdGEubWFuaWZvbGRzID0gdGhpcy5kcml2ZXIuZGlzcGF0Y2hlci5nZXROdW1NYW5pZm9sZHMoKTtcbiAgICBzdGF0c0RhdGEubWFuaWZvbGRDb250YWN0cyA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGF0c0RhdGEubWFuaWZvbGRzOyBpKyspIHtcbiAgICAgIGNvbnN0IG1hbmlmb2xkID0gdGhpcy5kcml2ZXIuZGlzcGF0Y2hlci5nZXRNYW5pZm9sZEJ5SW5kZXhJbnRlcm5hbChpKTtcbiAgICAgIHN0YXRzRGF0YS5tYW5pZm9sZENvbnRhY3RzICs9IG1hbmlmb2xkLmdldE51bUNvbnRhY3RzKCk7XG4gICAgfVxuICAgIHN0YXRzRGF0YS5jb2xsaXNpb25zID0gdGhpcy5kcml2ZXIuY29sbGlzaW9ucy5zaXplO1xuICAgIHN0YXRzRGF0YS5jb2xsaXNpb25LZXlzID0gdGhpcy5kcml2ZXIuY29sbGlzaW9uS2V5cy5sZW5ndGg7XG4gICAgc3RhdHNEYXRhLnN0YXRpY0JvZGllcyA9IDBcbiAgICBzdGF0c0RhdGEua2luZW1hdGljQm9kaWVzID0gMFxuICAgIHN0YXRzRGF0YS5keW5hbWljQm9kaWVzID0gMFxuICAgIFxuICAgIGZ1bmN0aW9uIHR5cGUoZWwpIHtcbiAgICAgIHJldHVybiBlbC5jb21wb25lbnRzWydhbW1vLWJvZHknXS5kYXRhLnR5cGVcbiAgICB9XG5cbiAgICB0aGlzLmRyaXZlci5lbHMuZm9yRWFjaCgoZWwpID0+IHtcbiAgICAgIGNvbnN0IHByb3BlcnR5ID0gdGhpcy5ib2R5VHlwZVRvU3RhdHNQcm9wZXJ0eU1hcFtcImFtbW9cIl1bdHlwZShlbCldXG4gICAgICBzdGF0c0RhdGFbcHJvcGVydHldKytcbiAgICB9KVxuICB9LFxuXG4gIHNldERlYnVnOiBmdW5jdGlvbihkZWJ1Zykge1xuICAgIHRoaXMuZGVidWcgPSBkZWJ1ZztcbiAgICBpZiAodGhpcy5kYXRhLmRyaXZlciA9PT0gJ2FtbW8nICYmIHRoaXMuaW5pdGlhbGl6ZWQpIHtcbiAgICAgIGlmIChkZWJ1ZyAmJiAhdGhpcy5kZWJ1Z0RyYXdlcikge1xuICAgICAgICB0aGlzLmRlYnVnRHJhd2VyID0gdGhpcy5kcml2ZXIuZ2V0RGVidWdEcmF3ZXIodGhpcy5lbC5vYmplY3QzRCk7XG4gICAgICAgIHRoaXMuZGVidWdEcmF3ZXIuZW5hYmxlKCk7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuZGVidWdEcmF3ZXIpIHtcbiAgICAgICAgdGhpcy5kZWJ1Z0RyYXdlci5kaXNhYmxlKCk7XG4gICAgICAgIHRoaXMuZGVidWdEcmF3ZXIgPSBudWxsO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQWRkcyBhIGJvZHkgdG8gdGhlIHNjZW5lLCBhbmQgYmluZHMgcHJveGllZCBtZXRob2RzIHRvIHRoZSBkcml2ZXIuXG4gICAqL1xuICBhZGRCb2R5OiBmdW5jdGlvbiAoYm9keSwgZ3JvdXAsIG1hc2spIHtcbiAgICB2YXIgZHJpdmVyID0gdGhpcy5kcml2ZXI7XG5cbiAgICB0aGlzLmRyaXZlci5hZGRCb2R5KGJvZHksIGdyb3VwLCBtYXNrKTtcbiAgfSxcblxuICAvKipcbiAgICogUmVtb3ZlcyBhIGJvZHkgYW5kIGl0cyBwcm94aWVkIG1ldGhvZHMuXG4gICAqL1xuICByZW1vdmVCb2R5OiBmdW5jdGlvbiAoYm9keSkge1xuICAgIHRoaXMuZHJpdmVyLnJlbW92ZUJvZHkoYm9keSk7XG4gIH0sXG5cbiAgLyoqIEBwYXJhbSB7QW1tby5idFR5cGVkQ29uc3RyYWludH0gY29uc3RyYWludCAqL1xuICBhZGRDb25zdHJhaW50OiBmdW5jdGlvbiAoY29uc3RyYWludCkge1xuICAgIHRoaXMuZHJpdmVyLmFkZENvbnN0cmFpbnQoY29uc3RyYWludCk7XG4gIH0sXG5cbiAgLyoqIEBwYXJhbSB7QW1tby5idFR5cGVkQ29uc3RyYWludH0gY29uc3RyYWludCAqL1xuICByZW1vdmVDb25zdHJhaW50OiBmdW5jdGlvbiAoY29uc3RyYWludCkge1xuICAgIHRoaXMuZHJpdmVyLnJlbW92ZUNvbnN0cmFpbnQoY29uc3RyYWludCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFkZHMgYSBjb21wb25lbnQgaW5zdGFuY2UgdG8gdGhlIHN5c3RlbSBhbmQgc2NoZWR1bGVzIGl0cyB1cGRhdGUgbWV0aG9kcyB0byBiZSBjYWxsZWRcbiAgICogdGhlIGdpdmVuIHBoYXNlLlxuICAgKiBAcGFyYW0ge0NvbXBvbmVudH0gY29tcG9uZW50XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwaGFzZVxuICAgKi9cbiAgYWRkQ29tcG9uZW50OiBmdW5jdGlvbiAoY29tcG9uZW50KSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzO1xuICAgIGlmIChjb21wb25lbnQuYmVmb3JlU3RlcCkgY2FsbGJhY2tzLmJlZm9yZVN0ZXAucHVzaChjb21wb25lbnQpO1xuICAgIGlmIChjb21wb25lbnQuc3RlcCkgICAgICAgY2FsbGJhY2tzLnN0ZXAucHVzaChjb21wb25lbnQpO1xuICAgIGlmIChjb21wb25lbnQuYWZ0ZXJTdGVwKSAgY2FsbGJhY2tzLmFmdGVyU3RlcC5wdXNoKGNvbXBvbmVudCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjb21wb25lbnQgaW5zdGFuY2UgZnJvbSB0aGUgc3lzdGVtLlxuICAgKiBAcGFyYW0ge0NvbXBvbmVudH0gY29tcG9uZW50XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwaGFzZVxuICAgKi9cbiAgcmVtb3ZlQ29tcG9uZW50OiBmdW5jdGlvbiAoY29tcG9uZW50KSB7XG4gICAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuY2FsbGJhY2tzO1xuICAgIGlmIChjb21wb25lbnQuYmVmb3JlU3RlcCkge1xuICAgICAgY2FsbGJhY2tzLmJlZm9yZVN0ZXAuc3BsaWNlKGNhbGxiYWNrcy5iZWZvcmVTdGVwLmluZGV4T2YoY29tcG9uZW50KSwgMSk7XG4gICAgfVxuICAgIGlmIChjb21wb25lbnQuc3RlcCkge1xuICAgICAgY2FsbGJhY2tzLnN0ZXAuc3BsaWNlKGNhbGxiYWNrcy5zdGVwLmluZGV4T2YoY29tcG9uZW50KSwgMSk7XG4gICAgfVxuICAgIGlmIChjb21wb25lbnQuYWZ0ZXJTdGVwKSB7XG4gICAgICBjYWxsYmFja3MuYWZ0ZXJTdGVwLnNwbGljZShjYWxsYmFja3MuYWZ0ZXJTdGVwLmluZGV4T2YoY29tcG9uZW50KSwgMSk7XG4gICAgfVxuICB9LFxuXG4gIC8qKiBAcmV0dXJuIHtBcnJheTxvYmplY3Q+fSAqL1xuICBnZXRDb250YWN0czogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmRyaXZlci5nZXRDb250YWN0cygpO1xuICB9LFxuXG4gIGdldE1hdGVyaWFsOiBmdW5jdGlvbiAobmFtZSkge1xuICAgIHJldHVybiB0aGlzLmRyaXZlci5nZXRNYXRlcmlhbChuYW1lKTtcbiAgfVxufSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFRIUkVFOyIsIi8vIFRoZSBtb2R1bGUgY2FjaGVcbnZhciBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX18gPSB7fTtcblxuLy8gVGhlIHJlcXVpcmUgZnVuY3Rpb25cbmZ1bmN0aW9uIF9fd2VicGFja19yZXF1aXJlX18obW9kdWxlSWQpIHtcblx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG5cdHZhciBjYWNoZWRNb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdO1xuXHRpZiAoY2FjaGVkTW9kdWxlICE9PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4gY2FjaGVkTW9kdWxlLmV4cG9ydHM7XG5cdH1cblx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcblx0dmFyIG1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF0gPSB7XG5cdFx0Ly8gbm8gbW9kdWxlLmlkIG5lZWRlZFxuXHRcdC8vIG5vIG1vZHVsZS5sb2FkZWQgbmVlZGVkXG5cdFx0ZXhwb3J0czoge31cblx0fTtcblxuXHQvLyBFeGVjdXRlIHRoZSBtb2R1bGUgZnVuY3Rpb25cblx0X193ZWJwYWNrX21vZHVsZXNfX1ttb2R1bGVJZF0obW9kdWxlLCBtb2R1bGUuZXhwb3J0cywgX193ZWJwYWNrX3JlcXVpcmVfXyk7XG5cblx0Ly8gUmV0dXJuIHRoZSBleHBvcnRzIG9mIHRoZSBtb2R1bGVcblx0cmV0dXJuIG1vZHVsZS5leHBvcnRzO1xufVxuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCIiLCIvLyBzdGFydHVwXG4vLyBMb2FkIGVudHJ5IG1vZHVsZSBhbmQgcmV0dXJuIGV4cG9ydHNcbi8vIFRoaXMgZW50cnkgbW9kdWxlIGlzIHJlZmVyZW5jZWQgYnkgb3RoZXIgbW9kdWxlcyBzbyBpdCBjYW4ndCBiZSBpbmxpbmVkXG52YXIgX193ZWJwYWNrX2V4cG9ydHNfXyA9IF9fd2VicGFja19yZXF1aXJlX18oXCIuL2luZGV4LmpzXCIpO1xuIiwiIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9

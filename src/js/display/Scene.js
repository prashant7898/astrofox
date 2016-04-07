'use strict';

var _ = require('lodash');
var THREE = require('three');
var NodeCollection = require('../core/NodeCollection.js');
var Display = require('../display/Display.js');
var CanvasDisplay = require('../display/CanvasDisplay.js');
var Effect = require('../effects/Effect.js');
var Composer = require('../graphics/Composer.js');
var TexturePass = require('../graphics/TexturePass.js');
var FrameBuffer = require('../graphics/FrameBuffer.js');

var defaults = {
    blendMode: 'Normal',
    opacity: 1.0
};

var Scene = function(name, options) {
    Display.call(this, 'Scene', defaults);

    this.owner = null;
    this.displays = new NodeCollection();
    this.effects = new NodeCollection();
    this.buffer2D = new FrameBuffer('2d');
    this.buffer3D = new FrameBuffer('webgl');

    this.update(options);
};

Scene.prototype = _.create(Display.prototype, {
    constructor: Scene,

    update: function(options) {
        var changed = Display.prototype.update.call(this, options);

        if (changed && this.owner) {
            this.updatePasses();
        }

        return changed;
    },

    addToStage: function(stage) {
        var size = stage.getSize(),
            texture, texture2;

        this.owner = stage;
        this.composer = new Composer(stage.renderer);

        this.updatePasses();
    },

    removeFromStage: function() {
        this.owner = null;
        this.displays.clear();
        this.displays = null;
        this.effects.clear();
        this.effects = null;
        this.canvasPass = null;
        this.composer.dispose();
        this.composer = null;
    },

    addElement: function(obj) {
        var nodes;

        if (obj instanceof Effect) {
            nodes = this.effects;
        }
        else if (obj instanceof Display) {
            nodes = this.displays;
        }

        nodes.addNode(obj);

        obj.owner = this;

        if (obj.addToScene) {
            obj.addToScene(this);
        }

        this.updatePasses();
    },

    removeElement: function(obj) {
        var nodes;

        if (obj instanceof Effect) {
            nodes = this.effects;
        }
        else if (obj instanceof Display) {
            nodes = this.displays;
        }

        nodes.removeNode(obj);

        obj.owner = null;

        if (obj.removeFromScene) {
            obj.removeFromScene(this);
        }

        this.updatePasses();
    },

    shiftElement: function(obj, i) {
        var nodes, index;

        if (obj instanceof Effect) {
            nodes = this.effects;
        }
        else if (obj instanceof Display) {
            nodes = this.displays;
        }

        index = nodes.indexOf(obj);

        if (nodes.swapNodes(index, index + i)) {
            this.updatePasses();
        }
    },

    updatePasses: function() {
        var composer = this.composer,
            enabled = false;

        composer.clearPasses();
        composer.addPass(this.buffer3D.pass);
        composer.addPass(this.buffer2D.pass);

        this.displays.nodes.forEach(function(display) {
            if (display.pass) {
                composer.addPass(display.pass);
            }

            if (!enabled && display instanceof CanvasDisplay) {
                enabled = true;
            }
        });

        this.effects.nodes.forEach(function(effect) {
            if (effect.pass) {
                composer.addPass(effect.pass);
            }
        });

        this.buffer2D.pass.options.enabled = enabled;
    },

    getSize: function() {
        var canvas =  this.canvas;

        return {
            width: canvas.width,
            height: canvas.height
        };
    },

    clearCanvas: function() {
        var canvas = this.canvas,
            context = this.context;

        context.clearRect(0, 0, canvas.width, canvas.height);
    },

    render: function(data) {
        var displays = this.displays.nodes,
            effects = this.effects.nodes,
            options = this.options,
            composer = this.composer;

        this.buffer3D.clear();
        this.buffer2D.clear();

        composer.clearBuffer(true, true, true);

        if (displays.size > 0 || effects.size > 0) {
            displays.forEach(function(display) {
                if (display.options.enabled) {
                    if (display.renderToCanvas) {
                        display.renderToCanvas(this.buffer2D.context, data);
                    }
                    else if (display.updateScene) {
                        display.updateScene(this.buffer3D.renderer, data);
                    }
                }
            }, this);

            effects.forEach(function(effect) {
                if (effect.options.enabled) {
                    if (effect.renderToCanvas) {
                        effect.renderToCanvas(this.buffer2D.context, data);
                    }
                    else if (effect.updateScene) {
                        effect.updateScene(this.buffer3D.renderer, data);
                    }
                }
            }, this);

            composer.render();
        }

        return composer.readBuffer;
    },

    toString: function() {
        return this.name + '' + this.id;
    },

    toJSON: function() {
        var displays = this.displays.nodes.map(function(display) {
            return display.toJSON();
        });

        var effects = this.effects.nodes.map(function(effect) {
            return effect.toJSON();
        });

        return {
            name: this.name,
            options: this.options,
            displays: displays,
            effects: effects
        };
    }
});

module.exports = Scene;
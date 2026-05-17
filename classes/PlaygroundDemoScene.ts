import { TransformNode } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { SceneManager, GameModeController } from "@babylonjs-toolkit/next";

export class PlaygroundDemoScene extends GameModeController {
    
    constructor(transform: TransformNode, scene: Scene, properties: any = {}, alias: string = "PlaygroundDemoScene") {
        super(transform, scene, properties, alias);
        this.hideSplashScreenDelayMs = 3000;
    }
    
    protected async createScene(data?: any): Promise<void> {
        // This get then rendering canvas from the engine
        const canvas = this.scene.getEngine().getRenderingCanvas();

        // This creates and positions a free camera (non-mesh)
        const camera = new FreeCamera("camera1", new Vector3(0, 5, -10), this.scene);

        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());

        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Our built-in 'sphere' shape.
        const sphere = MeshBuilder.CreateSphere("sphere", {diameter: 2, segments: 32}, this.scene);

        // Move the sphere upward 1/2 its height
        sphere.position.y = 1;

        // Our built-in 'ground' shape.
        const ground = MeshBuilder.CreateGround("ground", {width: 6, height: 6}, this.scene);
    }
}

SceneManager.RegisterClass("PlaygroundDemoScene", PlaygroundDemoScene);
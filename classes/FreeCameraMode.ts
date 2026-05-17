import { TransformNode } from "@babylonjs/core";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { SceneManager, GameModeController } from "@babylonjs-toolkit/next";

export class FreeCameraMode extends GameModeController {
    private camera: FreeCamera | null = null;

    constructor(transform: TransformNode, scene: Scene, properties: any = {}, alias: string = "FreeCameraMode") {
        super(transform, scene, properties, alias);
        this.hideSplashScreenDelayMs = 3000;
    }

    protected destroy(): void {
        this.camera?.dispose();
        this.camera = null;
    }
    
    protected async createScene(data?: any): Promise<void> {
        // Create a free camera for the scene
        this.camera = new FreeCamera("FreeCamera", new Vector3(0, 5, -10), this.scene);
        const canvas = this.scene.getEngine().getRenderingCanvas();
        if (canvas)this.camera.attachControl(canvas, true);
    }
}

SceneManager.RegisterClass("FreeCameraMode", FreeCameraMode);
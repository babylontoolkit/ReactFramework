import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";
import { Scene } from "@babylonjs/core/scene";
import { SceneManager, GameModeController } from "@babylonjs-toolkit/next";
import { ThirdPersonPlayerController } from "@babylonjs-toolkit/dlc";
import GameManager from "../globals";

export class PlayerControllerDemo extends GameModeController {
    
    constructor(transform: TransformNode, scene: Scene, properties: any = {}, alias: string = "PlayerControllerDemo") {
        super(transform, scene, properties, alias);
        this.hideSplashScreenDelayMs = 3000;
    }

    protected async createScene(data?: any): Promise<void> {
        // Load the player armature and create a third-person player controller
        GameManager.PostProgressStatus("Loading Player Armature ...");
        const playerPrefab = "playerarmature.gltf";
        const assetRepoPath = GameManager.PlaygroundRepo;
        const assetsManager = new AssetsManager(this.scene);
        assetsManager.addMeshTask("playerarmature", null, assetRepoPath, playerPrefab);
        await SceneManager.LoadRuntimeAssets(assetsManager, [playerPrefab], ()=> {
            const player = this.scene.getNodeByName("PlayerArmature") as TransformNode;
            if (player != null) {
                const controller = new ThirdPersonPlayerController(player, this.scene, { arrowKeyRotation: true, smoothMotionSpeed:true, smoothChangeRate: 25.0 });
                controller.enableInput = true;
                controller.attachCamera = true;
                controller.moveSpeed = 5.335;
                controller.walkSpeed = 2.0;
                controller.jumpSpeed = 12.0;
            }
        });
    }
}

SceneManager.RegisterClass("PlayerControllerDemo", PlayerControllerDemo);
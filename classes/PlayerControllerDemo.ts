import { AssetsManager, Scene, TransformNode } from "@babylonjs/core";
import { GameModeController, InputController, SceneManager } from "@babylonjs-toolkit/next/scenemanager";
import { ThirdPersonPlayerController } from "@babylonjs-toolkit/next/project";

import GameManager from "../globals";

// ThirdPersonPlayerController ships in the @babylonjs-toolkit/next package.
export class PlayerControllerDemo extends GameModeController {

    constructor(transform: TransformNode, scene: Scene, properties: any = {}, alias: string = "PlayerControllerDemo") {
        super(transform, scene, properties, alias);
    }

    protected async createScene(data?: any): Promise<void> {
        // Load the player armature and create a third-person player controller
        GameManager.PostProgressStatus("Loading Player Armature ...");

        InputController.EnableUserInput(this.scene.getEngine(), this.scene);

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

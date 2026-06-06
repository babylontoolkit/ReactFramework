import { AssetsManager, Scene, TransformNode } from "@babylonjs/core";
import { SceneController, InputController, SceneManager } from "@babylonjs-toolkit/next/scenemanager";
import { StandardCarController, VehicleInputController, VehicleCameraManager } from "@babylonjs-toolkit/next/project";
import GameManager from "../globals";

export class VehicleControllerDemo extends SceneController {

    constructor(transform: TransformNode, scene: Scene, properties: any = {}, alias: string = "VehicleControllerDemo") {
        super(transform, scene, properties, alias);
    }

    protected async createScene(data?: any): Promise<void> {
        // Load the rigged mustang and create a vehicle controller
        GameManager.PostProgressStatus("Loading Rigged Mustang ...");

        // Enable user input for the scene, if not already enabled by the scene
        InputController.EnableUserInput(this.scene.getEngine(), this.scene);

        // Load the rigged mustang and configure vehicle controller
        const mustangPrefab = "riggedmustang.gltf";
        const assetRepoPath = GameManager.PlaygroundRepo;
        const assetsManager = new AssetsManager(this.scene);
        assetsManager.addMeshTask("riggedmustang", null, assetRepoPath, mustangPrefab);
        await SceneManager.LoadRuntimeAssets(assetsManager, [mustangPrefab], () => {
            const mustang = this.scene.getNodeByName("RiggedMustang") as TransformNode;
            if (mustang != null) {
                const startPosition = this.scene.getNodeByName("StartPosition 1") as TransformNode;
                if (startPosition != null) {
                    const startWorld = startPosition.getAbsolutePosition();
                    mustang.position.copyFrom(startWorld);
                    if (startPosition.rotationQuaternion != null) {
                        if (mustang.rotationQuaternion == null) {
                            mustang.rotationQuaternion = startPosition.rotationQuaternion.clone();
                        } else {
                            mustang.rotationQuaternion.copyFrom(startPosition.rotationQuaternion);
                        }
                    } else {
                        mustang.rotation.copyFrom(startPosition.rotation);
                    }
                } else {
                    console.warn("VehicleControllerDemo: 'StartPosition 1' transform not found in scene.");
                }
                const standardCarController: StandardCarController = SceneManager.FindScriptComponent(mustang, "StandardCarController");
                if (standardCarController != null) {
                    standardCarController.topEngineSpeed = 200;
                    standardCarController.powerCoefficient = 2.0;
                }
                const vehicleInputController: VehicleInputController = SceneManager.FindScriptComponent(mustang, "VehicleInputController");
                if (vehicleInputController != null) {
                    vehicleInputController.enableInput = true;
                }
                const vehicleCameraManager: VehicleCameraManager = SceneManager.FindScriptComponent(mustang, "VehicleCameraManager");
                if (vehicleCameraManager != null) {
                    vehicleCameraManager.enableCamera = true;
                    vehicleCameraManager.autoAttachCamera = true;
                    vehicleCameraManager.followTarget = false;
                }
            }
        });
    }
}

SceneManager.RegisterClass("VehicleControllerDemo", VehicleControllerDemo);

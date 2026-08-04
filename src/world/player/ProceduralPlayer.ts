import type { Scene } from "@babylonjs/core/scene";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";

export class ProceduralPlayer {
  readonly root: TransformNode;
  readonly catBody: Mesh;
  readonly catHead: Mesh;
  readonly leftEar: Mesh;
  readonly rightEar: Mesh;
  readonly tail: Mesh;
  readonly boardDeck: Mesh;
  readonly frontWheel: Mesh;
  readonly backWheel: Mesh;

  private allMeshes: Mesh[] = [];

  constructor(scene: Scene, materials: MaterialsRegistry) {
    const { TransformNode } = require("@babylonjs/core/Meshes/transformNode");
    this.root = new TransformNode("player-visual-root", scene);

    const matBody = materials.createMaterial("player.body", "#E87848");
    const matHead = materials.createMaterial("player.head", "#E88858");
    const matEar = materials.createMaterial("player.ear", "#D06838");
    const matTail = materials.createMaterial("player.tail", "#C86038");
    const matBoard = materials.createMaterial("player.board", "#5A4A3A");
    const matWheel = materials.createMaterial("player.wheel", "#4A3A2A");

    // Cat body - stretched sphere
    this.catBody = MeshBuilder.CreateSphere("cat-body", { diameter: 0.85, segments: 16, slice: 0.8 }, scene);
    this.catBody.scaling.set(1, 1.3, 1);
    this.catBody.position.set(0, 0.85, 0.05);
    this.catBody.material = matBody;
    this.catBody.parent = this.root;
    this.allMeshes.push(this.catBody);

    // Cat head
    this.catHead = MeshBuilder.CreateSphere("cat-head", { diameter: 0.58, segments: 14 }, scene);
    this.catHead.position.set(0, 1.5, 0.05);
    this.catHead.material = matHead;
    this.catHead.parent = this.root;
    this.allMeshes.push(this.catHead);

    // Ears
    this.leftEar = MeshBuilder.CreateCylinder("cat-ear-L", { diameterTop: 0.02, diameterBottom: 0.18, height: 0.28, tessellation: 8 }, scene);
    this.leftEar.position.set(-0.14, 1.8, 0.05);
    this.leftEar.rotation.z = 0.3;
    this.leftEar.material = matEar;
    this.leftEar.parent = this.root;
    this.allMeshes.push(this.leftEar);

    this.rightEar = MeshBuilder.CreateCylinder("cat-ear-R", { diameterTop: 0.02, diameterBottom: 0.18, height: 0.28, tessellation: 8 }, scene);
    this.rightEar.position.set(0.14, 1.8, 0.05);
    this.rightEar.rotation.z = -0.3;
    this.rightEar.material = matEar;
    this.rightEar.parent = this.root;
    this.allMeshes.push(this.rightEar);

    // Tail - curved with 3 segments
    this.tail = MeshBuilder.CreateCylinder("cat-tail", { diameterTop: 0.04, diameterBottom: 0.1, height: 0.7, tessellation: 8 }, scene);
    this.tail.position.set(0, 0.75, -0.5);
    this.tail.rotation.x = 0.6;
    this.tail.material = matTail;
    this.tail.parent = this.root;
    this.allMeshes.push(this.tail);

    // Skateboard deck
    this.boardDeck = MeshBuilder.CreateBox("board-deck", { width: 1.5, height: 0.12, depth: 2.0 }, scene);
    this.boardDeck.position.set(0, 0.16, 0);
    this.boardDeck.material = matBoard;
    this.boardDeck.parent = this.root;
    this.allMeshes.push(this.boardDeck);

    // Wheels
    this.frontWheel = MeshBuilder.CreateCylinder("board-wheel-F", { diameter: 0.18, height: 0.1, tessellation: 12 }, scene);
    this.frontWheel.rotation.x = Math.PI / 2;
    this.frontWheel.position.set(0, 0.06, 0.75);
    this.frontWheel.material = matWheel;
    this.frontWheel.parent = this.root;
    this.allMeshes.push(this.frontWheel);

    this.backWheel = MeshBuilder.CreateCylinder("board-wheel-B", { diameter: 0.18, height: 0.1, tessellation: 12 }, scene);
    this.backWheel.rotation.x = Math.PI / 2;
    this.backWheel.position.set(0, 0.06, -0.75);
    this.backWheel.material = matWheel;
    this.backWheel.parent = this.root;
    this.allMeshes.push(this.backWheel);
  }

  get meshes(): readonly Mesh[] {
    return this.allMeshes;
  }

  dispose(): void {
    this.root?.dispose();
  }
}

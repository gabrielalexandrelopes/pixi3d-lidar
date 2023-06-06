import { Application, DRAW_MODES, Program, Shader } from "pixi.js"
import { CameraOrbitControl, Mesh3D, Material, Camera, MeshShader, Point3D, MeshGeometry3D, Color, Container3D } from "pixi3d/pixi7"
import lidar from './lidarSphere.json';

let app = new Application({
  backgroundColor: 0xdddddd, resizeTo: window, antialias: true
})
document.body.appendChild(app.view as HTMLCanvasElement)

let vert = `
  attribute vec3 a_Position;
  attribute vec3 a_Color;
  varying vec3 v_Color;
  uniform mat4 u_Model;
  uniform mat4 u_ViewProjection;
  uniform float u_Size;
  void main() {
    v_Color = a_Color;
    gl_Position = u_ViewProjection * u_Model * vec4(a_Position, 1.0);
    gl_PointSize = u_Size;
  }`

let frag = `
  varying vec3 v_Color;
  void main() {
    gl_FragColor = vec4(v_Color, 1.0);
  }`

class CustomMaterial extends Material {
  constructor() {
    super()
    this.drawMode = DRAW_MODES.POINTS
  }
  get shader() {
    return this._shader
  }
  updateUniforms(mesh: Mesh3D, shader: Shader) {
    shader.uniforms.u_Model = mesh.worldTransform.array
    shader.uniforms.u_ViewProjection = Camera.main.viewProjection.array
    shader.uniforms.u_Size = 3.0
  }
  createShader() {
    return new MeshShader(Program.from(vert, frag))
  }
}

class PointCloud extends Container3D {
  mesh: Mesh3D
  material = new CustomMaterial()

  constructor(private numberOfPoints: number) {
    super()

    let geometry = new MeshGeometry3D()
    geometry.positions = {
      buffer: new Float32Array(numberOfPoints * 3)
    }
    geometry.colors = {
      buffer: new Float32Array(numberOfPoints * 3)
    }
    this.mesh = this.addChild(new Mesh3D(geometry, this.material))
  }

  update(points: Point3D[], colors: Color[], npoints: number) {
    if (!this.material.shader) {
      // The shader hasn't been created yet
      return
    }
    let geometry = this.mesh.geometry.getShaderGeometry(this.material.shader)
    if (!geometry) {
      // The geometry hasn't been created yet
      return
    }
    let pointBuffer = geometry.getBuffer("a_Position")
    let colorBuffer = geometry.getBuffer("a_Color")

    for (let i = 0; i < npoints; i++) {
      (pointBuffer.data as Float32Array).set(points[i].array, i * 3);
      (colorBuffer.data as Float32Array).set(colors[i].rgb, i * 3);
    }
    pointBuffer.update()
    colorBuffer.update()
  }
}

function generatePoints(lidar_frame: number[][]) {
  let points: Point3D[] = []
    numberOfPoints = lidar_frame.length

    for (let i = 0; i < numberOfPoints; i++) {
          points.push(new Point3D(lidar_frame[i][0],lidar_frame[i][1],lidar_frame[i][2]))
    }
    let colors: Color[] = []
    for (let i = 0; i < numberOfPoints; i++) {
      colors.push(new Color(0.5, 0.5, 0.5))
    }
    return { points, colors }
}

let numberOfPoints = 20000
let pointCloud = app.stage.addChild(new PointCloud(20000))
let rotation = 0

app.ticker.add(() => {
  if (rotation >= lidar.length)
  {
    rotation = 0
  }
  const { points, colors } = generatePoints(lidar[rotation++])
  pointCloud.update(points, colors, lidar[0].length)
  // pointCloud.rotationQuaternion.setEulerAngles(0, rotation++, 0)
})

let control = new CameraOrbitControl(app.view as HTMLCanvasElement);

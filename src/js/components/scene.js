 import {
  Color,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  SphereGeometry,
  MeshMatcapMaterial,
  AxesHelper,
  MeshPhysicalMaterial,
  IcosahedronGeometry,
  EquirectangularReflectionMapping,
  RepeatWrapping,
  Vector2,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import Stats from 'stats-js'
import LoaderManager from '@/js/managers/LoaderManager'
import GUI from 'lil-gui'

export default class MainScene {
  #canvas
  #renderer
  #scene
  #camera
  #controls
  #stats
  #width
  #height
  #mesh
  #guiObj = {
    // y: 0,
    transmission: 1.0,
    roughness: 0.05,
    thickness: 0.5,
    speed: 0.01,
    clearcoat: 0.0,
    iridescence: 0.0,
    normalScaleX : 0.0,
    normalScaleY : 0.0,
  }
  #refractionMaterial
  #sphereMesh
  #icoMesh

  constructor() {
    this.#canvas = document.querySelector('.scene')

    this.init()
  }

  init = async () => {
    // Preload assets before initiating the scene
    const assets = [
      {
        name: 'matcap',
        texture: './img/matcap.png', 
      },
      {
        name: 'clouds',
        texture: './img/clouds.jpg', 
      },
      {
        name: 'normal',
        texture: './img/normal.jpg', 
      },
    ]
    

    await LoaderManager.load(assets)

    const loadRGBEPromise = (src) => 
      new Promise ((resolve) => {
          new RGBELoader().load(src, (texture) => resolve(texture))
        })
      
     // load HDR envmap
    this.hdrEquirect = await loadRGBEPromise('./img/envmap.hdr')
    this.hdrEquirect.mapping = EquirectangularReflectionMapping

    this.setStats()
    this.setGUI()
    this.setScene()
    this.setRender()
    this.setCamera()
    this.setControls()
    // this.setAxesHelper()

    this.setRefractionMaterial()
    this.setSphere()
    this.setIco()

    this.handleResize()

    // start RAF
    this.events()
  }

  /**
   * Our Webgl renderer, an object that will draw everything in our canvas
   * https://threejs.org/docs/?q=rend#api/en/renderers/WebGLRenderer
   */
  setRender() {
    this.#renderer = new WebGLRenderer({
      canvas: this.#canvas,
      antialias: true,
    })
  }

  /**
   * This is our scene, we'll add any object
   * https://threejs.org/docs/?q=scene#api/en/scenes/Scene
   */
  setScene() {
    this.#scene = new Scene()
    // this.#scene.background = new Color(0xffffff)
    const texture = LoaderManager.get('clouds').texture
    this.#scene.background = texture
  }

  /**
   * Our Perspective camera, this is the point of view that we'll have
   * of our scene.
   * A perscpective camera is mimicing the human eyes so something far we'll
   * look smaller than something close
   * https://threejs.org/docs/?q=pers#api/en/cameras/PerspectiveCamera
   */
  setCamera() {
    const aspectRatio = this.#width / this.#height
    const fieldOfView = 60
    const nearPlane = 0.1
    const farPlane = 10000

    this.#camera = new PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.#camera.position.y = 0
    this.#camera.position.x = 0
    this.#camera.position.z = -7
    this.#camera.lookAt(0, 0, 0)

    this.#scene.add(this.#camera)
  }

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement)
    this.#controls.enableDamping = true
    // this.#controls.dampingFactor = 0.04
  }

  /**
   * Axes Helper
   * https://threejs.org/docs/?q=Axesh#api/en/helpers/AxesHelper
   */
  // setAxesHelper() {
  //   const axesHelper = new AxesHelper(3)
  //   this.#scene.add(axesHelper)
  // }

setRefractionMaterial(){
  const normalTexture = LoaderManager.get('normal').texture
  normalTexture.wrapS = normalTexture.wrapT = RepeatWrapping
  this.#refractionMaterial = new MeshPhysicalMaterial({ 
        transmission: this.#guiObj.transmission, 
        roughness: this.#guiObj.roughness,
        thickness: this.#guiObj.thickness,
        envMap: this.hdrEquirect,
        normalMap: normalTexture,
        clearcoatMap: normalTexture,
        iridescence: this.#guiObj.iridescence,
        clearcoat: this.#guiObj.clearcoat,
        normalScale: new Vector2 (.2, .2),
      })
    }
  /**
   * Create a SphereGeometry
   * https://threejs.org/docs/?q=box#api/en/geometries/SphereGeometry
   * with a Basic material
   * https://threejs.org/docs/?q=mesh#api/en/materials/MeshBasicMaterial
   */
  setSphere(){
    const geometry = new SphereGeometry(1, 32, 32)
    this.#sphereMesh = new Mesh(geometry, this.#refractionMaterial)
    this.#sphereMesh.position.x = 1.2
    this.#scene.add(this.#sphereMesh)
  }

  setIco(){
    const geometry = new IcosahedronGeometry(1)
    this.#icoMesh = new Mesh(geometry, this.#refractionMaterial)
    this.#icoMesh.position.x = -1.2
    this.#scene.add(this.#icoMesh)
  }

  /**
   * Build stats to display fps
   */
  setStats() {
    this.#stats = new Stats()
    this.#stats.showPanel(0)
    document.body.appendChild(this.#stats.dom)
  }

  setGUI() {
    const titleEl = document.querySelector('.main-title')

    const handleChange = () => {
      this.#refractionMaterial.transmission = this.#guiObj.transmission
      this.#refractionMaterial.roughness = this.#guiObj.roughness
      this.#refractionMaterial.thickness = this.#guiObj.thickness
      this.#refractionMaterial.clearcoat = this.#guiObj.clearcoat
      this.#refractionMaterial.iridescence = this.#guiObj.iridescence
      this.#refractionMaterial.normalScale = new Vector2 (this.#guiObj.normalScaleX, this.#guiObj.normalScaleY)
    }


    const gui = new GUI()
    // gui.add(this.#guiObj, 'y', -3, 3).onChange(handleChange)
    // gui.add(this.#guiObj, 'showTitle').name('show title').onChange(handleChange)
    gui.add(this.#guiObj, 'transmission', 0, 1).name('transmission').onChange(handleChange)
    gui.add(this.#guiObj, 'roughness', 0, 1).name('roughness').onChange(handleChange)
    gui.add(this.#guiObj, 'thickness', 0, 1).name('thickness').onChange(handleChange)
    gui.add(this.#guiObj, 'speed', -0.03, 0.03).name('speed').onChange(handleChange)
    gui.add(this.#guiObj, 'clearcoat', 0, 1).name('clearcoat').onChange(handleChange)
    gui.add(this.#guiObj, 'iridescence', 0, 1).name('iridescence').onChange(handleChange)
    gui.add(this.#guiObj, 'normalScaleX', 0, 1).name('Normal Scale X').onChange(handleChange)
    gui.add(this.#guiObj, 'normalScaleY', 0, 1).name('Normal Scale Y').onChange(handleChange)
  }
  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.draw(0)
  }

  // EVENTS

  /**
   * Request animation frame function
   * This function is called 60/time per seconds with no performance issue
   * Everything that happens in the scene is drawed here
   * @param {Number} now
   */
  draw = () => {
    // now: time in ms
    this.#stats.begin()

    if (this.#controls) this.#controls.update() // for damping
    this.#renderer.render(this.#scene, this.#camera)

    this.#icoMesh.rotation.y += this.#guiObj.speed
    this.#sphereMesh.rotation.y += -this.#guiObj.speed

    this.#stats.end()
    this.raf = window.requestAnimationFrame(this.draw)
  }

  /**
   * On resize, we need to adapt our camera based
   * on the new window width and height and the renderer
   */
  handleResize = () => {
    this.#width = window.innerWidth
    this.#height = window.innerHeight

    // Update camera
    this.#camera.aspect = this.#width / this.#height
    this.#camera.updateProjectionMatrix()

    const DPR = window.devicePixelRatio ? window.devicePixelRatio : 1

    this.#renderer.setPixelRatio(DPR)
    this.#renderer.setSize(this.#width, this.#height)
  }
}

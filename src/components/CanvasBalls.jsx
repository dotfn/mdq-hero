import * as THREE from "three"
import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { EffectComposer, N8AO } from "@react-three/postprocessing"
import { BallCollider, Physics, RigidBody, CylinderCollider } from "@react-three/rapier"
import { useGLTF } from "@react-three/drei"

THREE.ColorManagement.legacyMode = false

/* ---------------- CONFIG ---------------- */

const SCENE = {
  camera: {
    position: [0, 0, 20],
    fov: 32.5,
    near: 1,
    far: 100
  },
  gl: {
    alpha: true,
    stencil: false,
    depth: false,
    antialias: false
  },
  exposure: 1.5
}

const LIGHTS = {
  ambient: { intensity: 1 },
  spot: {
    position: [20, 20, 25],
    penumbra: 1,
    angle: 0.2,
    color: "red",
    shadowMapSize: [512, 512]
  },
  directionalA: {
    position: [0, 5, -4],
    intensity: 4
  },
  directionalB: {
    position: [0, -15, 0],
    intensity: 4,
    color: "white"
  }
}

const PHYSICS = {
  gravity: [0, 0, 0],
  linearDamping: 0.75,
  angularDamping: 0.15,
  friction: 0.2
}

const BAUBLE = {
  scaleOptions: [0.6, 0.7, 0.8, 0.9, 1],
  spawnSpread: 20,
  spawnYOffset: -25,
  spawnZOffset: -10,
  impulse: {
    x: -50,
    y: -150,
    z: -50
  },
  cylinderCollider: {
    rotation: [Math.PI / 2, 0, 0],
    positionFactor: 1.2,
    heightFactor: 0.15,
    radiusFactor: 0.275
  }
}

const POINTER = {
  colliderRadius: 2,
  lerp: 0.2
}

const POST = {
  aoColor: "#91F5AD",
  aoRadius: 2,
  intensity: 1.15
}

/* ---------------- GLB MODEL ---------------- */

function BallModel({ scale }) {
  const { scene } = useGLTF("/mdq-hero/ball.glb")

  return (
    <primitive
      object={scene.clone()}
      scale={scale}
      castShadow
      receiveShadow
    />
  )
}

useGLTF.preload("/mdq-hero/ball.glb")

/* ---------------- RANDOM BAUBLES ---------------- */

const baubles = [...Array(20)].map(() => ({
  scale: BAUBLE.scaleOptions[Math.floor(Math.random() * BAUBLE.scaleOptions.length)]
}))

/* ---------------- COMPONENTS ---------------- */

function Bauble({ vec = new THREE.Vector3(), scale, r = THREE.MathUtils.randFloatSpread }) {
  const api = useRef()

  useFrame((_, delta) => {
    delta = Math.min(0.1, delta)

    api.current.applyImpulse(
      vec
        .copy(api.current.translation())
        .normalize()
        .multiply({
          x: BAUBLE.impulse.x * delta * scale,
          y: BAUBLE.impulse.y * delta * scale,
          z: BAUBLE.impulse.z * delta * scale
        })
    )
  })

  return (
    <RigidBody
      linearDamping={PHYSICS.linearDamping}
      angularDamping={PHYSICS.angularDamping}
      friction={PHYSICS.friction}
      position={[
        r(BAUBLE.spawnSpread),
        r(BAUBLE.spawnSpread) + BAUBLE.spawnYOffset,
        r(BAUBLE.spawnSpread) + BAUBLE.spawnZOffset
      ]}
      ref={api}
      colliders={false}
      dispose={null}
    >
      <BallCollider args={[scale]} />

      <CylinderCollider
        rotation={BAUBLE.cylinderCollider.rotation}
        position={[0, 0, BAUBLE.cylinderCollider.positionFactor * scale]}
        args={[
          BAUBLE.cylinderCollider.heightFactor * scale,
          BAUBLE.cylinderCollider.radiusFactor * scale
        ]}
      />

      <BallModel scale={scale} />
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()

  useFrame(({ mouse, viewport }) => {
    vec.lerp(
      {
        x: (mouse.x * viewport.width) / 2,
        y: (mouse.y * viewport.height) / 2,
        z: 0
      },
      POINTER.lerp
    )

    ref.current?.setNextKinematicTranslation(vec)
  })

  return (
    <RigidBody
      position={[100, 100, 100]}
      type="kinematicPosition"
      colliders={false}
      ref={ref}
    >
      <BallCollider args={[POINTER.colliderRadius]} />
    </RigidBody>
  )
}

/* ---------------- SCENE ---------------- */

export const CanvasBalls = () => (
  <Canvas
    shadows
    gl={SCENE.gl}
    camera={SCENE.camera}
    onCreated={(state) => (state.gl.toneMappingExposure = SCENE.exposure)}
  >
    <ambientLight intensity={LIGHTS.ambient.intensity} />

    <spotLight
      position={LIGHTS.spot.position}
      penumbra={LIGHTS.spot.penumbra}
      angle={LIGHTS.spot.angle}
      color={LIGHTS.spot.color}
      castShadow
      shadow-mapSize={LIGHTS.spot.shadowMapSize}
    />

    <directionalLight
      position={LIGHTS.directionalA.position}
      intensity={LIGHTS.directionalA.intensity}
    />

    <directionalLight
      position={LIGHTS.directionalB.position}
      intensity={LIGHTS.directionalB.intensity}
      color={LIGHTS.directionalB.color}
    />

    <Physics gravity={PHYSICS.gravity}>
      <Pointer />

      {baubles.map((props, i) => (
        <Bauble key={i} {...props} />
      ))}
    </Physics>

    <EffectComposer disableNormalPass>
      <N8AO
        color={POST.aoColor}
        aoRadius={POST.aoRadius}
        intensity={POST.intensity}
      />
    </EffectComposer>
  </Canvas>
)
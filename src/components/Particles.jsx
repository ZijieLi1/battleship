import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { updateParticles } from '../game/fx'

const MAX = 4000
const vertex = /* glsl */ `
  attribute vec4 aColor;
  attribute float aSize;
  uniform float uScale;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`
const fragment = /* glsl */ `
  varying vec4 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.25, d) * vColor.a;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor.rgb, a);
  }
`

export default function Particles() {
  const { size, camera } = useThree()
  const { geo, mat } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX * 3), 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(MAX * 4), 4))
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX), 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false,
      uniforms: { uScale: { value: 600 } },
    })
    return { geo: g, mat: m }
  }, [])

  useFrame((_, dt) => {
    mat.uniforms.uScale.value = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))
    const a = geo.attributes
    updateParticles(Math.min(dt, 0.05), a.position.array, a.aColor.array, a.aSize.array)
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = true
  })

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={10} />
}

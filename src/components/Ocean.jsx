import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

const vertex = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  void main() {
    vec3 p = position;
    // Gentle swell; plane is rotated flat so local z is "up".
    p.z += sin(p.x * 0.18 + uTime * 0.9) * 0.18 + cos(p.y * 0.23 + uTime * 0.7) * 0.15;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`

const fragment = /* glsl */ `
  uniform sampler2D uNormals;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  varying vec3 vWorld;

  void main() {
    vec2 uv = vWorld.xz * 0.045;
    vec3 n1 = texture2D(uNormals, uv + vec2(uTime * 0.012, uTime * 0.008)).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormals, uv * 1.9 - vec2(uTime * 0.016, -uTime * 0.01)).xyz * 2.0 - 1.0;
    // Texture is y-up tangent space; map into world with y as up.
    vec3 n = normalize(vec3((n1.x + n2.x) * 0.5, 1.6, (n1.y + n2.y) * 0.5));

    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
    vec3 R = reflect(-uSunDir, n);
    float spec = pow(max(dot(R, V), 0.0), 140.0);

    vec3 body = mix(uDeep, uShallow, clamp(n.x * 2.0 + 0.5, 0.0, 1.0) * 0.4);
    vec3 col = mix(body, uSky, fres * 0.85) + spec * vec3(1.0, 0.92, 0.75);

    // Fade to horizon colour with distance.
    float d = length(vWorld - cameraPosition);
    col = mix(col, uSky, smoothstep(180.0, 420.0, d));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

export default function Ocean() {
  const normals = useTexture('/textures/waternormals.jpg')
  normals.wrapS = normals.wrapT = THREE.RepeatWrapping

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNormals: { value: normals },
      uSunDir: { value: new THREE.Vector3(0.5, 0.45, -0.7).normalize() },
      uDeep: { value: new THREE.Color('#06344f') },
      uShallow: { value: new THREE.Color('#1c7a8c') },
      uSky: { value: new THREE.Color('#9cc4e0') },
    }),
    [normals],
  )

  useFrame((_, dt) => {
    uniforms.uTime.value += dt
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-0.25}>
      <planeGeometry args={[1200, 1200, 200, 200]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
    </mesh>
  )
}

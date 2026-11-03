/**
 * GLSL for the particle field: simplex noise, the vertex shader that morphs between six formations
 * (hero, esteira, desafios, security radar, infra cloud, initials) and the round-to-square point sprite.
 */
export const NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export const VERT = `
uniform float uFrom, uTo, uMix, uTime, uPointSize, uPixelRatio, uDrift, uDark, uAlpha, uInitAlpha, uInitSize;
uniform vec3 uColorBase, uColorAccent;
uniform vec2 uMouse, uHalf, uPointer, uField;
uniform vec4 uPulse;
attribute vec3 position1, position2, position3, position4, position5;
attribute float aRandom, aHighlight;
varying vec4 vColor; varying float vSquare;
${NOISE}
const float FLOW = 0.04;
const float PACKETS = 12.0;
vec3 rotY(vec3 p, float a){ float c = cos(a), s = sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }
float bit(float k){ return mod(floor(aHighlight / pow(2.0, k)), 2.0); }
// packets: a stream broken into rigid groups, so the flow reads as deliveries, not as sand
float packetU(float s, float speed){ float k = floor(s * PACKETS), o = fract(s * PACKETS); return fract((k + 0.5 + (o - 0.5) * 0.4) / PACKETS + uTime * speed); }
// F1 the pipeline: packets run left to right; past the verifier gate at x = 0.95 they fan out as proof
vec4 pipe(vec3 a){
  if (a.x >= 100.0) return vec4(a.x - 200.0, a.y, a.z, 1.0);
  float u = packetU(a.y, FLOW);
  float passed = smoothstep(0.76, 0.8, u);
  float x = mix(-1.75, 1.75, u);
  float y = a.z * mix(0.05, 0.45, passed) + sin(u * 12.0 + a.z) * 0.012 * (1.0 - passed);
  return vec4(x, y, fract(a.z * 3.7) * 0.06 - 0.03, smoothstep(0.0, 0.04, u) * smoothstep(1.0, 0.95, u));
}
float pipeHL(vec3 a){ if (a.x >= 100.0) return bit(1.0); return smoothstep(0.76, 0.8, packetU(a.y, FLOW)); }
// F3 the radar: rings, crosshair and core hold; the sweep turns and leaves an afterglow on what it passed; threats fly in and are turned away at r = 1
const float SWEEP = 0.55;
vec3 tiltS(vec3 p){ float y1 = p.y * 0.91309 - p.z * 0.40776, z1 = p.y * 0.40776 + p.z * 0.91309; return vec3(p.x * 0.98384 - z1 * 0.17903, y1, p.x * 0.17903 + z1 * 0.98384); }
float threatU(vec3 a){ return fract(a.y + uTime * (0.07 + a.z * 0.05)); }
vec4 radar(vec3 a){
  float sw = uTime * SWEEP;
  if (a.x >= 300.0) { float t = a.x - 400.0; return vec4(tiltS(vec3(cos(sw) * t - sin(sw) * a.y, sin(sw) * t + cos(sw) * a.y, a.z)), 0.55 + 0.45 * t); }
  if (a.x >= 100.0) return vec4(tiltS(vec3(a.x - 200.0, a.y, a.z)), 1.0);
  float u = threatU(a);
  float v = smoothstep(0.55, 1.0, u);
  float r = mix(1.8, 1.03, min(u, 0.55) / 0.55) + v * 0.4;
  float ang = a.x + v * 0.6 * sign(fract(a.z * 7.0) - 0.5);
  return vec4(tiltS(vec3(cos(ang) * r, sin(ang) * r, fract(a.z * 3.7) * 0.06 - 0.03)), smoothstep(0.0, 0.08, u) * (1.0 - v));
}
float radarHL(vec3 a){
  if (a.x >= 300.0) return 1.0;
  if (a.x >= 100.0) { vec2 p = vec2(a.x - 200.0, a.y); float r = length(p); if (r < 0.25 || r > 1.12) return 0.0; return 0.9 * exp(-7.0 * fract((uTime * SWEEP - atan(p.y, p.x)) / 6.2831853)); }
  return smoothstep(0.47, 0.56, threatU(a));
}
// F4 the cloud: racks and the cloud volume hold; workloads lift off the rack tops (lane -> rack x) and arc into the cloud, where they are lit and absorbed
const float LIFT = 0.045;
float liftU(vec3 a){ return fract(a.y + uTime * (LIFT + a.z * 0.02)); }
vec4 cloudF(vec3 a){
  if (a.x >= 100.0) return vec4(a.x - 200.0, a.y, a.z, 1.0);
  float u = liftU(a), x0 = -1.6 + a.x * 0.3;
  vec2 p0 = vec2(x0, 0.4), p1 = vec2(x0 + 0.45, 1.15), p2 = vec2(0.72 + (a.z - 0.5) * 0.9, 0.18 + (fract(a.z * 7.0) - 0.5) * 0.5);
  vec2 p = mix(mix(p0, p1, u), mix(p1, p2, u), u);
  return vec4(p, fract(a.z * 3.7) * 0.06 - 0.03, smoothstep(0.0, 0.08, u) * smoothstep(1.0, 0.86, u));
}
float cloudHL(vec3 a){ if (a.x >= 100.0) return bit(4.0); return smoothstep(0.3, 0.85, liftU(a)); }

vec4 formation(float i){
  if (i < 0.5) { vec3 p = rotY(position, uTime * 0.06); p.xy += uMouse * p.z * 0.08; return vec4(p, 1.0); }
  if (i < 1.5) return pipe(position1);
  if (i < 2.5) return vec4(rotY(position2, sin(uTime * 0.2) * 0.12), 1.0);
  if (i < 3.5) return radar(position3);
  if (i < 4.5) return cloudF(position4);
  return vec4(position5, 1.0);
}
float highlight(float i){
  if (i > 0.5 && i < 1.5) return pipeHL(position1);
  if (i > 2.5 && i < 3.5) return radarHL(position3);
  if (i > 3.5 && i < 4.5) return cloudHL(position4);
  if (i > 4.5) return 0.0;
  return bit(floor(i + 0.5));
}
float driftAmp(float i){ return i < 0.5 ? 0.035 : i < 1.5 ? 0.006 : i < 3.5 ? 0.02 : i < 4.5 ? 0.007 : 0.002; }

void main(){
  float delay = aRandom * 0.4;
  float m = smoothstep(delay, delay + 0.6, uMix);
  vec4 A = formation(uFrom);
  vec4 B = formation(uTo);
  vec3 pos = mix(A.xyz, B.xyz, m);
  float arc = sin(m * 3.14159265);
  if (arc > 0.001) pos += arc * 0.42 * vec3(snoise(pos * 1.1 + aRandom * 3.0), snoise(pos * 1.1 + 19.1), snoise(pos * 1.1 + 37.7));
  float amp = mix(driftAmp(uFrom), driftAmp(uTo), m) * uDrift;
  if (amp > 0.0) { float t = uTime * 0.15; pos += amp * vec3(snoise(pos * 0.8 + vec3(t, 0.0, 0.0)), snoise(pos * 0.8 + vec3(0.0, t, 7.3)), snoise(pos * 0.8 + vec3(5.1, 0.0, t))); }

  float h = mix(highlight(uFrom), highlight(uTo), m);
  float w8 = (uFrom > 4.5 ? 1.0 - m : 0.0) + (uTo > 4.5 ? m : 0.0);
  bool px = bit(5.0) > 0.5;
  vec3 col = mix(uColorBase, uColorAccent, h);
  if (px) col = mix(col, mix(uColorBase, uColorAccent, 0.4), w8);
  float a = mix(A.w, B.w, m) * mix(uAlpha * (0.6 + 0.4 * h), px ? uInitAlpha : uAlpha * 0.15, w8);

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  float soft = 1.0 - 0.6 * w8;
  vec2 sp = gl_Position.xy / gl_Position.w * uHalf;
  vec2 d = sp - uPointer;
  float r = length(d) + 0.001;
  vec2 off = d / r * uField.x * (1.0 - w8) * (1.0 - smoothstep(0.0, uField.y, r));
  d = sp - uPulse.xy; r = length(d) + 0.001;
  float q = (r - uPulse.z) / 48.0, ring = uPulse.w * exp(-q * q) * soft;
  off += d / r * ring * 24.0;
  gl_Position.xy += off / uHalf * gl_Position.w;
  col = mix(col, uColorAccent, ring * 0.8);
  a *= 1.0 + 0.8 * ring;
  float size = uPointSize * (0.7 + aRandom * 0.6) * (1.0 + 0.7 * h) * (6.0 / -mv.z);
  gl_PointSize = mix(size, px ? uInitSize : size, w8) * uPixelRatio;
  vColor = vec4(col, a);
  vSquare = px ? w8 : 0.0;
}`;
export const FRAG = `
varying vec4 vColor; varying float vSquare;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = mix(length(c), max(abs(c.x), abs(c.y)), vSquare);
  float a = smoothstep(0.5, mix(0.28, 0.44, vSquare), d);
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

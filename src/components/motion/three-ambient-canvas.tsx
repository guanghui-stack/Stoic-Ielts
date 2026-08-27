"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type AmbientVariant = "hero" | "campaign" | "territory";

type ThreeAmbientCanvasProps = {
  variant: AmbientVariant;
  activeKey?: string | null;
  className?: string;
};

type AnimatedObject = {
  object: THREE.Object3D;
  speed: number;
  axis: "x" | "y" | "z";
};

const PALETTE = {
  primary: 0x5b5fef,
  lavender: 0xb8a8f8,
  sage: 0x33745a,
  gold: 0x8a6318,
  ink: 0x172033,
};

function addRing(
  scene: THREE.Scene,
  animated: AnimatedObject[],
  options: {
    radius: number;
    tube: number;
    position: THREE.Vector3;
    color: number;
    opacity: number;
    speed: number;
    rotation?: THREE.Euler;
  },
) {
  const geometry = new THREE.TorusGeometry(options.radius, options.tube, 8, 72);
  const material = new THREE.MeshBasicMaterial({
    color: options.color,
    transparent: true,
    opacity: options.opacity,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(options.position);
  if (options.rotation) ring.rotation.copy(options.rotation);
  scene.add(ring);
  animated.push({ object: ring, speed: options.speed, axis: "z" });
}

function createScene(variant: AmbientVariant, activeKey: string | null) {
  const scene = new THREE.Scene();
  const animated: AnimatedObject[] = [];

  if (variant === "hero") {
    addRing(scene, animated, {
      radius: 1.42,
      tube: 0.018,
      position: new THREE.Vector3(1.72, 0.2, 0),
      color: PALETTE.primary,
      opacity: 0.42,
      speed: 0.055,
      rotation: new THREE.Euler(0.22, -0.32, 0.2),
    });
    addRing(scene, animated, {
      radius: 1.88,
      tube: 0.012,
      position: new THREE.Vector3(1.72, 0.2, -0.1),
      color: PALETTE.lavender,
      opacity: 0.34,
      speed: -0.035,
      rotation: new THREE.Euler(-0.32, 0.24, -0.1),
    });
    const points = new THREE.BufferGeometry();
    const positions = new Float32Array(42 * 3);
    for (let index = 0; index < 42; index += 1) {
      const angle = (index / 42) * Math.PI * 2;
      const radius = 1.4 + (index % 5) * 0.18;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle) * radius * 0.66;
      positions[index * 3 + 2] = (index % 3) * 0.04;
    }
    points.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pointMaterial = new THREE.PointsMaterial({
      color: PALETTE.gold,
      size: 0.035,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const pointCloud = new THREE.Points(points, pointMaterial);
    pointCloud.position.set(1.72, 0.2, 0.1);
    scene.add(pointCloud);
    animated.push({ object: pointCloud, speed: 0.022, axis: "z" });
  }

  if (variant === "campaign") {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.4, -0.9, 0),
      new THREE.Vector3(-2.7, 0.4, 0),
      new THREE.Vector3(-0.9, -0.2, 0),
      new THREE.Vector3(1.2, 0.8, 0),
      new THREE.Vector3(3.9, 0.1, 0),
    ]);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: PALETTE.lavender,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    const routeLine = new THREE.Line(lineGeometry, lineMaterial);
    routeLine.position.z = -0.15;
    scene.add(routeLine);
    animated.push({ object: routeLine, speed: 0.018, axis: "z" });

    for (let index = 0; index < 8; index += 1) {
      const point = curve.getPoint(index / 7);
      addRing(scene, animated, {
        radius: index === 0 ? 0.11 : 0.07,
        tube: 0.009,
        position: new THREE.Vector3(point.x, point.y, 0),
        color: index === 0 ? PALETTE.gold : PALETTE.primary,
        opacity: index === 0 ? 0.34 : 0.18,
        speed: index % 2 === 0 ? 0.035 : -0.025,
      });
    }
  }

  if (variant === "territory") {
    const keys = ["wei", "shu", "wu"];
    const colors = [PALETTE.primary, PALETTE.sage, PALETTE.gold];
    const positions = [
      new THREE.Vector3(-1.8, 0.85, 0),
      new THREE.Vector3(0.1, -0.45, 0),
      new THREE.Vector3(1.9, 0.72, 0),
    ];
    keys.forEach((key, index) => {
      const isActive = activeKey === key;
      addRing(scene, animated, {
        radius: isActive ? 0.56 : 0.38,
        tube: isActive ? 0.022 : 0.012,
        position: positions[index],
        color: colors[index],
        opacity: isActive ? 0.44 : 0.18,
        speed: isActive ? 0.09 : index % 2 === 0 ? 0.026 : -0.021,
        rotation: new THREE.Euler(0.1 * index, 0.32, 0.18 * index),
      });
    });
  }

  return { scene, animated };
}

export function ThreeAmbientCanvas({ variant, activeKey = null, className = "" }: ThreeAmbientCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const hostElement = host;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (reduceMotion || coarsePointer || window.innerWidth < 768) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
    camera.position.z = 10;
    const { scene, animated } = createScene(variant, activeKey);
    let frame = 0;
    let running = false;
    let inView = false;
    let hidden = document.visibilityState !== "visible";
    let lastTime = performance.now();

    function resize() {
      const rect = hostElement.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const aspect = width / height;
      camera.left = -5 * aspect;
      camera.right = 5 * aspect;
      camera.top = 3;
      camera.bottom = -3;
      camera.updateProjectionMatrix();
      renderer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer?.setSize(width, height, false);
    }

    function stop() {
      running = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function render(time: number) {
      if (!running || hidden || !inView) return;
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      animated.forEach(({ object, speed, axis }) => {
        object.rotation[axis] += speed * delta * 60;
      });
      renderer?.render(scene, camera);
      frame = requestAnimationFrame(render);
    }

    function start() {
      if (running || hidden || !inView) return;
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(render);
    }

    function handleVisibility() {
      hidden = document.visibilityState !== "visible";
      if (hidden) stop();
      else start();
    }

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostElement);
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false;
        if (inView) start();
        else stop();
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(hostElement);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      renderer?.dispose();
      renderer = null;
    };
  }, [activeKey, variant]);

  return (
    <div ref={hostRef} className={`world-ambient-canvas ${className}`} data-ambient-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

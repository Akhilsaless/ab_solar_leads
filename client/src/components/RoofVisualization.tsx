import { useEffect, useRef } from "react";
import * as THREE from "three";

interface RoofVisualizationProps {
  panelCount: number;
  systemSizeKw: number;
  panelType: "monocrystalline" | "polycrystalline";
}

export function RoofVisualization({ panelCount, systemSizeKw, panelType }: RoofVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 20);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Roof structure (trapezoid shape)
    const roofGeometry = new THREE.BufferGeometry();
    const roofVertices = new Float32Array([
      // Front face
      -8, 0, 0,   8, 0, 0,   8, 8, 0,   -8, 8, 0,
      // Back face
      -6, 0, 3,   6, 0, 3,   6, 8, 3,   -6, 8, 3,
      // Left side
      -8, 0, 0,   -6, 0, 3,   -6, 8, 3,   -8, 8, 0,
      // Right side
      8, 0, 0,    6, 0, 3,    6, 8, 3,    8, 8, 0,
    ]);

    roofGeometry.setAttribute("position", new THREE.BufferAttribute(roofVertices, 3));
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);

    // Solar panels
    const panelColor = panelType === "monocrystalline" ? 0x1a1a1a : 0x2a3a5a;
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: panelColor,
      roughness: 0.3,
      metalness: 0.7,
    });

    const panelsPerRow = Math.ceil(Math.sqrt(panelCount));
    const panelWidth = 1.6;
    const panelHeight = 1.0;
    const spacing = 0.1;

    let panelIndex = 0;
    for (let row = 0; row < panelsPerRow && panelIndex < panelCount; row++) {
      for (let col = 0; col < panelsPerRow && panelIndex < panelCount; col++) {
        const panelGeometry = new THREE.BoxGeometry(panelWidth, 0.05, panelHeight);
        const panel = new THREE.Mesh(panelGeometry, panelMaterial);

        const x = col * (panelWidth + spacing) - (panelsPerRow * (panelWidth + spacing)) / 2;
        const z = row * (panelHeight + spacing);
        const y = 0.1;

        panel.position.set(x, y, z);
        panel.rotation.x = Math.PI / 6; // 30-degree tilt
        panel.castShadow = true;
        panel.receiveShadow = true;
        scene.add(panel);

        panelIndex++;
      }
    }

    // Animation
    const animate = () => {
      requestAnimationFrame(animate);
      if (sceneRef.current && rendererRef.current) {
        rendererRef.current.render(sceneRef.current, camera);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && rendererRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [panelCount, panelType]);

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-lg border border-white/10 bg-white/5 overflow-hidden"
    />
  );
}

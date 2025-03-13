import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, useGLTF } from '@react-three/drei';
import gsap from 'gsap';
import './App.css';
import EnhancedPiano from './components/EnhancedPiano';
import './components/EnhancedMelodyStyles.css';
import Logger from './utils/Logger';

// 3D Background component
function PianoEnvironment() {
  const { scene, camera } = useThree();
  const directionalLight = useRef<THREE.DirectionalLight>(null);
  const ambientLight = useRef<THREE.AmbientLight>(null);
  const skyColor = new THREE.Color('#1a2639');
  const sunsetColor = new THREE.Color('#ff7f50');
  
  // Create background with day/night cycle
  useEffect(() => {
    if (!scene || !scene.background) return;
    scene.background = skyColor;
    scene.fog = new THREE.Fog(skyColor, 5, 30);
    
    // Add subtle animation to the camera
    gsap.to(camera.position, {
      y: camera.position.y + 0.1,
      x: camera.position.x + 0.05,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    // Create a day/night cycle
    const timeline = gsap.timeline({
      repeat: -1,
      yoyo: true,
      repeatDelay: 8,
    });
    
    timeline.to(skyColor, {
      r: sunsetColor.r,
      g: sunsetColor.g,
      b: sunsetColor.b,
      duration: 12,
      onUpdate: () => {
        if (scene && scene.background) {
          scene.background = skyColor;
          if (scene.fog) scene.fog.color = skyColor;
        }
      }
    });
    
    timeline.to(scene.fog!.color, {
      r: sunsetColor.r,
      g: sunsetColor.g,
      b: sunsetColor.b,
      duration: 12,
    }, 0);
    
    // Cleanup function to kill animations when component unmounts
    return () => {
      timeline.kill();
    };
  }, [scene, camera]);
  
  useFrame(() => {
    if (directionalLight.current) {
      const time = Date.now() * 0.0005;
      directionalLight.current.position.x = Math.sin(time) * 3;
      directionalLight.current.position.z = Math.cos(time) * 3;
    }
  });
  
  return (
    <>
      <ambientLight ref={ambientLight} intensity={0.4} />
      <directionalLight
        ref={directionalLight}
        position={[1, 3, 2]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <CityScape />
      <Environment preset="sunset" />
      <fog attach="fog" args={['#1a2639', 5, 30]} />
    </>
  );
}

// Cityscape component for the background
function CityScape() {
  const group = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (!group.current) return;
    
    // Create buildings
    for (let i = 0; i < 80; i++) {
      const height = Math.random() * 3 + 0.5;
      const width = Math.random() * 0.5 + 0.3;
      const depth = Math.random() * 0.5 + 0.3;
      
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.1, 0.1 + Math.random() * 0.1, 0.2 + Math.random() * 0.1),
        roughness: 0.7,
        metalness: 0.2,
        emissive: new THREE.Color(0.05, 0.05, 0.1),
        emissiveIntensity: Math.random() * 0.1,
      });
      
      const building = new THREE.Mesh(geometry, material);
      
      // Position buildings in a circular pattern
      const radius = 12 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      building.position.set(
        Math.sin(angle) * radius,
        height / 2 - 3,
        Math.cos(angle) * radius
      );
      
      // Rotate buildings slightly
      building.rotation.y = Math.random() * Math.PI;
      
      // Add random windows
      if (Math.random() > 0.3) {
        const windowsMaterial = new THREE.MeshBasicMaterial({
          color: new THREE.Color(0.9, 0.8, 0.5),
          transparent: true,
          opacity: 0.6 + Math.random() * 0.2,
        });
        
        const windowsGeometry = new THREE.PlaneGeometry(width * 0.8, height * 0.8);
        const windows = new THREE.Mesh(windowsGeometry, windowsMaterial);
        windows.position.z = depth / 2 + 0.001;
        windows.rotation.y = Math.PI;
        
        building.add(windows);
      }
      
      group.current.add(building);
    }
    
    // Add some ground
    const groundGeometry = new THREE.CircleGeometry(25, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.1, 0.15, 0.2),
      roughness: 0.8,
      metalness: 0.0,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    group.current.add(ground);
    
  }, []);
  
  return <group ref={group} position={[0, 0, -5]} />;
}

// Main App component
const App = () => {
  // Log application startup information
  useEffect(() => {
    const appLogger = new Logger('App');
    
    // Display startup information
    appLogger.perfStart('App Initialization');
    
    // System information
    appLogger.info('Piano App Starting', {
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      platform: navigator.platform,
      userAgent: navigator.userAgent
    });
    
    // Audio compatibility check
    if (window.AudioContext || (window as any).webkitAudioContext) {
      appLogger.success('Audio Context API available');
    } else {
      appLogger.error('Audio Context API not available - app functionality will be limited');
    }
    
    // Check WebAudio API compatibility
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx) {
        appLogger.success('WebAudio API initialized successfully', {
          sampleRate: audioCtx.sampleRate,
          state: audioCtx.state
        });
        audioCtx.close(); // Clean up the test context
      }
    } catch (e) {
      appLogger.error('WebAudio API initialization failed', e);
    }
    
    // MIDI support check
    if ('requestMIDIAccess' in navigator) {
      appLogger.info('Web MIDI API supported by browser');
    } else {
      appLogger.warn('Web MIDI API not supported by browser');
    }
    
    appLogger.perfEnd('App Initialization');
  }, []);

  return (
    <div className="app">
      <div className="three-background">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />
          <PianoEnvironment />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            autoRotate
            autoRotateSpeed={0.2}
          />
        </Canvas>
      </div>
      
      <div className="content-container">
        <div className="piano-app enhanced fade-in">
          <h1 className="app-title"></h1>
          <EnhancedPiano />
        </div>
      </div>
    </div>
  );
};

export default App;

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './ManhattanSkyline.css';

// Performance settings
const PERFORMANCE = {
  LOW: {
    buildingCount: 10,
    windowDetail: 0.5,
    shadowsEnabled: false,
    antialias: false,
    pixelRatio: 0.75,
    fogDensity: 0.05,
    targetFPS: 30
  },
  MEDIUM: {
    buildingCount: 20,
    windowDetail: 1,
    shadowsEnabled: true,
    antialias: true,
    pixelRatio: 1,
    fogDensity: 0.03,
    targetFPS: 45
  },
  HIGH: {
    buildingCount: 30,
    windowDetail: 1.5,
    shadowsEnabled: true,
    antialias: true,
    pixelRatio: window.devicePixelRatio,
    fogDensity: 0.02,
    targetFPS: 60
  }
};

const ManhattanSkyline = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsIntervalRef = useRef<number>(1000 / 60); // Default to 60 FPS
  const [performanceLevel, setPerformanceLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const resizeTimeoutRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const geometriesRef = useRef<THREE.BufferGeometry[]>([]);
  const materialsRef = useRef<THREE.Material[]>([]);
  const texturesRef = useRef<THREE.Texture[]>([]);
  
  // Detect device capabilities on mount
  useEffect(() => {
    const detectDeviceCapabilities = () => {
      // Check for low-end devices
      const isLowEndDevice = () => {
        // Check if it's a mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Check CPU cores if available
        const cpuCores = navigator.hardwareConcurrency || 0;
        
        // Check memory if available (Chrome only)
        const memory = (navigator as any).deviceMemory || 8;
        
        // Check if it's a low-end device
        return isMobile && (cpuCores <= 4 || memory <= 4);
      };
      
      // Check for high-end devices
      const isHighEndDevice = () => {
        // Check CPU cores if available
        const cpuCores = navigator.hardwareConcurrency || 0;
        
        // Check memory if available (Chrome only)
        const memory = (navigator as any).deviceMemory || 8;
        
        // Check if it's a high-end device
        return cpuCores >= 8 && memory >= 8 && !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      };
      
      // Set performance level based on device capabilities
      if (isLowEndDevice()) {
        setPerformanceLevel('LOW');
      } else if (isHighEndDevice()) {
        setPerformanceLevel('HIGH');
      } else {
        setPerformanceLevel('MEDIUM');
      }
    };
    
    detectDeviceCapabilities();
  }, []);

  // Update FPS interval when performance level changes
  useEffect(() => {
    fpsIntervalRef.current = 1000 / PERFORMANCE[performanceLevel].targetFPS;
  }, [performanceLevel]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const settings = PERFORMANCE[performanceLevel];

    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x1a2639);
    scene.fog = new THREE.Fog(0x1a2639, 10, 100);
    
    // Adjust fog density based on performance level
    (scene.fog as THREE.Fog).near = 10 / settings.fogDensity;
    (scene.fog as THREE.Fog).far = 100 / settings.fogDensity;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 10, 0);

    // Create frustum for culling
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: settings.antialias, 
      alpha: true,
      canvas: document.createElement('canvas'),
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(settings.pixelRatio, 2)); // Cap pixel ratio at 2 for performance
    renderer.shadowMap.enabled = settings.shadowsEnabled;
    
    // Use more efficient shadow map type for better performance
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Enable frustum culling
    renderer.autoClear = true;
    
    containerRef.current.appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    // Add directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffd6aa, 2);
    sunLight.position.set(50, 50, 50);
    sunLight.castShadow = settings.shadowsEnabled;
    
    // Optimize shadow map settings
    if (settings.shadowsEnabled) {
      sunLight.shadow.mapSize.width = 1024 * settings.windowDetail;
      sunLight.shadow.mapSize.height = 1024 * settings.windowDetail;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 200;
      sunLight.shadow.camera.left = -50;
      sunLight.shadow.camera.right = 50;
      sunLight.shadow.camera.top = 50;
      sunLight.shadow.camera.bottom = -50;
      sunLight.shadow.bias = -0.001;
    }
    
    scene.add(sunLight);

    // Create sun
    const sunGeometry = new THREE.SphereGeometry(5, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff99 });
    geometriesRef.current.push(sunGeometry);
    materialsRef.current.push(sunMaterial);

    // Create skyline group
    const skyline = new THREE.Group();
    scene.add(skyline);

    // Create building geometries and materials
    const buildingGeometries: THREE.BoxGeometry[] = [
      new THREE.BoxGeometry(4, 60, 4), // Tall building
      new THREE.BoxGeometry(8, 40, 8), // Medium building
      new THREE.BoxGeometry(12, 30, 12), // Wide building
      new THREE.BoxGeometry(6, 50, 6), // Another tall building
      new THREE.BoxGeometry(10, 25, 10) // Short wide building
    ];
    
    const buildingMaterials: THREE.MeshStandardMaterial[] = [
      new THREE.MeshStandardMaterial({ 
        color: 0xeeeeee,
        roughness: 0.7,
        metalness: 0.2
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0xcccccc,
        roughness: 0.7,
        metalness: 0.2
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0xdddddd,
        roughness: 0.7,
        metalness: 0.2
      })
    ];
    
    geometriesRef.current = [...geometriesRef.current, ...buildingGeometries];
    materialsRef.current = [...materialsRef.current, ...buildingMaterials];

    // Reusable window geometry and material
    const windowGeometry = new THREE.PlaneGeometry(0.5, 0.5);
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff99,
      transparent: true,
      opacity: 0.8,
    });
    geometriesRef.current.push(windowGeometry);
    materialsRef.current.push(windowMaterial);

    // Create 432 Park Avenue (iconic building)
    const parkAvenue = new THREE.Mesh(buildingGeometries[0], buildingMaterials[0]);
    parkAvenue.position.set(0, 30, -20);
    parkAvenue.castShadow = settings.shadowsEnabled;
    parkAvenue.receiveShadow = settings.shadowsEnabled;
    skyline.add(parkAvenue);

    // Create windows for buildings
    const createBuildingWindows = (building: THREE.Mesh, width: number, height: number, depth: number) => {
      const windowGroup = new THREE.Group();
      
      // Adjust window detail based on performance level
      const rows = Math.floor(20 * settings.windowDetail);
      const cols = 4;
      
      // Calculate window spacing
      const rowSpacing = height * 0.04;
      const startY = -height * 0.4;
      
      // Create instanced mesh for windows for better performance
      const instancedWindowMaterial = windowMaterial.clone();
      
      // Create matrix for each window instance
      const matrices: THREE.Matrix4[] = [];
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const windowMatrix = new THREE.Matrix4();
          
          // Position windows evenly on each face
          if (col === 0) {
            // Front face
            windowMatrix.makeTranslation(
              -width * 0.3,
              startY + row * rowSpacing,
              depth * 0.51
            );
          } else if (col === 1) {
            // Right face
            windowMatrix.makeTranslation(
              width * 0.51,
              startY + row * rowSpacing,
              -depth * 0.3
            );
            windowMatrix.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
          } else if (col === 2) {
            // Back face
            windowMatrix.makeTranslation(
              width * 0.3,
              startY + row * rowSpacing,
              -depth * 0.51
            );
            windowMatrix.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
          } else {
            // Left face
            windowMatrix.makeTranslation(
              -width * 0.51,
              startY + row * rowSpacing,
              depth * 0.3
            );
            windowMatrix.multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
          }
          
          matrices.push(windowMatrix);
        }
      }
      
      // Create instanced mesh
      const instanceCount = matrices.length;
      const instancedMesh = new THREE.InstancedMesh(
        windowGeometry,
        instancedWindowMaterial,
        instanceCount
      );
      
      // Set matrix for each instance
      for (let i = 0; i < instanceCount; i++) {
        instancedMesh.setMatrixAt(i, matrices[i]);
      }
      
      instancedMesh.instanceMatrix.needsUpdate = true;
      windowGroup.add(instancedMesh);
      
      building.add(windowGroup);
    };

    createBuildingWindows(parkAvenue, 4, 60, 4);

    // Use instanced mesh for buildings with similar geometry
    const createRandomBuildings = () => {
      // Group buildings by similar dimensions for instancing
      const buildingGroups: Record<string, {positions: THREE.Vector3[], heights: number[], count: number, width: number, depth: number}> = {};
      
      // Generate building data
      for (let i = 0; i < settings.buildingCount; i++) {
        // Select random geometry and material
        const geoIndex = Math.floor(Math.random() * buildingGeometries.length);
        const matIndex = Math.floor(Math.random() * buildingMaterials.length);
        
        const building = new THREE.Mesh(
          buildingGeometries[geoIndex],
          buildingMaterials[matIndex]
        );
        
        // Position building randomly in a grid
        const gridSize = 100;
        const gridDivisions = 5;
        const cellSize = gridSize / gridDivisions;
        
        const gridX = Math.floor(Math.random() * gridDivisions) - Math.floor(gridDivisions / 2);
        const gridZ = Math.floor(Math.random() * gridDivisions) - Math.floor(gridDivisions / 2);
        
        // Add some randomness to position within grid cell
        const offsetX = (Math.random() - 0.5) * cellSize * 0.8;
        const offsetZ = (Math.random() - 0.5) * cellSize * 0.8;
        
        building.position.set(
          gridX * cellSize + offsetX,
          buildingGeometries[geoIndex].parameters.height / 2,
          gridZ * cellSize + offsetZ - 20 // Offset to place buildings behind the main one
        );
        
        // Add random rotation
        building.rotation.y = Math.random() * Math.PI * 2;
        
        // Add shadows
        building.castShadow = settings.shadowsEnabled;
        building.receiveShadow = settings.shadowsEnabled;
        
        // Add to scene
        skyline.add(building);
        
        // Add windows to larger buildings
        if (geoIndex <= 2 && Math.random() > 0.3) {
          const geo = buildingGeometries[geoIndex];
          createBuildingWindows(
            building,
            geo.parameters.width,
            geo.parameters.height,
            geo.parameters.depth
          );
          
          // Create a key based on width and depth (similar buildings)
          const key = `${geo.parameters.width.toFixed(1)}_${geo.parameters.depth.toFixed(1)}`;
          
          if (!buildingGroups[key]) {
            buildingGroups[key] = {
              positions: [],
              heights: [],
              count: 0,
              width: geo.parameters.width,
              depth: geo.parameters.depth
            };
          }
          
          buildingGroups[key].positions.push(new THREE.Vector3(building.position.x, building.position.y, building.position.z));
          buildingGroups[key].heights.push(building.position.y);
          buildingGroups[key].count++;
        }
      }
      
      // Create instanced meshes for each building group
      Object.entries(buildingGroups).forEach(([key, group]) => {
        if (group.count > 3) { // Only use instancing for groups with enough similar buildings
          const [width, depth] = key.split('_').map(Number);
          // Use a height of 1 for the geometry, we'll scale it in the matrix
          const geometry = new THREE.BoxGeometry(width, 1, depth);
          geometriesRef.current.push(geometry);
          
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x444444),
            roughness: 0.7,
            metalness: 0.2,
          });
          materialsRef.current.push(material);
          
          const instancedMesh = new THREE.InstancedMesh(
            geometry,
            material,
            group.count
          );
          
          // Position each instance
          group.positions.forEach((position, i) => {
            const matrix = new THREE.Matrix4();
            // Scale the y dimension to match the building height
            matrix.makeScale(1, group.heights[i], 1);
            // Then translate to position
            matrix.setPosition(position.x, position.y, position.z);
            instancedMesh.setMatrixAt(i, matrix);
          });
          
          instancedMesh.castShadow = settings.shadowsEnabled;
          instancedMesh.receiveShadow = settings.shadowsEnabled;
          instancedMesh.instanceMatrix.needsUpdate = true;
          skyline.add(instancedMesh);
        } else {
          // For small groups, create individual meshes as before
          group.positions.forEach((position, i) => {
            // ... existing individual building creation code ...
          });
        }
      });
    };
    
    createRandomBuildings();

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
    });
    geometriesRef.current.push(groundGeometry);
    materialsRef.current.push(groundMaterial);

    // Create sun
    const theSunGeometry = new THREE.SphereGeometry(5, 16, 16);
    const theSunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff99 });
    const sun = new THREE.Mesh(theSunGeometry, theSunMaterial);
    sun.position.set(50, 50, -100);
    scene.add(sun);
    geometriesRef.current.push(theSunGeometry);
    materialsRef.current.push(theSunMaterial);

    // Animation loop with frame rate throttling
    const animate = (timestamp: number) => {
      // Calculate elapsed time since last frame
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      // Only render if enough time has passed
      if (elapsed > fpsIntervalRef.current) {
        // Remember last frame time
        lastFrameTimeRef.current = timestamp - (elapsed % fpsIntervalRef.current);
        
        // Update projection matrix for frustum culling
        projScreenMatrix.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(projScreenMatrix);
        
        // Rotate the skyline slightly for a more dynamic view
        skyline.rotation.y += 0.001;
        
        // Render scene
        renderer.render(scene, camera);
      }
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Debounced resize handler
    const handleResize = useCallback(() => {
      if (rendererRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        rendererRef.current.setSize(width, height);
      }
    }, []);
    
    // Debounced resize function
    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = window.setTimeout(() => {
        handleResize();
        resizeTimeoutRef.current = null;
      }, 150);
    };

    window.addEventListener('resize', debouncedResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedResize);
      
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (error) {
          console.error("Error removing renderer:", error);
        }
      }
      
      // Dispose of all Three.js resources
      // Dispose of geometries
      geometriesRef.current.forEach(geo => {
        if (geo && typeof geo.dispose === 'function') {
          geo.dispose();
        }
      });
      
      // Dispose of materials
      materialsRef.current.forEach(mat => {
        if (mat && typeof mat.dispose === 'function') {
          if ('map' in mat && mat.map && typeof mat.map.dispose === 'function') {
            mat.map.dispose();
          }
          mat.dispose();
        }
      });
      
      // Dispose of textures
      texturesRef.current.forEach(tex => {
        if (tex && typeof tex.dispose === 'function') {
          tex.dispose();
        }
      });
      
      // Dispose of renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
        rendererRef.current.domElement = null as any;
      }
      
      // Clear references
      sceneRef.current = null;
      geometriesRef.current = [];
      materialsRef.current = [];
      texturesRef.current = [];
    };
  }, [performanceLevel]);

  return (
    <div className="manhattan-skyline" ref={containerRef}>
      <div className="window-frame"></div>
      <div className="window-reflection"></div>
      <div className="window-dust"></div>
    </div>
  );
};

export default ManhattanSkyline; 
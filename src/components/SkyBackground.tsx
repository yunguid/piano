import { useState, useEffect, useRef, useCallback } from 'react';
import './SkyBackground.css';

// Washington DC coordinates
const DC_LAT = 38.9072;
const DC_LONG = -77.0369;

// Performance settings
const PERFORMANCE = {
  LOW: {
    starCount: 50,
    cloudCount: 5,
    birdCount: 3,
    raindropCount: 50,
    enableFilmGrain: false,
    enableVignette: true,
    targetFPS: 30
  },
  MEDIUM: {
    starCount: 100,
    cloudCount: 10,
    birdCount: 5,
    raindropCount: 100,
    enableFilmGrain: true,
    enableVignette: true,
    targetFPS: 45
  },
  HIGH: {
    starCount: 200,
    cloudCount: 15,
    birdCount: 8,
    raindropCount: 200,
    enableFilmGrain: true,
    enableVignette: true,
    targetFPS: 60
  }
};

interface SkyBackgroundProps {
  className?: string;
}

// Stars for night sky
interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

// Birds for daytime sky
interface Bird {
  x: number;
  y: number;
  size: number;
  speed: number;
  wingPhase: number;
  wingSpeed: number;
}

const SkyBackground: React.FC<SkyBackgroundProps> = ({ className = '' }) => {
  const [time, setTime] = useState(new Date());
  const [isRaining, setIsRaining] = useState(false);
  const [performanceLevel, setPerformanceLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cloudsRef = useRef<{ x: number; y: number; speed: number; size: number; opacity: number; type: number }[]>([]);
  const raindropsRef = useRef<{ x: number; y: number; speed: number; length: number }[]>([]);
  const starsRef = useRef<Star[]>([]);
  const birdsRef = useRef<Bird[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeMultiplierRef = useRef<number>(60); // Speed up time for dramatic effect (1 minute = 1 hour)
  const lastFrameTimeRef = useRef<number>(0);
  const fpsIntervalRef = useRef<number>(1000 / 60); // Default to 60 FPS
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);
  const currentFpsRef = useRef<number>(60);
  const resizeTimeoutRef = useRef<number | null>(null);

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

  // Calculate sun position based on time and DC location
  const calculateSunPosition = (date: Date) => {
    // Get hours and convert to decimal
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const decimalTime = hours + minutes / 60;
    
    // Simple approximation of sun position
    // Sunrise around 6am (position 0), sunset around 6pm (position 1)
    // Adjust based on season if needed for more accuracy
    const dayLength = 12; // 12 hours of daylight approximation
    
    // Calculate position from 0 (sunrise) to 1 (sunset)
    let position = 0;
    
    if (decimalTime >= 6 && decimalTime <= 18) {
      // During daylight hours
      position = (decimalTime - 6) / dayLength;
    } else if (decimalTime > 18) {
      // After sunset
      position = 1;
    } else {
      // Before sunrise
      position = 0;
    }
    
    return position;
  };

  // Calculate moon position (opposite to sun)
  const calculateMoonPosition = (sunPosition: number) => {
    // Moon is opposite to sun in the sky
    return (sunPosition + 0.5) % 1;
  };

  // Get sky colors based on sun position - more dramatic and anime-inspired
  const getSkyColors = (sunPosition: number) => {
    // Different color schemes based on time of day with more dramatic anime-inspired colors
    if (sunPosition < 0.05) { // Deep night
      return {
        top: 'rgb(5, 5, 20)',
        middle: 'rgb(15, 10, 35)',
        bottom: 'rgb(30, 15, 50)',
        sunColor: 'rgba(255, 180, 120, 0.8)',
        moonColor: 'rgba(220, 240, 255, 0.9)',
        cloudColor: 'rgba(30, 30, 50, 0.7)',
        starVisibility: 1.0
      };
    } else if (sunPosition < 0.15) { // Dawn
      return {
        top: 'rgb(25, 25, 62)',
        middle: 'rgb(85, 45, 90)',
        bottom: 'rgb(180, 70, 90)',
        sunColor: 'rgba(255, 160, 100, 0.9)',
        moonColor: 'rgba(200, 220, 255, 0.5)',
        cloudColor: 'rgba(100, 80, 120, 0.8)',
        starVisibility: 0.3
      };
    } else if (sunPosition < 0.3) { // Morning
      return {
        top: 'rgb(100, 150, 220)',
        middle: 'rgb(180, 180, 240)',
        bottom: 'rgb(255, 170, 130)',
        sunColor: 'rgba(255, 200, 150, 0.8)',
        moonColor: 'rgba(0, 0, 0, 0)',
        cloudColor: 'rgba(255, 255, 255, 0.8)',
        starVisibility: 0
      };
    } else if (sunPosition < 0.7) { // Midday
      return {
        top: 'rgb(60, 140, 220)',
        middle: 'rgb(120, 180, 240)',
        bottom: 'rgb(200, 220, 255)',
        sunColor: 'rgba(255, 255, 200, 0.9)',
        moonColor: 'rgba(0, 0, 0, 0)',
        cloudColor: 'rgba(255, 255, 255, 0.9)',
        starVisibility: 0
      };
    } else if (sunPosition < 0.85) { // Sunset - dramatic Berserk-inspired
      return {
        top: 'rgb(60, 30, 80)',
        middle: 'rgb(180, 60, 80)',
        bottom: 'rgb(250, 100, 50)',
        sunColor: 'rgba(255, 100, 50, 0.9)',
        moonColor: 'rgba(0, 0, 0, 0)',
        cloudColor: 'rgba(200, 100, 80, 0.8)',
        starVisibility: 0.1
      };
    } else if (sunPosition < 0.95) { // Dusk
      return {
        top: 'rgb(30, 20, 60)',
        middle: 'rgb(80, 30, 80)',
        bottom: 'rgb(120, 40, 70)',
        sunColor: 'rgba(200, 80, 60, 0.7)',
        moonColor: 'rgba(180, 200, 255, 0.4)',
        cloudColor: 'rgba(80, 50, 90, 0.8)',
        starVisibility: 0.5
      };
    } else { // Night
      return {
        top: 'rgb(10, 10, 30)',
        middle: 'rgb(20, 15, 40)',
        bottom: 'rgb(30, 20, 50)',
        sunColor: 'rgba(0, 0, 0, 0)',
        moonColor: 'rgba(220, 240, 255, 0.9)',
        cloudColor: 'rgba(30, 30, 50, 0.7)',
        starVisibility: 0.9
      };
    }
  };

  // Initialize stars, clouds, birds, and raindrops
  useEffect(() => {
    const settings = PERFORMANCE[performanceLevel];
    
    // Create stars
    const stars: Star[] = [];
    for (let i = 0; i < settings.starCount; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * (window.innerHeight * 0.7),
        size: 0.5 + Math.random() * 2,
        opacity: 0.5 + Math.random() * 0.5,
        twinkleSpeed: 0.001 + Math.random() * 0.003
      });
    }
    starsRef.current = stars;
    
    // Create clouds - use instance pooling for similar cloud types
    const cloudTypes = [
      { // Fluffy cloud
        radiusRatios: [0.5, 0.4, 0.4, 0.5],
        positionOffsets: [
          [0, 0],
          [0.4, -0.1],
          [0.7, 0],
          [0.4, 0.1]
        ]
      },
      { // Stretched cloud
        radiusRatios: [0.33, 0.33, 0.33, 0.33],
        positionOffsets: [
          [0, 0],
          [0.3, 0],
          [0.6, 0],
          [0.9, 0]
        ]
      },
      { // Wispy cloud
        radiusRatios: [0.25, 0.25, 0.25, 0.25, 0.25],
        positionOffsets: [
          [0, 0],
          [0.2, -0.05],
          [0.4, 0],
          [0.6, -0.05],
          [0.8, 0]
        ]
      }
    ];
    
    const clouds: { x: number; y: number; speed: number; size: number; opacity: number; type: number }[] = [];
    for (let i = 0; i < settings.cloudCount; i++) {
      clouds.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * (window.innerHeight * 0.6),
        speed: 0.2 + Math.random() * 0.3,
        size: 50 + Math.random() * 100,
        opacity: 0.4 + Math.random() * 0.4,
        type: Math.floor(Math.random() * cloudTypes.length)
      });
    }
    cloudsRef.current = clouds;
    
    // Create birds
    const birds: Bird[] = [];
    for (let i = 0; i < settings.birdCount; i++) {
      birds.push({
        x: Math.random() * window.innerWidth,
        y: 50 + Math.random() * (window.innerHeight * 0.3),
        size: 5 + Math.random() * 5,
        speed: 0.5 + Math.random() * 1.5,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpeed: 0.05 + Math.random() * 0.05
      });
    }
    birdsRef.current = birds;
    
    // Create raindrops
    const raindrops: { x: number; y: number; speed: number; length: number }[] = [];
    for (let i = 0; i < settings.raindropCount; i++) {
      raindrops.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        speed: 5 + Math.random() * 10,
        length: 10 + Math.random() * 20
      });
    }
    raindropsRef.current = raindrops;
  }, [performanceLevel]);

  // Update time every second, but accelerate for dramatic effect
  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = new Date();
      // Accelerate time for dramatic effect
      newTime.setHours(newTime.getHours() + timeMultiplierRef.current);
      setTime(newTime);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Main animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const settings = PERFORMANCE[performanceLevel];
    
    // Cloud shape templates for instance pooling
    const cloudTypes = [
      { // Fluffy cloud
        radiusRatios: [0.5, 0.4, 0.4, 0.5],
        positionOffsets: [
          [0, 0],
          [0.4, -0.1],
          [0.7, 0],
          [0.4, 0.1]
        ]
      },
      { // Stretched cloud
        radiusRatios: [0.33, 0.33, 0.33, 0.33],
        positionOffsets: [
          [0, 0],
          [0.3, 0],
          [0.6, 0],
          [0.9, 0]
        ]
      },
      { // Wispy cloud
        radiusRatios: [0.25, 0.25, 0.25, 0.25, 0.25],
        positionOffsets: [
          [0, 0],
          [0.2, -0.05],
          [0.4, 0],
          [0.6, -0.05],
          [0.8, 0]
        ]
      }
    ];
    
    // Animation loop with frame rate throttling
    const animate = (timestamp: number) => {
      // Calculate elapsed time since last frame
      const elapsed = timestamp - lastFrameTimeRef.current;
      
      // Only render if enough time has passed (throttle frame rate)
      if (elapsed < fpsIntervalRef.current) {
        // Skip this frame
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Remember last frame time, adjusting for the remainder
      lastFrameTimeRef.current = timestamp - (elapsed % fpsIntervalRef.current);
      
      // Update FPS counter
      frameCountRef.current++;
      if (timestamp - lastFpsUpdateRef.current >= 1000) {
        currentFpsRef.current = frameCountRef.current;
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = timestamp;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const sunPosition = calculateSunPosition(time);
      const moonPosition = calculateMoonPosition(sunPosition);
      const colors = getSkyColors(sunPosition);
      
      // Draw gradient sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, colors.top);
      skyGradient.addColorStop(0.5, colors.middle);
      skyGradient.addColorStop(1, colors.bottom);
      
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw stars if night or dawn/dusk
      if (colors.starVisibility > 0) {
        starsRef.current.forEach((star, index) => {
          // Twinkle effect
          const twinkle = Math.sin(Date.now() * star.twinkleSpeed) * 0.3 + 0.7;
          const starOpacity = star.opacity * colors.starVisibility * twinkle;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity})`;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
          
          // Add glow to some stars
          if (star.size > 1.5 && performanceLevel !== 'LOW') {
            const glow = ctx.createRadialGradient(
              star.x, star.y, 0,
              star.x, star.y, star.size * 4
            );
            glow.addColorStop(0, `rgba(255, 255, 255, ${starOpacity * 0.5})`);
            glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      
      // Draw sun
      const sunX = canvas.width * sunPosition;
      const sunY = canvas.height * (0.8 - 0.6 * Math.sin(sunPosition * Math.PI));
      
      // Sun glow - more dramatic for anime effect
      const sunGradient = ctx.createRadialGradient(
        sunX, sunY, 0,
        sunX, sunY, 200
      );
      
      sunGradient.addColorStop(0, colors.sunColor);
      sunGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.3)');
      sunGradient.addColorStop(0.7, 'rgba(255, 150, 50, 0.1)');
      sunGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
      
      ctx.fillStyle = sunGradient;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 200, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw sun
      ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw sun rays - Berserk-inspired dramatic rays
      if (sunPosition > 0.1 && sunPosition < 0.9 && performanceLevel !== 'LOW') {
        ctx.save();
        ctx.translate(sunX, sunY);
        
        const rayCount = performanceLevel === 'HIGH' ? 12 : 8;
        const rayLength = 300;
        
        for (let i = 0; i < rayCount; i++) {
          const angle = (i / rayCount) * Math.PI * 2;
          const rayOpacity = 0.2 + 0.1 * Math.sin(Date.now() * 0.001 + i);
          
          ctx.strokeStyle = `rgba(255, 200, 100, ${rayOpacity})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength);
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw moon if visible
      if (colors.moonColor !== 'rgba(0, 0, 0, 0)') {
        const moonX = canvas.width * moonPosition;
        const moonY = canvas.height * (0.8 - 0.6 * Math.sin(moonPosition * Math.PI));
        
        // Moon glow
        const moonGradient = ctx.createRadialGradient(
          moonX, moonY, 0,
          moonX, moonY, 100
        );
        
        moonGradient.addColorStop(0, colors.moonColor);
        moonGradient.addColorStop(0.5, 'rgba(180, 200, 255, 0.2)');
        moonGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
        
        ctx.fillStyle = moonGradient;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 100, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw moon
        ctx.fillStyle = 'rgba(230, 240, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw moon craters for detail
        if (performanceLevel !== 'LOW') {
          ctx.fillStyle = 'rgba(200, 210, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(moonX - 15, moonY - 10, 8, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(moonX + 10, moonY + 15, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(moonX + 5, moonY - 20, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Apply a subtle blur for anime-style atmosphere
      if (performanceLevel !== 'LOW') {
        ctx.filter = 'blur(3px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
      }
      
      // Draw birds during daytime
      if (sunPosition > 0.2 && sunPosition < 0.8) {
        birdsRef.current.forEach((bird, index) => {
          // Move bird
          bird.x += bird.speed;
          bird.wingPhase += bird.wingSpeed;
          
          // Reset bird when it moves off screen
          if (bird.x > canvas.width + 50) {
            bird.x = -50;
            bird.y = 50 + Math.random() * (canvas.height * 0.3);
            bird.speed = 0.5 + Math.random() * 1.5;
          }
          
          // Draw bird - simple "M" shape with flapping wings
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          
          // Wing position varies with phase
          const wingY = Math.sin(bird.wingPhase) * bird.size;
          
          ctx.moveTo(bird.x - bird.size, bird.y + wingY);
          ctx.lineTo(bird.x, bird.y);
          ctx.lineTo(bird.x + bird.size, bird.y + wingY);
          
          ctx.stroke();
        });
      }
      
      // Update and draw clouds using instance pooling
      cloudsRef.current.forEach((cloud, index) => {
        // Move cloud
        cloud.x += cloud.speed;
        
        // Reset cloud when it moves off screen
        if (cloud.x > canvas.width + cloud.size) {
          cloud.x = -cloud.size;
          cloud.y = Math.random() * (canvas.height * 0.6);
          cloud.speed = 0.2 + Math.random() * 0.3;
          cloud.size = 50 + Math.random() * 100;
          cloud.opacity = 0.4 + Math.random() * 0.4;
          cloud.type = Math.floor(Math.random() * cloudTypes.length);
        }
        
        // Draw cloud using the template for its type
        ctx.fillStyle = colors.cloudColor;
        ctx.beginPath();
        
        const cloudTemplate = cloudTypes[cloud.type];
        cloudTemplate.positionOffsets.forEach((offset, i) => {
          const radius = cloud.size * cloudTemplate.radiusRatios[i];
          const x = cloud.x + cloud.size * offset[0];
          const y = cloud.y + cloud.size * offset[1];
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        });
        
        ctx.fill();
      });
      
      // Update and draw raindrops if it's raining
      if (isRaining) {
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
        ctx.lineWidth = 1;
        
        raindropsRef.current.forEach((drop, index) => {
          // Move raindrop
          drop.y += drop.speed;
          
          // Reset raindrop when it moves off screen
          if (drop.y > canvas.height) {
            drop.y = Math.random() * -100;
            drop.x = Math.random() * canvas.width;
          }
          
          // Draw raindrop
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x, drop.y + drop.length);
          ctx.stroke();
        });
      }
      
      // Add a nostalgic film grain effect
      if (settings.enableFilmGrain) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Optimize film grain by only applying to a subset of pixels
        const pixelSkip = performanceLevel === 'HIGH' ? 4 : 8;
        for (let i = 0; i < data.length; i += 4 * pixelSkip) {
          const noise = (Math.random() - 0.5) * 10;
          data[i] = Math.min(255, Math.max(0, data[i] + noise));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Add a subtle vignette effect for nostalgic feel
      if (settings.enableVignette) {
        const vignetteGradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width / 1.5
        );
        
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Debounced resize handler
    const handleResize = useCallback(() => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    }, [canvas]);
    
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
    
    // Cleanup function
    return () => {
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Remove event listeners
      window.removeEventListener('resize', debouncedResize);
      
      // Clear timeout if it exists
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
      
      // Clear references to help garbage collection
      cloudsRef.current = [];
      raindropsRef.current = [];
      starsRef.current = [];
      birdsRef.current = [];
    };
  }, [time, isRaining, performanceLevel]);

  return (
    <div className={`sky-background ${className}`}>
      <canvas ref={canvasRef} className="sky-canvas" />
      <div className="window-frame"></div>
      <div className="window-reflection"></div>
    </div>
  );
};

export default SkyBackground; 
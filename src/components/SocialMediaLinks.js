'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope, FaDiscord } from 'react-icons/fa';
import { getHomepageData } from '../firebase/firestoreService';

import './SocialMediaLinks.css';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
      width: baseItemSize,
      height: baseItemSize
    };
    // Use x for horizontal (mobile), y for vertical (desktop)
    const center = window.innerWidth > 768 ? rect.y + baseItemSize / 2 : rect.x + baseItemSize / 2;
    return val - center;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, child => {
        if (child.type === DockIcon) {
          return cloneElement(child, { isHovered, size });
        }
        return cloneElement(child, { isHovered });
      })}
    </motion.div>
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '', size }) {
  return (
    <motion.div 
      className={`dock-icon ${className}`}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {children}
    </motion.div>
  );
}

const SocialMediaLinks = ({ 
  isMobile = false,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50,
  onLinksLoaded = null // Callback when links are loaded
}) => {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  const [socialLinks, setSocialLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Icon map for social platforms
  const iconMap = {
    github: <FaGithub />,
    linkedin: <FaLinkedin />,
    instagram: <FaInstagram />,
    mail: <FaEnvelope />,
    discord: <FaDiscord />
  };

  // Fetch social links from Firebase
  useEffect(() => {
    const fetchSocialLinks = async () => {
      setIsLoading(true);
      try {
        const data = await getHomepageData();
        if (data && data.socialLinks) {
          // Map social links from Firebase with their corresponding icons
          const linksWithIcons = data.socialLinks.map(link => ({
            ...link,
            icon: iconMap[link.id] || <FaDiscord /> // Fallback to Discord icon
          }));
          
          setSocialLinks(linksWithIcons);
          console.log('Social links fetched from Firebase:', linksWithIcons);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
        // Keep empty array if fetch fails
      } finally {
        setIsLoading(false);
        // Notify parent component that links are loaded
        if (onLinksLoaded) {
          onLinksLoaded();
        }
      }
    };
    
    fetchSocialLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  // Convert social links to dock items format
  const items = useMemo(() => 
    socialLinks.map(social => ({
      icon: social.icon,
      label: social.id,
      onClick: () => window.open(social.url, '_blank', 'noopener,noreferrer'),
      className: ''
    })),
    [socialLinks]
  );

  if (isMobile) {
    // Mobile view - horizontal dock at bottom
    return (
      <motion.div 
        style={{ 
          height: height, 
          scrollbarWidth: 'none',
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.3s ease-in-out'
        }} 
        className="dock-outer-mobile"
      >
        <motion.div
          onMouseMove={({ pageX }) => {
            isHovered.set(1);
            mouseX.set(pageX);
          }}
          onMouseLeave={() => {
            isHovered.set(0);
            mouseX.set(Infinity);
          }}
          className="dock-panel-mobile"
          style={{ height: panelHeight }}
          role="toolbar"
          aria-label="Social media links"
        >
          {items.map((item, index) => (
            <DockItem
              key={index}
              onClick={item.onClick}
              className={item.className}
              mouseX={mouseX}
              spring={spring}
              distance={distance}
              magnification={magnification}
              baseItemSize={baseItemSize}
            >
              <DockIcon>{item.icon}</DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  // Desktop view - dock style
  return (
    <motion.div 
      style={{ 
        width: height, 
        scrollbarWidth: 'none',
        opacity: isLoading ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }} 
      className="dock-outer"
    >
      <motion.div
        onMouseMove={({ pageY }) => {
          isHovered.set(1);
          mouseX.set(pageY);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className="dock-panel"
        style={{ width: panelHeight }}
        role="toolbar"
        aria-label="Social media links"
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>{item.icon}</DockIcon>
            <DockLabel>{item.label}</DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default SocialMediaLinks;

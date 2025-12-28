'use client';

import { useEffect, useState } from 'react';
import { motion as framerMotion, AnimatePresence as FramerAnimatePresence, MotionProps } from 'framer-motion';
import type { ComponentProps, ElementType } from 'react';

// Check if we're in mobile app context
function useIsMobileApp() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(
          document.documentElement.classList.contains('mobile-app') ||
          navigator.userAgent.includes('CoOpMobile') ||
          !!window.ReactNativeWebView
        );
      }
    };
    
    checkMobile();
    // Re-check after a short delay in case class is added after initial render
    const timeout = setTimeout(checkMobile, 100);
    return () => clearTimeout(timeout);
  }, []);
  
  return isMobile;
}

// Type for motion component props
type MotionComponentProps<T extends ElementType> = ComponentProps<T> & MotionProps;

// Create a wrapper that disables animations in mobile app
function createMotionComponent<T extends keyof JSX.IntrinsicElements>(element: T) {
  const MotionElement = framerMotion[element as keyof typeof framerMotion] as React.ComponentType<MotionComponentProps<T>>;
  
  return function MotionWrapper(props: MotionComponentProps<T>) {
    const isMobileApp = useIsMobileApp();
    
    if (isMobileApp) {
      // Strip motion props and render as regular element
      const {
        initial,
        animate,
        exit,
        transition,
        variants,
        whileHover,
        whileTap,
        whileFocus,
        whileDrag,
        whileInView,
        drag,
        dragConstraints,
        dragElastic,
        dragMomentum,
        dragTransition,
        dragPropagation,
        dragControls,
        dragListener,
        dragSnapToOrigin,
        dragDirectionLock,
        onDrag,
        onDragStart,
        onDragEnd,
        onDirectionLock,
        onDragTransitionEnd,
        onAnimationStart,
        onAnimationComplete,
        onUpdate,
        onPan,
        onPanStart,
        onPanEnd,
        onPanSessionStart,
        onTap,
        onTapStart,
        onTapCancel,
        onHoverStart,
        onHoverEnd,
        onViewportEnter,
        onViewportLeave,
        viewport,
        layout,
        layoutId,
        layoutDependency,
        layoutScroll,
        layoutRoot,
        onLayoutAnimationStart,
        onLayoutAnimationComplete,
        onLayoutMeasure,
        onBeforeLayoutMeasure,
        transformTemplate,
        style,
        ...rest
      } = props as MotionProps & { style?: React.CSSProperties; [key: string]: unknown };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Element = element as any;
      return <Element style={style} {...rest} />;
    }
    
    return <MotionElement {...props} />;
  };
}

// Export motion components that respect mobile app context
export const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  p: createMotionComponent('p'),
  a: createMotionComponent('a'),
  button: createMotionComponent('button'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  nav: createMotionComponent('nav'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  aside: createMotionComponent('aside'),
  main: createMotionComponent('main'),
  form: createMotionComponent('form'),
  input: createMotionComponent('input'),
  textarea: createMotionComponent('textarea'),
  img: createMotionComponent('img'),
  svg: createMotionComponent('svg'),
  path: createMotionComponent('path'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  h5: createMotionComponent('h5'),
  h6: createMotionComponent('h6'),
  table: createMotionComponent('table'),
  tbody: createMotionComponent('tbody'),
  tr: createMotionComponent('tr'),
  td: createMotionComponent('td'),
  th: createMotionComponent('th'),
};

// AnimatePresence wrapper that does nothing in mobile app
export function AnimatePresence({ children, ...props }: ComponentProps<typeof FramerAnimatePresence>) {
  const isMobileApp = useIsMobileApp();
  
  if (isMobileApp) {
    return <>{children}</>;
  }
  
  return <FramerAnimatePresence {...props}>{children}</FramerAnimatePresence>;
}

// Re-export other framer-motion utilities that don't need wrapping
export { useAnimation, useMotionValue, useTransform, useSpring, useScroll, useInView } from 'framer-motion';

// Declare ReactNativeWebView for TypeScript
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

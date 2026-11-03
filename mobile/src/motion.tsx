import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, StyleSheet } from 'react-native';
import type { ModalProps, PressableProps, ViewProps } from 'react-native';

export const motion = { pressIn: 90, pressOut: 140, page: 180, feedback: 180, sheet: 240 } as const;
const ReducedMotion = createContext(true);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  // Start without motion until the user's OS/browser preference is known.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true, version = 0;
    const media = Platform.OS === 'web' && typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const update = (enabled: boolean) => { version++; if (active) setReduced(enabled || !!media?.matches); };
    const browserChange = () => { update(!!media?.matches); };
    media?.addEventListener('change', browserChange);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    const initial = version;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => { if (active && version === initial) setReduced(enabled || !!media?.matches); }).catch(() => {});
    return () => { active = false; subscription.remove(); media?.removeEventListener('change', browserChange); };
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}
export function useReducedMotion() { return useContext(ReducedMotion); }
const native = Platform.OS !== 'web';

// Transition identity changes trigger motion without remounting retained content.
export function MotionView({ children, transitionKey, style, distance = 6, ...props }: ViewProps & { transitionKey?: string | number | boolean; distance?: number }) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  useLayoutEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: motion.page, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    animation.start();
    return () => animation.stop();
  }, [transitionKey, reduced, progress]);
  return <Animated.View {...props} style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>;
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function MotionPressable({ style, onPressIn, onPressOut, disabled, ...props }: PressableProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed,setPressed] = useState(false);
  const animate = (value: number, duration: number) => {
    scale.stopAnimation();
    if (reduced || disabled) { scale.setValue(1); return; }
    Animated.timing(scale, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  };
  useEffect(() => { if (reduced || disabled) { scale.stopAnimation(); scale.setValue(1); setPressed(false); } return () => scale.stopAnimation(); }, [reduced, disabled, scale]);
  const resolved = StyleSheet.flatten(typeof style === 'function' ? style({pressed}) : style);
  return <AnimatedPressable {...props}
    aria-checked={props['aria-checked'] ?? props.accessibilityState?.checked}
    aria-selected={props['aria-selected'] ?? props.accessibilityState?.selected}
    aria-expanded={props['aria-expanded'] ?? props.accessibilityState?.expanded}
    aria-busy={props['aria-busy'] ?? props.accessibilityState?.busy}
    disabled={disabled}
    onPressIn={event => { setPressed(true); animate(0.98, motion.pressIn); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); animate(1, motion.pressOut); onPressOut?.(event); }}
    style={[resolved, { transform: typeof resolved?.transform === 'string' ? resolved.transform : [...(resolved?.transform ?? []), { scale }] }]} />;
}

// Let each platform animate its modal; reduced motion disables both slide/fade.
export function MotionModal({ animationType = 'slide', ...props }: ModalProps) {
  const reduced = useReducedMotion();
  return <Modal {...props} animationType={reduced ? 'none' : animationType} />;
}

// Keep a mounted sheet until the platform has finished its dismissal animation.
// Unmount/account changes cancel the callback, so stale sheets cannot reopen data.
export function useModalDismiss(onDismiss: () => void) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closing = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function close(after?: () => void) {
    if (closing.current) return;
    closing.current = true; setVisible(false);
    const finish = () => { onDismiss(); if (typeof after === 'function') after(); };
    if (reduced) finish();
    else timer.current = setTimeout(finish, 350);
  }
  return { visible, close };
}

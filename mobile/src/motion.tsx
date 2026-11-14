import { DuoSafeSurface } from './DuoLayout';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, PanResponder, Keyboard } from 'react-native';
import type { ModalProps, PressableProps, ViewProps } from 'react-native';

export const motion = { pressIn: 90, pressOut: 140, navigation: 220, page: 640, feedback: 180, sheet: 240 } as const;
const ReducedMotion = createContext(true);
const MotionAncestor = createContext(false);
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
export function MotionView({ children, transitionKey, style, distance = 6,disabled=false,initial=true,variant='page', ...props }: ViewProps & { transitionKey?: string | number | boolean; distance?: number;disabled?:boolean;initial?:boolean;variant?:'page'|'navigation' }) {
  const ancestor=useContext(MotionAncestor),reduced = useReducedMotion()||disabled||(ancestor&&transitionKey===undefined);
  const progress = useRef(new Animated.Value(1)).current;
  const seen=useRef(false);
  useLayoutEffect(() => {
    progress.stopAnimation();
    if(!seen.current){seen.current=true;if(!initial){progress.setValue(1);return;}}
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: variant==='navigation'?motion.navigation:motion.page, easing: Easing.bezier(.32,0,.2,1), useNativeDriver: native });
    animation.start();
    return () => animation.stop();
  }, [transitionKey, reduced, progress,variant]);
  return <MotionAncestor.Provider value={ancestor||!disabled}><Animated.View {...props} style={[style, { opacity:progress.interpolate({inputRange:[0,1],outputRange:[variant==='navigation'?.98:.92,1]}), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [variant==='navigation'?0:distance, 0] }) },{scale:progress.interpolate({inputRange:[0,1],outputRange:[variant==='navigation'?1:.975,1]})}] }]}>{children}</Animated.View></MotionAncestor.Provider>;
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

// Fade the presentation while the sheet content zooms; reduce motion skips both.
export function MotionModal({ animationType = 'slide', children, ...props }: ModalProps) {
  const reduced = useReducedMotion();
  return <Modal {...props} animationType={reduced||animationType==='none' ? 'none' : 'fade'}><DuoSafeSurface>{children}</DuoSafeSurface></Modal>;
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

export function DraggableSheet({children,style,onDismiss,disabled=false,visible=true,testID}:{children:React.ReactNode;testID?:string;style?:ViewProps['style'];onDismiss:()=>void;disabled?:boolean;visible?:boolean}) {
  const reduced=useReducedMotion(),offset=useRef(new Animated.Value(0)).current;
  const current=useRef({reduced,disabled,onDismiss});current.current={reduced,disabled,onDismiss};
  const reset=()=>{offset.stopAnimation();if(current.current.reduced)offset.setValue(0);else Animated.timing(offset,{toValue:0,duration:motion.pressOut,useNativeDriver:native}).start();};
  useLayoutEffect(()=>{if(visible){offset.stopAnimation();offset.setValue(0);}},[visible,offset]);
  const zoom=useRef(new Animated.Value(reduced?1:0)).current;
  useLayoutEffect(()=>{zoom.stopAnimation();if(reduced){zoom.setValue(1);return;}Animated.timing(zoom,{toValue:visible?1:0,duration:visible?640:320,easing:Easing.bezier(.32,0,.2,1),useNativeDriver:native}).start();return()=>zoom.stopAnimation();},[visible,reduced,zoom]);
  const responder=useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_,gesture)=>!current.current.disabled&&gesture.dy>6&&Math.abs(gesture.dy)>Math.abs(gesture.dx)*1.3,
    onPanResponderGrant:()=>{offset.stopAnimation();Keyboard.dismiss();},
    onPanResponderMove:(_,gesture)=>offset.setValue(Math.max(0,Math.min(360,gesture.dy))),
    onPanResponderRelease:(_,gesture)=>{if(!current.current.disabled&&(gesture.dy>72||(gesture.dy>30&&gesture.vy>.7)))current.current.onDismiss();else reset();},
    onPanResponderTerminate:reset,
  })).current;
  useEffect(()=>{if(disabled){offset.stopAnimation();offset.setValue(0);}return()=>offset.stopAnimation();},[disabled,offset]);
  return <Animated.View testID={testID} style={[style,{transform:[{translateY:offset},{scale:zoom.interpolate({inputRange:[0,1],outputRange:[.975,1]})}]}]}><View {...responder.panHandlers}><MotionPressable accessibilityRole="button" accessibilityLabel="아래로 내려 닫기" disabled={disabled} onPress={onDismiss} style={{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:-16}}><View style={{width:36,height:4,borderRadius:2,backgroundColor:'#d1d6db'}}/></MotionPressable></View>{children}</Animated.View>;
}

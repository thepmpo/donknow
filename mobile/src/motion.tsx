import { DuoSafeSurface } from './DuoLayout';
import {useBlockParentSurface} from './SurfaceInteraction';
import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Platform, Pressable, StyleSheet, View, PanResponder, Keyboard } from 'react-native';
import type { ModalProps, PressableProps, ViewProps } from 'react-native';

export const motion = { pressIn: 90, pressOut: 140, navigation: 180, page: 200, feedback: 180, sheet: 200 } as const;
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
export function MotionView({ children, transitionKey, style, distance = 0,disabled=false,initial=true,variant='page', ...props }: ViewProps & { transitionKey?: string | number | boolean; distance?: number;disabled?:boolean;initial?:boolean;variant?:'page'|'navigation' }) {
  const ancestor=useContext(MotionAncestor),reduced = useReducedMotion()||disabled||(ancestor&&transitionKey===undefined);
  const progress = useRef(new Animated.Value(1)).current;
  const seen=useRef<{key:typeof transitionKey;variant:typeof variant}|null>(null);
  useLayoutEffect(() => {
    progress.stopAnimation();
    const first=!seen.current,changed=first||seen.current?.key!==transitionKey||seen.current?.variant!==variant;
    seen.current={key:transitionKey,variant};
    // Resolving the OS preference must not replay an already visible page.
    if(!changed||first&&!initial){progress.setValue(1);return;}
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: variant==='navigation'?motion.navigation:motion.page, easing: Easing.bezier(.32,0,.2,1), useNativeDriver: native });
    animation.start();
    return () => animation.stop();
  }, [transitionKey, reduced, progress,variant]);
  return <MotionAncestor.Provider value={ancestor||!disabled}><Animated.View {...props} style={[style, { opacity:progress.interpolate({inputRange:[0,1],outputRange:[variant==='navigation'?.98:.96,1]}), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [variant==='navigation'?0:distance, 0] }) }] }]}>{children}</Animated.View></MotionAncestor.Provider>;
}
/** Reordered siblings settle from their previous location; the page never zooms. */
export const ReorderItem=React.forwardRef<React.ComponentRef<typeof View>,ViewProps&{moving?:boolean;position?:number}>(({moving=false,position,onLayout,children,...props},ref)=>{
  const reduced=useReducedMotion(),offset=useRef(new Animated.Value(0)).current,previousY=useRef<number|null>(null),value=useRef(0),node=useRef<React.ComponentRef<typeof View>|null>(null),read=useRef(0);
  useEffect(()=>{const id=offset.addListener(v=>{value.current=v.value;});return()=>{offset.removeListener(id);offset.stopAnimation();};},[offset]);
  useEffect(()=>{if(reduced||moving){offset.stopAnimation();offset.setValue(0);}},[reduced,moving,offset]);
  const measure=()=>{const version=++read.current;node.current?.measureInWindow((_x,pageY)=>{if(version!==read.current)return;const y=pageY-value.current,prior=previousY.current;previousY.current=y;if(prior!==null&&Math.abs(prior-y)>1&&!reduced&&!moving){const start=prior-y+value.current;offset.stopAnimation();offset.setValue(start);Animated.timing(offset,{toValue:0,duration:motion.page,easing:Easing.out(Easing.cubic),useNativeDriver:native}).start();}});};
  // Web's ResizeObserver does not report movement between same-size siblings.
  useLayoutEffect(()=>{measure();return()=>{read.current++;};},[position,reduced,moving]);
  return <Animated.View {...props} ref={el=>{node.current=el;if(typeof ref==='function')ref(el);else if(ref)ref.current=el;}} onLayout={e=>{measure();onLayout?.(e);}} style={[props.style,{transform:[{translateY:offset}]}]}>{children}</Animated.View>;
});
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
  useBlockParentSurface(props.visible!==false,reduced||animationType==='none'?0:350);
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

export function DraggableSheet({children,style,onDismiss,disabled=false,visible=true,testID,presentation='zoom'}:{children:React.ReactNode;testID?:string;presentation?:'zoom'|'none';style?:ViewProps['style'];onDismiss:()=>void;disabled?:boolean;visible?:boolean}) {
  const reduced=useReducedMotion(),offset=useRef(new Animated.Value(0)).current;
  const current=useRef({reduced,disabled,onDismiss});current.current={reduced,disabled,onDismiss};
  const reset=()=>{offset.stopAnimation();if(current.current.reduced)offset.setValue(0);else Animated.timing(offset,{toValue:0,duration:motion.pressOut,useNativeDriver:native}).start();};
  useLayoutEffect(()=>{if(visible){offset.stopAnimation();offset.setValue(0);}},[visible,offset]);
  const zoom=useRef(new Animated.Value(reduced?1:0)).current;
  useLayoutEffect(()=>{zoom.stopAnimation();if(reduced||presentation==='none'){zoom.setValue(1);return;}Animated.timing(zoom,{toValue:visible?1:0,duration:visible?280:200,easing:Easing.bezier(.32,0,.2,1),useNativeDriver:native}).start();return()=>zoom.stopAnimation();},[visible,reduced,zoom,presentation]);
  const responder=useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture:(_,gesture)=>!current.current.disabled&&gesture.dy>6&&Math.abs(gesture.dy)>Math.abs(gesture.dx)*1.3,
    onPanResponderGrant:()=>{offset.stopAnimation();Keyboard.dismiss();},
    onPanResponderMove:(_,gesture)=>offset.setValue(Math.max(0,Math.min(360,gesture.dy))),
    onPanResponderRelease:(_,gesture)=>{if(!current.current.disabled&&(gesture.dy>72||(gesture.dy>30&&gesture.vy>.7)))current.current.onDismiss();else reset();},
    onPanResponderTerminate:reset,
  })).current;
  useEffect(()=>{if(disabled){offset.stopAnimation();offset.setValue(0);}return()=>offset.stopAnimation();},[disabled,offset]);
  return <Animated.View testID={testID} style={[style,{opacity:zoom.interpolate({inputRange:[0,1],outputRange:[.96,1]}),transform:[{translateY:offset}]}]}><View {...responder.panHandlers}><MotionPressable accessibilityRole="button" accessibilityLabel="아래로 내려 닫기" disabled={disabled} onPress={onDismiss} style={{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:-16}}><View style={{width:36,height:4,borderRadius:2,backgroundColor:'#d1d6db'}}/></MotionPressable></View>{children}</Animated.View>;
}

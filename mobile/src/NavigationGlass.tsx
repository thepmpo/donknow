import React,{useEffect,useState} from 'react';
import {AccessibilityInfo,Platform,StyleSheet,View} from 'react-native';
import type {ViewProps} from 'react-native';
import {useReducedMotion} from './motion';
import {navigationMotion} from './theme';
import {BlurView} from 'expo-blur';
import {GlassView,isGlassEffectAPIAvailable,isLiquidGlassAvailable} from 'expo-glass-effect';

/** Capability checked native Liquid Glass, with explicit accessible fallbacks. */
export function NavigationGlass({children,style,variant='bar',active=false,...props}:ViewProps&{variant?:'bar'|'selection';active?:boolean}){
 const [opaque,setOpaque]=useState(true),reduced=useReducedMotion();
 useEffect(()=>{
  if(Platform.OS==='web'){
   const reduced=window.matchMedia('(prefers-reduced-transparency: reduce)'),contrast=window.matchMedia('(forced-colors: active)');
   const update=()=>setOpaque(reduced.matches||contrast.matches);update();
   reduced.addEventListener('change',update);contrast.addEventListener('change',update);
   return()=>{reduced.removeEventListener('change',update);contrast.removeEventListener('change',update);};
  }
  if(Platform.OS!=='ios')return;
  let alive=true,revision=0;
  const update=(value:boolean)=>{revision++;if(alive)setOpaque(value);};
  const subscription=AccessibilityInfo.addEventListener('reduceTransparencyChanged',update),initial=revision;
  AccessibilityInfo.isReduceTransparencyEnabled().then(value=>{if(alive&&revision===initial)setOpaque(value);}).catch(()=>{});
  return()=>{alive=false;subscription.remove();};
 },[]);
 let nativeGlass=false;
 try{nativeGlass=Platform.OS==='ios'&&isGlassEffectAPIAvailable()&&isLiquidGlassAvailable();}catch{}
 const radius=StyleSheet.flatten(style)?.borderRadius??0;
 const prefix=variant==='selection'?'navigation-selection-material':'navigation-material';
 return <View {...props} style={style}>
  {variant==='selection'&&!opaque&&<View pointerEvents="none" testID={prefix+'-rest'} style={[StyleSheet.absoluteFill,styles.rest,{borderRadius:radius}]}/>}
  {opaque?<View pointerEvents="none" testID={prefix+'-opaque'} style={[StyleSheet.absoluteFill,styles.opaque,{borderRadius:radius},variant==='selection'&&styles.opaqueSelection]}/>:
   nativeGlass?<GlassView pointerEvents="none" testID={prefix+'-native-glass'} style={[StyleSheet.absoluteFill,{borderRadius:radius}]} glassEffectStyle={variant==='bar'?'regular':{style:active?'regular':'none',animate:!reduced,animationDuration:navigationMotion.release/1000}} isInteractive={false} colorScheme="light"/>:
    (variant==='bar'||active)&&<BlurView pointerEvents="none" testID={prefix+'-blur-fallback'} style={[StyleSheet.absoluteFill,styles.fallback,{borderRadius:radius},variant==='selection'&&styles.selectionFallback]} intensity={variant==='selection'?45:85} tint="light"/>}
  {children}
 </View>;
}
// The decorative lens does not receive touches. Controlled RN gestures below own
// press/drag/cancel; do not claim UIGlassEffect.isInteractive supplies these.
const styles=StyleSheet.create({rest:{backgroundColor:'rgba(120,120,128,0.12)'},opaque:{backgroundColor:'#f2f6fb'},opaqueSelection:{backgroundColor:'#dce2e9',borderWidth:1,borderColor:'#8b95a1'},fallback:{backgroundColor:'rgba(246,250,255,0.65)',overflow:'hidden'},selectionFallback:{backgroundColor:'rgba(255,255,255,0.35)',borderWidth:1,borderColor:'rgba(255,255,255,0.95)',boxShadow:'0 1px 4px rgba(25,31,40,0.12)'}});

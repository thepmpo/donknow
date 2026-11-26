import React,{forwardRef,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import {scheduleOnRN,scheduleOnUI} from 'react-native-worklets';
import {useReducedMotion} from './motion';
import {useCalendarTranslation} from './todo-gestures.native';

export type CalendarPeriodMotionHandle={drag:(x:number)=>void;cancel:()=>void};

function Layer({translation,offset=0,width,preview=false,testID,children}:{translation:SharedValue<number>;offset?:number;width:number;preview?:boolean;testID:string;children:React.ReactNode}){
 const style=useAnimatedStyle(()=>({transform:[{translateX:translation.value+offset}]}),[offset]);
 return <Animated.View testID={testID} pointerEvents={preview?'none':'auto'} accessibilityElementsHidden={preview}
  importantForAccessibility={preview?'no-hide-descendants':'auto'} style={[preview&&[styles.preview,{width}],style]}>{children}</Animated.View>;
}

/** The active pan and the release animation use the same UI-thread coordinate. */
export const CalendarPeriodMotion=forwardRef<CalendarPeriodMotionHandle,{identity:string;sequence:number;direction:number;width:number;enabled:boolean;preview?:(direction:number)=>React.ReactNode;presentation?:()=>React.ReactNode;children:React.ReactNode}>(function CalendarPeriodMotion({identity,sequence,direction,width,enabled,preview,presentation,children},ref){
 const reduced=useReducedMotion(),provided=useCalendarTranslation(),fallback=useSharedValue(0),translation=provided??fallback;
 const [layer,setLayer]=useState<{offset:number;node:React.ReactNode;kind:'preview'|'outgoing'}|null>(null);
 const identityRef=useRef({identity,sequence}),previewRef=useRef(preview);previewRef.current=preview;
 const committed=useRef<(()=>React.ReactNode)|undefined>(presentation);
 useLayoutEffect(()=>{
  if(identityRef.current.identity===identity&&identityRef.current.sequence===sequence)committed.current=presentation;
 });
 const generation=useRef(0),snapped=useRef(0);
 function clear(run:number){if(run===generation.current){snapped.current=0;setLayer(null);}}
 useImperativeHandle(ref,()=>({
  drag:x=>{
   if(!enabled||reduced)return;
   const sign=x<0?1:-1;
   if(snapped.current===sign)return;
   generation.current++;snapped.current=sign;
   if(!provided)translation.value=x;
   setLayer({offset:sign*width,node:previewRef.current?.(sign),kind:'preview'});
  },
  cancel:()=>{
   const run=++generation.current;
   scheduleOnUI(()=>{
    'worklet';
    translation.value=reduced?0:withTiming(0,{duration:220,easing:Easing.out(Easing.cubic)},finished=>{if(finished)scheduleOnRN(clear,run);});
    if(reduced)scheduleOnRN(clear,run);
   });
  },
 }),[provided,reduced,translation,width,enabled]);
 useLayoutEffect(()=>{
  const previous=identityRef.current,previousPresentation=committed.current;
  identityRef.current={identity,sequence};committed.current=presentation;
  const changed=previous.identity!==identity||previous.sequence!==sequence;
  if(!enabled||reduced){generation.current++;snapped.current=0;cancelAnimation(translation);translation.value=0;setLayer(null);return;}
  if(!changed)return;
  const run=++generation.current;snapped.current=0;
  if(!direction||previous.sequence===sequence||!previousPresentation){translation.value=0;setLayer(null);return;}
  const sign=Math.sign(direction);
  setLayer({offset:-sign*width,node:previousPresentation(),kind:'outgoing'});
  scheduleOnUI(()=>{
   'worklet';
   const offset=Math.max(-width,Math.min(width,translation.value));
   translation.value=sign*width+offset;
   translation.value=withTiming(0,{duration:Math.round(235+70*(1-Math.min(1,Math.abs(offset)/Math.max(1,width)))),easing:Easing.bezier(.32,0,.2,1)},
    finished=>{if(finished)scheduleOnRN(clear,run);});
  });
 },[identity,sequence,direction,width,enabled,reduced,translation]);
 return <View testID="calendar-period-motion" style={styles.root}>
  {layer&&<Layer translation={translation} offset={layer.offset} width={width} preview testID={'calendar-period-'+layer.kind}>{layer.node}</Layer>}
  <Layer translation={translation} width={width} testID="calendar-period-current">{children}</Layer>
 </View>;
});
const styles=StyleSheet.create({root:{overflow:'hidden'},preview:{position:'absolute',left:0,top:0}});

export function CalendarWeekMotion({identity,enabled,children}:{identity:string;enabled:boolean;children:React.ReactNode}){
 const translation=useCalendarTranslation();
 const style=useAnimatedStyle(()=>({transform:[{translateX:Math.max(-18,Math.min(18,(translation?.value??0)*.12))}]}));
 useLayoutEffect(()=>{
  if(translation)translation.value=enabled?withTiming(0,{duration:180,easing:Easing.out(Easing.cubic)}):0;
 },[identity,enabled,translation]);
 return <Animated.View style={[{flex:1,minHeight:0},style]}>{children}</Animated.View>;
}

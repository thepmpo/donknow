import React,{useCallback,useLayoutEffect,useMemo,useRef} from 'react';
import {Keyboard,StyleSheet,View} from 'react-native';
import type {StyleProp,ViewStyle} from 'react-native';
import {Gesture,GestureDetector} from 'react-native-gesture-handler';
import Animated,{cancelAnimation,Easing,useAnimatedStyle,useSharedValue,withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {MotionPressable,useReducedMotion} from './motion';

function dismissKeyboard(){Keyboard.dismiss();}
export function CalendarSheetCard({identity,disabled,style,onDismiss,children}:{identity:string;disabled:boolean;style:StyleProp<ViewStyle>;onDismiss:(held?:number)=>void;children:React.ReactNode}){
 const reduced=useReducedMotion(),position=useSharedValue(0),latest=useRef(onDismiss);
 latest.current=onDismiss;
 const dismiss=useCallback((held:number)=>latest.current(held),[]);
 useLayoutEffect(()=>{cancelAnimation(position);position.value=0;},[identity,disabled,reduced,position]);
 const pan=useMemo(()=>Gesture.Pan().enabled(!disabled&&!reduced).activeOffsetY(6).failOffsetY(-8).failOffsetX([-18,18])
  .onStart(()=>{'worklet';cancelAnimation(position);scheduleOnRN(dismissKeyboard);})
  .onUpdate(event=>{'worklet';position.value=Math.max(0,Math.min(360,event.translationY));})
  .onFinalize((event,completed)=>{
   'worklet';
   if(completed&&(event.translationY>72||event.translationY>30&&event.velocityY>700)){scheduleOnRN(dismiss,position.value);return;}
   position.value=withTiming(0,{duration:180,easing:Easing.out(Easing.cubic)});
  }),[disabled,reduced,position,dismiss]);
 const motion=useAnimatedStyle(()=>({transform:[{translateY:position.value}]}));
 return <Animated.View testID="calendar-sheet-surface" style={[style,motion]}><GestureDetector gesture={pan}><View collapsable={false}><MotionPressable accessibilityRole="button" accessibilityLabel="아래로 내려 닫기" disabled={disabled} onPress={()=>onDismiss()} style={styles.control}><View style={styles.handle}/></MotionPressable></View></GestureDetector>{children}</Animated.View>;
}
const styles=StyleSheet.create({control:{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:-16},handle:{width:36,height:4,borderRadius:2,backgroundColor:'#d1d6db'}});

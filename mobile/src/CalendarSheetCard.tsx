import React,{useLayoutEffect,useRef} from 'react';
import {Animated,Easing,StyleSheet,View} from 'react-native';
import type {StyleProp,ViewStyle} from 'react-native';
import {MotionPressable,useReducedMotion} from './motion';

export function CalendarSheetCard({identity,disabled,style,onDismiss,children}:{identity:string;disabled:boolean;style:StyleProp<ViewStyle>;onDismiss:(held?:number)=>void;children:React.ReactNode}){
 const reduced=useReducedMotion(),position=useRef(new Animated.Value(0)).current;
 const gesture=useRef<{id:number;x:number;y:number;amount:number;dragging:boolean}|null>(null),skipPress=useRef(false);
 useLayoutEffect(()=>{gesture.current=null;skipPress.current=false;position.stopAnimation();position.setValue(0);},[identity,disabled,reduced,position]);
 function reset(){Animated.timing(position,{toValue:0,duration:180,easing:Easing.out(Easing.cubic),useNativeDriver:false}).start();}
 const handlers={
  onPointerDown:(event:React.PointerEvent<HTMLElement>)=>{
   if(disabled||reduced||!event.isPrimary||event.button!==0)return;
   gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,amount:0,dragging:false};
   skipPress.current=false;
   (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  },
  onPointerMove:(event:React.PointerEvent<HTMLElement>)=>{
   const start=gesture.current;if(!start||event.pointerId!==start.id)return;
   const distance=event.clientY-start.y;
   if(!start.dragging){
    if(distance<6||distance<Math.abs(event.clientX-start.x)*1.3)return;
    start.dragging=true;skipPress.current=true;position.stopAnimation();
   }
   start.amount=Math.max(0,Math.min(360,distance));position.setValue(start.amount);
  },
  onPointerUp:(event:React.PointerEvent<HTMLElement>)=>{
   const start=gesture.current;if(!start||event.pointerId!==start.id)return;
   gesture.current=null;
   if(start.amount>72)onDismiss(start.amount);
   else if(start.dragging)reset();
  },
  onPointerCancel:()=>{gesture.current=null;reset();},
 };
 return <Animated.View testID="calendar-sheet-surface" style={[style,{transform:[{translateY:position}]}]}><View {...(handlers as unknown as React.ComponentProps<typeof View>)} style={styles.grip}>
  <MotionPressable accessibilityRole="button" accessibilityLabel="아래로 내려 닫기" disabled={disabled} onPress={()=>{if(!skipPress.current)onDismiss();skipPress.current=false;}} style={styles.control}><View style={styles.handle}/></MotionPressable>
 </View>{children}</Animated.View>;
}
const styles=StyleSheet.create({grip:{touchAction:'none'} as ViewStyle,control:{minHeight:44,alignItems:'center',justifyContent:'center',marginTop:-16},handle:{width:36,height:4,borderRadius:2,backgroundColor:'#d1d6db'}});

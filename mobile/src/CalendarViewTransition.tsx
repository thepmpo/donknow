import React,{useLayoutEffect,useRef} from 'react';
import {Animated,Easing,Platform} from 'react-native';
import {useReducedMotion} from './motion';

export function CalendarViewTransition({view,children}:{view:string;children:React.ReactNode}){
 const fade=useRef(new Animated.Value(1)).current,seen=useRef(view),reduced=useReducedMotion();
 useLayoutEffect(()=>{
  const changed=seen.current!==view;seen.current=view;
  fade.stopAnimation();fade.setValue(changed&&!reduced ? .8 : 1);
  if(changed&&!reduced)Animated.timing(fade,{toValue:1,duration:160,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}).start();
  return ()=>fade.stopAnimation();
 },[view,reduced,fade]);
 return <Animated.View testID="calendar-view-transition" style={{flex:1,minHeight:0,opacity:fade}}>{children}</Animated.View>;
}

import React,{createContext,useCallback,useContext,useLayoutEffect,useRef,useState} from 'react';
import {Animated,Pressable,StyleSheet,View,useWindowDimensions} from 'react-native';
type Anchor=React.RefObject<React.ComponentRef<typeof View>|null>;
type Entry={id:symbol;left:number;width:number;height:number;onPress:()=>void;disabled:boolean;opacity?:Animated.Value};
const AnimatedPressable=Animated.createAnimatedComponent(Pressable);
const Context=createContext<(anchor:Anchor,onPress:()=>void,disabled:boolean,opacity?:Animated.Value)=>()=>void>(()=>()=>{});
/** Covers only the app-owned strip above a pane's inline sheet, never another pane or camera column. */
export function SheetBackdropProvider({children}:{children:React.ReactNode}){
 const host=useRef<React.ComponentRef<typeof View>>(null),[entries,setEntries]=useState<Entry[]>([]);
 const register=useCallback((anchor:Anchor,onPress:()=>void,disabled:boolean,opacity?:Animated.Value)=>{
  const id=Symbol(String(Math.random()));let cancelled=false;
  const frame=requestAnimationFrame(()=>host.current?.measureInWindow((hx,hy)=>anchor.current?.measureInWindow((x,y,width)=>{
   if(cancelled||width<=0||y<=hy)return;
   setEntries(old=>[...old,{id,left:x-hx,width,height:y-hy,onPress,disabled,opacity}]);
  })));
  return()=>{cancelled=true;cancelAnimationFrame(frame);setEntries(old=>old.filter(e=>e.id!==id));};
 },[]);
 return <Context.Provider value={register}><View ref={host} collapsable={false} style={{flex:1,minHeight:0,minWidth:0}}>{children}{entries.map(e=><AnimatedPressable key={String(e.id)} testID="calendar-top-backdrop" accessibilityRole="button" accessibilityLabel="상단 배경 눌러 닫기" disabled={e.disabled} onPress={e.onPress} style={[styles.strip,{left:e.left,width:e.width,height:e.height,opacity:e.opacity}]}/>)}</View></Context.Provider>;
}
export function useSheetTopBackdrop(anchor:Anchor,onPress:()=>void,disabled:boolean,opacity?:Animated.Value){
 const register=useContext(Context),press=useRef(onPress);press.current=onPress;const {width,height}=useWindowDimensions();
 useLayoutEffect(()=>register(anchor,()=>press.current(),disabled,opacity),[register,anchor,disabled,width,height,opacity]);
}
const styles=StyleSheet.create({strip:{position:'absolute',top:0,zIndex:30,backgroundColor:'#00000055'}});

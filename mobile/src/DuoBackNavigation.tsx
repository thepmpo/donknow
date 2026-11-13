import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {colors,layout} from './theme';
import type {DuoRect} from './duo-layout';
import {NavigationGlass} from './NavigationGlass';
type Entry={id:symbol;back:()=>void;disabled:boolean;kind?:'back'|'close'};
type BackContext={enabled:boolean;available:boolean;register:(entry:Entry)=>()=>void};
const Context=createContext<BackContext>({enabled:false,available:false,register:()=>()=>{}});
export function useDuoBackState(){return useContext(Context);}
/** Registers real route/dismiss handlers; tab changes alone never invent back history. */
export function useDuoBackAction(back:()=>void,disabled=false,kind:'back'|'close'='back'){
 const {enabled,register}=useDuoBackState(),id=useRef(Symbol()),latest=useRef(back);latest.current=back;
 useEffect(()=>{if(!enabled)return;return register({id:id.current,back:()=>latest.current(),disabled,kind});},[enabled,register,disabled,kind]);
 return enabled;
}
/** Each safe surface (including a Modal) owns its own back actions and coordinates. */
export function DuoBackProvider({enabled,frame,children}:{enabled:boolean;frame:DuoRect|null;children:React.ReactNode}){
 const [entries,setEntries]=useState<Entry[]>([]);
 const register=useCallback((entry:Entry)=>{setEntries(old=>[...old.filter(x=>x.id!==entry.id),entry]);return()=>setEntries(old=>old.filter(x=>x.id!==entry.id));},[]);
 const current=entries.at(-1),backEnabled=enabled&&!!frame,available=backEnabled&&!!current;
 const value=useMemo(()=>({enabled:backEnabled,available,register}),[backEnabled,available,register]);
 return <Context.Provider value={value}><View style={styles.surface}>{children}{available&&frame&&<Pressable testID="DuoBackButton" accessibilityRole="button" accessibilityLabel="뒤로가기" accessibilityState={{disabled:current.disabled}} disabled={current.disabled} onPress={current.back} style={[styles.circle,{left:frame.x,top:frame.y,width:frame.width,height:frame.height}]}><NavigationGlass pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:layout.duoNavigationWidth/2}]}/><Text style={[styles.chevron,current.disabled&&{color:colors.muted,opacity:.4}]}>{current.kind==='close'?'×':'‹'}</Text></Pressable>}</View></Context.Provider>;
}
const styles=StyleSheet.create({
 surface:{flex:1,minHeight:0,minWidth:0},
 circle:{position:'absolute',borderRadius:layout.duoNavigationWidth/2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,overflow:'hidden',alignItems:'center',justifyContent:'center',zIndex:30},
 chevron:{fontSize:32,lineHeight:38,color:colors.text,textAlign:'center'},
});

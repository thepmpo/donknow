import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {colors,layout} from './theme';
type Entry={id:symbol;back:()=>void;disabled:boolean};
type BackContext={enabled:boolean;available:boolean;register:(entry:Entry)=>()=>void};
const Context=createContext<BackContext>({enabled:false,available:false,register:()=>()=>{}});
export function useDuoBackState(){return useContext(Context);}
/** Registers real route/dismiss handlers; tab changes alone never invent back history. */
export function useDuoBackAction(back:()=>void,disabled=false){
 const {enabled,register}=useDuoBackState(),id=useRef(Symbol()),latest=useRef(back);latest.current=back;
 useEffect(()=>{if(!enabled)return;return register({id:id.current,back:()=>latest.current(),disabled});},[enabled,register,disabled]);
 return enabled;
}
/** Each safe surface (including a Modal) owns its own back actions and coordinates. */
export function DuoBackProvider({enabled,children}:{enabled:boolean;children:React.ReactNode}){
 const [entries,setEntries]=useState<Entry[]>([]);
 const register=useCallback((entry:Entry)=>{setEntries(old=>[...old.filter(x=>x.id!==entry.id),entry]);return()=>setEntries(old=>old.filter(x=>x.id!==entry.id));},[]);
 const current=entries.at(-1),available=enabled&&!!current;
 const value=useMemo(()=>({enabled,available,register}),[enabled,available,register]);
 return <Context.Provider value={value}><View style={styles.surface}>{children}{available&&<Pressable testID="DuoBackButton" accessibilityRole="button" accessibilityLabel="뒤로가기" accessibilityState={{disabled:current.disabled}} disabled={current.disabled} onPress={current.back} style={[styles.circle,current.disabled&&{opacity:.4}]}><Text style={styles.chevron}>‹</Text></Pressable>}</View></Context.Provider>;
}
const styles=StyleSheet.create({
 surface:{flex:1,minHeight:0,minWidth:0},
 circle:{position:'absolute',top:layout.duoNavigationInset,right:layout.duoNavigationInset,width:layout.duoNavigationWidth,height:layout.duoNavigationWidth,borderRadius:layout.duoNavigationWidth/2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center',zIndex:30},
 chevron:{fontSize:32,lineHeight:38,color:colors.text,textAlign:'center'},
});

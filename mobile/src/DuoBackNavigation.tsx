import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {colors,layout} from './theme';
import {duoDismissFrames,duoCalendarViewFrame,type DuoRect,type DuoSceneLayout} from './duo-layout';
import {useSurfaceBlocked} from './SurfaceInteraction';
import {NavigationGlass} from './NavigationGlass';
import {MaterialCommunityIcons} from '@expo/vector-icons';
type Entry={id:symbol;back:()=>void;disabled:boolean;kind?:'back'|'close';calendarSlot?:boolean;label?:string};
type KeyboardEntry={id:symbol;dismiss:()=>void};
type BackContext={enabled:boolean;available:boolean;controlsBottom?:number;register:(entry:Entry)=>()=>void;registerKeyboard:(entry:KeyboardEntry)=>()=>void};
const Context=createContext<BackContext>({enabled:false,available:false,register:()=>()=>{},registerKeyboard:()=>()=>{}});
export function useDuoBackState(){return useContext(Context);}
/** Registers real route/dismiss handlers; tab changes alone never invent back history. */
export function useDuoBackAction(back:()=>void,disabled=false,kind:'back'|'close'='back',calendarSlot=false,label?:string){
 const {enabled,register}=useDuoBackState(),id=useRef(Symbol()),latest=useRef(back);latest.current=back;
 useEffect(()=>{if(!enabled)return;return register({id:id.current,back:()=>latest.current(),disabled,kind,calendarSlot,label});},[enabled,register,disabled,kind,calendarSlot,label]);
 return enabled;
}
/** Each safe surface (including a Modal) owns its own back actions and coordinates. */
export function DuoBackProvider({enabled,frame,scene,children}:{enabled:boolean;frame:DuoRect|null;scene?:DuoSceneLayout|null;children:React.ReactNode}){
 const blocked=useSurfaceBlocked();
 const [entries,setEntries]=useState<Entry[]>([]);
 const [keyboards,setKeyboards]=useState<KeyboardEntry[]>([]);
 const registerKeyboard=useCallback((entry:KeyboardEntry)=>{setKeyboards(old=>[...old.filter(x=>x.id!==entry.id),entry]);return()=>setKeyboards(old=>old.filter(x=>x.id!==entry.id));},[]);
 const register=useCallback((entry:Entry)=>{setEntries(old=>[...old.filter(x=>x.id!==entry.id),entry]);return()=>setEntries(old=>old.filter(x=>x.id!==entry.id));},[]);
 const current=entries.at(-1),keyboard=keyboards.at(-1),backEnabled=enabled&&!!frame,available=backEnabled&&!!(current||keyboard);
 const accessory=scene&&current?.calendarSlot&&!keyboard?duoCalendarViewFrame(scene,false):null;
 const frames=accessory?{back:accessory,keyboard:null}:scene?duoDismissFrames(scene,!!current,!!keyboard):{back:current?frame:null,keyboard:keyboard?frame:null};
 const controlsBottom=available&&!accessory?Math.max(...[frames.back,frames.keyboard].filter((r):r is DuoRect=>!!r).map(r=>r.y+r.height)):undefined;
 const value=useMemo(()=>({enabled:backEnabled,available:available&&!accessory,controlsBottom,register,registerKeyboard}),[backEnabled,available,accessory,controlsBottom,register,registerKeyboard]);
 const circle=(rect:DuoRect)=>[styles.circle,{left:rect.x,top:rect.y,width:rect.width,height:rect.height}];
 return <Context.Provider value={value}><View style={styles.surface}>{children}
 {backEnabled&&keyboard&&frames.keyboard&&<Pressable testID="DuoKeyboardDismissButton" disabled={blocked} aria-hidden={blocked} accessibilityElementsHidden={blocked} importantForAccessibility={blocked?'no-hide-descendants':'auto'} accessibilityState={{disabled:blocked}} accessibilityRole="button" accessibilityLabel="키보드 내리기" accessibilityHint="입력과 화면을 유지하고 키보드만 닫아요." onPress={keyboard.dismiss} style={circle(frames.keyboard)}><NavigationGlass pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:32}]}/><MaterialCommunityIcons name="keyboard-close" size={26} color={colors.text}/>{blocked&&<View testID="DuoKeyboardDismissDim" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colors.scrim}]}/>}</Pressable>}
 {backEnabled&&current&&frames.back&&<Pressable testID="DuoBackButton" accessibilityRole="button" accessibilityLabel={current.label??'뒤로가기'} aria-hidden={blocked} accessibilityElementsHidden={blocked} importantForAccessibility={blocked?'no-hide-descendants':'auto'} accessibilityState={{disabled:current.disabled||blocked}} disabled={current.disabled||blocked} onPress={current.back} style={circle(frames.back)}><NavigationGlass pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:32}]}/><Text style={[styles.chevron,current.disabled&&{color:colors.muted,opacity:.4}]}>{current.kind==='close'?'×':'‹'}</Text>{blocked&&<View testID="DuoBackDim" pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:colors.scrim}]}/>}</Pressable>}
 </View></Context.Provider>;
}
const styles=StyleSheet.create({
 surface:{flex:1,minHeight:0,minWidth:0},
 circle:{position:'absolute',borderRadius:layout.duoNavigationWidth/2,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,overflow:'hidden',alignItems:'center',justifyContent:'center',zIndex:30},
 chevron:{fontSize:32,lineHeight:38,color:colors.text,textAlign:'center'},
});

import React,{createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import type {ReactNode} from 'react';
import {DuoBackProvider,useDuoBackState} from './DuoBackNavigation';
import {duoTabFrame,duoTodayFrame,duoCalendarViewFrame} from './duo-layout';
import {NavigationGlass} from './NavigationGlass';
import {SheetBackdropProvider} from './SheetBackdrop';
import {Ionicons} from '@expo/vector-icons';
import {colors} from './theme';
import type {DuoSceneLayout} from './duo-layout';
type TodayEntry={id:symbol;day:string;onPress:()=>void;priority:number;view?:{expanded:boolean;onPress:()=>void}};
type Chrome={scene:DuoSceneLayout|null;ready:boolean;setNavigation:React.Dispatch<React.SetStateAction<ReactNode>>;registerToday:(entry:TodayEntry)=>()=>void};
const Context=createContext<Chrome>({scene:null,ready:true,setNavigation:()=>{},registerToday:()=>()=>{}});
export function useDuoScene(){return useContext(Context);}
export function useDuoNavigationPortal(node:ReactNode,enabled:boolean){
 const {scene,setNavigation}=useDuoScene();
 useLayoutEffect(()=>{if(!enabled||!scene)return;setNavigation(node);return()=>setNavigation(null);},[enabled,!!scene,setNavigation,node]);
}
export function useDuoToday(day:string,onPress:()=>void,enabled:boolean,priority=1,view?:{expanded:boolean;onPress:()=>void}){
 const {scene,registerToday}=useDuoScene(),id=useRef(Symbol()),press=useRef(onPress);press.current=onPress;const viewPress=useRef(view?.onPress);viewPress.current=view?.onPress;
 useEffect(()=>{if(!scene||!enabled)return;return registerToday({id:id.current,day,onPress:()=>press.current(),priority,view:view?{expanded:view.expanded,onPress:()=>viewPress.current?.()}:undefined});},[!!scene,registerToday,day,enabled,priority,!!view,view?.expanded]);
}
function NavigationHost({scene,children,today}:{scene:DuoSceneLayout;children:ReactNode;today?:TodayEntry}){
 const {available}=useDuoBackState(),frame=duoTabFrame(scene,available),accessory=duoTodayFrame(scene,available,!!today?.view),viewFrame=duoCalendarViewFrame(scene,available);
 return <>{today?.view&&viewFrame&&<Pressable testID="DuoCalendarViewButton" accessibilityRole="button" accessibilityLabel={today.view.expanded?"월 보기로 전환":"2주 보기로 전환"} accessibilityState={{selected:today.view.expanded}} onPress={today.view.onPress} style={[styles.today,{left:viewFrame.x,top:viewFrame.y,width:viewFrame.width,height:viewFrame.height}]}><NavigationGlass pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:32}]}/><Ionicons name="albums-outline" size={28} color={colors.text}/></Pressable>}{frame&&<View pointerEvents="box-none" style={[styles.navigation,{left:frame.x,top:frame.y,width:frame.width,height:frame.height}]} testID="duo-camera-column-controls">{children}</View>}
 {today&&accessory&&<Pressable testID="DuoTodayButton" accessibilityRole="button" accessibilityLabel="오늘" onPress={today.onPress} style={[styles.today,{left:accessory.x,top:accessory.y,width:accessory.width,height:accessory.height}]}><NavigationGlass pointerEvents="none" style={[StyleSheet.absoluteFill,{borderRadius:32}]}/><Text style={styles.weekday}>{new Intl.DateTimeFormat('ko-KR',{weekday:'short'}).format(new Date(today.day+'T12:00:00'))}</Text><Text style={styles.date}>{Number(today.day.slice(8))}</Text></Pressable>}</>;
}
/** Host stays in full native coordinates; content may be inset or split independently. */
export function DuoChromeProvider({scene,ready,children}:{scene:DuoSceneLayout|null;ready:boolean;children:ReactNode}){
 const [navigation,setNavigation]=useState<ReactNode>(null),[today,setToday]=useState<TodayEntry[]>([]);
 const registerToday=useCallback((entry:TodayEntry)=>{setToday(old=>[...old.filter(e=>e.id!==entry.id),entry].sort((a,b)=>b.priority-a.priority));return()=>setToday(old=>old.filter(e=>e.id!==entry.id));},[]);
 const value=useMemo(()=>({scene,ready,setNavigation,registerToday}),[scene,ready,registerToday]);
 return <Context.Provider value={value}><SheetBackdropProvider><DuoBackProvider enabled={!!scene} frame={scene?.back??null}>{children}{scene&&navigation&&<NavigationHost scene={scene} today={today[0]}>{navigation}</NavigationHost>}</DuoBackProvider></SheetBackdropProvider></Context.Provider>;
}
const styles=StyleSheet.create({navigation:{position:'absolute',zIndex:20,justifyContent:'flex-end'},today:{position:'absolute',zIndex:20,borderRadius:32,borderWidth:StyleSheet.hairlineWidth,borderColor:colors.line,alignItems:'center',justifyContent:'center',overflow:'hidden'},weekday:{fontSize:12,lineHeight:16,color:colors.text},date:{fontSize:25,lineHeight:30,color:colors.text,fontWeight:'600'}});

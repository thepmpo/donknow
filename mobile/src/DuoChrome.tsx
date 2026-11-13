import React,{createContext,useContext,useLayoutEffect,useMemo,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import type {ReactNode} from 'react';
import {DuoBackProvider,useDuoBackState} from './DuoBackNavigation';
import {duoTabFrame} from './duo-layout';
import type {DuoSceneLayout} from './duo-layout';
type Chrome={scene:DuoSceneLayout|null;ready:boolean;setNavigation:React.Dispatch<React.SetStateAction<ReactNode>>};
const Context=createContext<Chrome>({scene:null,ready:true,setNavigation:()=>{}});
export function useDuoScene(){return useContext(Context);}
export function useDuoNavigationPortal(node:ReactNode,enabled:boolean){
 const {scene,setNavigation}=useDuoScene();
 useLayoutEffect(()=>{if(!enabled||!scene)return;setNavigation(node);return()=>setNavigation(null);},[enabled,!!scene,setNavigation,node]);
}
function NavigationHost({scene,children}:{scene:DuoSceneLayout;children:ReactNode}){
 const {available}=useDuoBackState(),frame=duoTabFrame(scene,available);
 return frame?<View pointerEvents="box-none" style={[styles.navigation,{left:frame.x,top:frame.y,width:frame.width,height:frame.height}]} testID="duo-camera-column-controls">{children}</View>:null;
}
/** Host stays in full native coordinates; content may be inset or split independently. */
export function DuoChromeProvider({scene,ready,children}:{scene:DuoSceneLayout|null;ready:boolean;children:ReactNode}){
 const [navigation,setNavigation]=useState<ReactNode>(null),value=useMemo(()=>({scene,ready,setNavigation}),[scene,ready]);
 return <Context.Provider value={value}><DuoBackProvider enabled={!!scene} frame={scene?.back??null}>{children}{scene&&navigation&&<NavigationHost scene={scene}>{navigation}</NavigationHost>}</DuoBackProvider></Context.Provider>;
}
const styles=StyleSheet.create({navigation:{position:'absolute',zIndex:20,justifyContent:'flex-end'}});

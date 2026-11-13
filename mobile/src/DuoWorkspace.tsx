import React,{useEffect,useState} from 'react';
import {StyleSheet,View} from 'react-native';
import {useDuoScene} from './DuoChrome';
import type {DuoRect} from './duo-layout';
/** Stable parents preserve both panels through unfolding, rotation and tab changes. */
export function DuoWorkspace({fixed,children,enabled=true}:{fixed:React.ReactNode;children:React.ReactNode;enabled?:boolean}){
 const {scene}=useDuoScene(),panes=scene?.panes,split=enabled&&!!panes;
 const [opened,setOpened]=useState(split);useEffect(()=>{if(split)setOpened(true);},[split]);
 const position=(frame:DuoRect)=>({position:'absolute' as const,left:frame.x-scene!.body.x,top:Math.max(0,frame.y-scene!.body.y),bottom:Math.max(0,scene!.body.y+scene!.body.height-frame.y-frame.height),width:frame.width});
 return <View style={styles.workspace} testID={split?'duo-split-workspace':'single-workspace'}>
  {(opened||split)&&<View testID="DuoFixedCalendarPane" style={[styles.pane,split&&panes?position(panes.leading):styles.hidden]} accessibilityElementsHidden={!split} importantForAccessibility={split?'auto':'no-hide-descendants'}>{fixed}</View>}
  <View testID="DuoActivePane" style={[styles.pane,panes&&position(panes.trailing)]}>{children}</View>
 </View>;
}
const styles=StyleSheet.create({workspace:{flex:1,minHeight:0,minWidth:0},pane:{flex:1,minHeight:0,minWidth:0},hidden:{display:'none'}});

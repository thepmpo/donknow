import React,{useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Animated,Easing,Platform,ScrollView,StyleSheet,Text,View} from 'react-native';
import type {LayoutRectangle} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {MotionPressable as Pressable,useReducedMotion} from './motion';
import {colors,palette,layout} from './theme';
import {useDuoNavigationPortal,useDuoScene} from './DuoChrome';
import {NavigationGlass} from './NavigationGlass';
export const appTabs=[
 {id:'calendar',name:'캘린더',icon:'calendar-outline'},
 {id:'todos',name:'Todo 리스트',icon:'checkmark-circle-outline'},
 {id:'duck',name:'duckduck',icon:'chatbubble-outline'},
 {id:'log',name:'log',icon:'time-outline'},
 {id:'profile',name:'내정보',icon:'person-outline'},
] as const;
export type AppTab=typeof appTabs[number]['id'];
type Props={tab:AppTab;onSelect:(tab:AppTab)=>void;duo:boolean;bottomInset?:number;small?:boolean;unread?:number};
const native=Platform.OS!=='web';
function NavigationBar({tab,onSelect,duo,bottomInset=0,small=false,unread=0}:Props){
 const reduced=useReducedMotion(),[frames,setFrames]=useState<Partial<Record<AppTab,LayoutRectangle>>>({});
 const x=useRef(new Animated.Value(0)).current,y=useRef(new Animated.Value(0)).current,scale=useRef(new Animated.Value(1)).current;
 const initialized=useRef(false),direction=useRef(duo),frame=frames[tab];
 const indicator=frame?{width:duo?layout.duoNavigationItemSize:Math.min(64,frame.width-4),height:duo?layout.duoNavigationItemSize:Math.min(54,frame.height-4)}:null;
 const targetX=frame&&indicator?frame.x+(frame.width-indicator.width)/2:0,targetY=frame&&indicator?frame.y+(frame.height-indicator.height)/2:0;
 useLayoutEffect(()=>{
  x.stopAnimation();y.stopAnimation();scale.stopAnimation();
  if(!frame)return;
  if(reduced||!initialized.current||direction.current!==duo){x.setValue(targetX);y.setValue(targetY);scale.setValue(1);}
  else Animated.parallel([
   Animated.timing(x,{toValue:targetX,duration:250,easing:Easing.out(Easing.cubic),useNativeDriver:native}),
   Animated.timing(y,{toValue:targetY,duration:250,easing:Easing.out(Easing.cubic),useNativeDriver:native}),
   Animated.sequence([Animated.timing(scale,{toValue:1.06,duration:80,useNativeDriver:native}),Animated.timing(scale,{toValue:1,duration:170,easing:Easing.out(Easing.cubic),useNativeDriver:native})]),
  ]).start();
  initialized.current=true;direction.current=duo;
  return()=>{x.stopAnimation();y.stopAnimation();scale.stopAnimation();};
 },[targetX,targetY,!!frame,reduced,duo,x,y,scale]);
 return <NavigationGlass style={[styles.bar,duo?styles.duo:styles.bottom,!duo&&{paddingBottom:Math.max(bottomInset,8)}]} testID={duo?'DuoTrailingNavigation':'BottomNavigation'} accessibilityRole="tablist">
  <ScrollView horizontal={!duo} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.items,duo&&styles.verticalItems]} style={{minWidth:0,minHeight:0}}>
   {indicator&&<Animated.View pointerEvents="none" testID="navigation-selection" style={[styles.selection,indicator,{transform:[{translateX:x},{translateY:y},{scale}]}]}><NavigationGlass variant="selection" pointerEvents="none" style={[StyleSheet.absoluteFill,styles.selectionMaterial]}/></Animated.View>}
   {appTabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.name} accessibilityState={{selected:item.id===tab}} onPress={()=>onSelect(item.id)} onLayout={event=>{const next=event.nativeEvent.layout;setFrames(old=>{const prior=old[item.id];return prior&&Object.keys(next).every(key=>next[key as keyof LayoutRectangle]===prior[key as keyof LayoutRectangle])?old:{...old,[item.id]:next};});}} style={[styles.tab,duo&&styles.compact]}>
    {item.id==='duck'?<Text testID={'navigation-icon-'+item.id} style={[styles.duck,duo&&styles.duoDuck]}>🦆</Text>:<Ionicons testID={'navigation-icon-'+item.id} name={item.icon} size={duo?layout.duoNavigationIconSize:24} color={item.id===tab?colors.blueText:palette.grey600}/>}
    {item.id==='duck'&&unread>0&&<View style={styles.badge}><Text style={styles.badgeText}>{unread>99?'99+':unread}</Text></View>}
    {!duo&&<Text numberOfLines={2} style={[styles.label,item.id===tab&&styles.selected]}>{small&&item.id==='todos'?'Todo\n리스트':item.name}</Text>}
   </Pressable>)}
  </ScrollView>
 </NavigationGlass>;
}
/** Full-scene portal preserves the physical camera column through folding/rotation. */
export function AppNavigation(props:Props){
 const {ready}=useDuoScene();
 const {tab,onSelect,duo,bottomInset,small,unread}=props;
 const bar=useMemo(()=><NavigationBar tab={tab} onSelect={onSelect} duo={duo} bottomInset={bottomInset} small={small} unread={unread}/>,[tab,onSelect,duo,bottomInset,small,unread]);
 useDuoNavigationPortal(bar,duo&&ready);
 return !ready||duo?null:bar;
}
const styles=StyleSheet.create({
 bar:{borderColor:'rgba(180,190,205,0.5)'},
 bottom:{position:'absolute',bottom:0,left:0,right:0,borderTopWidth:StyleSheet.hairlineWidth,paddingTop:4},
 duo:{width:layout.duoNavigationWidth,height:layout.duoNavigationHeight,maxHeight:'100%',borderRadius:layout.duoNavigationWidth/2,borderWidth:1,padding:5},
 selection:{position:'absolute',left:0,top:0},selectionMaterial:{borderRadius:27},
 badge:{position:'absolute',right:1,top:0,backgroundColor:colors.action,borderRadius:9,minWidth:18,paddingHorizontal:3,alignItems:'center'},badgeText:{fontSize:11,lineHeight:18,color:colors.white},
 items:{flexGrow:1,flexDirection:'row'},tab:{flex:1,minHeight:58,paddingHorizontal:2,paddingVertical:6,alignItems:'center',justifyContent:'center',gap:6},
 verticalItems:{flexDirection:'column'},compact:{flex:0,width:layout.duoNavigationItemSize,minWidth:layout.duoNavigationItemSize,minHeight:layout.duoNavigationItemSize,padding:0,gap:0},
 label:{fontSize:12,lineHeight:18,color:colors.muted,textAlign:'center'},selected:{color:colors.blueText,fontWeight:'600'},duck:{fontSize:24,lineHeight:28},duoDuck:{fontSize:layout.duoNavigationIconSize,lineHeight:34},
});

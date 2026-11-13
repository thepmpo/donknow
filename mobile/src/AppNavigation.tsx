import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {BlurView} from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import {MotionPressable as Pressable} from './motion';
import {colors,palette,layout} from './theme';
import {useDuoBackState} from './DuoBackNavigation';
export const appTabs=[
 {id:'calendar',name:'캘린더',icon:'calendar-outline'},
 {id:'todos',name:'Todo 리스트',icon:'checkmark-circle-outline'},
 {id:'duck',name:'duckduck',icon:'chatbubble-outline'},
 {id:'log',name:'log',icon:'time-outline'},
 {id:'profile',name:'내정보',icon:'person-outline'},
] as const;
export type AppTab=typeof appTabs[number]['id'];
/** Duo keeps the same vertical stack at the lower trailing edge; it never becomes a bottom row. */
export function AppNavigation({tab,onSelect,duo,bottomInset=0,small=false,unread=0}:{tab:AppTab;onSelect:(tab:AppTab)=>void;duo:boolean;bottomInset?:number;small?:boolean;unread?:number}){
 const {available:canGoBack}=useDuoBackState();
 const bar=<BlurView intensity={85} tint="light" style={[styles.bar,duo?styles.duo:styles.bottom,!duo&&{paddingBottom:Math.max(bottomInset,8)}]} testID={duo?'DuoTrailingNavigation':'BottomNavigation'} accessibilityRole="tablist">
  <ScrollView horizontal={!duo} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.items,duo&&styles.verticalItems]} style={{minWidth:0,minHeight:0}}>{appTabs.map(item=><Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.name} accessibilityState={{selected:item.id===tab}} onPress={()=>onSelect(item.id)} style={[styles.tab,duo&&styles.compact]}>
   {item.id==='duck'?<Text style={styles.duck}>🦆</Text>:<Ionicons name={item.icon} size={24} color={item.id===tab?colors.blue:palette.grey500}/>}
   {item.id==='duck'&&unread>0&&<View style={styles.badge}><Text style={styles.badgeText}>{unread>99?'99+':unread}</Text></View>}
   {!duo&&<Text numberOfLines={2} style={[styles.label,item.id===tab&&styles.selected]}>{small&&item.id==='todos'?'Todo\n리스트':item.name}</Text>}
  </Pressable>)}</ScrollView>
 </BlurView>;
 return duo?<View pointerEvents="box-none" style={[styles.duoAnchor,canGoBack&&{top:layout.duoNavigationInset*2+layout.duoNavigationWidth}]}>{bar}</View>:bar;
}
const styles=StyleSheet.create({
 bar:{backgroundColor:'rgba(235,243,252,0.32)',borderColor:'rgba(180,190,205,0.35)',overflow:'hidden'},
 bottom:{position:'absolute',bottom:0,left:0,right:0,borderTopWidth:StyleSheet.hairlineWidth,paddingTop:4},
 duoAnchor:{position:'absolute',top:layout.duoNavigationInset,right:layout.duoNavigationInset,bottom:layout.duoNavigationInset,width:layout.duoNavigationWidth,zIndex:20,justifyContent:'flex-end'},
 duo:{width:layout.duoNavigationWidth,height:layout.duoNavigationHeight,maxHeight:'100%',borderRadius:16,borderWidth:StyleSheet.hairlineWidth,padding:1},
 badge:{position:'absolute',right:1,top:0,backgroundColor:colors.action,borderRadius:9,minWidth:18,paddingHorizontal:3,alignItems:'center'},badgeText:{fontSize:11,lineHeight:18,color:colors.white},
 items:{flexGrow:1,flexDirection:'row'},tab:{flex:1,minHeight:58,paddingHorizontal:2,paddingVertical:6,alignItems:'center',justifyContent:'center',gap:6},
 verticalItems:{flexDirection:'column'},
 compact:{flex:0,width:44,minWidth:44,minHeight:44,padding:0,gap:0},
 label:{fontSize:12,lineHeight:18,color:colors.muted,textAlign:'center'},selected:{color:colors.blueText,fontWeight:'600'},duck:{fontSize:24,lineHeight:28},
});

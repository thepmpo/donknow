import React,{useMemo,useState} from 'react';
import {Platform,StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaProvider,useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {CoreScreen} from './src/CoreScreen';
import {product,sections} from './src/product';
import type {Section} from './src/product';
import {DuoLayoutFrame,DuoSafeSurface,useDuoTrailingNavigation} from './system/DuoLayout';
import {useDuoNavigationPortal} from './system/DuoChrome';
import {MotionPressable,MotionProvider} from './system/motion';
import {NavigationGlass} from './system/NavigationGlass';
import {colors,layout,spacing,typography} from './system/theme';
import {webWorkspace,workspaceGeometry} from './system/workspace-geometry';
import './system/desktop-theme';

function Navigation({active,select,placement}:{active:Section;select:(id:Section)=>void;placement:'sidebar'|'top'|'bottom'|'duo'}){
 return <View accessibilityRole="tablist" accessibilityLabel="주요 메뉴" style={[styles.tabs,(placement==='top'||placement==='bottom')&&styles.horizontal,placement==='bottom'&&styles.floating,placement==='duo'&&styles.duoTabs]}>
  {(placement==='bottom'||placement==='duo')&&<NavigationGlass pointerEvents="none" style={StyleSheet.absoluteFill}/>}
  {sections.map(({id,title,icon})=><MotionPressable key={id} testID={'section-'+id} accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{selected:active===id}} onPress={()=>select(id)}
    style={[styles.tab,placement==='sidebar'&&styles.sidebarTab,active===id&&styles.selected]}>
   <Ionicons name={icon} size={placement==='duo'?layout.duoNavigationIconSize:20} color={active===id?colors.blueText:colors.secondary}/>
   {placement!=='duo'&&<Text numberOfLines={1} style={[styles.tabText,active===id&&{color:colors.blueText}]}>{title}</Text>}
  </MotionPressable>)}
 </View>;
}

function Workspace({standardPreview=false}:{standardPreview?:boolean}){
 const {width}=useWindowDimensions(),insets=useSafeAreaInsets(),duo=useDuoTrailingNavigation();
 const [section,select]=useState<Section>('items');
 const web=Platform.OS==='web'&&!duo&&!standardPreview;
 const frame=workspaceGeometry(width),title=sections.find(item=>item.id===section)!.title;
 const duoNavigation=useMemo(()=><Navigation active={section} select={select} placement="duo"/>,[section]);
 useDuoNavigationPortal(duoNavigation,duo);
 const standard=!web&&!duo;
 return <View testID={duo?'starter-duo':web?'starter-web':'starter-standard'} style={[styles.root,web&&styles.web,{paddingBottom:standard?insets.bottom+layout.navigationBottomGap:0},web&&{width:frame.width,margin:frame.margin}]}>
  {web&&<View style={styles.top}><Wordmark/></View>}
  {web&&frame.narrow&&<Navigation active={section} select={select} placement="top"/>}
  <View style={styles.workspace}>
   {web&&!frame.narrow&&<View style={styles.sidebar}><Navigation active={section} select={select} placement="sidebar"/></View>}
   <View style={styles.body}>
    <View style={styles.header}>
     {!web&&<View style={styles.leading}><Wordmark/></View>}
     <Text accessibilityRole="header" numberOfLines={1} style={[styles.heading,web&&styles.webHeading]}>{title}</Text>
    </View>
    <CoreScreen section={section}/>
   </View>
   {web&&frame.showAside&&<View testID="starter-context" style={styles.aside}><Text style={styles.contextTitle}>현재 화면</Text><Text style={styles.contextText}>{title}</Text></View>}
  </View>
  {standard&&<Navigation active={section} select={select} placement="bottom"/>}
 </View>;
}

function Wordmark(){
 return <Text numberOfLines={1} style={styles.brand}>{product.name}<Text style={{color:colors.blueText}}>.</Text></Text>;
}

function Root(){
 const {width,height}=useWindowDimensions();
 const preview=Platform.OS==='web'&&process.env.EXPO_PUBLIC_STARTER_LAYOUT_PREVIEW==='1'
  ?new URLSearchParams(window.location.search).get('layout'):null;
 const geometry=useMemo(()=>({
  apiAvailable:true,hasHinge:true,width,height,safeArea:{top:0,bottom:0,left:0,right:0},
  regions:[{kind:'occlusion' as const,active:true,frame:{x:Math.max(0,width-80),y:0,width:80,height:110}}],
 }),[width,height]);
 if(preview==='duo')return <DuoLayoutFrame geometry={geometry} enabled><Workspace/></DuoLayoutFrame>;
 return <DuoSafeSurface workspace><Workspace standardPreview={preview==='standard'}/></DuoSafeSurface>;
}

export default function App(){
 return <SafeAreaProvider><MotionProvider><View style={styles.page}><Root/></View></MotionProvider></SafeAreaProvider>;
}

const styles=StyleSheet.create({
 page:{flex:1,minHeight:0,backgroundColor:colors.bg},
 root:{flex:1,minWidth:0,minHeight:0,backgroundColor:colors.bg},
 web:{alignSelf:'center',borderWidth:1,borderColor:colors.line,borderRadius:webWorkspace.radius,overflow:'hidden'},
 top:{height:webWorkspace.top,paddingHorizontal:20,borderBottomWidth:1,borderColor:colors.line,justifyContent:'center',backgroundColor:colors.surface},
 brand:{...typography.detail,color:colors.text,fontWeight:'800'},
 workspace:{flex:1,minHeight:0,flexDirection:'row'},
 sidebar:{width:webWorkspace.sidebar,borderRightWidth:1,borderColor:colors.line,padding:12,backgroundColor:colors.surface},
 body:{flex:1,minWidth:0,minHeight:0},
 header:{height:layout.headerHeight,justifyContent:'center',paddingHorizontal:layout.pageInset,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
 leading:{position:'absolute',left:layout.pageInset,maxWidth:'29%'},
 heading:{...typography.section,textAlign:'center',marginHorizontal:'24%',color:colors.text},
 webHeading:{textAlign:'left',marginHorizontal:0},
 aside:{width:webWorkspace.aside,padding:24,gap:8,borderLeftWidth:1,borderColor:colors.line,backgroundColor:colors.surface},
 contextTitle:{...typography.detail,fontWeight:'600',color:colors.text},
 contextText:{...typography.caption,color:colors.muted},
 tabs:{gap:spacing.xs,padding:spacing.xs},
 horizontal:{flexDirection:'row',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:colors.line},
 floating:{marginHorizontal:layout.navigationInset,minHeight:layout.navigationHeight,borderRadius:layout.navigationRadius,overflow:'hidden',borderWidth:StyleSheet.hairlineWidth},
 duoTabs:{borderRadius:layout.navigationRadius,overflow:'hidden',alignItems:'center'},
 tab:{minHeight:44,minWidth:44,flexGrow:1,alignItems:'center',justifyContent:'center',borderRadius:12,gap:4,padding:4},
 sidebarTab:{flexDirection:'row',justifyContent:'flex-start',paddingHorizontal:12},
 selected:{backgroundColor:colors.pale},
 tabText:{...typography.caption,color:colors.secondary},
});

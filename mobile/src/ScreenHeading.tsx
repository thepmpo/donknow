import {BrandWordmark} from './BrandWordmark';
import React,{useState} from 'react';
import {useDesktopPresentation} from './DesktopPresentation';
import {Text,View} from 'react-native';
import {colors,layout,typography} from './theme';
export function ScreenHeading({title,children,embedded=false}:{title:string;children?:React.ReactNode;embedded?:boolean}){
 const desktop=useDesktopPresentation(),[width,setWidth]=useState(300);
 const narrow=width<240;
 if(!desktop)return <View testID="mobile-page-header" onLayout={event=>setWidth(event.nativeEvent.layout.width)} style={{height:56,minHeight:56,marginHorizontal:embedded?0:layout.pageInset,marginTop:embedded?0:layout.pageTop,justifyContent:'center',backgroundColor:colors.bg}}><View style={{position:'absolute',left:0,top:0,bottom:0,width:title==='docen'?(narrow?108:136):(narrow?62:90),zIndex:1,justifyContent:'center'}}><BrandWordmark ai={title==='docen'} style={{fontSize:narrow?20:26,lineHeight:36,letterSpacing:narrow?-.7:-.5,fontWeight:'800',color:colors.text}}/></View>{title!=='docen'&&<Text accessibilityRole="header" numberOfLines={1} style={{fontSize:narrow?13:18,lineHeight:26,fontWeight:'700',color:colors.text,textAlign:'center',marginHorizontal:narrow?62:88}}>{title}</Text>}{children&&<View style={{position:'absolute',right:0,top:0,bottom:0,zIndex:1,justifyContent:'center',maxWidth:70}}>{children}</View>}</View>;
 return <View style={{paddingHorizontal:embedded?0:layout.pageInset,paddingTop:embedded?0:desktop?28:layout.pageTop,paddingBottom:layout.titleBottom,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>{title==='docen'?<BrandWordmark ai accessibilityRole="header" style={{...typography.heading,...(desktop?{fontSize:25,lineHeight:34}:{}),color:colors.text,flexShrink:1}}/>:<Text accessibilityRole="header" style={{...typography.heading,...(desktop?{fontSize:25,lineHeight:34}:{}),color:colors.text,flexShrink:1}}>{title}</Text>}{children}</View>;
}

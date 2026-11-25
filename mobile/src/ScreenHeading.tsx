import {BrandWordmark} from './BrandWordmark';
import React from 'react';
import {useDesktopPresentation} from './DesktopPresentation';
import {Text,View} from 'react-native';
import {colors,layout,typography} from './theme';
export function ScreenHeading({title,children,embedded=false}:{title:string;children?:React.ReactNode;embedded?:boolean}){
 const desktop=useDesktopPresentation();
 return <View style={{paddingHorizontal:embedded?0:layout.pageInset,paddingTop:embedded?0:desktop?28:layout.pageTop,paddingBottom:layout.titleBottom,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>{title==='docen'?<BrandWordmark ai accessibilityRole="header" style={{...typography.heading,...(desktop?{fontSize:25,lineHeight:34}:{}),color:colors.text,flexShrink:1}}/>:<Text accessibilityRole="header" style={{...typography.heading,...(desktop?{fontSize:25,lineHeight:34}:{}),color:colors.text,flexShrink:1}}>{title}</Text>}{children}</View>;
}

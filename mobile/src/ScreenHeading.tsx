import React from 'react';
import {Text,View} from 'react-native';
import {colors,layout,typography} from './theme';
export function ScreenHeading({title,children,embedded=false}:{title:string;children?:React.ReactNode;embedded?:boolean}){
 return <View style={{paddingHorizontal:embedded?0:layout.pageInset,paddingTop:embedded?0:layout.pageTop,paddingBottom:layout.titleBottom,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><Text accessibilityRole="header" style={{...typography.heading,color:colors.text,flexShrink:1}}>{title}</Text>{children}</View>;
}

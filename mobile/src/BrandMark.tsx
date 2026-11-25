import React from 'react';
import {Image,Platform,type ImageStyle,type StyleProp} from 'react-native';
export const brandLogoCutout=require('../assets/brand/docen-logo-cutout.png');
export const brandLogo=require('../assets/brand/docen-logo.png');
/** User-supplied docen logo. Identifier names and navigation geometry stay intact. */
export function BrandMark({size=32,style,decorative=false,testID,cutout=false}:{size?:number;style?:StyleProp<ImageStyle>;decorative?:boolean;testID?:string;cutout?:boolean}){
 return <Image testID={testID} source={cutout?brandLogoCutout:brandLogo} accessible={!decorative} accessibilityLabel={decorative?undefined:'docen 로고'} resizeMode="contain" style={[{width:size,height:size,borderRadius:cutout?0:size*.18,backgroundColor:cutout?'transparent':'#fff',transform:Platform.OS==='web'&&!cutout?[{translateY:-size*.08}]:undefined},style]}/>;
}

import React from 'react';
import {Image,type ImageStyle,type StyleProp} from 'react-native';
export const brandLogo=require('../assets/brand/docen-logo.png');
/** User-supplied docen logo. Identifier names and navigation geometry stay intact. */
export function BrandMark({size=32,style,decorative=false,testID}:{size?:number;style?:StyleProp<ImageStyle>;decorative?:boolean;testID?:string}){
 return <Image testID={testID} source={brandLogo} accessible={!decorative} accessibilityLabel={decorative?undefined:'docen 로고'} resizeMode="contain" style={[{width:size,height:size,borderRadius:size*.18,backgroundColor:'#fff'},style]}/>;
}

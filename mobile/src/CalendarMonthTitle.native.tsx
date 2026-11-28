import React,{useState} from 'react';
import {I18nManager,StyleSheet,Text,View} from 'react-native';
import type {ViewProps} from 'react-native';
import NativeMaskedView from '@react-native-masked-view/masked-view';
import {monthLabelScale,monthTitleFadeWidth,monthTitleLine} from './calendar-month-display';

const MaskedView=NativeMaskedView as unknown as React.ComponentType<ViewProps&{maskElement:React.ReactElement}>;

export function CalendarMonthTitle({title,lines,color,fontScale}:{
 title:string;lines:number;color:string;fontScale:number;
}){
 const [measured,setMeasured]=useState<{title:string;lines:number;clipped:boolean}>();
 const clipped=measured?.title===title&&measured.lines===lines&&measured.clipped;
 const label=<Text numberOfLines={lines} ellipsizeMode="clip" maxFontSizeMultiplier={monthLabelScale} style={[styles.title,{color}]}>{title}</Text>;
 const height=Math.ceil(monthTitleLine*Math.min(fontScale,monthLabelScale));
 const direction=I18nManager.isRTL?'left':'right';
 return <View>
  {clipped?<MaskedView testID="month-title-fade" maskElement={
   <View style={styles.mask}>
    <View style={styles.solid}/>
    <View style={[styles.bottom,{height}]}>
     <View style={styles.solid}/>
     <View style={{width:monthTitleFadeWidth,experimental_backgroundImage:`linear-gradient(to ${direction}, black, transparent)`}}/>
    </View>
   </View>
  }>{label}</MaskedView>:label}
  <Text pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
   maxFontSizeMultiplier={monthLabelScale} style={[styles.title,styles.measure]} onTextLayout={event=>{
    const clipped=event.nativeEvent.lines.length>lines;
    setMeasured(previous=>previous?.title===title&&previous.lines===lines&&previous.clipped===clipped?previous:{title,lines,clipped});
   }}>{title}</Text>
 </View>;
}
const styles=StyleSheet.create({
 title:{fontSize:13,lineHeight:monthTitleLine,fontWeight:'600'},
 measure:{position:'absolute',start:0,end:0,top:0,opacity:0},
 mask:{flex:1},
 solid:{flex:1,backgroundColor:'black'},
 bottom:{flexDirection:'row'},
});

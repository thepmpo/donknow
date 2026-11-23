import {BrandLoading} from './BrandLoading';
import React,{useEffect,useRef} from 'react';
import {Animated,Platform,StyleSheet,Text,View} from 'react-native';
import {useReducedMotion} from './motion';
import {colors,typography} from './theme';
export function ChatArrival({children}:{children:React.ReactNode}){const reduced=useReducedMotion(),progress=useRef(new Animated.Value(reduced?1:0)).current;useEffect(()=>{if(reduced){progress.stopAnimation();progress.setValue(1);return;}const animation=Animated.timing(progress,{toValue:1,duration:220,useNativeDriver:Platform.OS!=='web'});animation.start();return()=>animation.stop();},[reduced]);return <Animated.View style={{opacity:progress.interpolate({inputRange:[0,1],outputRange:[.45,1]}),transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[3,0]})}]}}>{children}</Animated.View>;}
export function ChatFeedback({label}:{label:string}){return <View testID="duck-chat-pending" accessibilityLiveRegion="polite" style={s.bubble}><BrandLoading size={36} label={label}/><Text style={s.label}>{label}</Text></View>;}
const s=StyleSheet.create({bubble:{alignSelf:'flex-start',minHeight:44,paddingVertical:10,paddingHorizontal:14,borderRadius:18,backgroundColor:colors.surface,flexDirection:'row',alignItems:'center',gap:10},label:{...typography.caption,color:colors.secondary}});

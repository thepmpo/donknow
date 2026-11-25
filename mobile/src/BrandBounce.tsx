import React,{useEffect,useRef,useState} from 'react';
import {Animated,AppState,Easing,Image,Platform,View} from 'react-native';
import {BrandMark} from './BrandMark';
import {useReducedMotion} from './motion';
import type {BrandLoadingProps} from './BrandLoading.types';
/** Transparent brand layers: the sphere bounces while the platform stays still. */
function BrandBounce({size=96,label='불러오는 중',loading,enabled=true}:BrandLoadingProps&{loading:boolean;enabled?:boolean}){
 const reduced=useReducedMotion(),phase=useRef(new Animated.Value(0)).current;
 const [active,setActive]=useState(AppState.currentState!=='background'),[failed,setFailed]=useState(false);
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>setActive(state==='active'));return()=>sub.remove();},[]);
 useEffect(()=>{
  if(reduced||!active||!enabled||failed){phase.stopAnimation();phase.setValue(0);return;}
  const animation=Animated.loop(Animated.sequence([
   Animated.timing(phase,{toValue:1,duration:430,easing:Easing.out(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),
   Animated.timing(phase,{toValue:0,duration:430,easing:Easing.in(Easing.cubic),useNativeDriver:Platform.OS!=='web'}),
  ]));animation.start();return()=>animation.stop();
 },[reduced,active,enabled,failed,phase]);
 return <View testID={loading?"docen-brand-loading":"docen-brand-motion"} accessible accessibilityRole={loading?"progressbar":"image"} accessibilityLabel={label} accessibilityState={loading?{busy:true}:undefined} pointerEvents="none" style={{width:size,height:size,backgroundColor:'transparent'}}>
  {reduced||failed?<BrandMark size={size} cutout decorative/>:<><Image testID="loading-platform" source={require('../assets/brand/docen-loading-base.png')} resizeMode="contain" style={{width:size,height:size}} onError={()=>setFailed(true)}/><Animated.Image testID="loading-bouncing-ball" source={require('../assets/brand/docen-loading-ball.png')} resizeMode="contain" onError={()=>setFailed(true)} style={{position:'absolute',width:size*.36,height:size*.36,left:size*.32,top:size*.07,transform:[{translateY:phase.interpolate({inputRange:[0,1],outputRange:[size*.10,-size*.06]})}]}}/></>}
 </View>;
}

export function BrandLoading(props:BrandLoadingProps){return <BrandBounce {...props} loading/>;}
export function BrandMotion({active=true,...props}:BrandLoadingProps&{active?:boolean}){return <BrandBounce label="docen" {...props} loading={false} enabled={active}/>;}

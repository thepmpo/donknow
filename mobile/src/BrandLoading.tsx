import React,{useEffect,useState} from 'react';
import {AppState,StyleSheet,View} from 'react-native';
import {VideoView,useVideoPlayer} from 'expo-video';
import {BrandMark} from './BrandMark';
import {useReducedMotion} from './motion';
import type {BrandLoadingProps} from './BrandLoading.types';
function LoadingMovie({size}:{size:number}){
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 const player=useVideoPlayer(require('../assets/brand/docen-loading.mp4'),p=>{p.loop=true;p.muted=true;p.volume=0;if(AppState.currentState==='active')p.play();});
 useEffect(()=>{
  const status=player.addListener('statusChange',e=>{if(e.status==='error')setFailed(true);});
  const app=AppState.addEventListener('change',state=>{if(state==='active')player.play();else player.pause();});
  return()=>{status.remove();app.remove();};
 },[player]);
 return <View pointerEvents="none" style={{width:size,height:size,borderRadius:size*.18,overflow:'hidden',backgroundColor:'#fff'}}><BrandMark size={size} decorative/>{!failed&&<VideoView player={player} nativeControls={false} contentFit="contain" allowsPictureInPicture={false} allowsVideoFrameAnalysis={false} onFirstFrameRender={()=>setReady(true)} style={[StyleSheet.absoluteFill,{opacity:ready?1:0}]}/>}</View>;
}
export function BrandLoading({size=96,label='불러오는 중'}:BrandLoadingProps){
 const reduced=useReducedMotion();
 return <View testID="docen-brand-loading" accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{busy:true}}>{reduced?<BrandMark size={size} decorative/>:<LoadingMovie size={size}/>}</View>;
}

import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {Asset} from 'expo-asset';
import {BrandMark} from './BrandMark';
import {useReducedMotion} from './motion';
import type {BrandLoadingProps} from './BrandLoading.types';
const movie=Asset.fromModule(require('../assets/brand/docen-loading.mp4')).uri;
export function BrandLoading({size=96,label='불러오는 중'}:BrandLoadingProps){
 const reduced=useReducedMotion(),video=useRef<HTMLVideoElement>(null),[failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{if(reduced||failed)return;const el=video.current;if(!el)return;const update=()=>{if(document.hidden)el.pause();else void el.play().catch(()=>setFailed(true));};update();document.addEventListener('visibilitychange',update);return()=>{document.removeEventListener('visibilitychange',update);el.pause();};},[reduced,failed]);
 return <View testID="docen-brand-loading" accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{busy:true}} style={{width:size,height:size,borderRadius:size*.18,overflow:'hidden',backgroundColor:'#fff'}}><BrandMark size={size} decorative/>{!reduced&&!failed&&<video ref={video} src={movie} muted loop autoPlay playsInline preload="metadata" aria-hidden="true" onError={()=>setFailed(true)} onPlaying={()=>setReady(true)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',opacity:ready?1:0,pointerEvents:'none'}}/>}</View>;
}

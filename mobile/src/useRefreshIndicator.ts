import {useCallback,useEffect,useRef,useState} from 'react';
// Only the visual wait is bounded. The request keeps its original lifecycle and
// applies late results through the existing owner/revision guards.
export const REFRESH_INDICATOR_LIMIT=2800;
export function useRefreshIndicator(refreshing:boolean){
 const [visible,setVisible]=useState(false),[expired,setExpired]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 const end=useCallback(()=>{if(timer.current)clearTimeout(timer.current);setVisible(false);},[]);
 const begin=useCallback(()=>{if(timer.current)clearTimeout(timer.current);setExpired(false);setVisible(true);timer.current=setTimeout(()=>{setVisible(false);setExpired(true);},REFRESH_INDICATOR_LIMIT);},[]);
 useEffect(()=>{if(refreshing)begin();else end();return()=>{if(timer.current)clearTimeout(timer.current);};},[refreshing,begin,end]);
 return {visible,expired,begin};
}

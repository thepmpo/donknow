import React,{createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
const Context=createContext({blocked:false,block:()=>()=>{}});
/** Each presented surface owns a scope. A modal blocks its parent, not itself. */
export function SurfaceInteractionProvider({children}:{children:React.ReactNode}){
 const [layers,setLayers]=useState<symbol[]>([]);
 const block=useCallback(()=>{const id=Symbol();setLayers(old=>[...old,id]);return()=>setLayers(old=>old.filter(layer=>layer!==id));},[]);
 const value=useMemo(()=>({blocked:layers.length>0,block}),[layers.length,block]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useSurfaceBlocked=()=>useContext(Context).blocked;
export function useBlockParentSurface(visible:boolean,exitMs:number){
 const {block}=useContext(Context),release=useRef<(()=>void)|null>(null);
 useLayoutEffect(()=>{if(visible){release.current??=block();return;}if(!release.current)return;const timer=setTimeout(()=>{release.current?.();release.current=null;},exitMs);return()=>clearTimeout(timer);},[visible,exitMs,block]);
 useEffect(()=>()=>{release.current?.();release.current=null;},[]);
}

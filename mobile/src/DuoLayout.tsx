import React, { createContext, useContext, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import { hasDuoCapability, readDuoGeometry } from './duo-layout';
import type { DuoGeometry } from './duo-layout';
import {duoSceneLayout} from './duo-layout';
import {DuoChromeProvider} from './DuoChrome';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const DuoLayout = createContext(false);
export function useDuoTrailingNavigation() { return useContext(DuoLayout); }
type ObserverProps = ViewProps & { onGeometryChange: (event: NativeSyntheticEvent<unknown>) => void };
// Expo Go/older binaries have no module: normal navigation stays available without a crash.
const NativeObserver = Platform.OS === 'ios' && requireOptionalNativeModule('DuckduckDuo')
  ? requireNativeViewManager<ObserverProps>('DuckduckDuo') : null;

/** Presentation-only seam used by deterministic resize fixtures; no URL/device-size test switch. */
export function DuoLayoutFrame({ children, geometry, enabled, onLayout,workspace=true,ready=true,fallbackInsets={top:0,left:0,right:0,bottom:0} }: {
  children: React.ReactNode; geometry: DuoGeometry | null; enabled: boolean; onLayout?: ViewProps['onLayout'];workspace?:boolean;ready?:boolean;fallbackInsets?:{top:number;left:number;right:number;bottom:number};
}) {
  const scene = useMemo(() => enabled && geometry ? duoSceneLayout(geometry,workspace) : null, [enabled,geometry,workspace]);
  const frame=scene?.body;
  return <DuoLayout.Provider value={enabled}>
    <View style={styles.surface} onLayout={onLayout} testID={enabled ? 'duo-layout-surface' : 'standard-layout-surface'}>
      <DuoChromeProvider scene={scene} ready={ready}><View style={[styles.content,frame?{position:'absolute',left:frame.x,top:frame.y,width:frame.width,height:frame.height,flex:0}:{paddingTop:fallbackInsets.top,paddingLeft:fallbackInsets.left,paddingRight:fallbackInsets.right}]} testID="duo-safe-content">{children}</View></DuoChromeProvider>
    </View>
  </DuoLayout.Provider>;
}

/** Native observer and content share a parent; every Modal gets its own coordinate space. */
export function DuoSafeSurface({ children,workspace=false }: { children: React.ReactNode;workspace?:boolean }) {
  const insets=useSafeAreaInsets();
  const [geometry,setGeometry]=useState<DuoGeometry|null>(null);
  const enabled=hasDuoCapability(Platform.OS,geometry);
  return <View style={styles.surface}>
    {NativeObserver && <NativeObserver pointerEvents="none" style={StyleSheet.absoluteFill} onGeometryChange={event=>setGeometry(readDuoGeometry(event.nativeEvent))} />}
    <DuoLayoutFrame geometry={geometry} enabled={enabled} workspace={workspace} fallbackInsets={insets} ready={!NativeObserver||!!geometry}>{children}</DuoLayoutFrame>
  </View>;
}
const styles=StyleSheet.create({surface:{flex:1,minHeight:0,minWidth:0},content:{flex:1,minHeight:0,minWidth:0}});

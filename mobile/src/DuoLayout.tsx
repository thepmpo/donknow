import React, { createContext, useContext, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { NativeSyntheticEvent, ViewProps } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import { duoSafeFrame, hasDuoCapability, readDuoGeometry } from './duo-layout';
import type { DuoGeometry } from './duo-layout';

const DuoLayout = createContext(false);
export function useDuoTrailingNavigation() { return useContext(DuoLayout); }
type ObserverProps = ViewProps & { onGeometryChange: (event: NativeSyntheticEvent<unknown>) => void };
// Expo Go/older binaries have no module: normal navigation stays available without a crash.
const NativeObserver = Platform.OS === 'ios' && requireOptionalNativeModule('DuckduckDuo')
  ? requireNativeViewManager<ObserverProps>('DuckduckDuo') : null;

/** Presentation-only seam used by deterministic resize fixtures; no URL/device-size test switch. */
export function DuoLayoutFrame({ children, geometry, enabled, onLayout }: {
  children: React.ReactNode; geometry: DuoGeometry | null; enabled: boolean; onLayout?: ViewProps['onLayout'];
}) {
  const frame = useMemo(() => enabled && geometry ? duoSafeFrame(geometry) : null, [enabled,geometry]);
  return <DuoLayout.Provider value={enabled}>
    <View style={styles.surface} onLayout={onLayout} testID={enabled ? 'duo-layout-surface' : 'standard-layout-surface'}>
      <View style={[styles.content, frame && {position:'absolute',left:frame.x,top:frame.y,width:frame.width,height:frame.height,flex:0}]} testID="duo-safe-content">{children}</View>
    </View>
  </DuoLayout.Provider>;
}

/** Native observer and content share a parent; every Modal gets its own coordinate space. */
export function DuoSafeSurface({ children }: { children: React.ReactNode }) {
  const [geometry,setGeometry]=useState<DuoGeometry|null>(null);
  const enabled=hasDuoCapability(Platform.OS,geometry);
  return <View style={styles.surface}>
    {NativeObserver && <NativeObserver pointerEvents="none" style={StyleSheet.absoluteFill} onGeometryChange={event=>setGeometry(readDuoGeometry(event.nativeEvent))} />}
    <DuoLayoutFrame geometry={geometry} enabled={enabled}>{children}</DuoLayoutFrame>
  </View>;
}
const styles=StyleSheet.create({surface:{flex:1,minHeight:0,minWidth:0},content:{flex:1,minHeight:0,minWidth:0}});

import React from 'react';

import {Animated} from 'react-native';
import type {LiftPreviewProps,RowGestureProps} from './todo-gesture-types';

// React Native Web handles pointer input through the row's responder.
export function TodoGestureRoot({children}:{children:React.ReactNode}) {return <>{children}</>;}
export function TodoGestureScroll({children}:{children:React.ReactElement}) {return children;}
export function TodoGestureRow({children}:RowGestureProps) {return children;}

export function TodoLiftScope({children}:{children:React.ReactNode}) {return <>{children}</>;}
export function TodoLiftPreview({testID='todo-drag-preview',style,children,fallbackPosition,fallbackScale}:LiftPreviewProps) {
  return <Animated.View pointerEvents="none" aria-hidden importantForAccessibility="no-hide-descendants" testID={testID} style={[style,{transform:[{translateX:fallbackPosition.x},{translateY:fallbackPosition.y},{scale:fallbackScale}]}]}>
    {children}
  </Animated.View>;
}

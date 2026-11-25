import React from 'react';

import type {RowGestureProps} from './todo-gesture-types';

// React Native Web handles pointer input through the row's responder.
export function TodoGestureRoot({children}:{children:React.ReactNode}) {return <>{children}</>;}
export function TodoGestureScroll({children}:{children:React.ReactElement}) {return children;}
export function TodoGestureRow({children}:RowGestureProps) {return children;}

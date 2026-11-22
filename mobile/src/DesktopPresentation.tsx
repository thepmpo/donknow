import {createContext,useContext} from 'react';
/** Presentation only: API permissions, ownership and action confirmation remain unchanged. */
export const DesktopPresentation=createContext(false);
export const useDesktopPresentation=()=>useContext(DesktopPresentation);

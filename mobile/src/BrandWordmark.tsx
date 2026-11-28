import React from 'react';
import {Text,type StyleProp,type TextStyle} from 'react-native';
export const AI_NAME='docen.t ai';
/** Display-only wordmark; the service name and technical identifiers remain docen. */
export function BrandWordmark({style,accessibilityRole,ai=false}:{style?:StyleProp<TextStyle>;accessibilityRole?:'header';ai?:boolean}){return <Text style={style} accessibilityRole={accessibilityRole} accessibilityLabel={ai?AI_NAME:'docen'}>docen<Text accessible={false} style={{color:'#2366e8'}}>.</Text>{ai?'t ai':null}</Text>;}

import React from 'react';
import {Text,type StyleProp,type TextStyle} from 'react-native';
/** Display-only wordmark; the service name and technical identifiers remain docen. */
export function BrandWordmark({style,accessibilityRole,ai=false}:{style?:StyleProp<TextStyle>;accessibilityRole?:'header';ai?:boolean}){return <Text style={style} accessibilityRole={accessibilityRole} accessibilityLabel={ai?"docen.ai":"docen"}>docen<Text accessible={false} style={{color:'#2366e8'}}>.</Text>{ai?'ai':null}</Text>;}

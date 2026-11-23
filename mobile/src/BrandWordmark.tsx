import React from 'react';
import {Text,type StyleProp,type TextStyle} from 'react-native';
/** Display-only wordmark; the service name and technical identifiers remain docen. */
export function BrandWordmark({style}:{style?:StyleProp<TextStyle>}){return <Text style={style} accessibilityLabel="docen">docen<Text accessible={false} style={{color:'#2366e8'}}>.</Text></Text>;}

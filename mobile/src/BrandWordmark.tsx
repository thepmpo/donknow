import React from 'react';
import {Text,type StyleProp,type TextStyle} from 'react-native';
/** Display-only wordmark; the service name and technical identifiers remain docen. */
export function BrandWordmark({style,accessibilityRole}:{style?:StyleProp<TextStyle>;accessibilityRole?:'header'}){return <Text style={style} accessibilityRole={accessibilityRole} accessibilityLabel="docen">docen<Text accessible={false} style={{color:'#2366e8'}}>.</Text></Text>;}

import React from 'react';
import {
  FlexWidget,
  TextWidget,
  SvgWidget,
} from 'react-native-android-widget';

export function QuickRecordWidget() {
  // Mic icon SVG path (similar to FontAwesome microphone)
  const micSvg = `
    <svg viewBox="0 0 24 24" fill="white">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
    </svg>
  `;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        borderRadius: 24,
      }}
      clickAction="OPEN_URI"
      clickActionData={{
        uri: 'budgetapp://record',
      }}
    >
      {/* Mic Icon Circle */}
      <FlexWidget
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <SvgWidget
          svg={micSvg}
          style={{
            width: 28,
            height: 28,
          }}
        />
      </FlexWidget>

      {/* Record Text */}
      <TextWidget
        text="Record"
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#FFFFFF',
        }}
      />
    </FlexWidget>
  );
}

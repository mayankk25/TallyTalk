import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { QuickRecordWidget } from './QuickRecordWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      if (widgetName === 'QuickRecord') {
        props.renderWidget(<QuickRecordWidget />);
      }
      break;
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}

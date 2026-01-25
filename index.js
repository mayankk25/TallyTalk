import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widgets/widget-task-handler';

// Register the widget task handler for Android (must be before app entry)
registerWidgetTaskHandler(widgetTaskHandler);

// Import the expo-router entry point
import 'expo-router/entry';

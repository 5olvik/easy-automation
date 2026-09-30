Light Guard lets you create room-based automations for lights, switches, doors, and other devices — all configured directly inside the app's settings page. No flows needed. Simply add a Room device, set up your automations with motion sensors, door contacts or switches as triggers, and let the app handle the rest.

The app includes a built-in activity log, hold and override support for temporary pausing, and a Flow action card so you can trigger automation groups from Homey Flows when needed.

This fork includes the Easy Automation master fixes from version 0.1.14 and a House Guard / Power Guard-inspired interface. Overview groups existing automations by room and shows enabled, paused and disabled groups, plus recent events. Active means an automation is enabled; it does not indicate whether its lights are currently on. Connection settings and help are under Settings.

Development: run npm ci, npm test and npm run preview for a local preview using sample data only. Validate with homey app validate --level debug, then install permanently with homey app install. The technical app ID remains no.easy.automation to preserve existing settings, devices and Flows. See NOTICE.md for UI attribution.

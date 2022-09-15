export const HAS_ORIENTATION = 'ondeviceorientation' in window;
export const HAS_ORIENTATION_ABSOLUTE = 'ondeviceorientationabsolute' in window;
export const DEVICEORIENTATION_NEEDS_PERMISSION =
  'DeviceOrientationEvent' in window &&
  'requestPermission' in DeviceOrientationEvent;
export const HAS_WEBKIT_COMPASS_HEADING =
  'DeviceOrientationEvent' in window &&
  'webkitCompassHeading' in DeviceOrientationEvent.prototype;

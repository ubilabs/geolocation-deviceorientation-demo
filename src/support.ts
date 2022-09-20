export const HAS_ORIENTATION = 'ondeviceorientation' in window;
export const HAS_ORIENTATION_ABSOLUTE = 'ondeviceorientationabsolute' in window;
export const HAS_WEBKIT_COMPASS_HEADING =
  'DeviceOrientationEvent' in window &&
  'webkitCompassHeading' in DeviceOrientationEvent.prototype;
export const NEED_DEVICEORIENTATION_PERMISSION =
  'DeviceOrientationEvent' in window &&
  'requestPermission' in DeviceOrientationEvent;

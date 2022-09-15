// these iOS-properties are non-standard and missing from
// typescripts lib.dom.d.ts
interface DeviceOrientationEvent {
  webkitCompassAccuracy?: number;
  webkitCompassHeading?: number;
}

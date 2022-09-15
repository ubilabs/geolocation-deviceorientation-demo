import {
  DEVICEORIENTATION_NEEDS_PERMISSION,
  HAS_ORIENTATION,
  HAS_ORIENTATION_ABSOLUTE,
  HAS_WEBKIT_COMPASS_HEADING
} from './support';
import {eulerAnglesToCompassHeading} from './euler-angles-to-compass-heading';

export class GeolocationService extends EventTarget {
  public latitude: number = NaN;
  public longitude: number = NaN;
  public accuracy: number = NaN;
  public compassHeading: number = NaN;
  public geolocationPermissionState: PermissionState = 'prompt';
  public deviceOrientationPermissionState: PermissionState = 'prompt';

  private watcherId: number = 0;
  private updateScheduled: boolean = false;

  constructor() {
    super();
  }

  /**
   * checks if the user already gave permission to use the geolocation-api
   */
  async queryPermissionsState(): Promise<void> {
    try {
      const {state} = await navigator.permissions.query({name: 'geolocation'});
      this.geolocationPermissionState = state;
    } catch (err) {
      // when the permissions-API isn't available (e.g. Safari prior to 16.0),
      // we have to assume we have to ask.
      this.geolocationPermissionState = 'prompt';
    }
  }

  /**
   * requests all neccessary permissions to use the geolocation-
   * and deviceorientation APIs.
   */
  async requestPermissions(): Promise<void> {
    // not all browsers require a permission to access those events
    if (DEVICEORIENTATION_NEEDS_PERMISSION) {
      this.deviceOrientationPermissionState =
        await DeviceOrientationEvent.requestPermission();
    }

    // there's no way to request permission for geolocation access, requesting
    // a location will trigger the permission-prompt
    try {
      this.geolocationPermissionState = await new Promise<PermissionState>(
        (resolve, reject) => {
          // since we're not interested in the results, we request
          // with a very short timeout and maximum allowable age
          navigator.geolocation.getCurrentPosition(
            () => resolve('granted'),
            err => reject(err),
            {enableHighAccuracy: true, timeout: 100, maximumAge: Infinity}
          );
        }
      );
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          this.geolocationPermissionState = 'denied';
        } else if (err.code === err.TIMEOUT) {
          // if permission isn't granted, the algorithm would terminate
          // way before a timeout occurs, so we can say for sure that
          // permission has been granted.
          this.geolocationPermissionState = 'granted';
        }
        // fixme: is there a better way to handle this?
        else throw err;
      }
    }
  }

  start() {
    this.startGeolocationWatcher();

    if (HAS_ORIENTATION_ABSOLUTE) {
      window.addEventListener(
        'deviceorientationabsolute',
        this.handleDeviceOrientation
      );
    } else if (HAS_ORIENTATION && HAS_WEBKIT_COMPASS_HEADING) {
      window.addEventListener(
        'deviceorientation',
        this.handleDeviceOrientation
      );
    }
  }

  stop() {
    navigator.geolocation.clearWatch(this.watcherId);
    this.watcherId = 0;
  }

  private startGeolocationWatcher() {
    if (this.watcherId !== 0) {
      return;
    }

    this.watcherId = navigator.geolocation.watchPosition(
      position => {
        const {latitude, longitude, accuracy} = position.coords;

        this.latitude = latitude;
        this.longitude = longitude;
        this.accuracy = accuracy;

        this.queueUpdateEvent();
      },
      err => {
        const errorEvent = new CustomEvent('error', {detail: err});
        this.dispatchEvent(errorEvent);
      },
      {enableHighAccuracy: true}
    );
  }

  private handleDeviceOrientation = (ev: DeviceOrientationEvent) => {
    if (!ev.absolute && ev.webkitCompassHeading) {
      this.compassHeading = ev.webkitCompassHeading;
    } else if (ev.absolute) {
      this.compassHeading = eulerAnglesToCompassHeading(
        ev.alpha,
        ev.beta,
        ev.gamma
      );
    }

    this.queueUpdateEvent();
  };

  private queueUpdateEvent() {
    if (this.updateScheduled) return;

    this.updateScheduled = true;
    setTimeout(() => {
      this.updateScheduled = false;
      this.dispatchUpdateEvent();
    }, 50);
  }

  dispatchUpdateEvent() {
    const detail = {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      compassHeading: this.compassHeading
    };
    this.dispatchEvent(new CustomEvent<GeolocationData>('update', {detail}));
  }
}

export type GeolocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  compassHeading: number;
};

// make custom events work with proper typescript typings

interface GeolocationEventMap {
  error: CustomEvent<Error>;
  update: CustomEvent<GeolocationData>;
}

export interface GeolocationService extends EventTarget {
  addEventListener<K extends keyof GeolocationEventMap>(
    type: K,
    listener: (this: GeolocationService, ev: GeolocationEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof GeolocationEventMap>(
    type: K,
    listener: (this: GeolocationService, ev: GeolocationEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

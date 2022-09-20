import {
  HAS_ORIENTATION,
  HAS_ORIENTATION_ABSOLUTE,
  HAS_WEBKIT_COMPASS_HEADING,
  NEED_DEVICEORIENTATION_PERMISSION
} from './support';

import {eulerAnglesToCompassHeading} from './euler-angles-to-compass-heading';

/**
 * The GeolocationService handles the integration with the Geolocation
 * and DeviceOrientationEvent APIs and normalizes the events across
 * different platforms.
 *
 * Usage:
 *
 *     const service = new GeolocationService();
 *
 *     // check initial permissions if possible:
 *     await service.queryPermissionsState();
 *     console.log(service.geolocationPermissionState); // 'prompt', 'granted', or 'denied'
 *
 *     // to request the required permissions (has to be called when
 *     // handling a trusted event)
 *     await service.requestPermissions()
 *
 *     // start the location watcher
 *     service.start();
 *
 *     // receive events
 *     service.addEventListener('update', ev => console.log(ev.details));
 *     service.addEventListener('error', ev => console.log(ev.details));
 *
 *     // stop the location-watcher
 *     service.stop();
 */
export class GeolocationService extends EventTarget {
  // these properties store the last seen values for both APIs
  public latitude: number = NaN;
  public longitude: number = NaN;
  public accuracy: number = NaN;
  public compassHeading: number = NaN;

  // permission-state for geolocation and deviceorientation
  public geolocationPermissionState: PermissionState = 'prompt';
  public deviceOrientationPermissionState: PermissionState = 'prompt';

  private watcherId: number = 0;
  private updateScheduled: boolean = false;

  constructor() {
    super();
  }

  /**
   * Checks if the user already gave permission to use the geolocation-api.
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

    // there's no permissions-API for deviceorientation events, so it's
    // always prompt unless the requestPermission method isn't implemented.
    if (!NEED_DEVICEORIENTATION_PERMISSION) {
      this.deviceOrientationPermissionState = 'granted';
    }
  }

  /**
   * Requests all neccessary permissions to use the geolocation-
   * and deviceorientation APIs.
   */
  async requestPermissions(): Promise<void> {
    // not all browsers require a permission to access those events
    try {
      this.deviceOrientationPermissionState =
        await DeviceOrientationEvent.requestPermission();
    } catch (err) {
      this.deviceOrientationPermissionState = 'granted';
    }

    // there's no way to request permission for geolocation access, requesting
    // a location will trigger the permission-prompt
    this.geolocationPermissionState = await new Promise<PermissionState>(
      (resolve, reject) => {
        // since we're not interested in the results, we request
        // with a very short timeout and maximum allowable age
        navigator.geolocation.getCurrentPosition(
          () => resolve('granted'),
          err => {
            if (!(err instanceof GeolocationPositionError)) {
              reject(err);
              return;
            }

            if (err.code === err.PERMISSION_DENIED) {
              resolve('denied');
            } else if (err.code === err.TIMEOUT) {
              // when a timeout occurs, we know that the permission had been
              // granted, otherwise we would get the 'permission denied' error.
              resolve('granted');
            }
          },
          {enableHighAccuracy: true, timeout: 100, maximumAge: Infinity}
        );
      }
    );
  }

  /**
   * Starts the geolocation watcher and begins sending out update-events.
   */
  start() {
    this.startGeolocationWatcher();
    this.bindDeviceOrientationEvents();
  }

  /**
   * Stops the geolocation watcher.
   */
  stop() {
    window.removeEventListener(
      'deviceorientation',
      this.handleDeviceOrientation
    );
    window.removeEventListener(
      'deviceorientationabsolute',
      this.handleDeviceOrientation
    );

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

  private bindDeviceOrientationEvents() {
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

  private dispatchUpdateEvent() {
    const detail = {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      compassHeading: this.compassHeading
    };
    this.dispatchEvent(new CustomEvent<GeolocationData>('update', {detail}));
  }
}

/**
 * The GeolocationData type is used in the update-events.
 */
export type GeolocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
  compassHeading: number;
};

// everything below is just to make our custom events work with proper typings

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

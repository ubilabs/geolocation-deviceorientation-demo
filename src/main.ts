import {loadMapsApi} from './load-maps-api';
import {GeolocationMarker} from './geolocation-marker';
import {compassHeading} from './compass-heading';

const infoPanel = document.querySelector('.info') as HTMLElement;
const button = infoPanel.querySelector('button') as HTMLElement;

declare global {
  interface DeviceOrientationEvent {
    webkitCompassAccuracy?: number;
    webkitCompassHeading?: number;
  }
}

async function main() {
  await loadMapsApi({
    key: import.meta.env.GOOGLE_MAPS_API_KEY
  });

  const map = new google.maps.Map(
    document.querySelector('#map') as HTMLElement,
    {
      center: {lat: 53.55, lng: 10},
      zoom: 12,
      gestureHandling: 'greedy',
      mapId: '3fec513989decfcd'
    }
  );

  const marker = new GeolocationMarker();
  marker.setMap(map);

  button.addEventListener('click', () => {
    infoPanel.style.display = 'none';

    startGeolocationUpdates(marker);
    startOrientationUpdates(marker);
  });
}

function startGeolocationUpdates(marker: GeolocationMarker) {
  navigator.geolocation.watchPosition(
    position => {
      console.log('geolocation', position.coords);
      marker.position = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      marker.accuracy = position.coords.accuracy;
    },
    err => {
      throw err;
    },
    {enableHighAccuracy: true}
  );
}

async function startOrientationUpdates(marker: GeolocationMarker) {
  if ('requestPermission' in DeviceOrientationEvent) {
    const res = await DeviceOrientationEvent.requestPermission();

    if (res !== 'granted') {
      throw new Error('failed to get permission');
    }
  }

  if ('ondeviceorientationabsolute' in window) {
    window.addEventListener('deviceorientationabsolute', ev => {
      marker.heading = compassHeading(ev.alpha, ev.beta, ev.gamma);
    });
  } else if ('ondeviceorientation' in window) {
    window.addEventListener('deviceorientation', ev => {
      if (ev.webkitCompassHeading) marker.heading = ev.webkitCompassHeading;
    });
  } else {
    throw new Error('no deviceorientation events available');
  }
}

main().catch(err => alert(err));

export {};

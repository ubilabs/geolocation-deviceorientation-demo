import {loadMapsApi} from './load-maps-api';
import {GeolocationMarker} from './geolocation-marker';
import {GeolocationService} from './geolocation-service';
import tracking from '@ubilabs/ubilabs-tracking';

const infoPanel = document.querySelector('.info') as HTMLElement;
const button = infoPanel.querySelector('button') as HTMLElement;
const permissionInfoElements: HTMLElement[] = Array.from(
  document.querySelectorAll('.permission-info')
);

// vite specific way to get environment-variables (supplied via
// commandline or a .env file)
const {GOOGLE_MAPS_API_KEY, VITE_TAG_MANAGER_ID} = import.meta.env;

let mapCenterInitiallyUpdated = false;

async function main() {
  tracking(VITE_TAG_MANAGER_ID);

  const mapsApiPromise = loadMapsApi({key: GOOGLE_MAPS_API_KEY});
  const geolocationService = new GeolocationService();

  await geolocationService.queryPermissionsState();
  updatePermissionStateDetails(geolocationService.geolocationPermissionState);

  // wait for Google Maps API to load before continuing
  await mapsApiPromise;

  const marker = new GeolocationMarker();
  const map = await new google.maps.Map(
    document.querySelector('#map') as HTMLElement,
    {
      center: {lat: 48, lng: 7},
      zoom: 5,
      gestureHandling: 'greedy',
      disableDefaultUI: true,
      mapId: '3fec513989decfcd'
    }
  );

  // if the permission had previously been granted, we can immediately
  // start showing the marker
  if (geolocationService.geolocationPermissionState === 'granted') {
    marker.setMap(map);
    geolocationService.start();
  }

  geolocationService.addEventListener('update', ev => {
    const {latitude, longitude, accuracy, compassHeading} = ev.detail;
    const hasValidLocation = !isNaN(latitude) && !isNaN(longitude);

    marker.accuracy = accuracy;
    marker.heading = compassHeading;

    if (hasValidLocation) {
      marker.position = {lat: latitude, lng: longitude};

      if (!mapCenterInitiallyUpdated) {
        mapCenterInitiallyUpdated = true;

        map.setCenter(marker.position);
        map.setZoom(15);
      }
    }
  });

  geolocationService.addEventListener('error', ev => {
    console.log('error occured:', ev.detail);
    marker.setMap(null);
    geolocationService.stop();
  });

  button.addEventListener('click', async () => {
    await geolocationService.requestPermissions();

    updatePermissionStateDetails(geolocationService.geolocationPermissionState);
    if (geolocationService.geolocationPermissionState === 'granted') {
      geolocationService.start();
      marker.setMap(map);
    }
  });
}

function updatePermissionStateDetails(state: PermissionState) {
  for (let el of permissionInfoElements) {
    el.style.display = el.dataset.state === state ? '' : 'none';
  }
}

main().catch(err => alert(err));

export {};

import './style.css';
import 'ol/ol.css';
import redDotUrl from './assets/red-dot.svg';
import blueDotUrl from './assets/blue-dot.svg';

import * as OlSource from 'ol/source';
import * as OlStyle from 'ol/style';
import * as OlLayer from 'ol/layer';
import * as OlProj from 'ol/proj';
import * as OlGeom from 'ol/geom';
// import * as OlSphere from 'ol/Sphere';
import OlFeature from 'ol/Feature';
import OlView from 'ol/View';
import OlMap from 'ol/Map';
import OlCollection from 'ol/Collection';
import type { Coordinate } from 'ol/coordinate';

import MilesApi, { Poi } from './miles-api';
import { DbChargingStations } from './data/charging-stations';

import type { ChargingStation } from './types';

function initializeMap(center: Coordinate, mapDefaultZoom: number) {
  return new OlMap({
    target: "map",
    layers: [
      new OlLayer.Tile({
        source: new OlSource.OSM({
          url: "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        }),
      }),
    ],
    view: new OlView({
      center: OlProj.fromLonLat(center),
      zoom: mapDefaultZoom,
    }),
  });
}

function vectorLayerStyle(imageSrc: string): OlStyle.Style {
  return new OlStyle.Style({
    image: new OlStyle.Icon({
      anchor: [0.5, 0.5],
      anchorXUnits: "fraction",
      anchorYUnits: "fraction",
      src: imageSrc,
    }),
  });
}

function addVectorLayer(map: OlMap, imageSrc: string) {
  const features: OlCollection<OlFeature<OlGeom.Point>> = new OlCollection([]);
  const source = new OlSource.Vector({ features });
  const style = vectorLayerStyle(imageSrc);
  const vectorLayer = new OlLayer.Vector({ source, style });

  map.addLayer(vectorLayer);

  return [features, vectorLayer] as const;
}

function addMapPoint(chargingStationsVectorLayerSource: OlCollection<OlFeature<OlGeom.Point>>, lat: number, lon: number, chargingStation: ChargingStation) {
  const feature = new OlFeature({
    geometry: new OlGeom.Point(OlProj.transform([lon, lat], "EPSG:4326", "EPSG:3857"))
  });
  feature.setProperties({ chargingStation });
  chargingStationsVectorLayerSource.push(feature);
}

function updateChargingStationPoints(chargingStationsVectorLayerSource: OlCollection<OlFeature<OlGeom.Point>>, chargingStations: Map<number, ChargingStation>) {
  console.log("updateChargingStationPoints", chargingStations);
  chargingStationsVectorLayerSource.clear();
  chargingStations.forEach((chargingStation) => {
    addMapPoint(chargingStationsVectorLayerSource, chargingStation.Latitude, chargingStation.Longitude, chargingStation);
  });
}

function poiToChargingStation(poi: Poi): ChargingStation {
  return {
    idCityLayer: poi.idCityLayer,
    Longitude: poi.Longitude,
    Latitude: poi.Latitude,
    Station_Name: poi.Station_Name,
    Station_Address: poi.Station_Address
  };
}

async function fetchChargingStationsAround(lon: number, lat: number, chargingStations: Map<number, ChargingStation>) {
  MilesApi.Vehicles(lon, lat).then(response => {
    response.Data.pois.forEach((poi) => {
      if (poi.idCityLayerType === "EV_CHARGING_STATION") {
        poiToChargingStation(poi);
        chargingStations.set(poi.idCityLayer, poi);
      }
    });
  });
}

// Given 2 lat/lon points spanning a rect (upper left and lower right), iterate over a grid of points spaced 5km apart.
// remember that the longitude is not constant but a function of the latitude
// function* gridPoints(upperLeft: [number, number], lowerRight: [number, number], spacingMeters = 5000) {
//   const latitudeStep = spacingMeters / 110574;
//   const [lon1, lat1] = upperLeft;
//   const [lon2, lat2] = lowerRight;

//   const lonDistanceDegree = lon2 - lon1;

//   console.log({ lon1, lat1, lon2, lat2 });
//   for (let lat = lat2; lat <= lat1; lat += latitudeStep) {
//     const lonDistanceMeters = OlSphere.getDistance([lon1, lat], [lon2, lat]);
//     const longitudeFactor = spacingMeters / lonDistanceMeters;
//     const lonStepDegree = lonDistanceDegree * longitudeFactor;
//     for (let lon = lon1; lon <= lon2; lon += lonStepDegree) {
//       yield [lon, lat];
//     }
//   }
// }

// function sleep(t: number) {
//   return new Promise<void>(r => {
//     setTimeout(r, t);
//   });
// }

async function init() {
  const initialLon = 10.008544921874998;
  const initialLat = 53.57416149700879;
  const mapDefaultZoom = 10;
  const chargingStations: Map<number, ChargingStation> = new Map(DbChargingStations.map(c => [c.idCityLayer, c]));

  const map = initializeMap([initialLon, initialLat], mapDefaultZoom);
  const [chargingStationsVectorLayerSource, _chargingStationsVectorLayer] = addVectorLayer(map, redDotUrl);
  const [currentLocationVectorLayerSource, _currentLocationVectorLayer] = addVectorLayer(map, blueDotUrl);

  map.on("singleclick", async function (event) {
    const [lon, lat] = OlProj.toLonLat(event.coordinate);
    console.log(lon, lat);
    // vectorLayer.getFeatures(event.pixel).then((fs) => console.log(fs.map((f) => f.getProperties())));
    fetchChargingStationsAround(lon, lat, chargingStations);
    updateChargingStationPoints(chargingStationsVectorLayerSource, chargingStations);
  });

  updateChargingStationPoints(chargingStationsVectorLayerSource, chargingStations);

  // for (const g of gridPoints([6.880377663797766, 53.792176031139206], [10.334992254695134, 53.099881357257715])) {
  //   await fetchChargingStationsAround(g[0], g[1], chargingStations);
  //   updateChargingStationPoints(vectorSources, chargingStations);
  //   await sleep(500);
  // }

  function initializeGeolocation() {

    function success(position: GeolocationPosition) {
      console.log("success", position);
      const lon = position.coords.longitude;
      const lat = position.coords.latitude;
      currentLocationVectorLayerSource.clear();
      const feature = new OlFeature({
        geometry: new OlGeom.Point(OlProj.transform([lon, lat], "EPSG:4326", "EPSG:3857")),
      });
      currentLocationVectorLayerSource.push(feature);
    }

    function error(...args: unknown[]) {
      console.log("error", args);
    }

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(success, error, { enableHighAccuracy: true });
    } else {
      console.log("navigator.geolocation is not available");
    }
  }

  initializeGeolocation();
}

init();

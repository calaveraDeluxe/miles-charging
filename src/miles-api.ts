import { z } from "zod/v4";

const S = z.string();
const N = z.number();
const B = z.boolean();
const L = z.literal;
const U = z.union;

export const VehicleSize = U([L("L"), L("M"), L("P"), L("S"), L("X")]);

export const DistanceFromMiddlePositionClass = z.object({
  "source": S,
  "parsedValue": N,
});

export const Vehicle = z.object({
  idVehicle: N,
  idCity: S,
  LicensePlate: S,
  VehicleType: S,
  VehicleColor: S,
  VehicleSize: VehicleSize,
  isElectric: B,
  Latitude: N,
  Longitude: N,
  DistanceFromUserPosition: z.union([DistanceFromMiddlePositionClass, N]),
  DistanceFromMiddlePosition: z.union([DistanceFromMiddlePositionClass, N]),
  idVehicleStatus: S,
  GSMCoverage: N,
  SatelliteNumber: N,
  RentalPrice_row1: S,
  RentalPrice_row1unit: S,
  RentalPrice_discounted: S.nullable(),
  RentalPrice_row2: S,
  RentalPrice_discountSource: S.nullable(),
  ParkingPrice: S,
  ParkingPrice_discounted: z.unknown(),
  ParkingPrice_unit: S,
  UnlockFee: S,
  UnlockFee_discounted: z.unknown(),
  UnlockFee_unit: S,
  FuelPct: S,
  FuelLevelIcon: N,
  RemainingRange: S,
  EVPlugged: B,
  JSONFullVehicleDetails: S,
  FVDPrice: S,
  URLVehicleImage: S,
  JSONVehicleDamages: S.nullable(),
  SpecialAirportRate: z.unknown(),
  SpecialRates: z.unknown(),
  ShowSpecialAirportRate: B,
  nDaysRookieDelay: N,
  CityToCityOptions: S,
  PremiumRestrictedTxt: S,
  RookieDelayTxt: S,
  JSONVehicleBanner: S.nullable(),
  ParkingLotInfo: z.unknown(),
});

export const Poi = z.object({
  idCityLayer: N,
  idCityLayerType: S,
  Latitude: N,
  Longitude: N,
  Distance_m: N,
  txtDistance: S,
  NavigateTo: z.unknown(),
  Available: B,
  Station_Name: S.nullable(),
  Station_Address: S.nullable(),
});
export type Poi = z.infer<typeof Poi>;

const Cluster = z.unknown();
const Partner = z.unknown();

const DataResponse = z.object({
  Result: L("OK"),
  ResponseText: S,
  idVehicleBooked: z.unknown(),
  idRide: N.nullable(),
  idVehicleInRide: N.nullable(),
  NearestIdCity: S,
  LivePayment: B,
  TopUpRequired: B,
  userAppVersion: N,
  nFilterElements: N,
  UserInOpsMode: B,
  CloseForceDisplayVehicle: B,
  SpecialAirportRate: z.unknown(),
  SpecialAirportRate_E: z.unknown(),
  SpecialAirportRate_2: z.unknown(),
  SpecialAirportRate_E_2: z.unknown(),
  UsesPPC: B,
  CurrentSubscription: z.unknown(),
  JSONCityAreas: S,
  CityAreasTimestamp: S,
  AdditionalInfo: S
});

const Data = z.object({
  response: DataResponse,
  vehicles: z.array(Vehicle),
  clusters: z.array(Cluster),
  pois: z.array(Poi),
  partners: z.array(Partner),
});

const SuccessfulResponse = z.object({ Result: L("OK"), ResponseText: S.nullable(), Data: Data });

// returns max 30 stations in a radius of ~7.5km
async function Vehicles(longitude: number, latitude: number) {
  const params = {
    deviceKey: "034BD4EC-92D0-49FF-81FC-A74965271F1D",
    latitude,
    longitude,
    latitudeDelta: 0.13594758800703347,
    longitudeDelta: 0.174027219414711,
    userLatitude: 53.57072911460969,
    userLongitude: 9.971597023601872,
    lang: "de",
    FuelLevelFilterMin: 0,
    FuelLevelFilterMax: 100,
    VehicleSizeFilter: "",
    vehicleEngineFilter: "",
    VehicleSeatsFilter: "",
    vehicleModelsFilter: "",
    // 1=zoomed out to 20=zoomed in - 10 and smaller doesn't display chargers
    zoomLevel: 11,
    forceDisplay: 20520,
    showOnlyDiscountedVehicles: 0,
    vehicleTransmissionFilter: "",
    showFuelingStations: 0,
    showChargingStations: 1,
    showMilesPartners: 0,
  };

  const paramsString = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const url = `https://api.app.miles-mobility.com/mobile/Vehicles?${paramsString}`;

  const untypedResponse = await fetch(url).then((r) => r.json());
  const typedResponse = SuccessfulResponse.parse(untypedResponse);
  return typedResponse;
}

export default { Vehicles };

declare namespace google.maps.marker {
  class AdvancedMarkerElement extends google.maps.MVCObject {
    constructor(options?: google.maps.marker.AdvancedMarkerElementOptions);
    position: google.maps.LatLng | google.maps.LatLngLiteral;
    title: string;
    map: google.maps.Map | null;
  }

  interface AdvancedMarkerElementOptions {
    map?: google.maps.Map;
    position?: google.maps.LatLng | google.maps.LatLngLiteral;
    title?: string;
  }
}

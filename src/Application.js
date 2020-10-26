//jshint esversion:8
// eslint-disable-next-line
import React from "react";
//import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import hospitals from "./hospitals.json";
import libraries from "./libraries.json";
import hospitals_mumbai from "./hospital_mumbai_updated.geojson";
import { round } from "@turf/turf";
var turf = require("@turf/turf");
var neo4j=require('neo4j-driver');

//var MapboxDirections = require("@mapbox/mapbox-gl-directions");


var driver = neo4j.driver(
  "bolt://34.201.68.240:37212",
  neo4j.auth.basic("neo4j", "jackboxes-witnesses-attesting")
);
var session=driver.session();

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
class Application extends React.Component {
  // Code from the next few steps will go here



  //constructor to set initial state
  constructor(props) {
    super(props);
    this.state = {
      lng: -84.5,
      lat: 38.05,
      zoom: 12,
    };
  }

  //this function will be invoked right after the app is inserted into the DOM tree of your HTML page
  componentDidMount() {
    //create a map
    const map = new mapboxgl.Map({
      container: this.mapContainer,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [this.state.lng, this.state.lat], //-84.5, 38.05
      zoom: this.state.zoom, //12
    });

    //store the new coordinates
    map.on("move", () => {
      this.setState({
        lng: map.getCenter().lng.toFixed(4),
        lat: map.getCenter().lat.toFixed(4),
        zoom: map.getZoom().toFixed(2),
      });
    });

    //load the data
    map.on("load", function () {
      //add hospitals layer on map load
      map.addLayer({
        id: "hospitals",
        type: "symbol",
        source: {
          type: "geojson",
          data: hospitals,
        },
        layout: {
          "icon-image": "hospital-15",
          "icon-allow-overlap": true,
        },
        paint: {},
      });
      //add mumbai hospitals layer on map load
      map.addLayer({
        id: "hospitals_mumbai",
        type: "symbol",
        source: {
          type: "geojson",
          data: hospitals_mumbai,
        },
        layout: {
          "icon-image": "hospital-15",
          "icon-allow-overlap": true,
        },
        paint: {},
      });
      //add libraries layer on map load
      map.addLayer({
        id: "libraries",
        type: "symbol",
        source: {
          type: "geojson",
          data: libraries,
        },
        layout: {
          "icon-image": "library-15",
        },
        paint: {},
      });
      // adding new source on maploading
      map.addSource("nearest-hospital", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
    });

    //add interactivity on mousemove
    //add popup
    var popup = new mapboxgl.Popup();
    map.on("mousemove", function (e) {
      var features = map.queryRenderedFeatures(e.point, {
        layers: ["hospitals", "libraries", "hospitals_mumbai"],
      });
      if (!features.length) {
        popup.remove();
        return;
      }
      var feature = features[0];

      popup
        .setLngLat(feature.geometry.coordinates)
        .setHTML([feature.properties.Name || feature.properties.Hospital_Name])
        .addTo(map);

      map.getCanvas().style.cursor = features.length ? "pointer" : "";
    });

    //nearest point
    map.on("click", function (e) {
      // Return any features from the 'libraries' layer whenever the map is clicked
      var libraryFeatures = map.queryRenderedFeatures(e.point, {
        layers: ["libraries"],
      });

      if (!libraryFeatures.length) {
        return;
      }
      var libraryFeature = libraryFeatures[0];

      // Using Turf, find the nearest hospital to library clicked
      var nearestHospital = turf.nearestPoint(libraryFeature, hospitals);
      // var nearestHospitalMUmbai = turf.nearestPoint(libraryFeature, hospitals_mumbai);
      // console.log(nearestHospitalMUmbai);

      // If a nearest hospital is found
      if (nearestHospital !== null) {
        // Update the 'nearest-library' data source to include
        // the nearest library
        map.getSource("nearest-hospital").setData({
          type: "FeatureCollection",
          features: [nearestHospital],
        });

        // map.getSource("nearest-hospital").setData({
        //   type: "FeatureCollection",
        //   features: [nearestHospitalMUmbai],
        // });

        // Create a new circle layer from the 'nearest-library' data source
        map.addLayer(
          {
            id: "nearest-hospital",
            type: "circle",
            source: "nearest-hospital",
            paint: {
              "circle-radius": 12,
              "circle-color": "#486DE0",
            },
          },
          "hospitals"
        );

        // map.addLayer(
        //   {
        //     id: "nearest-hospital",
        //     type: "circle",
        //     source: "nearest-hospital",
        //     paint: {
        //       "circle-radius": 12,
        //       "circle-color": "#486DE0",
        //     },
        //   },
        //   "hospitals_mumbai"
        // );
      }
    });

    // Initialize the geolocate control.
    var geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      fitBoundsOptions: {
        zoom: 12,
      },
    });

    // Add the control to the map.
    map.addControl(geolocate);

    // map.on("load", function () {
    //   geolocate.trigger();
    // });

    // Set an event listener that fires
    // when a geolocate event occurs.
    geolocate.on("geolocate", function (data) {
      console.log(data.coords.longitude, data.coords.latitude);
      console.log("A geolocate event has occurred.");
    });

    // Set an event listener that fires
    // when a trackuserlocationend event occurs.
    geolocate.on("trackuserlocationend", function (position) {
      console.log(position.target._lastKnownPosition.coords);
      console.log("A trackuserlocationend event has occurred.");
    });

    //add FullscreenControl constrol to map.
    map.addControl(new mapboxgl.FullscreenControl());

    session
      .run('match(n:Movie) return n ')
      .then(function(records){
        console.log(records);
      })
      .catch(function(err){
        console.log(err);
      })
      

  }

  //display the map
  render() {
    return (
      <div>
        <div className="sidebarStyle">
          <div>
            Longitude: {this.state.lng} | Latitude: {this.state.lat} | Zoom:{" "}
            {this.state.zoom}
          </div>
        </div>
        <div ref={(el) => (this.mapContainer = el)} className="mapContainer" />
      </div>
    );
  }
}

//ReactDOM.render(<Application />, document.getElementById("app"));

export default Application;

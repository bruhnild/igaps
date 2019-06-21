// Inspiré de : https://bl.ocks.org/mastersigat/b57cea9413e03fac92b00a003734d71e

mapboxgl.accessToken = 'pk.eyJ1IjoidmluY2VudGZhdWNoZXIiLCJhIjoiY2p3cDFtMTJ6MXR5cDN5bnNncnYyYmh2MyJ9.88mIlJakYMQRuO7HWezUew'

// Configuration de la carte
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10', // fond de carte
    center: [2.549830, 46.557995 ], // lat/long
    zoom: 5.4, // zoom
    pitch: 10, // Inclinaison
    bearing: 0 // Rotation
});

var hoveredStateId =  null;

map.on('load', function () {addSources();addLayers();loadImages()});

map.on('styledata', function () {addSources();addLayers();loadImages() })
 
function addSources () { 

// maps

map.addSource('dep_maps', {
type: 'vector',
url: 'mapbox://vincentfaucher.bnskcbaw'});
   
// regions   
map.addSource("region", {
"type": "geojson",
'generateId': true,
"data": "./region.geojson"});

// service_deconcentres_etat
// Add a new source from our GeoJSON data and set the
// 'cluster' option to true. GL-JS will add the point_count property to your source data.
map.addSource("data", {
type: "geojson",
// Point to GeoJSON data. 
data: "./service_deconcentres_etat.geojson",
cluster: true,
clusterMaxZoom: 14, // Max zoom to cluster points on
clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
});


}

function addLayers (){
 
var layers = map.getStyle().layers;
 
var labelLayerId;
for (var i = 0; i < layers.length; i++) {
if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
labelLayerId = layers[i].id;
break;
}
}

//maps
    map.addLayer({
        "id": "dep_maps",
        "type": "fill",
        "source": "dep_maps",
        "layout": {'visibility': 'visible'},
        "source-layer": "dep_maps",
        "paint": {
        'fill-opacity':1,
        'fill-outline-color': '#232323',
        'fill-color': ['match', ['get', 'MAPS'], // get the property
            'Centre-Est', '#8dd3c7',  
            'Centre-Sud-Ouest', '#ffffb3', 
            'Ile de France et International', '#bebada',
            'Nord-Est et Outremer', '#fb8072',
            'Ouest', '#80b1d3',
            'Sud', '#fdb462',
            '#fb8072']   //else  
                 }
    }); 

//region

    // The feature-state dependent fill-opacity expression will render the hover effect
    // when a feature's hover state is set to true.
    map.addLayer({
        "id": "state-fills",
        "type": "fill",
        "source": "region",
        "layout": {},
        "paint": {
            "fill-color": "#fff",
            "fill-opacity": ["case",
                ["boolean", ["feature-state", "hover"], false],
                1,
                0.5
            ],

            'fill-outline-color': '#7a7a7a',
            'fill-color': ['match', ['get', 'MAPS'], // get the property
                'Centre-Est', '#8dd3c7',  
                'Centre-Sud-Ouest', '#ffffb3', 
                'Ile de France et International', '#bebada',
                'Nord-Est et Outremer', '#fb8072',
                'Ouest', '#80b1d3',
                'Sud', '#fdb462',
                      '#fff'] //else  
        }
    });

    map.addLayer({
        "id": "state-borders",
        "type": "line",
        "source": "region",
        "layout": {},
        "paint": {
            "line-color": "#7a7a7a",
            "line-width": 2
        }
    });


    // When the user moves their mouse over the state-fill layer, we'll update the
    // feature state for the feature under the mouse.
    map.on("mousemove", "state-fills", function(e) {
        if (e.features.length > 0) {
            if (hoveredStateId) {
                map.setFeatureState({source: 'region', id: hoveredStateId}, { hover: false});
            }
            hoveredStateId = e.features[0].id;
            map.setFeatureState({source: 'region', id: hoveredStateId}, { hover: true});
        }
    });

    // When the mouse leaves the state-fill layer, update the feature state of the
    // previously hovered feature.
    map.on("mouseleave", "state-fills", function() {
        if (hoveredStateId) {
            map.setFeatureState({source: 'region', id: hoveredStateId}, { hover: false});
        }
        hoveredStateId =  null;
    });


        // Configuration fenêtre d'informations
    map.on('mousemove', function (e) {
        var states = map.queryRenderedFeatures(e.point, {
            layers: ['state-fills']
        });
        if (states.length > 0) {
            document.getElementById('pd').innerHTML = 
            '<div style="text-align: center;"><span style="font-family: trebuchet ms, sans-serif;"><font size="3"><b>' + states[0].properties.libelle + '</b></font></span></div><span style="font-family: trebuchet ms, sans-serif;"></span>'
            + '<div style="text-align: center;"><span style="font-family: trebuchet ms, sans-serif;"><font size="4"><font size="2">'+"Coordinateur : " +states[0].properties.NOM_COORD + '</font><b><br></b></font></span></div>'
            +'<div style="text-align: center;"><span style="font-family: trebuchet ms, sans-serif;"><font size="4"><font size="2">'+"Téléphone : "+states[0].properties.contact_tel + '</font><b><br></b></font></span></div>'
            + '<div style="text-align: center;"><span style="font-family: trebuchet ms, sans-serif;"><font size="4"><font size="2">' +"Mail : "+ states[0].properties.contact_mail + '</font><b><br></b></font></span></div>';
        } 
    });


    //Configuration changement des couches


        switchlayer = function (lname) {
            if (document.getElementById(lname + "CB").checked) {
                map.setLayoutProperty(lname, 'visibility', 'visible');
            } else {
                map.setLayoutProperty(lname, 'visibility', 'none');
           }
        }

// service_deconcentres_etat
    map.addLayer({
        id: "clusters",
        type: "circle",
        source: "data",
        filter: ["has", "point_count"],
        paint: {
            // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
            // with three steps to implement three types of circles:
            //   * Blue, 20px circles when point count is less than 100
            //   * Yellow, 30px circles when point count is between 100 and 750
            //   * Pink, 40px circles when point count is greater than or equal to 750
            "circle-color": [
                "step",
                ["get", "point_count"],
                "#51bbd6",
                20,
                "#f1f075",
                30,
                "#f28cb1"
            ],
            "circle-radius": [
                "step",
                ["get", "point_count"],
                10,
                20,
                20,
                30,
                30
            ]
        }
    });

    map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "data",
        filter: ["has", "point_count"],
        layout: {
            "text-field": "{point_count_abbreviated}",
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12
        }
    });

    map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "data",
        filter: ["!", ["has", "point_count"]],
        paint: {
            "circle-color": "#002f89",
            "circle-radius": 4,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
        }
    });

    // inspect a cluster on click
    map.on('click', 'clusters', function (e) {
        var features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        var clusterId = features[0].properties.cluster_id;
        map.getSource('data').getClusterExpansionZoom(clusterId, function (err, zoom) {
            if (err)
                return;

            map.easeTo({
                center: features[0].geometry.coordinates,
                zoom: zoom
            });
        });
    });

    map.on('mouseenter', 'clusters', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', function () {
        map.getCanvas().style.cursor = '';
    });


}

 
//Interactivité CLICK
// When a click event occurs on a feature in the states layer, open a popup at the
// location of the click, with description HTML from its properties.

//cluster pop-up
map.on('click', function (e) {
var features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
if (!features.length) {
return;
}
var feature = features[0];
var popup = new mapboxgl.Popup({ offset: [0, -15] })
.setLngLat(feature.geometry.coordinates)
.setHTML('<h4> <font color="#002f89">'  + feature.properties.nomen_long 
    + '</h6><font color="black"> <img src="https://institutmaritimedeprevention.fr/wp-content/uploads/2017/03/RF_legifrance.jpg"  style="width:30%"> <h6>'
+"Effectifs salariés : " + feature.properties.libtefen + '</h4><p>'
+"Nature juridique : " + feature.properties.libnj + '</p>' )
.addTo(map);
});

map.on('mousemove', function (e) {
var features = map.queryRenderedFeatures(e.point, { layers: ['unclustered-point'] });
map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
});

// Change the cursor to a pointer when the mouse is over the states layer.
map.on('mouseenter', 'unclustered-point', function () {
map.getCanvas().style.cursor = 'pointer';
});
 
// Change it back to a pointer when it leaves.
map.on('mouseleave', 'unclustered-point', function () {
map.getCanvas().style.cursor = '';
});

// Centrer la carte sur les coordonnées des couches 
map.on('click', 'unclustered-point', function (e) {
map.flyTo({center: e.features[0].geometry.coordinates});
});


//region pop-up

// map.on('mousemove', function (e) {
// var features = map.queryRenderedFeatures(e.point, { layers: ['states-fills'] });
// map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';
// });


// Change the cursor to a pointer when the mouse is over the states layer.
map.on('mouseenter', 'states-fills', function () {
map.getCanvas().style.cursor = 'pointer';
});
 
// Change it back to a pointer when it leaves.
map.on('mouseleave', 'states-fills', function () {
map.getCanvas().style.cursor = '';
});



//Ajout échelle cartographique
       
map.addControl(new mapboxgl.ScaleControl({
    maxWidth: 120,
    unit: 'metric'}));
    
//Ajout boutons de controle
    
var nav = new mapboxgl.NavigationControl();
map.addControl(nav, 'top-right');

    

// Config geo-signets


document.getElementById('CE').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [4.670, 46.184], // starting position
    zoom: 6 });
});

document.getElementById('CSO').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [0.965, 46.293], // starting position
zoom: 5.5
 });
});

document.getElementById('IFI').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [2.5053,48.7050], // starting position
    zoom: 7.5});
});

document.getElementById('NEO').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [4.614,49.150], // starting position
    zoom: 6});
});
  
document.getElementById('O').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-1.127, 48.235], // starting position
    zoom: 6});
});
  
document.getElementById('S').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [4.133, 43.775], // starting position
    zoom: 6 });
});

document.getElementById('GLP').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-61.68708419799799, 16.230350494384794], // starting position
    zoom: 6 });
});

document.getElementById('MTQ').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-61.01638793945304, 14.636946201324406], // starting position
    zoom: 6 });
});

document.getElementById('REU').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [55.535833358764705, -21.130833625793457], // starting position
    zoom: 6 });
});

document.getElementById('MYT').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [45.14930534362793, -12.825139522552462], // starting position
    zoom: 6 });
});

document.getElementById('GUY').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-58.965295261933285, 4.849224805831909], // starting position
    zoom: 6 });
});

document.getElementById('NCL').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [165.69984783182034, -21.30640338327305], // starting position
    zoom: 6 });
});

document.getElementById('PYF').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-139.00683144099472, -9.779349327087402], // starting position
    zoom: 6 });
});

document.getElementById('WLF').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-178.1364573221877, -14.283472061157227], // starting position
    zoom: 6 });
});

document.getElementById('SPM').addEventListener('click', function () 
{ map.flyTo({
 pitch: 0,  center: [-56.195556640625, 46.78249931335452], // starting position
    zoom: 6 });
});


//Ajouter un menu pour gérer les couches


function toggleLayer(e ) {
  console.log(e)
        e.preventDefault();
        e.stopPropagation();
                                 
                                 
      toggleableLayers[e.target.id].layers.forEach(function(layer){
        
              var visibility = map.getLayoutProperty(layer, 'visibility');
        if (visibility === 'visible') {
            map.setLayoutProperty(layer, 'visibility', 'none');
            this.className = '';} else {this.className = 'active';
            map.setLayoutProperty(layer, 'visibility', 'visible');}  
        
      })
}

var toggleableLayers = [
  {id:1,label:"Départements",layers:['dep_maps', 'state-fills', 'state-borders']}, 
  {id:2,label:"Cluster",layers:['clusters', 'unclustered-point', 'cluster-count']}                       
  ];

for (var i = 0; i < toggleableLayers.length; i++) {
    var toggleableLayer = toggleableLayers[i];

    var link = document.createElement('a');
    link.href = '#';
    link.className = 'active';
    link.textContent = toggleableLayer.label;
    link.id = i;
    link.onclick = (e)=>toggleLayer(e);                         
                                                    
                              

var layers = document.getElementById('menu');  layers.appendChild(link); }


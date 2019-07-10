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

map.on('load', function () {addSources();addLayers();loadImages(); });

map.on('styledata', function () {addSources();addLayers();loadImages(); });
 
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


// regions   
map.addSource("agents", {
"type": "geojson",
'generateId': true,
"data": "./agents.geojson"});

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


        map.addLayer({
        "id": "agents",
        "type": "circle",
        "source": "agents",
        "layout": {'visibility': 'none'},
        "paint": {
            'circle-color': ['match', ['get', 'coordonnateur'], // get the property
            'Paul MERLIN', '#8dd3c7',  
            'Hélène GUIGNARD', '#ffffb3', 
            'Jean-Louis ROUSSEL', '#bebada',
            'Jean-Christophe PAILLE', 'orange',
            'Jean-Dominique BAYARD', 'pink',
            'Catherine PERRY', 'red',
            '#fb8072'],   //else 
            "circle-radius": 4,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#fff"
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


}

//region pop-up


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

   


//Ajouter un menu pour gérer les couches


function toggleLayer(e) {
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
  {id:2,label:"Établissements",layers:['agents']}                       
  ];

for (var i = 0; i < toggleableLayers.length; i++) {
    var toggleableLayer = toggleableLayers[i];

    var link = document.createElement('a');
    link.href = '#';
    link.className = 'active';
    link.textContent = toggleableLayer.label;
    link.id = i;
    link.onclick = toggleLayer;                         
                                                    
var layers = document.getElementById('menu');  layers.appendChild(link); }



function activeLayer (element){
	console.log("activeLayer", element.classList)
	var currentlayer = element.attributes["data-layer"].value
	var dataName = element.attributes["data-coord"].value
    var stateFilter = ['in', 'coordonnateur', dataName]
    console.log(dataName)
	if (!element.classList.contains("activeLayer")){
		element.classList.add("activeLayer")
		map.setLayoutProperty(currentlayer, 'visibility', 'visible')
		map.setFilter('agents',stateFilter)

	} else {
		element.classList.remove("activeLayer")
		map.setLayoutProperty(currentlayer, 'visibility', 'none')
	}

}


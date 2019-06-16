mapboxgl.accessToken = 'pk.eyJ1IjoibWFraW5hY29ycHVzIiwiYSI6ImNqY3E4ZTNwcTFta3ozMm80d2xzY29wM2MifQ.Nwl_FHrWAIQ46s_lY0KNiQ';
// Configuration de la carte
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10', // fond de carte
    center: [2.7877831156249613, 46.892729 ], // lat/long
    zoom: 5.4, // zoom
    pitch: 10, // Inclinaison
    bearing: 0 // Rotation
});

var hoveredStateId =  null;

map.addControl(new mapboxgl.NavigationControl());

// filters for classifying data into five categories based on magnitude
var mag1 = ["==", ["get", "nature"], 'ddt'];
var mag2 = ["==", ["get", "nature"], 'ddtm'];
var mag3 = ["==", ["get", "nature"], 'ddpp'];
var mag4 = ["==", ["get", "nature"], 'eplefpa'];

// colors to use for the categories
var colors = ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4'];

map.on('load', function () {
    // add a clustered GeoJSON source for a sample set of data
    map.addSource('data', {
        "type": "geojson",
        "data": "./service_deconcentres_etat.geojson",
        "cluster": true,
        "clusterRadius": 80,
        "clusterProperties": { // keep separate counts for each magnitude category in a cluster
            "mag1": ["+", ["case", mag1, 1, 0]],
            "mag2": ["+", ["case", mag2, 1, 0]],
            "mag3": ["+", ["case", mag3, 1, 0]],
            "mag4": ["+", ["case", mag4, 1, 0]]
        }
    });
    // circle and symbol layers for rendering individual data (unclustered points)
    map.addLayer({
        "id": "earthquake_circle",
        "type": "circle",
        "source": "data",
        "filter": ["!=", "cluster", true],
        "paint": {
            "circle-color": ["case",
                mag1, colors[0],
                mag2, colors[1],
                mag3, colors[2],
                mag4, colors[3]],
            "circle-opacity": 0.6,
            "circle-radius": 12
        }
    });
    map.addLayer({
        "id": "earthquake_label",
        "type": "symbol",
        "source": "data",
        "filter": ["!=", "cluster", true],
        "layout": {
            "text-field": ["number-format", ["get", "nature"], {"min-fraction-digits": 1, "max-fraction-digits": 1}],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-size": 10
        },
        "paint": {
            "text-color": ["case", ["<", ["get", "nature"], 3], "black", "white"]
        }
    });

    // objects for caching and keeping track of HTML marker objects (for performance)
    var markers = {};
    var markersOnScreen = {};

    function updateMarkers() {
        var newMarkers = {};
        var features = map.querySourceFeatures('data');

        // for every cluster on the screen, create an HTML marker for it (if we didn't yet),
        // and add it to the map if it's not there already
        for (var i = 0; i < features.length; i++) {
            var coords = features[i].geometry.coordinates;
            var props = features[i].properties;
            if (!props.cluster) continue;
            var id = props.cluster_id;

            var marker = markers[id];
            if (!marker) {
                var el = createDonutChart(props);
                marker = markers[id] = new mapboxgl.Marker({element: el}).setLngLat(coords);
            }
            newMarkers[id] = marker;

            if (!markersOnScreen[id])
                marker.addTo(map);
        }
        // for every marker we've added previously, remove those that are no longer visible
        for (id in markersOnScreen) {
            if (!newMarkers[id])
                markersOnScreen[id].remove();
        }
        markersOnScreen = newMarkers;
    }

    // after the GeoJSON data is loaded, update markers on the screen and do so on every map move/moveend
    map.on('data', function (e) {
        if (e.sourceId !== 'data' || !e.isSourceLoaded) return;

        map.on('move', updateMarkers);
        map.on('moveend', updateMarkers);
        updateMarkers();
    });
});

// code for creating an SVG donut chart from feature properties
function createDonutChart(props) {
    var offsets = [];
    var counts = [props.mag1, props.mag2, props.mag3, props.mag4];
    var total = 0;
    for (var i = 0; i < counts.length; i++) {
        offsets.push(total);
        total += counts[i];
    }
    var fontSize = total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16;
    var r = total >= 1000 ? 50 : total >= 100 ? 32 : total >= 10 ? 24 : 18;
    var r0 = Math.round(r * 0.6);
    var w = r * 2;

    var html = '<svg width="' + w + '" height="' + w + '" viewbox="0 0 ' + w + ' ' + w +
        '" text-anchor="middle" style="font: ' + fontSize + 'px sans-serif">';

    for (i = 0; i < counts.length; i++) {
        html += donutSegment(offsets[i] / total, (offsets[i] + counts[i]) / total, r, r0, colors[i]);
    }
    html += '<circle cx="' + r + '" cy="' + r + '" r="' + r0 +
        '" fill="white" /><text dominant-baseline="central" transform="translate(' +
        r + ', ' + r + ')">' + total.toLocaleString() + '</text></svg>';

    var el = document.createElement('div');
    el.innerHTML = html;
    return el.firstChild;
}

function donutSegment(start, end, r, r0, color) {
    if (end - start === 1) end -= 0.00001;
    var a0 = 2 * Math.PI * (start - 0.25);
    var a1 = 2 * Math.PI * (end - 0.25);
    var x0 = Math.cos(a0), y0 = Math.sin(a0);
    var x1 = Math.cos(a1), y1 = Math.sin(a1);
    var largeArc = end - start > 0.5 ? 1 : 0;

    return ['<path d="M', r + r0 * x0, r + r0 * y0, 'L', r + r * x0, r + r * y0,
        'A', r, r, 0, largeArc, 1, r + r * x1, r + r * y1,
        'L', r + r0 * x1, r + r0 * y1, 'A',
        r0, r0, 0, largeArc, 0, r + r0 * x0, r + r0 * y0,
        '" fill="' + color + '" />'].join(' ');
}
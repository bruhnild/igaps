mapboxgl.accessToken = 'pk.eyJ1IjoibG9iZW5pY2hvdSIsImEiOiJjajdrb2czcDQwcHR5MnFycmhuZmo4eWwyIn0.nUf9dWGNVRnMApuhQ44VSw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/lobenichou/cjto9zfpj00jq1fs7gajbuaas?fresh=true',
  center: [2.7877831156249613, 46.892729 ], // lat/long
  zoom: 5.4, // zoom
  pitch: 10, // Inclinaison
  bearing: 0 // Rotation
});

const colors = ['#8dd3c7','#ffffb3','#bebada','#fb8072'];

// using d3 to create a consistent color scale
const colorScale = d3.scaleOrdinal()
  .domain(["ddt", "ddtm", "ddpp", "eplefpa"])
  .range(colors)

const ddt = ['==', ['get', 'nature'], 'ddt'];
const ddtm = ['==', ['get', 'nature'], 'ddtm'];
const ddpp = ['==', ['get', 'nature'], 'ddpp'];
const eplefpa = ['==', ['get', 'nature'], 'eplefpa'];


map.on('load', () => {
  // add a clustered GeoJSON source for powerplant
  map.addSource('powerplants', {
    'type': 'geojson',
    'data': "./ddt_m.geojson",
    'cluster': true,
    'clusterRadius': 100,
    'clusterProperties': { // keep separate counts for each fuel category in a cluster
      'ddt': ['+', ['case', ddt, 1, 0]],
      'ddtm': ['+', ['case', ddtm, 1, 0]],
      'ddpp': ['+', ['case', ddpp, 1, 0]],
      'eplefpa': ['+', ['case', eplefpa, 1, 0]]
     
    }
  });

  map.addLayer({
    'id': 'powerplant_individual',
    'type': 'circle',
    'source': 'powerplants',
    'filter': ['!=', ['get', 'cluster'], true],
    'paint': {
      'circle-color': ['case',
        ddt, colorScale('ddt'),
        ddtm, colorScale('ddtm'),
        ddpp, colorScale('ddpp'),
        eplefpa, colorScale('eplefpa'), '#ffed6f'],
      'circle-radius': 5
    }
  });

    map.addLayer({
      'id': 'powerplant_individual_outer',
      'type': 'circle',
      'source': 'powerplants',
      'filter': ['!=', ['get', 'cluster'], true],
      'paint': {
        'circle-stroke-color': ['case',
          ddt, colorScale('ddt'),
          ddtm, colorScale('ddtm'),
          ddpp, colorScale('ddpp'),
          eplefpa, colorScale('eplefpa'),'#ffed6f'],
        'circle-stroke-width': 2,
        'circle-radius': 10,
        'circle-color': "rgba(0, 0, 0, 0)"
      }
    });



    let markers = {};
    let markersOnScreen = {};
    let point_counts = [];
    let totals;

    const getPointCount = (features) => {
      features.forEach(f => {
        if (f.properties.cluster) {
          point_counts.push(f.properties.point_count)
        }
      })

      return point_counts;
    };

    const updateMarkers = () => {
       // keep track of new markers
      document.getElementById('key').innerHTML = '';
      let newMarkers = {};
      // get the features whether or not they are visible (https://docs.mapbox.com/mapbox-gl-js/api/#map#queryrenderedfeatures)
      const features = map.querySourceFeatures('powerplants');
      // loop through each feature
      totals = getPointCount(features);
      features.forEach((feature) => {
        const coordinates = feature.geometry.coordinates;
      // get our properties, which include our clustered properties
         const props = feature.properties;
      // continue only if the point is part of a cluster
        if (!props.cluster) {
          return;
        };
      // if yes, get the cluster_id

        const id = props.cluster_id;
      // create a marker object with the cluster_id as a key

        let marker = markers[id];
      // if that marker doesn't exist yet, create it
        if (!marker) {
      // create an html element (more on this later)
          const el = createDonutChart(props, totals);
      // create the marker object passing the html element and the coordinates
          marker = markers[id] = new mapboxgl.Marker({
            element: el
          })
          .setLngLat(coordinates)
        }
      // create an object in our newMarkers object with our current marker representing the current cluster
      
        newMarkers[id] = marker;
      // if the marker isn't already on screen then add it to the map
        if (!markersOnScreen[id]) {
          marker.addTo(map);
        }
      });
      // check if the marker with the cluster_id is already on the screen by iterating through our markersOnScreen object, which keeps track of that
      for (id in markersOnScreen) {
        if (!newMarkers[id]) {
      // if there isn't a new marker with that id, then it's not visible, therefore remove it. 

          markersOnScreen[id].remove();
        }
      }
      // otherwise, it is visible and we need to add it to our markersOnScreen object
        markersOnScreen = newMarkers;
    };

    const createDonutChart = (props, totals) => {
      // create a div element to hold our marker
      const div = document.createElement('div');
      // create our array with our data
      const data = [
        {type: 'ddt', count: props.ddt},
        {type: 'ddtm', count: props.ddtm},
        {type: 'ddpp', count: props.ddpp},
        {type: 'eplefpa', count: props.eplefpa}
       
      ];
      // svg config
      const thickness = 10;
      // this sets the scale for our circle radius and this is why we need the totals. We need to set a mininum and a maximum to define the domain and the range. 
      const scale = d3.scaleLinear()
        .domain([d3.min(totals), d3.max(totals)])
        .range([500, d3.max(totals)])
      // calculate the radius
      const radius = Math.sqrt(scale(props.point_count));
      // calculate the radius of the smaller circle
      const circleRadius = radius - thickness;
      // create the svg
      const svg = d3.select(div)
        .append('svg')
        .attr('class', 'pie')
        .attr('width', radius * 2)
        .attr('height', radius * 2);

      // create a group to hold our arc paths and center
      const g = svg.append('g')
        .attr('transform', `translate(${radius}, ${radius})`);
      // create an arc using the radius above
      const arc = d3.arc()
        .innerRadius(radius - thickness)
        .outerRadius(radius);
      // create the pie for the donut
      const pie = d3.pie()
        .value(d => d.count)
        .sort(null);
      // using the pie and the arc, create our path based on the data
      const path = g.selectAll('path')
        .data(pie(data.sort((x, y) => d3.ascending(y.count, x.count))))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', (d) => colorScale(d.data.type))
      // create the center circle
      const circle = g.append('circle')
        .attr('r', circleRadius)
        .attr('fill', 'rgba(0, 0, 0, 0.7)')
        .attr('class', 'center-circle')
      // create the text
      const text = g
        .append("text")
        .attr("class", "total")
        .text(props.point_count_abbreviated)
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('fill', 'white')

        const infoEl = createTable(props);

        svg.on('click', () => {
          d3.selectAll('.center-circle').attr('fill', 'rgba(0, 0, 0, 0.7)')
          circle.attr('fill', 'rgb(71, 79, 102)')
          document.getElementById('key').innerHTML = '';
          document.getElementById('key').append(infoEl);
        })

      return div;
    }

    const createTable = (props) => {
      const getPerc = (count) => {
        return count/props.point_count;
      };

      const data = [
        {type: 'ddt', perc: getPerc(props.ddt)},
        {type: 'ddtm', perc: getPerc(props.ddtm)},
        {type: 'ddpp', perc: getPerc(props.ddpp)},
        {type: 'oil', perc: getPerc(props.oil)},
        {type: 'eplefpa', perc: getPerc(props.eplefpa)}
        
      ];

      const columns = ['type', 'perc']
      const div = document.createElement('div');
      const table = d3.select(div).append('table').attr('class', 'table')
  		const thead = table.append('thead')
  		const	tbody = table.append('tbody');

  		thead.append('tr')
  		  .selectAll('th')
  		  .data(columns).enter()
  		  .append('th')
		    .text((d) => {
          let colName = d === 'perc' ? '%' : 'Répartition des administrations publiques'
          return colName;
        })

  		const rows = tbody.selectAll('tr')
  		  .data(data.filter(i => i.perc).sort((x, y) => d3.descending(x.perc, y.perc)))
  		  .enter()
  		  .append('tr')
        .style('border-left', (d) => `20px solid ${colorScale(d.type)}`);

  		// create a cell in each row for each column
  		const cells = rows.selectAll('td')
  		  .data((row) => {
  		    return columns.map((column) => {
            let val = column === 'perc' ? d3.format(".2%")(row[column]) : row[column];
  		      return {column: column, value: val};
  		    });
  		  })
  		  .enter()
  		  .append('td')
		    .text((d) => d.value)
        .style('text-transform', 'capitalize')

  	  return div;
    }

    map.on('data', (e) => {
      if (e.sourceId !== 'powerplants' || !e.isSourceLoaded) return;

      map.on('move', updateMarkers);
      map.on('moveend', updateMarkers);
      updateMarkers();
    });
});

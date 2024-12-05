const width = +d3.select('#map-svg').attr("data-width"); 
const height = +d3.select('#map-svg').attr("data-height"); 

// Create the SVG container and set the viewBox
const mapSvg = d3.select("#map-svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "70%")
    .style("background", "none");

const mapGroup = mapSvg.append("g");

// Add the circle for the ocean (centered in the middle)
const oceanCircle = mapGroup.append("circle")
    .attr("id", "map-circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", 150)  // Initial radius
    .attr("fill", "blue");

// Use geoOrthographic projection for a globe-like view
const mapProjection = d3.geoOrthographic()
    .scale(150)  // Adjust scale for the globe size
    .translate([width / 2, height / 2]) // Adjust the translation (center of the map)
    .rotate([0, 0]);  // Starting rotation angle (longitude, latitude)

// Define the path generator
const path = d3.geoPath().projection(mapProjection);

let years = ["value_2000", "value_2001", "value_2002", "value_2003", "value_2004", "value_2005",
    "value_2006", "value_2007", "value_2008", "value_2009", "value_2010", "value_2011", "value_2012", "value_2013", "value_2014", "value_2015",
    "value_2016", "value_2017"];
let currentYear = 17;

// Tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("opacity",0)
    .style("background", "rgba(255, 255, 255, 0.8)")
    .style("padding", "5px")
    .style("border-radius", "4px")
    .style("font-size", "12px");

Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("data_with_coordinates.csv")
]).then(([geoData, csvData]) => {
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Initial map rendering
    function updateMap() {
        mapGroup.selectAll("path").remove();
        mapGroup.selectAll("circle").remove();

        mapGroup.selectAll("path")
            .data(geoData.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => colorScale(d.properties.name))
            .style("stroke", "#fff")
            .style("stroke-width", 0.5)
            .style("opacity", 0.9)
            .on("mouseover", (event, d) => {
                d3.select(event.target)
                    .style("fill", "orange")
                    .style("opacity", 1);

                tooltip.style("visibility", "visible")
                    .html(`Region: ${d.properties.name}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", (event, d) => {
                d3.select(event.target)
                    .style("fill", colorScale(d.properties.name))
                    .style("opacity", 0.9);

                tooltip.style("visibility", "hidden");
            })
            .on("click", (event, d) => {
                const bounds = event.target.getBBox();
                const width = bounds.width;
                const height = bounds.height;
                const dx = bounds.x + width / 2;
                const dy = bounds.y + height / 2;

                const scale = 2;  // Adjust the zoom level as needed
                const zoomTransform = d3.zoomIdentity
                    .translate(width / 2 - dx, height / 2 - dy)
                    .scale(scale);

                mapSvg.transition().duration(500).call(zoom.transform, zoomTransform);

                tooltip.style("visibility", "visible")
                    .html(`Country: ${d.properties.name}<br>Details: Some country details here...`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            });

        mapGroup.selectAll("circle")
            .data(csvData)
            .join("circle")
            .attr("r", 3)
            .attr("transform", d => {
                const [x, y] = mapProjection([+d.X, +d.Y]);
                const [longitude, latitude] = mapProjection.invert([x, y]);
                const isVisible = Math.abs(longitude) <= 90;
                return isVisible ? `translate(${x}, ${y})` : "translate(-10000, -10000)";
            })
            .on("mouseover", (event, d) => {
                tooltip.style("opacity",1)
                    .html(`Location: ${d.geoAreaName}<br>Value: ${d.value_latest_year}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity",0));
    }
    document.addEventListener("countrySelected", function (event) {
        const selectedCountry = event.detail;
    
        // Highlight the selected country
        mapGroup.selectAll("path")
            .style("opacity", d => (d.properties.name === selectedCountry ? 1 : 0.5))  // Highlight the selected country
            .style("fill", d => (d.properties.name === selectedCountry ? "red" : colorScale(d.properties.name)));  // Change color of selected country
    });
    

    // Function to update the map's data based on the selected year
    function updateYearOnMap() {
        // Remove previous circles
        mapGroup.selectAll("circle").remove();

        // Add circles based on the selected year
        mapGroup.selectAll("circle")
            .data(csvData)
            .join("circle")
            .attr("r", 3)
            .attr("transform", d => {
                const [x, y] = mapProjection([+d.X, +d.Y]);
                const isVisible = Math.abs(x) <= 90 && Math.abs(y) <= 90; // Adjust based on map's visibility
                return isVisible ? `translate(${x}, ${y})` : "translate(-10000, -10000)";
            })
            .style("fill", d => {
                // Set the color based on the value for the selected year
                const yearValue = d[`value_${2017 - currentYear}`]; // Adjust the year index as needed
                return yearValue ? d3.scaleLinear().domain([0, 100]).range(["blue", "red"])(yearValue) : "gray";
            })
            .on("mouseover", (event, d) => {
                tooltip.style("opacity", 1)
                    .html(`Location: ${d.geoAreaName}<br>Value: ${d[`value_${2017 - currentYear}`]}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));
    }

    // Syncing year changes between the timeline and map
    function updateMapOnYearChange() {
        updateYearOnMap(); // Update the map based on the selected year
        highlightCountry(""); // Reset country highlighting on year change
    }

    // Event listener for play button to control the animation
    const playButton = d3.select("#play-pause");
    playButton.on("click", function () {
        if (playButton.text() === "Play") {
            playButton.text("Pause");
            // Implement a similar play/pause functionality for the world map if needed
        } else {
            playButton.text("Play");
            clearInterval(interval); // Stop timeline animation
        }
    });

    // Implement slider functionality
    const yearSlider = d3.select("#year-slider");
    yearSlider.on("input", function () {
        currentYear = +this.value; // Set current year based on slider
        updateMapOnYearChange();
    });


    // Initial map update
    updateMap();

    // Mouse drag for panning the globe
    let isDragging = false;
    let lastX, lastY;

    mapSvg.on("mousedown", function (event) {
        isDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
    });

    mapSvg.on("mousemove", function (event) {
        if (isDragging) {
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            const rotation = mapProjection.rotate();
            mapProjection.rotate([rotation[0] - dx * 0.5, rotation[1] + dy * 0.5]);

            // Re-render the map after updating the projection
            updateMap();

            lastX = event.clientX;
            lastY = event.clientY;
        }
    });

    mapSvg.on("mouseup", function () {
        isDragging = false;
    });

    // Reset zoom and rotation on mouse leave
    mapSvg.on("mouseleave", () => {
        mapProjection.rotate([0, 0]);
        updateMap();  // Re-render the map with reset projection
        mapSvg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([0.5, 4])
        .on("zoom", (event) => {
            const { transform } = event;
            mapGroup.attr("transform", transform);
            oceanCircle.attr("transform", `scale(${transform.k})`);
        });

    mapSvg.call(zoom);
});

// Constants and SVG setup
const timelineMargin = { top: 30, right: 50, bottom: 50, left: 50 };
const timelineWidth = 1300 - timelineMargin.left - timelineMargin.right;
const timelineHeight = 600 - timelineMargin.top - timelineMargin.bottom;

const svg = d3.select("#timeline-chart")
    .attr("viewBox", `0 0 ${timelineWidth + timelineMargin.left + timelineMargin.right} ${timelineHeight + timelineMargin.top + timelineMargin.bottom}`)
    .attr("preserveAspectRatio", "xMinYMin meet")
    .append("g")
    .attr("transform", `translate(${timelineMargin.left}, ${timelineMargin.top})`);

// Scales and Axes
const xScale = d3.scaleLinear().domain([1990, 2017]).range([0, timelineWidth]);
const yScale = d3.scaleLinear().domain([0, 500]).range([timelineHeight, 0]);

const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
const yAxis = d3.axisLeft(yScale);

const xAxisGroup = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${timelineHeight})`)
    .call(xAxis);

const yAxisGroup = svg.append("g")
    .attr("class", "y-axis")
    .call(yAxis);

// Gridlines
svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0, ${timelineHeight})`)
    .call(d3.axisBottom(xScale).tickSize(-timelineHeight).tickFormat(""))
    .selectAll("line")
    .attr("stroke", "#e0e0e0")
    .attr("stroke-dasharray", "2,2");

svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).tickSize(-timelineWidth).tickFormat(""))
    .selectAll("line")
    .attr("stroke", "#e0e0e0")
    .attr("stroke-dasharray", "2,2");

// Line Generator
const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);

// Age Groups Configuration
const ageGroups = [
    { key: "< 5", color: "purple" },
    { key: "> 70", color: "red" },
    { key: "5 - 14", color: "blue" },
    { key: "15 - 49", color: "green" },
    { key: "50 - 69", color: "orange" }
];

// Load Data
d3.csv("tuberculosis-death-rates-by-age.csv").then(data => {
    // Process data
    const processedData = ageGroups.map(group => ({
        key: group.key,
        color: group.color,
        values: data.map(d => {
            const year = +d.Year;
            const value = +d[group.key];
            const country = d.Country;

            if (!isNaN(year) && !isNaN(value) && country) {
                return { year, value, country };
            }
        }).filter(Boolean)
    }));

    // Extract World data
    const worldData = processedData.map(group => ({
        ...group,
        values: group.values.filter(d => d.country === "World")
    }));
   


    // Tooltip setup
    const hoverLine = svg.append("line")
        .attr("class", "hover-line")
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4")
        .style("opacity", 0);

    const TMLtooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(255, 255, 255, 0.8)")
        .style("border", "1px solid #ccc")
        .style("border-radius", "4px")
        .style("padding", "10px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    svg.append("rect")
        .attr("class", "hover-area")
        .attr("width", timelineWidth)
        .attr("height", timelineHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", function (event) {
            const mouseX = d3.pointer(event, this)[0];
            const year = Math.round(xScale.invert(mouseX));

            hoverLine
                .attr("x1", xScale(year))
                .attr("y1", 0)
                .attr("x2", xScale(year))
                .attr("y2", timelineHeight)
                .style("opacity", 1);

            TMLtooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 30}px`)
                .style("opacity", 1)
                .html(`<strong>Year:</strong> ${year}<br>${ageGroups.map(group => {
                    const dataPoint = processedData.find(d => d.key === group.key).values.find(v => v.year === year);
                    return `<strong>${group.key}:</strong> ${dataPoint ? dataPoint.value : "N/A"}`;
                }).join("<br>")}`);
        })
        .on("mouseout", function () {
            hoverLine.style("opacity", 0);
            TMLtooltip.style("opacity", 0);
        });
    // Add Legend
const legend = svg.append("g")
.attr("class", "legend")
.attr("transform", `translate(${timelineWidth - 200}, 20)`);

legend.selectAll(".legend-item")
.data(ageGroups)
.enter()
.append("g")
.attr("class", "legend-item")
.attr("transform", (d, i) => `translate(0, ${i * 25})`)
.each(function (d) {
    // Add color box
    d3.select(this).append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d.color)
        .attr("class", "legend-color")
        .style("cursor", "pointer");

    // Add text
    d3.select(this).append("text")
        .attr("x", 30)
        .attr("y", 15)
        .attr("fill", "#000")
        .style("font-size", "14px")
        .text(d.key)
        .style("cursor", "pointer");
});

// Legend Click Behavior
let activeGroup = null;

legend.selectAll(".legend-item")
.on("click", function (event, d) {
    if (activeGroup === d.key) {
        // If clicking the same legend, reset all lines
        activeGroup = null;
        svg.selectAll(".line")
            .style("opacity", 1);
    } else {
        // Set active group and blur others
        activeGroup = d.key;
        svg.selectAll(".line")
            .style("opacity", l => (l.key === d.key ? 1 : 0.2));
    }
})
.on("mouseover", function () {
    d3.select(this).style("cursor", "pointer");
});


    // Line Chart Drawing
    const lines = svg.selectAll(".line-group")
        .data(worldData)
        .enter().append("g")
        .attr("class", "line-group");

    lines.append("path")
        .attr("class", "line")
        .attr("d", d => line(d.values))
        .style("stroke", d => d.color)
        .attr("data-key", d => d.key);

    const resetChart = (filteredData) => {
        xScale.domain([1990, 2017]);
        xAxisGroup.call(xAxis);

        const lineGroups = svg.selectAll(".line-group").data(filteredData);

        lineGroups
            .join("g")
            .attr("class", "line-group")
            .each(function (d) {
                d3.select(this).selectAll(".line")
                    .data([d])
                    .join("path")
                    .attr("class", "line")
                    .attr("d", d => line(d.values))
                    .style("stroke", d.color);
            });
    };

    const playButton = d3.select("#play-pause");
    let currentYear = 1990;
    let interval;

    const updateChart = (endYear, filteredData) => {
        xScale.domain([1990, endYear]);
        xAxisGroup.transition().duration(300).call(xAxis);

        lines.data(filteredData).selectAll(".line")
            .transition()
            .duration(300)
            .attr("d", d => line(d.values.filter(v => v.year <= endYear)));
    };

    const playAnimation = (filteredData) => {
        interval = setInterval(() => {
            currentYear++;
            if (currentYear > 2017) {
                clearInterval(interval);
                playButton.text("Play");
                return;
            }
            updateChart(currentYear, filteredData);
        }, 500);
    };

    playButton.on("click", () => {
        if (playButton.text() === "Play") {
            playButton.text("Pause");
            playAnimation(worldData);
        } else {
            clearInterval(interval);
            playButton.text("Play");
        }
    });

    const yearSlider = d3.select("#year-slider");
    yearSlider.on("input", function () {
        clearInterval(interval);
        playButton.text("Play");
        currentYear = +this.value;
        updateChart(currentYear, worldData);
    });

    const countries = ["World", ...new Set(data.map(d => d.Country))];
    function updateSelectedCountry(countryName) {
        // Dispatch a custom event with the selected country
        const event = new CustomEvent("countrySelected", { detail: countryName });
        document.dispatchEvent(event);
    }
    const countryDropdown = d3.select("#country-dropdown")
        .selectAll("option")
        .data(countries)
        .enter().append("option")
        .attr("value", d => d)
        .text(d => d);

        d3.select("#country-dropdown").on("change", function () {
            const selectedCountry = this.value;
            updateSelectedCountry(selectedCountry);

            const filteredData = processedData.map(group => ({
                ...group,
                values: group.values.filter(d => d.country === selectedCountry)
            }));
        
            resetChart(filteredData);
        });
        
        

    // Initialize chart with World data
    resetChart(worldData);
});

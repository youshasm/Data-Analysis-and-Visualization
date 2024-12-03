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
const yScale = d3.scaleLinear().domain([0, 250]).range([timelineHeight, 0]);
//
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
d3.csv("tb-death-rate-by-year.csv").then(data => {
    const processedData = ageGroups.map(group => ({
        key: group.key,
        color: group.color,
        values: data.map(d => ({
            year: +d.Year,
            value: +d[group.key]
        }))
    }));

    // Plot Lines
    const lines = svg.selectAll(".line-group")
        .data(processedData)
        .enter().append("g")
        .attr("class", "line-group");

    lines.append("path")
        .attr("class", "line")
        .attr("d", d => line(d.values))
        .style("stroke", d => d.color)
        .attr("data-key", d => d.key);
        const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0, ${-timelineMargin.top / 2})`);

// Add the text label
    legend.append("text")
        .attr("x", 0)
        .attr("y", 8)
        .text("Age Group =")
        .style("font-size", "20px")
        .attr("alignment-baseline", "middle");

// Add legend items horizontally
    ageGroups.forEach((group, index) => {
        const legendItem = legend.append("g")
            .attr("transform", `translate(${150 + index * 150}, 0)`) // Adjust starting point and spacing
            .attr("class", "legend-item")
            .style("cursor", "pointer")
            .on("click", function () {
                const isActive = d3.select(this).classed("active");
                d3.selectAll(".line").style("opacity", 0.1);
                d3.selectAll(".legend-item").classed("active", false);

                if (!isActive) {
                    d3.select(this).classed("active", true);
                    svg.select(`.line[data-key="${group.key}"]`).style("opacity", 1);
                } else {
                    d3.selectAll(".line").style("opacity", 1);
                }
            });

        legendItem.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", group.color);

        legendItem.append("text")
            .attr("x", 20)
            .attr("y", 10) // Center text vertically
            .text(group.key)
            .style("font-size", "16px")
            .attr("alignment-baseline", "middle");
    });
    
        // Hover Line and Tooltip
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
    // Right Axis for Relative Values
    const yAxisRightGroup = svg.append("g")
        .attr("class", "y-axis-right")
        .attr("transform", `translate(${timelineWidth}, 0)`);

    const updateRightAxis = (endYear) => {
        const relativeRates = processedData.map(d => {
            const startValue = d.values.find(v => v.year === 1990)?.value || 1; // Fallback to 1
            const endValue = d.values.find(v => v.year === endYear)?.value || 0;
            return ((endValue - startValue) / startValue) * 100; // Percentage change
        });

        // Clear previous labels
        yAxisRightGroup.selectAll("text").remove();

        // Add updated labels
        relativeRates.forEach((rate, i) => {
            const endValue = processedData[i].values.find(v => v.year === endYear)?.value || 0;

            yAxisRightGroup
                .append("text")
                .attr("x", 10)
                .attr("y", yScale(endValue)) // Position by value
                .attr("dy", "0.35em")
                .style("fill", ageGroups[i].color)
                .style("font-size", "12px")
                .text(`${rate.toFixed(1)}%`);
        });
    };

    // Update Chart Function
    const updateChart = (endYear) => {
        xScale.domain([1990, endYear]);
        xAxisGroup.transition().duration(300).call(xAxis);

        lines.selectAll("path")
            .transition()
            .duration(300)
            .attr("d", d => line(d.values.filter(v => v.year <= endYear)));

        updateRightAxis(endYear);
    };

    // Animation Controls
    const playButton = d3.select("#play-pause");
    const yearSlider = d3.select("#year-slider");

    let currentYear = 1990;
    let interval;

    const playAnimation = () => {
        interval = setInterval(() => {
            currentYear++;
            if (currentYear > 2017) {
                clearInterval(interval);
                playButton.text("Play");
                return;
            }
            yearSlider.property("value", currentYear);
            updateChart(currentYear);
        }, 500);
    };

    playButton.on("click", function () {
        if (playButton.text() === "Play") {
            playButton.text("Pause");
            playAnimation();
        } else {
            clearInterval(interval);
            playButton.text("Play");
        }
    });

    yearSlider.on("input", function () {
        clearInterval(interval);
        playButton.text("Play");
        currentYear = +this.value;
        updateChart(currentYear);
    });

    // Initialize with full range
    updateChart(2017);
});

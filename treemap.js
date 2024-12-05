// Load data
d3.json("treemap-dataset.json").then(data => {
    // Get width and height from the SVG element
    const twidth = +d3.select('#treemap-svg').attr("data-width") - 100;
    const theight = +d3.select('#treemap-svg').attr("data-height");

    // Custom tiling function
    function tile(node, x0, y0, x1, y1) {
        d3.treemapBinary(node, 0, 0, twidth, theight);
        for (const child of node.children || []) {
            child.x0 = x0 + child.x0 / twidth * (x1 - x0);
            child.x1 = x0 + child.x1 / twidth * (x1 - x0);
            child.y0 = y0 + child.y0 / theight * (y1 - y0);
            child.y1 = y0 + child.y1 / theight * (y1 - y0);
        }
    }

    // Define color scales
    const stateColors = d3.scaleOrdinal(d3.schemeCategory10);
    const shadeScale = d3.scaleLinear().domain([0, 1]).range([0.7, 1.3]);

    // Compute the hierarchy
    const hierarchy = d3.hierarchy(data)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);

    const root = d3.treemap().tile(tile)(hierarchy);

    // Create scales
    const x = d3.scaleLinear().rangeRound([0, twidth]);
    const y = d3.scaleLinear().rangeRound([0, theight]);

    // Format utilities
    const format = d3.format(",d");
    const name = d => d.ancestors().reverse().map(d => d.data.name).join("/");

    // Create SVG container
    const tsvg = d3.select('#treemap-svg')
        .attr("viewBox", [0.5, -30.5, twidth, theight + 30])
        .attr("width", twidth)
        .attr("height", theight + 30)
        .style("font", "10px sans-serif");

    let group = tsvg.append("g").call(render, root);

    function render(group, root) {
        const children = root.children || [];
        const nodes = children.concat(root);

        const node = group
            .selectAll("g")
            .data(nodes)
            .join("g");

        node.filter(d => d === root || d.children)
            .attr("cursor", "pointer")
            .on("click", (event, d) => d === root ? zoomout(root) : zoomin(d));

        node.append("title")
            .text(d => `${name(d)}\n${format(d.value)}`);

        node.append("rect")
            .attr("fill", d => {
                if (!d.parent) return "#fff"; // Root
                if (!d.children) {
                    const parentColor = stateColors(d.parent.data.name);
                    const valueRatio = d.value / d.parent.value;
                    return d3.color(parentColor).darker(shadeScale(valueRatio));
                }
                return stateColors(d.data.name); // State
            })
            .attr("stroke", "#fff");

        node.append("text")
            .attr("font-weight", d => d === root ? "bold" : null)
            .attr("font-size", d => {
                const boxWidth = x(d.x1) - x(d.x0);
                const boxHeight = y(d.y1) - y(d.y0);
                return `${Math.min(12, Math.max(8, boxWidth / 10, boxHeight / 4))}px`;
            })
            .selectAll("tspan")
            .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g).concat(format(d.value)))
            .join("tspan")
            .attr("x", 3)
            .attr("y", (d, i) => `${1.1 + i * 0.9}em`)
            .text(d => d);

        group.call(position, root);
    }

    function position(group, root) {
        group.selectAll("g")
            .attr("transform", d => d === root ? `translate(0,-30)` : `translate(${x(d.x0)},${y(d.y0)})`)
            .select("rect")
            .attr("width", d => d === root ? twidth : x(d.x1) - x(d.x0))
            .attr("height", d => d === root ? 30 : y(d.y1) - y(d.y0));
    }

    function zoomin(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = tsvg.append("g").call(render, d);

        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        tsvg.transition().duration(750)
            .call(t => group0.transition(t).remove().call(position, d.parent))
            .call(t => group1.transition(t).attrTween("opacity", () => d3.interpolate(0, 1)).call(position, d));
    }

    function zoomout(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = tsvg.insert("g", "*").call(render, d.parent);

        x.domain([d.parent.x0, d.parent.x1]);
        y.domain([d.parent.y0, d.parent.y1]);

        tsvg.transition().duration(750)
            .call(t => group0.transition(t).attrTween("opacity", () => d3.interpolate(1, 0)).remove().call(position, d))
            .call(t => group1.transition(t).call(position, d.parent));
    }

    // Listen for the 'countrySelected' event
    document.addEventListener('countrySelected', (event) => {
        const selectedCountry = event.detail; // Get the selected country
        console.log('Selected Country:', selectedCountry);  // Debugging line
        updateNodeHighlight(selectedCountry);
    });

    // Highlight the nodes based on the selected country
    function updateNodeHighlight(selectedCountry) {
        // Update node styles or highlight based on the selected country
        tsvg.selectAll("g").each(function(d) {
            const node = d3.select(this);
            if (d.data.name === selectedCountry) {
                node.select("rect").attr("stroke", "yellow").attr("stroke-width", 3);
            } else {
                node.select("rect").attr("stroke", "#fff").attr("stroke-width", 1);
            }
        });
    }

}).catch(error => {
    console.error("Error loading or processing data:", error);
});

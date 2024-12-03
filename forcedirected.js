const fwidth = +d3.select('#fdl-svg').attr("data-width"); 
const fheight = +d3.select('#fdl-svg').attr("data-height"); 

const fdlSvg = d3.select("#fdl-svg")
    .attr("viewBox", `0 0 ${fwidth} ${fheight}`)
    .style("width", fwidth + "px")
    .style("height", fheight + "px")
    .style("position", "relative");

const fdlGroup = fdlSvg.append("g");

// Tooltip for showing detailed information
const FDLtooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(255, 255, 255, 0.8)")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "10px")
    .style("pointer-events", "none")
    .style("opacity", 0);

d3.csv("data_with_coordinates.csv").then(data => {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    // Add the central grandparent node
    const grandparentNode = { id: "Earth", group: 0 };
    nodes.push(grandparentNode);

    // Group rows by parentName
    const grouped = d3.group(data, d => d.parentName);
    const parentNames = Array.from(grouped.keys());

    // Add parent nodes and link them to the grandparent node
    parentNames.forEach(parentName => {
        if (!nodeSet.has(parentName)) {
            const parentNode = { id: parentName, group: 1 };
            nodes.push(parentNode);
            nodeSet.add(parentName);
            links.push({ source: "Earth", target: parentName, type: "parent" });
        }
    });

    // Iterate over each group to add child nodes and links
    grouped.forEach((rows, parentName) => {
        const topChildren = rows.sort((a, b) => b.value_latest_year - a.value_latest_year).slice(0, 10);

        topChildren.forEach(row => {
            if (!nodeSet.has(row.geoAreaName)) {
                const childNode = { id: row.geoAreaName, group: 2 };
                nodes.push(childNode);
                nodeSet.add(row.geoAreaName);
            }
            links.push({ source: parentName, target: row.geoAreaName, type: "child" });
        });
    });

    // Create the force simulation with adjusted forces
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id)
            .distance(d => d.type === "child" ? fwidth * 0.03 : fwidth * 0.1)
            .strength(1))
        .force("charge", d3.forceManyBody().strength(-fwidth * 0.3))
        .force("center", d3.forceCenter(fwidth / 2, fheight / 2))
        .on("tick", () => {
            fdlGroup.selectAll(".link")
                .data(links)
                .join("line")
                .attr("class", "link")
                .attr("stroke", d => d.type === "parent" ? "#1f77b4" : "#ff7f0e")
                .attr("stroke-width", fwidth * 0.002)
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            fdlGroup.selectAll(".node")
                .data(nodes)
                .join("circle")
                .attr("class", "node")
                .attr("r", fwidth * 0.02)
                .attr("fill", d => {
                    if (d.group === 0) return "red";
                    if (d.group === 1) return "blue";
                    return "green";
                })
                .attr("cx", d => d.x)
                .attr("cy", d => d.y)
                .on("mouseover", (event, d) => {
                    FDLtooltip.style("opacity", 1)
                        .html(`Location: ${d.id}`)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 10}px`);
                })
                .on("mouseout", () => FDLtooltip.style("opacity", 0))
                .call(drag(simulation));
        });

    function drag(simulation) {
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

    const zoom = d3.zoom()
        .scaleExtent([0.5, 2]) // Adjust zoom levels based on dimensions
        .on("zoom", (event) => {
            fdlGroup.attr("transform", event.transform);
        });

    fdlSvg.call(zoom);
});

const gwidth = 600;
const gheight = 500;

// Select the SVG container
const genSvg = d3.select("#genotype-svg")
    .attr("width", gwidth)
    .attr("height", gheight)
    .attr("viewBox", "0 0 500 400"); // Set the viewBox for the SVG

// Load CSV and process data
d3.csv("genotypes-forced-directed-layout.csv").then(data => {
    // Convert data into nodes and links
    const nodes = data.map(d => ({
        id: +d["Strain ID"],
        status: d["NCD_Status"]
    }));

    const maxDistanceThreshold = 0;// Only link nodes within this distance
    const links = [];
    data.forEach((source, i) => {
        data.slice(i + 1).forEach(target => {
            const distance = Math.abs(+source["match distance #1"] - +target["match distance #1"]);
            if (
                source["best matching database-strain species #1"] === target["best matching database-strain species #1"] &&
                source["best matching database-strain lineage #1"] === target["best matching database-strain lineage #1"] &&
                distance < maxDistanceThreshold
            ) {
                links.push({
                    source: +source["Strain ID"],
                    target: +target["Strain ID"],
                    distance
                });
            }
        });
    });

    // Create the simulation
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(d => 100 + d.distance * 300).strength(0.5))
        .force("charge", d3.forceManyBody().strength(-10)) // Reduce repulsion
        .force("center", d3.forceCenter(gwidth / 2, gheight / 2))
        .force("collision", d3.forceCollide(20)) // Prevent overlap
        .on("tick", ticked);

    // Add links
    const link = genSvg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("stroke-width", 2);

    // Add nodes
    const node = genSvg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 10)
        .attr("fill", d => d.status === "NCD" ? "yellow" : "blue")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    // Add labels
    node.append("title")
        .text(d => `Strain ID: ${d.id}\nStatus: ${d.status}`);

    // Tick function to update positions
    function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
    }

    // Drag functions
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
    
    simulation.alphaDecay(0.02); // Faster decay for stability
    simulation.on("end", () => console.log("Simulation stabilized"));

}).catch(error => console.error("Error loading CSV:", error));

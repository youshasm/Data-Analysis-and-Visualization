const sunwidth = +d3.select('#sunburst-svg').attr("data-width"); 
const sunheight = +d3.select('#sunburst-svg').attr("data-height"); 
const radius = sunwidth / 2;

// Load the data
d3.json("treemap-dataset.json").then(data => {
    // Create the color scale
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

    // Compute the layout
    const hierarchy = d3.hierarchy(data)
        .sum(d => d.value || 0) // Handle potential missing Value fields
        .sort((a, b) => b.value - a.value);
    const root = d3.partition().size([2 * Math.PI, 1])(hierarchy);

    root.each(d => d.current = d);

    // Create the arc generator
    const arc = d3.arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.001)) // Reduced padding for smaller gaps
        .padRadius(radius * 1.5)
        .innerRadius(d => d.y0 * radius)
        .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

    // Create the SVG container
    const sunsvg = d3.select("#sunburst-svg")
        .attr("viewBox", [-sunwidth / 2, -sunheight / 2, sunwidth, sunheight])
        .style("font", "10px sans-serif");

    // Append the arcs
    const arcPath = sunsvg.append("g")
        .selectAll("path")
        .data(root.descendants().slice(1))
        .join("path")
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); })
        .attr("fill-opacity", 1) // Set all paths to fully visible
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current));

    // Add click functionality
    arcPath.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

    // Add titles
    arcPath.append("title")
        .text(d => `${d.ancestors().map(d => d.data.name).reverse().join("/")}\n${d.value}`);

    // Add labels
    const label = sunsvg.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data.name);

    // Add parent circle for zoom-out functionality
    const parent = sunsvg.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

    // Handle zoom on click
    function clicked(event, p) {
        parent.datum(p.parent || root);
    
        root.each(d => d.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        });
    
        const t = sunsvg.transition().duration(750);
    
        // Transition the data on all arcs, even the ones that aren’t visible,
        // so that if this transition is interrupted, entering arcs will start
        // the next transition from the desired position.
        arcPath.transition(t)
            .tween("data", d => {
              const i = d3.interpolate(d.current, d.target);
              return t => d.current = i(t);
            })
          .filter(function(d) {
            return +this.getAttribute("fill-opacity") || arcVisible(d.target);
          })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
            .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none") 
    
            .attrTween("d", d => () => arc(d.current));
    
        label.filter(function(d) {
            return +this.getAttribute("fill-opacity") || labelVisible(d.target);
          }).transition(t)
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
      }

    function arcVisible(d) {
        return true;
    }

    function labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) > 0.02; // Ensured larger labels are visible
    }

    function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius * 1.1; // Increased the factor for better placement
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
});

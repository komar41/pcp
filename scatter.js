const dropdown = document.getElementById("projectionSelect-scatter");
var width = 450, height = 300, margin = { top: 0, right: 0, bottom: 0, left: 0 };
var svg = d3v7.select("svg");
var scatterGroup = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
var brushLayer = svg.append("g");

function updateProjection(projectionType) {
    d3v7.json("test.json").then(rawData => {

        const data = rawData.map(d => ({
            x: d[projectionType][0], // First coordinate
            y: d[projectionType][1]  // Second coordinate
        }));

        const xExtent = d3v7.extent(data, d => d.x);
        const yExtent = d3v7.extent(data, d => d.y);

        // Now you can use extractedData for your d3v7 scatter plot


        // Set dimensions
        

        // Create SVG container
        svg = d3v7.select("#svg-scatter")
            .attr("width", width)
            .attr("height", height);

        // Create a group for margins
        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        // Scales
        const xScale = d3v7.scaleLinear().domain(xExtent).range([0, innerWidth]);
        const yScale = d3v7.scaleLinear().domain(yExtent).range([innerHeight, 0]);

        // Define a clip-path to keep points within bounds
        chart.append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", innerWidth)
            .attr("height", innerHeight);

            scatterGroup.selectAll("circle").remove();

        // Create a zoomable group inside chart
        scatterGroup = chart.append("g")
            .attr("clip-path", "url(#clip)");

        // Create scatter plot points
        const points = scatterGroup.selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", 1)
            .attr("opacity", 0.25)
            .attr("fill", "#7570b3");

        let zoomEnabled = true;
        let lastTransform = d3v7.zoomIdentity; // Store last zoom state

        // Zoom behavior
        const zoom = d3v7.zoom()
            .scaleExtent([1, 10]) // Zoom limits
            .on("zoom", (event) => {
                if (zoomEnabled) {
                    lastTransform = event.transform; // Store current zoom state
                    scatterGroup.attr("transform", lastTransform); // Apply zoom & pan
                }
            });

        brushLayer.selectAll("*").remove(); // Clear previous brush selection
        brushLayer = chart.append("g")
                .attr("class", "brush-scatter");

        // Create brushing behavior
        const brush = d3v7.brush()
            .extent([[0, 0], [innerWidth, innerHeight]]) // Define brush area
            .on("brush", (event) => {
                if (!zoomEnabled) {
                    const selection = event.selection;
                    if (!selection) return;

                    // Rescale x and y domains based on last zoom transform
                    const newXScale = lastTransform.rescaleX(xScale);
                    const newYScale = lastTransform.rescaleY(yScale);

                    const [[x0, y0], [x1, y1]] = selection;

                    // Highlight brushed points using the transformed scales
                    points.classed("selected-scatter", d => {
                        const cx = newXScale(d.x);
                        const cy = newYScale(d.y);
                        return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
                    });
                }
            })
            .on("end", (event) => {
                if (!zoomEnabled && !event.selection) {
                    points.classed("selected-scatter", false); // Clear selection if no brush area
                }
            });

        // Append brushing layer (above scatter plot)
        brushLayer = chart.append("g")
            .attr("class", "brush-scatter");

        // Apply zoom initially
        svg.call(zoom);

        // Checkbox toggle for zoom/brush mode
        document.getElementById("zoomToggle-scatter").addEventListener("change", function () {
            zoomEnabled = this.checked;
            
            if (zoomEnabled) {
                // Enable zoom & remove brush
                brushLayer.call(brush.move, null); // Clear active brushing
                brushLayer.selectAll("*").remove(); // Remove brush from DOM
                svg.call(zoom.transform, lastTransform); // Restore last zoom state
                svg.call(zoom); // Reapply zoom
            } else {
                // Enable brushing & retain zoomed state
                scatterGroup.attr("transform", lastTransform); // Keep last zoom position
                svg.on(".zoom", null); // Disable zoom
                brushLayer.call(brush); // Enable brushing
            }
        });

    });
}
// Initialize with default projection (PCA)
updateProjection("PCA");

// Listen for dropdown changes
dropdown.addEventListener("change", function () {
    updateProjection(this.value);
});
const widthS = 600, heightS = 400;
const numPoints = 1000;

// Generate random dataset
const dataS = d3.range(numPoints).map(() => ({
    x: Math.random() * widthS,
    y: Math.random() * heightS
}));

// Setup canvas
const canvas = document.getElementById("canvas");
canvas.width = widthS;
canvas.height = heightS;
const ctx = canvas.getContext("2d");

// Setup overlay SVG for brushing
const overlaySvg = d3.select("#overlay-svg")
    .attr("width", widthS)
    .attr("height", heightS)
    .style("position", "absolute");

// Draw scatterplot on canvas
function drawPoints(highlightedIndices = new Set()) {
    ctx.clearRect(0, 0, widthS, heightS);
    dataS.forEach((d, i) => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = highlightedIndices.has(i) ? "red" : "steelblue";
        ctx.fill();
    });
}

drawPoints(); // Initial draw

// Brushing behavior
const brushS = d3.brush()
    .extent([[0, 0], [widthS, heightS]])
    .on("brush", ({ selection }) => {
        if (!selection) return;
        const [[x0, y0], [x1, y1]] = selection;

        const selectedIndices = new Set(
            dataS.map((d, i) => (x0 <= d.x && d.x <= x1 && y0 <= d.y && d.y <= y1 ? i : null)).filter(i => i !== null)
        );

        drawPoints(selectedIndices);
    })
    .on("end", ({ selection }) => {
        if (!selection) drawPoints(); // Reset on brush clear
    });

overlaySvg.append("g")
    .attr("class", "brush")
    .call(brushS);


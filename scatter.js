let currentProjection = "PCA";

const btnPCA = document.getElementById("btn-pca");
const btnUMAP = document.getElementById("btn-umap");

btnPCA.addEventListener("click", () => {
  if (currentProjection !== "PCA") {
    currentProjection = "PCA";
    setActiveButton("PCA");
    drawScatter();
  }
});

btnUMAP.addEventListener("click", () => {
  if (currentProjection !== "UMAP") {
    currentProjection = "UMAP";
    setActiveButton("UMAP");
    drawScatter();
  }
});

function setActiveButton(projection) {
  if (projection === "PCA") {
    btnPCA.classList.add("active");
    btnUMAP.classList.remove("active");
  } else {
    btnUMAP.classList.add("active");
    btnPCA.classList.remove("active");
  }
}
const svgElement = document.getElementById("svg-scatter");

let svg_scatter = d3v7.select(svgElement);
let margin = { top: 20, right: 0, bottom: 20, left: 0 };
let lastTransform = d3v7.zoomIdentity; // Remember zoom state globally
let zoomEnabled = true;

// Wrapper to redraw the chart
function drawScatter() {
  // Get current container sizes
  const wrapper = document.querySelector(".wrapper-scatter");
  const container = document.querySelector(".container-scatter");
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight - container.offsetHeight;

  updateProjection(currentProjection, width, height);
}

// Main function to create or update the scatter plot
function updateProjection(projectionType, width, height) {
  d3v7.json("test.json").then((rawData) => {
    svg_scatter.selectAll("*").remove(); // Clear everything before redrawing

    const data = rawData.map((d) => ({
      x: d[projectionType][0],
      y: d[projectionType][1],
    }));

    const xExtent = d3v7.extent(data, (d) => d.x);
    const yExtent = d3v7.extent(data, (d) => d.y);

    svg_scatter.attr("width", width).attr("height", height);

    const chart = svg_scatter
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const pointRadius = 1;
    const xPadding = (xExtent[1] - xExtent[0]) * 0.01;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.01;

    const xScale = d3v7
      .scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([pointRadius, innerWidth - pointRadius]);

    const yScale = d3v7
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight - pointRadius, pointRadius]);

    chart
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight);

    let scatterGroup = chart
      .append("g")
      .attr("clip-path", "url(#clip)")
      .attr("transform", lastTransform);

    const points = scatterGroup
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", pointRadius)
      .attr("opacity", 0.25)
      .attr("fill", "#7570b3");

    let brushLayer = chart.append("g").attr("class", "brush-scatter");

    const zoom = d3v7
      .zoom()
      .scaleExtent([1, 10])
      .on("zoom", (event) => {
        if (zoomEnabled) {
          lastTransform = event.transform;
          scatterGroup.attr("transform", lastTransform);
        }
      });

    const brush = d3v7
      .brush()
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on("brush", (event) => {
        if (!zoomEnabled) {
          const selection = event.selection;
          if (!selection) return;

          const newXScale = lastTransform.rescaleX(xScale);
          const newYScale = lastTransform.rescaleY(yScale);

          const [[x0, y0], [x1, y1]] = selection;

          points.classed("selected-scatter", (d) => {
            const cx = newXScale(d.x);
            const cy = newYScale(d.y);
            return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
          });
        }
      })
      .on("end", (event) => {
        if (!zoomEnabled && !event.selection) {
          points.classed("selected-scatter", false);
        }
      });

    if (zoomEnabled) {
      svg_scatter.call(zoom.transform, lastTransform); // Restore zoom position
      svg_scatter.call(zoom);
    } else {
      svg_scatter.on(".zoom", null); // Disable zoom
      brushLayer.call(brush);
    }

    document
      .getElementById("zoomToggle-scatter")
      .addEventListener("change", function () {
        zoomEnabled = this.checked;

        if (zoomEnabled) {
          brushLayer.call(brush.move, null);
          brushLayer.selectAll("*").remove();
          svg_scatter.call(zoom.transform, lastTransform);
          svg_scatter.call(zoom);
        } else {
          scatterGroup.attr("transform", lastTransform);
          svg_scatter.on(".zoom", null);
          brushLayer.call(brush);
        }
      });
  });
}

// Initial load
drawScatter();

// Listen to dropdown changes
// dropdown.addEventListener("change", drawScatter);

// Debounced resize listener
let resizeTimeout;
window.addEventListener("resize", () => {
  console.log("resizing");
  drawScatter();
});

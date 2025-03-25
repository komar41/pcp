let scatterCurProjection = "PCA";

const scatterBtnPCA = document.getElementById("btn-pca");
const scatterBtnUMAP = document.getElementById("btn-umap");

scatterBtnPCA.addEventListener("click", () => {
  if (scatterCurProjection !== "PCA") {
    scatterCurProjection = "PCA";
    setActiveBtnProjection("PCA");
    drawScatter();
  }
});

scatterBtnUMAP.addEventListener("click", () => {
  if (scatterCurProjection !== "UMAP") {
    scatterCurProjection = "UMAP";
    setActiveBtnProjection("UMAP");
    drawScatter();
  }
});

function setActiveBtnProjection(projection) {
  if (projection === "PCA") {
    scatterBtnPCA.classList.add("active");
    scatterBtnUMAP.classList.remove("active");
  } else {
    scatterBtnUMAP.classList.add("active");
    scatterBtnPCA.classList.remove("active");
  }
}
const svgElementScatter = document.getElementById("svg-scatter");

let svg_scatter = d3v7.select(svgElementScatter);
let marginScatter = { top: 0, right: 0, bottom: 0, left: 0 };
let lastTransformScatter = d3v7.zoomIdentity; // Remember zoom state globally
let zoomEnabledScatter = true;

// Wrapper to redraw the chart
function drawScatter() {
  // Get current container sizes
  const wrapperScatter = document.querySelector(".wrapper-scatter");
  const containerScatter = document.querySelector(".container-scatter");
  const width = wrapperScatter.clientWidth;
  const height = wrapperScatter.clientHeight - containerScatter.offsetHeight;

  updateProjection(scatterCurProjection, width, height);
}

// Main function to create or update the scatter plot
function updateProjection(projectionType, width, height) {
  d3v7.json(dataFiles[currentCategory]).then((rawData) => {
    // console.log(rawData);
    const data = rawData.map((d) => ({
      x: d[projectionType][0],
      y: d[projectionType][1],
      id: d.image_name,
    }));

    const xExtent = d3v7.extent(data, (d) => d.x);
    const yExtent = d3v7.extent(data, (d) => d.y);

    // remove previous scatter plot
    svg_scatter.selectAll("*").remove();

    svg_scatter.attr("width", width).attr("height", height);

    const chart = svg_scatter
      .append("g")
      .attr(
        "transform",
        `translate(${marginScatter.left}, ${marginScatter.top})`
      );

    const innerWidth = width - marginScatter.left - marginScatter.right;
    const innerHeight = height - marginScatter.top - marginScatter.bottom;

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
      .attr("transform", lastTransformScatter);

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
        if (zoomEnabledScatter) {
          lastTransformScatter = event.transform;
          scatterGroup.attr("transform", lastTransformScatter);
        }
      });

    const brush = d3v7
      .brush()
      .extent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on("brush", (event) => {
        if (!zoomEnabledScatter) {
          const selection = event.selection;
          if (!selection) return;

          const newXScale = lastTransformScatter.rescaleX(xScale);
          const newYScale = lastTransformScatter.rescaleY(yScale);

          const [[x0, y0], [x1, y1]] = selection;

          points.classed("selected-scatter", (d) => {
            const cx = newXScale(d.x);
            const cy = newYScale(d.y);
            return x0 <= cx && cx <= x1 && y0 <= cy && cy <= y1;
          });
        }
      })
      .on("end", (event) => {
        if (!zoomEnabledScatter && !event.selection) {
          points.classed("selected-scatter", false);
        }
      });

    if (zoomEnabledScatter) {
      svg_scatter.call(zoom.transform, lastTransformScatter); // Restore zoom position
      svg_scatter.call(zoom);
    } else {
      svg_scatter.on(".zoom", null); // Disable zoom
      brushLayer.call(brush);
    }

    document
      .getElementById("zoomToggle-scatter")
      .addEventListener("change", function () {
        zoomEnabledScatter = this.checked;

        if (zoomEnabledScatter) {
          brushLayer.call(brush.move, null);
          brushLayer.selectAll("*").remove();
          svg_scatter.call(zoom.transform, lastTransformScatter);
          svg_scatter.call(zoom);
        } else {
          scatterGroup.attr("transform", lastTransformScatter);
          svg_scatter.on(".zoom", null);
          brushLayer.call(brush);
        }
      });
  });
}

// Initial load
drawScatter();

// Debounced resize listener
let resizeTimeout;
window.addEventListener("resize", () => {
  // console.log("resizing");
  drawScatter();
});

window.updateScatter = function (selectedData) {
  const selectedIds = new Set(selectedData.map((d) => d.image_name || d.id));

  d3v7
    .selectAll("circle")
    .attr("fill", (d) => {
      return "#7570b3";
    })
    .attr(
      "opacity",
      (d) => (selectedIds.has(d.id) ? 0.25 : 0) // higher opacity for selected
    );
};

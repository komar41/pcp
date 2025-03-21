// Parallel Coordinates
// Copyright (c) 2012, Kai Chang
// Released under the BSD License: http://opensource.org/licenses/BSD-3-Clause

const activeAxes = new Set();

// Initialize all axes on page load
window.onload = function () {
  document.querySelectorAll(".axis-btn-pcp").forEach((btn) => {
    const axis = btn.getAttribute("data-axis-pcp");

    activeAxes.add(axis);
    btn.classList.add("active-axis-pcp");

    // Setup toggle functionality
    btn.addEventListener("click", () => {
      if (activeAxes.has(axis)) {
        remove_axis(axis); // assume function exists
        activeAxes.delete(axis);
        btn.classList.remove("active-axis-pcp");
      } else {
        add_axis(axis);
        activeAxes.add(axis);
        btn.classList.add("active-axis-pcp");
      }
    });
  });
};

var container = document.getElementById("container-pcp");
var width = container.clientWidth,
  height = container.clientHeight - 50;
var m = [30, 0, 10, 0],
  w = width - m[1] - m[3],
  h = height - m[0] - m[2],
  xscale = d3.scale.ordinal().rangePoints([0, w], 1),
  yscale = {},
  dragging = {},
  line = d3.svg.line(),
  axis = d3.svg
    .axis()
    .orient("left")
    .ticks(1 + height / 50),
  data,
  foreground,
  background,
  highlighted,
  dimensions,
  legend,
  render_speed = 50,
  brush_count = 0,
  removed_axes = [],
  jsonData;

// Scale chart and canvas height
d3.select("#chart-pcp").style("height", h + m[0] + m[2] + "px");

d3.selectAll("canvas")
  .attr("width", w)
  .attr("height", h)
  .style("padding", m.join("px ") + "px");

// Foreground canvas for primary view
foreground = document.getElementById("foreground-pcp").getContext("2d");
foreground.globalCompositeOperation = "destination-over";
foreground.strokeStyle = "rgba(0,100,160,0.1)";
foreground.lineWidth = 1.7;
foreground.fillText("Loading...", w / 2, h / 2);

// Highlight canvas for temporary interactions
highlighted = document.getElementById("highlight-pcp").getContext("2d");
highlighted.strokeStyle = "rgba(0,100,160,1)";
highlighted.lineWidth = 4;

// Background canvas
background = document.getElementById("background-pcp").getContext("2d");
background.strokeStyle = "rgba(0,100,160,0.1)";
background.lineWidth = 1.7;

// SVG for ticks, labels, and interactions
var svg = d3
  .select("#overlay-svg-pcp")
  .attr("width", w + m[1] + m[3])
  .attr("height", h + m[0] + m[2])
  .append("g")
  .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

// Load the data and visualization
d3.json("test.json", function (raw_data) {
  // console.log(raw_data);
  // Convert quantitative scales to floats
  data = raw_data.map(function (d) {
    for (var k in d["f_xyz"]) {
      d["f_xyz"][k] = (parseFloat(d["f_xyz"][k]) / 2 + 0.5) * 100;
    }
    return d["f_xyz"];
  });

  // Extract the list of numerical dimensions and create a scale for each.
  xscale.domain(
    (dimensions = d3
      .keys(data[0])
      .filter(function (k) {
        return (
          _.isNumber(data[0][k]) &&
          (yscale[k] = d3.scale
            .linear()
            .domain(
              d3.extent(data, function (d) {
                return +d[k];
              })
            )
            .range([h, 0]))
        );
      })
      .sort())
  );

  // console.log(dimensions);
  // Add a group element for each dimension.
  var g = svg
    .selectAll(".dimension")
    .data(dimensions)
    .enter()
    .append("g")
    .attr("class", "dimension")
    .attr("transform", function (d) {
      return "translate(" + xscale(d) + ")";
    });

  // Add an axis and title.
  g.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0,0)")
    .each(function (d) {
      d3.select(this).call(axis.scale(yscale[d]));
    })
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", function (d, i) {
      return -14;
    })
    .attr("x", 0)
    .attr("class", "label")
    .text(String)
    .append("title")
    .text("Click to invert. Drag to reorder");

  // Add and store a brush for each axis.
  g.append("svg:g")
    .attr("class", "brush")
    .each(function (d) {
      d3.select(this).call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    })
    .selectAll("rect")
    .style("visibility", null)
    .attr("x", -23)
    .attr("width", 36)
    .append("title")
    .text("Drag up or down to brush along this axis");

  g.selectAll(".extent").append("title").text("Drag or resize this filter");

  // Render full foreground
  brush();
});

// render polylines i to i+render_speed
function render_range(selection, i, max, opacity) {
  // console.log(selection);
  selection.slice(i, max).forEach(function (d) {
    path(d, foreground, color(opacity));
  });
}

// Adjusts rendering speed
function optimize(timer) {
  var delta = new Date().getTime() - timer;
  render_speed = Math.max(Math.ceil((render_speed * 30) / delta), 8);
  render_speed = Math.min(render_speed, 300);
  return new Date().getTime();
}

function path(d, ctx, color) {
  if (color) ctx.strokeStyle = color;
  ctx.beginPath();
  var x0 = xscale(0) - 15,
    y0 = yscale[dimensions[0]](d[dimensions[0]]); // left edge
  ctx.moveTo(x0, y0);
  dimensions.map(function (p, i) {
    var x = xscale(p),
      y = yscale[p](d[p]);
    var cp1x = x - 0.88 * (x - x0);
    var cp1y = y0;
    var cp2x = x - 0.12 * (x - x0);
    var cp2y = y;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    x0 = x;
    y0 = y;
  });
  ctx.lineTo(x0 + 15, y0); // right edge
  ctx.stroke();
}

function color(a) {
  // var c = colors[d];
  // console.log(a)
  return "rgba(117,112,179, " + a + ")";
}

function position(d) {
  var v = dragging[d];
  return v == null ? xscale(d) : v;
}

// Handles a brush event, toggling the display of foreground lines.
// TODO refactor
function brush() {
  brush_count++;
  var actives = dimensions.filter(function (p) {
      return !yscale[p].brush.empty();
    }),
    extents = actives.map(function (p) {
      return yscale[p].brush.extent();
    });

  // hack to hide ticks beyond extent
  var b = d3.selectAll(".dimension")[0].forEach(function (element, i) {
    var dimension = d3.select(element).data()[0];
    if (_.include(actives, dimension)) {
      var extent = extents[actives.indexOf(dimension)];
      d3.select(element)
        .selectAll("text")
        .style("font-weight", "bold")
        .style("font-size", "13px")
        .style("display", function () {
          var value = d3.select(this).data();
          return extent[0] <= value && value <= extent[1] ? null : "none";
        });
    } else {
      d3.select(element)
        .selectAll("text")
        .style("font-size", null)
        .style("font-weight", null)
        .style("display", null);
    }
    d3.select(element).selectAll(".label").style("display", null);
  });
  // bold dimensions with label
  d3.selectAll(".label").style("font-weight", function (dimension) {
    if (_.include(actives, dimension)) return "bold";
    return null;
  });

  // Get lines within extents
  var selected = [];
  data.map(function (d) {
    return actives.every(function (p, dimension) {
      return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
    })
      ? selected.push(d)
      : null;
  });

  // console.log(selected);

  if (selected.length < data.length && selected.length > 0) {
    d3.select("#keep-data").attr("disabled", null);
    d3.select("#exclude-data").attr("disabled", null);
  } else {
    d3.select("#keep-data").attr("disabled", "disabled");
    d3.select("#exclude-data").attr("disabled", "disabled");
  }

  // Render selected lines
  paths(selected, foreground, brush_count, true);
}

// render a set of polylines on a canvas
function paths(selected, ctx, count) {
  var n = selected.length,
    i = 0,
    opacity = d3.min([2 / Math.pow(n, 0.3), 1]),
    timer = new Date().getTime();

  shuffled_data = _.shuffle(selected);

  ctx.clearRect(0, 0, w + 1, h + 1);

  // render all lines until finished or a new brush event
  function animloop() {
    if (i >= n || count < brush_count) return true;
    var max = d3.min([i + render_speed, n]);
    render_range(shuffled_data, i, max, opacity);
    i = max;
    timer = optimize(timer); // adjusts render_speed
  }

  d3.timer(animloop);
}

// transition ticks for reordering, rescaling and inverting
function update_ticks(d, extent) {
  // update brushes
  if (d) {
    var brush_el = d3.selectAll(".brush").filter(function (key) {
      return key == d;
    });
    // single tick
    if (extent) {
      // restore previous extent
      brush_el.call(
        (yscale[d].brush = d3.svg
          .brush()
          .y(yscale[d])
          .extent(extent)
          .on("brush", brush))
      );
    } else {
      brush_el.call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    }
  } else {
    // all ticks
    d3.selectAll(".brush").each(function (d) {
      d3.select(this).call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    });
  }

  brush_count++;

  // update axes
  d3.selectAll(".axis").each(function (d, i) {
    // hide lines for better performance
    d3.select(this).selectAll("line").style("display", "none");

    // transition axis numbers
    d3.select(this).transition().duration(720).call(axis.scale(yscale[d]));

    // bring lines back
    d3.select(this)
      .selectAll("line")
      .transition()
      .delay(800)
      .style("display", null);

    d3.select(this)
      .selectAll("text")
      .style("font-weight", null)
      .style("font-size", null)
      .style("display", null);
  });
}

// Rescale to new dataset domain
function rescale() {
  // reset yscales, preserving inverted state
  dimensions.forEach(function (d, i) {
    if (yscale[d].inverted) {
      yscale[d] = d3.scale
        .linear()
        .domain(
          d3.extent(data, function (p) {
            return +p[d];
          })
        )
        .range([0, h]);
      yscale[d].inverted = true;
    } else {
      yscale[d] = d3.scale
        .linear()
        .domain(
          d3.extent(data, function (p) {
            return +p[d];
          })
        )
        .range([h, 0]);
    }
  });

  update_ticks();

  // Render selected data
  paths(data, foreground, brush_count);
}

// Get polylines within extents
function actives() {
  var actives = dimensions.filter(function (p) {
      return !yscale[p].brush.empty();
    }),
    extents = actives.map(function (p) {
      return yscale[p].brush.extent();
    });

  // filter extents and excluded groups
  var selected = [];
  data.map(function (d) {
    return actives.every(function (p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    })
      ? selected.push(d)
      : null;
  });

  return selected;
}

function update_remove() {
  var container = document.getElementById("container-pcp");
  var width = container.clientWidth,
    height = container.clientHeight - 50;

  (w = width - m[1] - m[3]), (h = height - m[0] - m[2]);

  d3.select("#chart-pcp").style("height", h + m[0] + m[2] + "px");

  d3.selectAll("canvas")
    .attr("width", w)
    .attr("height", h)
    .style("padding", m.join("px ") + "px");

  d3.select("svg")
    .attr("width", w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
    .select("g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

  xscale = d3.scale.ordinal().rangePoints([0, w], 1).domain(dimensions);
  dimensions.forEach(function (d) {
    yscale[d].range([h, 0]);
  });

  d3.selectAll(".dimension").attr("transform", function (d) {
    return "translate(" + xscale(d) + ")";
  });
  // update brush placement
  d3.selectAll(".brush").each(function (d) {
    d3.select(this).call(
      (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
    );
  });
  brush_count++;

  // update axis placement
  (axis = axis.ticks(1 + height / 50)),
    d3.selectAll(".axis").each(function (d) {
      d3.select(this).call(axis.scale(yscale[d]));
    });

  // render data
  brush();
}

// scale to window size
window.onresize = function () {
  update_remove();
};

function remove_axis(d) {
  dimensions = _.difference(dimensions, [d]);
  removed_axes.push(d);
  xscale.domain(dimensions);

  // Update the position of remaining axes
  d3.selectAll(".dimension").attr("transform", function (p) {
    return "translate(" + position(p) + ")";
  });

  // Remove the axis corresponding to dimension d
  d3.selectAll(".dimension")
    .filter(function (p) {
      return p === d;
    })
    .remove();

  update_ticks();
  update_dropdown();
  update_remove();
}

function update_dropdown() {
  // console.log(removed_axes);
  var dropdown = d3.select("#axis-dropdown");
  dropdown.selectAll("option").remove();

  dropdown
    .append("option")
    .attr("value", "")
    .attr("disabled", true)
    .attr("selected", true)
    .text("Select an axis");

  removed_axes.forEach(function (axis) {
    dropdown.append("option").attr("value", axis).text(axis);
  });
}

function add_axis(axisName) {
  if (!axisName) return;

  removed_axes = removed_axes.filter((a) => a !== axisName); // Remove from removed list
  dimensions.push(axisName); // Add back to active dimensions
  xscale.domain(dimensions); // Update x-scale

  update_ticks();
  update_dropdown();
  brush();

  // console.log(dimensions);

  // Create a new axis group for the added dimension
  var g = svg.selectAll(".dimension").data(dimensions, (d) => d);

  var newAxis = g
    .enter()
    .append("g")
    .attr("class", "dimension")
    .attr("transform", (d) => "translate(" + xscale(d) + ")");

  newAxis
    .append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0,0)")
    .each(function (d) {
      d3.select(this).call(axis.scale(yscale[d]));
    })
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", -14)
    .attr("x", 0)
    .attr("class", "label")
    .text(String)
    .append("title")
    .text("Click to invert. Drag to reorder");

  // Add brush functionality
  newAxis
    .append("g")
    .attr("class", "brush")
    .each(function (d) {
      d3.select(this).call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    })
    .selectAll("rect")
    .style("visibility", null)
    .attr("x", -23)
    .attr("width", 36)
    .append("title")
    .text("Drag up or down to brush along this axis");

  // **Force reordering of all axes to ensure correct spacing**
  d3.selectAll(".dimension")
    .transition()
    .duration(500)
    .attr("transform", (d) => "translate(" + xscale(d) + ")");
}

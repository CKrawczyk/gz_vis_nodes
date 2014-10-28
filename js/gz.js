Array.prototype.contains = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i] == obj) {
			return true;
		}
	}
	return false;
}

function cleanArray(actual){
  var newArray = new Array();
  for(var i = 0; i<actual.length; i++){
	  if (actual[i]){
		newArray.push(actual[i]);
	}
  }
  return newArray;
}

var margin = {top: 1, right: 1, bottom: 6, left: 1},
	width = 1030 - margin.left - margin.right,
	height = 700 - margin.top - margin.bottom;

var color = d3.scale.category20();

// create a dictionary pointing the answer_id do the 
// image offset in workflow.png
var image_offset = {
    13: 0, // Bulge Dominate
    12: 1, // Bulge Obvious
    11: 2, // Bulge Just Noticeable
    10: 3, // No Bulge
    59: 4, // clump spiral
    //: 5, // clump not-embedded
    //: 6, // clump symmetrical
    //: 7, // clump bright-center
    //: 8, // clump one-brighter
    49: 9, // clump cluster
    48: 10, // clump chain
    47: 11, // clump line
    54: 12, // clump can't tell
    53: 13, // clump 4+
    4: 13,
    52: 14, // clump 4
    51: 15, // clump 3
    50: 16, // clump 2
    60: 17, // clump 1
    6: 18, // spiral bar
    //: 19, // smooth bar
    //: 20, // dustlane
    //: 21, // irregular
    2: 22, // feature
    //: 48, // feature clumpy
    //: 23, // merger
    //: 24, // merger tidal
    //: 25, // tidal-debris
    //: 26, // other
    //: 27, // lens
    //: 28, // disturbed
    5: 29, // no
    7: 29,
    9: 29, 
    40: 29,
    42: 29,
    44: 29,
    46: 29,
    56: 29,
    58: 29,
    39: 30, // yes
    41: 30,
    43: 30,
    45: 30,
    55: 30,
    57: 30,
    //: 31, // ring
    3: 32, // star
    27: 33, // edge none
    26: 34, // edge boxy
    25: 35, // edge round
    18: 36, // smooth cigar
    17: 37, // smooth in-between
    1: 38, // smooth round
    16: 38,
    31: 39, // spiral 1
    32: 40, // spiral 2
    33: 41, // spiral 3
    34: 42, // spiral 4
    36: 43, // spiral 4+
    37: 44, // spiral can't tell
    30: 45, // spiral loose
    8: 46, // spiral medium
    29: 46,
    28: 47, // spiral tight
    0: 44, // All
}

var formatNumber = d3.format(",.0f"),
	format = function(d) { return formatNumber(d) + " galaxies"; },
	color = d3.scale.category20();

function updateData(gal_id){
    d3.select("svg").remove();

    d3.select("#slider_charge").on("input", function() { update_charge(+this.value); })
    d3.select("#slider_strength").on("input", function() { update_strength(+this.value); })
    d3.select("#slider_friction").on("input", function() { update_friction(+this.value); })
    d3.select("#reset_button").on("click", reset_data)

    function update_charge(new_val){
	d3.select("#slider_charge_value").text(new_val);
	d3.select("#slider_charge").property("value", new_val);
	force.charge(function(n) {return -1 * new_val * M_factor * n.value});
	force.stop();
	force.start();
    }

    function update_strength(new_val){
	d3.select("#slider_strength_value").text(new_val);
	d3.select("#slider_strength").property("value", new_val);
	force.linkStrength(new_val);
	force.stop();
	force.start();
    }

    function update_friction(new_val){
	d3.select("#slider_friction_value").text(new_val);
	d3.select("#slider_friction").property("value", new_val);
	force.friction(1-new_val);
	force.stop();
	force.start();
    }

    function reset_data(){
	updateData(gal_id);
    }

    var svg = d3.select("#body").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
      .append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var force = d3.layout.force()
	.size([width, height]);

    update_charge(2.5);
    update_strength(1);
    update_friction(0.35);
    
    var M_factor = 1700;

    d3.json("data/"+gal_id+".json", function(answers) { 
	$(".galaxy-image").attr("src", answers.image_url);
	root = answers;
	root.fixed = true;
	root.x = Math.sqrt(M_factor);
	root.y = height/2;
	// make sure to minpulate data *before* the update loop
	// add a list of source and target Links to each node
	root.nodes.forEach(function(node) {
	    node.sourceLinks = [];
	    node._sourceLinks = [];
	    node.targetLinks = [];
	});
	root.links.forEach(function(link, i) {
	    link.link_id = i;
	    var source = link.source,
		target = link.target;
	    if (typeof source === "number") source = link.source = root.nodes[link.source];
	    if (typeof target === "number") target = link.target = root.nodes[link.target];
	    source.sourceLinks.push(link);
	    target.targetLinks.push(link);
	});
	// Get the number of votes for each node
	root.nodes.forEach(function(node) {
	    node.value = Math.max(
		d3.sum(node.sourceLinks, function(L) {return L.value}),
		d3.sum(node.targetLinks, function(L) {return L.value})
	    );
	});
	// Normalize votes by total number
	Total_value=root.nodes[0].value
	root.nodes.forEach(function(node, i) {
	    node.value /= Total_value;
	    node.radius = 2 * Math.sqrt(M_factor*node.value);
	    node.node_id = i;
	});     
	computeNodeBreadths(root);
	max_level = d3.max(root.nodes, function(d) {return d.fixed_level; });
	force.linkDistance(.8*width/(max_level + 1));
	
	// good starting points
	root.nodes.forEach(function(d , i) {
	    d.x = d.fixed_x;
	    if (root.nodes[1].value > root.nodes[2].value) { 
		j = 1;
	    } else {
		j = -1;
	    }
	    d.y = (1 - d.value + j * d.group/10) * height/3;
	});
	root.nodes[0].x = root.nodes[0].radius;
	root.nodes[0].y = height/2;
	root.nodes[0].fixed = true;
	update(root.nodes, root.links);
    });
    
    var diagonal = d3.svg.diagonal()
	.source(function(d) { return {"x":d.source.y, "y":d.source.x}; })
	.target(function(d) { return {"x":d.target.y, "y":d.target.x}; })
	.projection(function(d) {return [d.y, d.x]; });

    var link = svg.selectAll(".link"),
	gnode = svg.selectAll(".gnode");

    function update(nodes_in, links_in) {
	var n = root.nodes.length;
	
	force
	    .nodes(nodes_in)
	    .links(links_in)
	    .on("tick", tick);

	link = link.data(links_in, function(d) { return d.link_id; });
	
	link.enter().insert("path", ".gnode")
            .attr("class", "link")
	    .attr("d", diagonal)
            .style("stroke-width", function(d) { return .5 * Math.min(d.target.radius, d.source.radius); });

	// Exit any old links
	link.exit().remove();

	gnode = gnode.data(nodes_in, function(d) { return d.node_id; });

	// Exit any old nodes
	gnode.exit().remove();
      
	var genter = gnode.enter().append("g")
	    .attr("class","gnode")
	    .call(force.drag)
	    .on("click", click);

	var gimage = genter.append("g")
	    .attr("transform", function(d) { return "scale(" + d.radius/50 + ")"; })

	gimage.append("defs")
	    .append("clipPath")
	    .attr("id", function(d) { return "myClip" + d.node_id; })
	    .append("circle")
	    .attr("cx", 0)
	    .attr("cy", 0)
	    .attr("r", 40);

	gimage.append("circle")
	    .attr("color", "black")
	    .attr("cx", 0)
	    .attr("cy", 0)
	    .attr("r",40);

	gimage.append("image")
	    .attr("xlink:href", "images/workflow.png")
	    .attr("x", -50)
	    .attr("y", function(d) { return d.answer_id ? -image_offset[d.answer_id]*100-50 : -image_offset[0]*100-50; })
	    .attr("clip-path", function(d) { return "url(#myClip" + d.node_id + ")"; })
	    .attr("width", 100)
	    .attr("height", 4900);

	genter.append("text")
	    .attr("text-anchor", function(d) { return d.sourceLinks.length>0 ? "middle" : "left";})
	    .attr("dx", function(d) { return d.sourceLinks.length>0 ? 0 : d.radius * .6;})
	    .attr("dy", ".35em")
	    .text(function(d, i) { return (d.targetLinks.length>0 || i==0) ? d.name + ": " + d.value*Total_value: ""; });
    
	force.start();
	//for (var i = 500; i > 0; --i) force.tick();
	//force.stop();
   
	function tick(e) {
	    // Push sources up and targets down to form a weak tree.
	    var ky = 10 * e.alpha;
	   
	    root.nodes.forEach(function(d, i) {
		// fix the x value at the depth of the node
		d.x = d.fixed_x + root.nodes[0].radius;
		// move low prob nodes down
		if (root.nodes[1].value > root.nodes[2].value) { 
		    j = 1;
		} else {
		    j = -1;
		}
		delta_y = (5 * d.value - j * .3 * d.group + .5) * ky;
		d.y_old = d.y;
		if ((d.y-d.radius<0 && delta_y>0) || (d.y+d.radius>height && delta_y<0)) {
		    delta_y *= -1
		}
		d.y -= delta_y;
		//if (isNaN(d.y)) {console.log(d.value,d.group,ky)}
	    });

	    if (e.alpha<0.05) {
		// Also do collision detection after a few itterations
		var q=d3.geom.quadtree(root.nodes),
		    i=0,
		    n=root.nodes.length;
		
		while (++i < n) q.visit(collide(root.nodes[i]));
	    }
	    root.nodes.forEach( function(d) {
		if (isNaN(d.y)) { d.y = d.y_old; }
	    });
	    // Translate the groups
	    gnode.attr("transform", function(d) {
		//return 'translate(' + [d.x, Math.max(d.radius, d.y)] + ')'; 
		return 'translate(' + [d.x, d.y] + ')'; 
	    });    
	    link.attr("d",diagonal);
	};
	function collide(node) {
	    var r = node.radius,
		nx1 = node.x - r,
		nx2 = node.x + r,
		ny1 = node.y - r,
		ny2 = node.y + r;
	    return function(quad, x1, y1, x2, y2) {
		if (quad.point && (quad.point !== node)) {
		    var x = node.x - quad.point.x,
			y = node.y - quad.point.y,
			l = Math.sqrt(x * x + y * y),
			r = 0.9*(node.radius + quad.point.radius);
		    if (l < r) {
			l = (l - r) / l * .5;
			//node.x -= x *= l;
			node.y -= y *= l;
			//quad.point.x += x;
			quad.point.y += y;
		    }
		}
		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	    };
	}
    };
    // Find the x positions for each node
    function computeNodeBreadths(root) {
	var remainingNodes = root.nodes,
	    nextNodes,
	    x = 0;
	
	while (remainingNodes.length) {
	    nextNodes = [];
	    remainingNodes.forEach(function(node) {
		node.fixed_x = x;
		node.sourceLinks.forEach(function(link) {
		    if (nextNodes.indexOf(link.target) < 0) {
			nextNodes.push(link.target);
		    }
		});
	    });
	    remainingNodes = nextNodes;
	    ++x;
	}	  
	moveSinksRight(x);
	scaleNodeBreadths(.75*width / (x - 1));
    };
    
    function moveSinksRight(x) {
	root.nodes.forEach(function(node) {
	    if (!node.sourceLinks.length) {
		node.fixed_x = x - 1;
	    }
	});
    };
    
    function scaleNodeBreadths(kx) {
	root.nodes.forEach(function(node) {
	    node.fixed_level = node.fixed_x;
	    node.fixed_x *= kx;
	});
    };
    
    function click(d) {
	if (d3.event.defaultPrevented) return;
	if (d.sourceLinks.length>0) {
	    d._sourceLinks=d.sourceLinks;
	    d.sourceLinks=[];
	} else {
	    d.sourceLinks=d._sourceLinks
	    d._sourceLinks=[];
	}
	var current_nodes = [];
	var current_links = [];
	function recurse(node) {
	    if (!current_nodes.contains(node)) { current_nodes.push(node) };
	    if (node.sourceLinks.length>0) {
		node.sourceLinks.forEach(function(link) {
		    if (!current_links.contains(link)) { current_links.push(link) };
		    recurse(link.target);
		});
	    }
	};
	recurse(root.nodes[0]);
	update(current_nodes, current_links);
    };
};

$("#galaxies").change(function() {
    updateData(this.value);  
});

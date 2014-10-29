// useful function to see if an array contains an object
Array.prototype.contains = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i] == obj) {
			return true;
		}
	}
	return false;
}

// set up the margins and such
var margin = {top: 1, right: 1, bottom: 1, left: 1},
	width = 1130 - margin.left - margin.right,
	height = 700 - margin.top - margin.bottom;

// create a dictionary pointing the answer_id to the 
// image offset in workflow.png and providing a useful
// mouse over message
var image_offset = {
    // format answer_id: [mouse over text, image offset (in pix/100), yes/no overlay offset (if needed)]
    13: ["Bulge dominate",0], // Bulge Dominate
    12: ["Bulge obvious",1], // Bulge Obvious
    11: ["Bulge just noticeable",2], // Bulge Just Noticeable
    10: ["No bulge",3], // No Bulge
    59: ["Clumps spiral-shaped",4], // clump spiral
    //: 5, // clump not-embedded
    57: ["Clumps embedded",5,29], // no not-embedded (hate dubble neg...) 
    58: ["Clumps not embedded",5,30], // yes not-embedded
    //: 6, // clump symmetrical
    55: ["Clumps symmetrical",6,30], // yes symmetrical
    56: ["Clumps not symmetrical",6,29], // no symmetrical
    //: 7, // clump bright-center
    45: ["Clumps have bright center",7,30], // yes bright-center
    46: ["Clumps do not have bright center",7,29], // no bright-center
    //: 8, // clump one-brighter
    43: ["One clump is brighter",8,30], // yes one clump brighter
    44: ["One clump is not brighter",8,29], // no one clump brighter
    49: ["Clumps are clustered",9], // clump cluster
    48: ["Clumps from a chain",10], // clump chain
    47: ["Clumps are in a line",11], // clump line
    54: ["Can not tell how many clumps",12], // clump can't tell
    39: ["There are clumps",13,30], // yes clumps
    40: ["There are no clumps",13,29], // no clumps
    53: ["5+ Clumps",13], // clump 5+
    52: ["4 Clumps",14], // clump 4
    51: ["3 Clumps",15], // clump 3
    50: ["2 Clumps",16], // clump 2
    60: ["1 Clump",17], // clump 1
    4: ["The disk is edge on",35,30], // yes edge
    5: ["The disk is face on",35,29], //no edge
    6: ["There is a bar",18,30], // yes bar
    7: ["There is no bar",18,29], // no bar
    //: 18, // spiral bar
    //: 19, // smooth bar
    //: 20, // dustlane
    //: 21, // irregular
    2: ["There is a disk or feature",22], // feature
    //: 48, // feature clumpy
    //: 23, // merger
    //: 24, // merger tidal
    //: 25, // tidal-debris
    //: 26, // other
    //: 27, // lens
    //: 28, // disturbed
    42: ["No",29], // no
    41: ["Yes",30], // yes
    //: 31, // ring
    3: ["Star or artifact",32], // star
    27: ["Edge on with no bulge",33], // edge none
    26: ["Edge on with boxy bulge",34], // edge boxy
    25: ["Edge on with round bulge",35], // edge round
    18: ["Smooth and cigar shaped",36], // smooth cigar
    17: ["Smooth and in-between shaped",37], // smooth in-between
    1: ["Smooth",38], // smooth round
    16: ["Smooth and round shaped",38],
    8: ["Has spiral arm(s)",46,30], // yes spiral
    9: ["Has no spiral arm(s)",46,29], // no spiral
    31: ["1 spiral arm",39], // spiral 1
    32: ["2 spiral arms",40], // spiral 2
    33: ["3 spiral arms",41], // spiral 3
    34: ["4 spiral arms",42], // spiral 4
    36: ["5+ spiral arms",43], // spiral 5+
    37: ["Can not tell how many spiral arms",44], // spiral can't tell
    30: ["Loose spiral arms",45], // spiral loose
    29: ["Medium spiral arms",46], // spiral medium
    28: ["Tight spiral arms",47], // spiral tight
    0: ["All",48], // All
}

// function that takes in a galaxy id and makes the node tree
function updateData(gal_id){
    // clear the page
    d3.select("svg").remove();
    // make sure dropdown list matches this id (useful for refresh)
    d3.select("#galaxies")[0][0].value=gal_id

    // hook up call-bakcs for the slider bars and reset button
    d3.select("#slider_charge").on("input", function() { update_charge(+this.value); })
    d3.select("#slider_strength").on("input", function() { update_strength(+this.value); })
    d3.select("#slider_friction").on("input", function() { update_friction(+this.value); })
    d3.select("#reset_button").on("click", reset_data)

    function update_charge(new_val){
	d3.select("#slider_charge_value").text(new_val);
	d3.select("#slider_charge").property("value", new_val);
	force.charge(function(n) {return -1 * new_val * 1700 * n.value});
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
	// use 1-new_val to make 0 frictionless instead of 1!
	force.friction(1-new_val);
	force.stop();
	force.start();
    }

    function reset_data(){
	updateData(gal_id);
    }

    // add the draw window
    var svg = d3.select("#body").append("svg")
	.attr("width", width + margin.left + margin.right)
	.attr("height", height + margin.top + margin.bottom)
      .append("g")
	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // create the node tree object
    var force = d3.layout.force()
	.size([width, height]);

    // update the sliders to default values
    update_charge(2.5);
    update_strength(1);
    update_friction(0.35);

    // now that the basics are set up read in the json file
    d3.json("data/"+gal_id+".json", function(answers) { 
	// draw the galaxy image
	$(".galaxy-image").attr("src", answers.image_url);
	root = answers;
	// make sure to minpulate data *before* the update loop
	// add a list of source and target Links to each node
	root.nodes.forEach(function(node) {
	    node.sourceLinks = [];
	    // _sourceLinks will be used to toggle links on and off
	    node._sourceLinks = [];
	    node.targetLinks = [];
	});
	root.links.forEach(function(link, i) {
	    // give each link a unique id
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
	    // set the radius such that 18 full sized nodes could fit
	    node.radius = width * Math.sqrt(node.value) / 18;
	    node.node_id = i;
	});     
	// get the x position for each node
	computeNodeBreadths(root);
	// find how deep the tree goes and set the linkDistance to match 
	max_level = d3.max(root.nodes, function(d) {return d.fixed_level; });
	force.linkDistance(.8*width/(max_level + 1));
	
	// good starting points
	root.nodes.forEach(function(d , i) {
	    d.x = d.fixed_x;
	    // find if smooth or spiral is voted the most
	    // and put that group on top
	    if (root.nodes[1].value > root.nodes[2].value) { 
		j = 1;
	    } else {
		j = -1;
	    }
	    // set the y position such that higher vote values
	    // are on top, and (to a lesser extent) the groups
	    // stay together
	    d.y = (1 - d.value + j * d.group/10) * height/2;
	});
	// fix the first node so it does not move
	root.nodes[0].x = root.nodes[0].radius;
	root.nodes[0].y = height/2;
	root.nodes[0].fixed = true;
	// run the call-back function to update positions
	update(root.nodes, root.links);
    });
    
    // make the links long nice by using diagonal
    // swap x and y so the curve goes the propper way
    var diagonal = d3.svg.diagonal()
	.source(function(d) { return {"x":d.source.y, "y":d.source.x}; })
	.target(function(d) { return {"x":d.target.y, "y":d.target.x}; })
	.projection(function(d) {return [d.y, d.x]; });

    // select the link and gnode objects
    var link = svg.selectAll(".link"),
	gnode = svg.selectAll(".gnode");

    // create the update function to draw the tree
    function update(nodes_in, links_in) {
	// add the nodes and links to the tree
	force
	    .nodes(nodes_in)
	    .links(links_in)
	    .on("tick", tick);

	// set the data for the links (with unique ids)
	link = link.data(links_in, function(d) { return d.link_id; });
	
	// add a path object to each link
	link.enter().insert("path", ".gnode")
            .attr("class", "link")
	    .attr("d", diagonal)
            .style("stroke-width", function(d) { return .5 * Math.min(d.target.radius, d.source.radius); });

	// Exit any old links
	link.exit().remove();

	// set the data for the nodes (with unique ids)
	gnode = gnode.data(nodes_in, function(d) { return d.node_id; });

	// Exit any old nodes
	gnode.exit().remove();
      
	// add a group to the node to translate it
	var genter = gnode.enter().append("g")
	    .attr("class","gnode")
	    .call(force.drag)
	    .on("click", click);

	// add a group to the node to scale it
	// with this scaling the image (with r=50px) will have the propper radius
	var gimage = genter.append("g")
	    .attr("transform", function(d) { return "scale(" + d.radius/50 + ")"; })

	// add a clipPath for a circle to corp the node image
	gimage.append("defs")
	    .append("clipPath")
	    .attr("id", function(d) { return "myClip" + d.node_id; })
	    .append("circle")
	    .attr("cx", 0)
	    .attr("cy", 0)
	    .attr("r", 45);

	// add a black circle in the background
	gimage.append("circle")
	    .attr("color", "black")
	    .attr("cx", 0)
	    .attr("cy", 0)
	    .attr("r",45);

	// add the inital image to the node
	gimage.append("image")
	    .attr("xlink:href", "images/workflow.png")
	    .attr("x", -50)
	    .attr("y", function(d) { return d.answer_id ? -image_offset[d.answer_id][1]*100-50 : -image_offset[0][1]*100-50; })
	    .attr("clip-path", function(d) { return "url(#myClip" + d.node_id + ")"; })
	    .attr("width", 100)
	    .attr("height", 4900);
	
	// add the yes/no image if needed
	gimage.append("image")
	    .attr("xlink:href", "images/workflow.png")
	    .attr("x", -50)
	    .attr("y", function(d) { 
		if (d.answer_id) {
		    return image_offset[d.answer_id][2] ? -image_offset[d.answer_id][2]*100-50 : 100;
		} else {
		    return 100;
		}
	    })
	    .attr("clip-path", function(d) { return "url(#myClip" + d.node_id + ")"; })
	    .attr("width", 100)
	    .attr("height", 4900)
	    .attr("opacity", .35);

	// add the mouse over text
	genter.append("title")
	    .text(function(d) { return d.answer_id ? image_offset[d.answer_id][0] + ": " + d.value*Total_value : image_offset[0][0] + ": " + d.value*Total_value; })
    
	// start the nodes moving
	force.start();
	//for (var i = 500; i > 0; --i) force.tick();
	//force.stop();
   
	// call-back to set how the nodes will move
	function tick(e) {
	    // make sure the force gets smaller as the simulation runs
	    var ky = 10 * e.alpha;
	   
	    root.nodes.forEach(function(d, i) {
		// fix the x value at the depth of the node
		// and add in the radius of the first node
		d.x = d.fixed_x + root.nodes[0].radius;
		// move low prob nodes down
		// and keep the groups together (to a lesser extent)
		if (root.nodes[1].value > root.nodes[2].value) { 
		    j = 1;
		} else {
		    j = -1;
		}
		// the amount to move the node
		delta_y = (5 * d.value - j * .3 * d.group + .5) * ky;
		// store the old position in case something goes wrong
		// the collision detection can casue NaNs and I am not sure why
		d.y_old = d.y;
		// check to make sure the node is not outside the plot area
		// if it is change the direction of the push
		if ((d.y-d.radius<0 && delta_y>0) || (d.y+d.radius>height && delta_y<0)) {
		    delta_y *= -1
		}
		d.y -= delta_y;
	    });

	    // Also do collision detection after a few itterations
	    if (e.alpha<0.05) {
		var q=d3.geom.quadtree(root.nodes),
		    i=0,
		    n=root.nodes.length;
		while (++i < n) q.visit(collide(root.nodes[i]));
	    }
	    
	    // if the new position is NaN use the previous position
	    // this prevents links for disappearing
	    root.nodes.forEach( function(d) {
		if (isNaN(d.y)) { d.y = d.y_old; }
	    });
	    
	    // Translate the node group to the new position
	    gnode.attr("transform", function(d) {
		return 'translate(' + [d.x, d.y] + ')'; 
	    });    
	    link.attr("d",diagonal);
	};
	// the collision detection code
	// found this online and I am not sure how it works
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
	// don't scale to the full width or the nodes go off the page
	scaleNodeBreadths(.87 * width / (x - 1));
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
    
    // call-back to collapse/expand nodes
    function click(d) {
	if (d3.event.defaultPrevented) return;
	if (d.sourceLinks.length>0) {
	    d._sourceLinks=d.sourceLinks;
	    d.sourceLinks=[];
	} else {
	    d.sourceLinks=d._sourceLinks
	    d._sourceLinks=[];
	}
	// find what nodes and links are still around
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
	// update the nodes
	update(current_nodes, current_links);
    };
};

// make the dropdown list
json_list = ['14846', '15335', '15517', '15584', '15588', '16987', '19537',
	     '19696', '19714', '19989', '20054', '20108', '20190', '20247',
	     '20257', '20266', '20289', '20327', '20334', '20357', '20411',
	     '20436', '20460', '20475', '20534', '20589', '20619', '20704',
	     '20753', '20754', '20772', '20774', '20871', '20918',
	     '20986', '21078', '21086', '21165', '21245', '21261', '21291',
	     '21339', '21364', '21383', '21422', '21430', '21442', '21465',
	     '21471', '21478', '21482', '21486', '21493', '21504', '21513',
	     '21515', '21518', '21525', '21528', '21531', '21544', '21550',
	     '21556', '21559', '21573', '21574', '21575', '21576', '21582',
	     '21584', '21592', '21597', '21600', '21606', '21612', '21618',
	     '21620', '21627', '21628', '21634', '21640', '21642', '21645',
	     '21648', '21654', '21656', '21657', '21658', '21659', '21661',
	     '21670', '21673', '21804', '21809', '9614']

// 20927 removed from list since it crashes the browser, not sure why

d3.select("#header")
    .append("select")
    .attr("id","galaxies")
    .selectAll("option")
    .data(json_list)
    .enter()
    .append("option")
    .attr("value", function(d) { return d; })
    .text(function(d) { return d; });

d3.select("#galaxies")
    .on("change", function() {
	updateData(this.value);
    });

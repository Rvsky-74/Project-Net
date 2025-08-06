function add_highlight_function(node){
    const prev_width = parseInt(window.getComputedStyle(node).getPropertyValue('width').slice(0,2));

    //fade all nodes except the one being hovered
    node.addEventListener('mouseenter', function(event){
        const elements = document.querySelectorAll('.node');
        elements.forEach(element => {
            element.style.setProperty('--alpha', 0.3); 
        });
        node.style.setProperty('--alpha', 1);

        node.style.setProperty("--diameter", 1.2 * prev_width + 'px');

        document.querySelectorAll('.arrow').forEach(element => {
            if(!(element.parent === node)) element.style.setProperty('--alpha', 0.3); 
        });
    });

    //turn all nodes back to normal when no longer hovering
    node.addEventListener('mouseleave', function(event){
        const elements = document.querySelectorAll('.node');
        elements.forEach(element => {
            element.style.setProperty('--alpha', 1); 
            element.style.setProperty("--diameter", prev_width + 'px');

        });

        document.querySelectorAll('.arrow').forEach(element => {
            element.style.setProperty('--alpha', 1); 
        });
    });
}



function add_onClick_function(node){
    node.addEventListener('click', function(event){
        event.stopPropagation();
        if (link_mode_on){ //a connection was selected
            
            let is_connection_valid = origin_node != node && //a node cant depend on itself
                                      !(origin_node.connections.includes(node)) && //avoid assigning same node multiple times
                                      !(node.connections.includes(origin_node)); //double dependancies make no sense in this context
            if(is_connection_valid){ 
                if (creates_loop(origin_node, node)){
                    public_print("That would make a loop impossible to complete");
                    return;
                }

                origin_node.connections.push(node); //add the connection to the origin node object
                create_arrow(origin_node, node);      
                update_colors(node, node.state, node.state);

                return;
            }

            if (origin_node.connections.includes(node)){ //if we clicked a node that was already connected, delete that connection
                document.querySelectorAll(".arrow").forEach(arrow => {
                    if (arrow.parent == origin_node && arrow.child == node) arrow.remove();
                });                
                let index = origin_node.connections.indexOf(node);
                if (index !== -1) {
                    origin_node.connections.splice(index, 1);
                }
                update_colors(node, node.state, node.state);
                update_colors(origin_node, origin_node.state, origin_node.state);

                return;
            }
        }
        if (!box_opened && !link_mode_on){ //to prevent opening multiple boxes at the same time
            open_options(node);
        }
    });
}

function create_arrow(parent, child){
    const arrow = document.createElement("div");
    arrow.classList.add("arrow", child.state);
    container.appendChild(arrow);

    const tip = document.createElement("div");
    tip.className = "tip";
    arrow.appendChild(tip);

    const line = document.createElement("div");
    line.className = "line";   
    arrow.appendChild(line);

    arrow.parent = parent;
    arrow.child = child;

    update_arrow_render(arrow);
}

function update_arrows(dx=0, dy=0){
    document.querySelectorAll('.arrow').forEach(element => {
        update_arrow_render(element, dx, dy);
    });
}

function update_arrow_render(arrow, off_x=0, off_y=0){
    const tip = arrow.querySelector('.tip');
    const line = arrow.querySelector('.line');


    const child = {x: arrow.child.x, y: arrow.child.y};
    const parent = {x: arrow.parent.x, y: arrow.parent.y};

    
    const dx = child.x - parent.x;
    const dy = child.y - parent.y;

    let angle = Math.atan2(dy, dx);
    let distance = Math.sqrt(dx * dx + dy * dy);

    // small fixes, no ideas why they are needed
    if (angle < Math.PI/2){ 
        angle -=0.01;
    }
    if (angle < -Math.PI/2){ 
        angle +=0.01;
    }


    const styles = getComputedStyle(arrow.parent);
    const radius = parseInt(styles.getPropertyValue('--diameter').slice(0,2))/2;
    const tip_height = Math.sqrt(50)/2; //because the tip is a square with side 5
    const lines_thickness = 3;

    
    const tip_x = (child.x - (radius+tip_height+2*lines_thickness) * dx/distance);
    const tip_y = (child.y - (radius+tip_height+2*lines_thickness) * dy/distance);
    tip.style.transform = `translate(-50%, -50%) translate(${tip_x + off_x}px,${tip_y + off_y}px) rotate(${angle + Math.PI/4}rad)`;


    line.style.width = (distance - 2*radius - 3*lines_thickness - tip_height) + 'px';
    const line_x = (parent.x + (radius+2*lines_thickness) * Math.cos(angle));
    const line_y = (parent.y + (radius+2*lines_thickness) * Math.sin(angle));   
    line.style.transform = `translate(${line_x + off_x}px,${line_y + off_y}px) rotate(${angle}rad)`;
}



function update_colors(node, old_state, new_state){
//Called when loading nodes, when changing the state of a node and when updating a connection
    const state_changed = old_state != new_state;
    let is_pointed_to = false;
    node.state = new_state;

    if (node.connections.length == 0){ //if the task depends on nothing
        if (new_state != "Completed") node.classList.replace("undoable", "doable");
    }

    document.querySelectorAll('.arrow').forEach(arrow => {
        if(arrow.child === node){ 
            is_pointed_to = true;
            
            //the arrow pointing to a node should have a state equal to the node's
            arrow.classList.replace(old_state, new_state);

            // how many uncompleted dependencies the node has. If it has none, it's now completable 
            if ((arrow.parent.connections.filter(n => n.state === "Uncompleted" || n.state === "Default")).length == 0){ 
                // in case the completable node is not done yet, ww should higlight it
                if (arrow.parent.state != "Completed") arrow.parent.classList.replace("undoable", "doable");
            } 
            else {
                arrow.parent.classList.replace("doable", "undoable");
            }
        }
    });
    if (node.state == "Completed") node.classList.replace("doable", "undoable"); //no point in higlighting a completed node


    //if a task was completed, its dependencies are probably also complete
    //however, marking as done might be an error, so returning the node to uncompleted should return the dependancies to their original state
    // i will do that by just masking the dependencies instead of changing their states
    // if it goes back to uncompleted, remove the masks

    // plan: search all nodes; if any of its parents is completed, mask them, otherwise, unmask

    node_tree_search(node);
}    

function find_parents(node){
    p = [];
    document.querySelectorAll('.arrow').forEach(arrow => {
        if(arrow.child === node){
            p.push(arrow.parent);    
        }
    });
    return p;
}

function node_tree_search(node, visited_nodes = new Set()){
    //check the tree of dependencies of the node
    // mask/remove mask and turn the arrows pointing to them the correct color
    //apply_mask = true -> make it green
    //apply_mask = false -> remove the green

    visited_nodes.add(node);

    // if a node's parents are completed, mask the node, and remove the mask otherwise
    const apply_mask = find_parents(node).filter(n => n.state==="Completed").length != 0;


    if (apply_mask) node.classList.add("complete-mask");
    else node.classList.remove("complete-mask");

    document.querySelectorAll(".arrow").forEach(arrow => {
        if (arrow.child == node){
            let line = arrow.querySelector(".line");
            let tip = arrow.querySelector(".tip");

            if (apply_mask){
                line.classList.add("line-mask");
                tip.classList.add("tip-mask");
            } 
            else {
                line.classList.remove("line-mask");
                tip.classList.remove("tip-mask");
            }
        }
    });
    //the changes in the node's state may have propagated to other layers
    node.connections.forEach(n => {
        if (!visited_nodes.has(n)) node_tree_search(n, visited_nodes);
    });
    

    return;
}



function update_nodes(){
    const dx = end_coords[0] - start_coords[0];
    const dy = end_coords[1] - start_coords[1]; 

    bkg_x_off += dx;
    bkg_y_off += dy;

    centro = [centro[0] + dx, centro[1] + dy];

    draw_bkg(0,0);
    dragged = false;

    // update the position of the nodes for access by other elements
    document.querySelectorAll(".node").forEach((node) => {
        node.x += dx;
        node.y += dy;
        node.style.left = node.x + "px";
        node.style.top = node.y + "px";
        node.style.transform = 'translate(-50%, -50%)';
    });
}

function start_dragging(x, y){
    isMouseDown = true; // Start dragging when the mouse button is pressed
    start_coords = [x, y];

    nodes.forEach((node) => {
        node.initialTranslate = getTranslateValues(node);
    });
    document.querySelectorAll(".arrow").forEach((arrow) => {
        arrow.initialTranslate = getTranslateValues(arrow);
    });
}


// Variable to store the entered text
let enteredText = "";
function add_menu_functions(add_node_button, delete_button, save_button, load_button, info_button){
    //Style the add_node button
    const vbar = document.createElement("div");
    vbar.className = "bar";
    add_node_button.appendChild(vbar);
    const hbar = document.createElement("div");
    hbar.className = "bar";
    hbar.style.transform = "rotate(90deg)";
    add_node_button.appendChild(hbar);


    // Add help when hovering a button
    const button_list = [add_node_button, delete_button, save_button, load_button, info_button];
    button_list.forEach(element => {
        element.addEventListener("mouseenter", () => {
            timeout = setTimeout(() => {
                // Create the text box
                const tooltip = document.createElement("div");
                tooltip.className = "tooltip";

                // Change text as needed
                const button_descriptions = {"addbutton": "New Task", 
                                             "savebutton": "Save Current Project",
                                             "loadbutton": "Load Saved Project",
                                             "deletebutton": "Clear Canvas",
                                             "infobutton": "Instructions / Help"};
                tooltip.textContent = button_descriptions[element.id];
                
                // Positioning the tooltip to the left of the element
                tooltip.style.position = "absolute";
                tooltip.style.right = "110%"; // Moves it to the left
                tooltip.style.top = "50%";
                tooltip.style.transform = "translateY(-50%)";
                tooltip.style.padding = "5px 10px";
                tooltip.style.background = "black";
                tooltip.style.color = "white";
                tooltip.style.borderRadius = "5px";
                tooltip.style.fontSize = "12px";
                tooltip.style.whiteSpace = "nowrap";
    
                element.appendChild(tooltip);
            }, 500); // 500ms delay
        });
        element.addEventListener("mouseleave", () => {
            clearTimeout(timeout); // Prevent tooltip from appearing if the user leaves early
    
            // Remove tooltip if it exists
            const tooltip = element.querySelector(".tooltip");
            if (tooltip) {
                tooltip.remove();
            }
        });
    });

 

    // Add_node button functionality
    add_node_button.addEventListener("click", () => {
    // No need to do anything if the input box was already there (caused by double clicks on the add_node_button)
        const already_there = document.querySelector(".input-box") != null;
        if (already_there) return; 

        let inputBox = document.createElement("input");
        inputBox.className = "input-box";
        inputBox.type = "text";
        inputBox.placeholder = "Enter task name...";
        
        // Style the text box (centered inside container)
        inputBox.style.position = "absolute";
        inputBox.style.top = "50%";
        inputBox.style.left = "50%";
        inputBox.style.transform = "translate(-50%, -50%)";
        inputBox.style.padding = "8px";
        inputBox.style.fontSize = "16px";
        inputBox.style.border = "1px solid black";
        inputBox.style.borderRadius = "5px";
        inputBox.style.outline = "none";
    
        container.appendChild(inputBox);


        inputBox.focus();

        // Event listener for "Enter" key
        inputBox.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && inputBox.value.trim() != '') {
                
                enteredText = inputBox.value.trim(); // Store input value
                inputBox.remove(); // Remove input box after entering text

                if (!is_name_available(enteredText)){
                    public_print("Task already in the project"); 
                    const repeated_node = nodes.find(n => n.name === enteredText);
                    
                    const dx = canvas.width/2 - repeated_node.x;
                    const dy = canvas.height/2 - repeated_node.y;

                    move_all(dx, dy);

                    //increase the node to highlight it and then reduce it to original size
                    const prev_diam = parseInt(window.getComputedStyle(repeated_node).getPropertyValue("--diameter").slice(0,-2), 10);     
                    print(prev_diam);   
                    repeated_node.style.setProperty("--diameter", prev_diam*1.3 + 'px');

                    function return_original_width(event){
                        repeated_node.style.setProperty("--diameter", prev_diam + 'px');
                        repeated_node.removeEventListener('transitionend', return_original_width);
                    }
                    repeated_node.addEventListener('transitionend', return_original_width);
                    



                    return;   
                }

                add_node(null, null, enteredText);
            }
            if (event.key == 'Escape'){
                inputBox.remove();
            }
        });
    });


    // Delete button functionality
    delete_button.addEventListener("click", () => {
        delete_all();
    });

    save_button.addEventListener("click", () => {
        saveUserData();
    });

    load_button.addEventListener("click", () => {
        load();
    });

    info_button.addEventListener("click", () => {
        document.querySelector(".help").style.display = "block";
    });
}



function close_link_mode(){
    canvas.classList.replace("canvas-alt", "canvas-default");
    document.getElementById("Canvas_Text").innerText = "";

    link_mode_on = false;

    draw_bkg();
    if (!simulating) toggle_physics(); //resume physics simulation
}



function move_all(dx, dy){
    document.querySelectorAll(".node").forEach((node) => {
        node.x += dx;
        node.y += dy;
        node.style.left = node.x + "px";
        node.style.top = node.y + "px";
        node.style.transform = 'translate(-50%, -50%)';
    });
    centro[0] += dx;
    centro[1] += dy;
    update_arrows();
}





function creates_loop(n_goal, n2, visited_nodes = new Set()) {
    if (n_goal === n2) return true; // Loop detected

    visited_nodes.add(n2);

    for (let node of n2.connections) {
        if (!visited_nodes.has(node)) {
            if (creates_loop(n_goal, node, visited_nodes)) {
                return true; // If a loop is found in recursion, propagate it
            }
        }
    }
 
    return false; // No loop found
}




////////////////////////////////// Small functions ////////////////////////////////////

function print_nodes(){
    for(let i =0; i<nodes.length;i++){
        console.log(nodes[i].classList);
    }
}

function setup_nodes(){
    add_node(null, null, "acnio");
    add_node(null, null, "wio");
    add_node(null, null, "abc qwq qo aocew inecwwm si apq os");
    draw_bkg();
    if (!simulating) toggle_physics();
}

function print(...args) {
    args.forEach(arg => {
        console.log(arg); // Loop through each argument
    });
}

function state_to_color(state, light = false){
/**********************************************************************************************************************************
    Recebe:
            state -> string do conjunto: completed, uncompleted, default
            (light) -> bool indicativo de se querer a cor escura ou a clara. 
                        Por default pretende-se a cor escura (light = false)
    Retorna:
            color -> string reconhecida pelo css como uma cor
***********************************************************************************************************************************/
    let color = "0,0,0";
    if (light){
        color = (state === "Completed") ? color_code["light_green"]:
                        (state === "Uncompleted") ? color_code["light_red"]:
                        color_code["light_purple"]; 
    }
    else{
        color = (state === "Completed") ? color_code["dark_green"]:
                        (state === "Uncompleted") ? color_code["dark_red"]:
                        color_code["dark_purple"]; 
    }

    return `rgb(${color})`;
}
    


function getTranslateValues(element) {
    const style = window.getComputedStyle(element);
    const matrix = new WebKitCSSMatrix(style.transform);
    return { x: matrix.m41, y: matrix.m42 }; // m41 = translateX, m42 = translateY
}


function delete_all(){
    document.querySelectorAll(".node").forEach(element => element.remove());
    document.querySelectorAll(".arrow").forEach(element => element.remove());
    nodes.length = 0;
}


function is_name_available(name){
    const bool = nodes.find(n => n.name === name)
    return (bool) ? false : true;
} 


function public_print(text){
    document.getElementById("Canvas_Text").innerText = text;
}


function create_new_element(type, where_to_add = container, id = null, classes = []){
    const element = document.createElement(type);
    if (id) element.id = id;

    classes.forEach(c => element.classList.add(c));

    where_to_add.appendChild(element);
    return element;
}
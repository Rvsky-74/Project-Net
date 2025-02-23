function add_highlight_function(node){
    const prev_width = parseInt(window.getComputedStyle(node).getPropertyValue('width').slice(0,2));

    //fade all nodes except the one being hovered
    node.addEventListener('mouseenter', function(event){
        const elements = document.querySelectorAll('.node');
        elements.forEach(element => {
            element.style.setProperty('--alpha', 0.3); 
        });
        node.style.setProperty('--alpha', 1);

        node.style.width = 1.2 * prev_width + 'px';

        document.querySelectorAll('.arrow').forEach(element => {
            if(!(element.parent === node)) element.style.setProperty('--alpha', 0.3); 
        });
    });

    //turn all nodes back to normal when no longer hovering
    node.addEventListener('mouseleave', function(event){
        const elements = document.querySelectorAll('.node');
        elements.forEach(element => {
            element.style.setProperty('--alpha', 1); 
            element.style.width = prev_width + 'px';
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
                origin_node.connections.push(node); //add the connection to the origin node object

                create_arrow(origin_node, node);

                update_colors(origin_node);
                
                return;
            }
        }
        if (!box_opened){ //to prevent opening multiple boxes at the same time
            open_options(node);
        }
    });
}

function create_arrow(parent, child){
    const arrow = document.createElement("div");
    arrow.className = "arrow";
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




function update_colors(node){
    // first update the node's color
    let c = state_to_color(node.state, light = true);
    node.style.setProperty('--in-color', c.slice(4,-1));

    c = state_to_color(node.state, light = false);
    node.style.setProperty('--out-color', c.slice(4,-1));

    // then update its connections
    document.querySelectorAll('.arrow').forEach(element => {
        if(element.parent === node){
            element.style.setProperty('--cor', c.slice(4,-1));
        }
    


        

////////////////////////////////// Small functions ////////////////////////////////////
});
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
function add_menu_functions(add_node_button, delete_button, save_button, load_button){
    //Style the add_node button
    const vbar = document.createElement("div");
    vbar.className = "bar";
    add_node_button.appendChild(vbar);
    const hbar = document.createElement("div");
    hbar.className = "bar";
    hbar.style.transform = "rotate(90deg)";
    add_node_button.appendChild(hbar);


    // Add help when hovering a button
    const button_list = [add_node_button, delete_button, save_button, load_button];
    button_list.forEach(element => {
        element.addEventListener("mouseenter", () => {
            timeout = setTimeout(() => {
                // Create the text box
                const tooltip = document.createElement("div");
                tooltip.className = "tooltip";

                // Change text as needed
                tooltip.textContent = (element.className == "add-node") ? 
                        "New Task": (element.id == "savebutton") ?
                        "Save current project": (element.id == "loadbutton") ?
                        "Load Saved project":
                        "Delete everything"; 
                
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
            }, 500); // 2 seconds delay
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
            if (event.key === "Enter") {
                enteredText = inputBox.value.trim(); // Store input value
                inputBox.remove(); // Remove input box after entering text

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

}









////////////////////////////////// Small functions ////////////////////////////////////

function print_nodes(){
    for(let i =0; i<nodes.length;i++){
        console.log(nodes[i].style.transform);
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
        color = (state === "completed") ? color_code["light_green"]:
                        (state === "uncompleted") ? color_code["light_red"]:
                        color_code["light_purple"]; 
    }
    else{
        color = (state === "completed") ? color_code["dark_green"]:
                        (state === "uncompleted") ? color_code["dark_red"]:
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

import {
    globals
} from './variables.js'

import {
    saveNodeData,
    load,
    fetch_save_files,
    modify_save_file
} from './frontend.js'


const canvas = document.getElementById('circleCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const container = document.getElementById("canvas-container");



let origin_node;
let centro =  [canvas.width/2, canvas.height/2]; // centro de massa para onde os nodos vão ser atraidos



export function add_highlight_function(node){
    const prev_width = parseInt(window.getComputedStyle(node).getPropertyValue('width').slice(0,2));

    //fade all nodes except the one being hovered
    node.addEventListener('mouseenter', function(event){
        globals.nodes.forEach(element => {
            element.style.setProperty('--alpha', 0.3); 
        });
        node.style.setProperty('--alpha', 1);

        node.style.setProperty("--diameter", 1.2 * prev_width + 'px');

        globals.arrows.forEach(element => {
            if(!(element.parent === node)) element.style.setProperty('--alpha', 0.3); 
        });
    });

    //turn all nodes back to normal when no longer hovering
    node.addEventListener('mouseleave', function(event){
        globals.nodes.forEach(element => {
            element.style.setProperty('--alpha', 1); 
            element.style.setProperty("--diameter", prev_width + 'px');

        });

        globals.arrows.forEach(element => {
            element.style.setProperty('--alpha', 1); 
        });
    });
}



export function add_onClick_function(node){
    node.addEventListener('click', function(event){
        event.stopPropagation();
        if (globals.link_mode_on){ // A connection was selected            
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

            if (origin_node.connections.includes(node)){ // If we clicked a node that was already connected, delete that connection 
                globals.arrows.forEach(arrow => { //TODO use find instead of this
                    if (arrow.parent == origin_node && arrow.child == node) arrow.remove();
                });                

                let index = origin_node.connections.indexOf(node); //TODO maybe pop works as well and more readable?
                origin_node.connections.splice(index, 1); // Remove the connection from the connections list of the origin node

                update_colors(node, node.state, node.state);
                update_colors(origin_node, origin_node.state, origin_node.state);

                return;
            }
        }
        if (!globals.box_opened && !globals.link_mode_on){ //to prevent opening multiple boxes at the same time
            open_options(node);
        }
    });
}

export function create_arrow(parent, child){
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


    // These objects will be accessed frequently, so its better to 
    // save them in an array instead of using querySelector multiple times, 
    // which needs to access the DOM and becomes slower
    globals.arrows.push(arrow) 
}

export function update_arrows(dx=0, dy=0){
    globals.arrows.forEach(element => {
        update_arrow_render(element, dx, dy);
    });
}

export function update_arrow_render(arrow, off_x=0, off_y=0){
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



export function update_colors(node, old_state, new_state){
//Called when loading nodes, when changing the state of a node and when updating a connection
    const state_changed = old_state != new_state;
    let is_pointed_to = false;
    node.state = new_state;

    if (node.connections.length == 0){ //if the task depends on nothing
        if (new_state != "Completed") node.classList.replace("undoable", "doable");
    }

    globals.arrows.forEach(arrow => {
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

export function find_parents(node){
    const p = [];
    globals.arrows.forEach(arrow => {
        if(arrow.child === node){
            p.push(arrow.parent);    
        }
    });
    return p;
}

export function node_tree_search(node, visited_nodes = new Set()){
    //check the tree of dependencies of the node
    // mask/remove mask and turn the arrows pointing to them the correct color
    //apply_mask = true -> make it green
    //apply_mask = false -> remove the green

    visited_nodes.add(node);

    // if a node's parents are completed, mask the node, and remove the mask otherwise
    const apply_mask = find_parents(node).filter(n => n.state==="Completed").length != 0;


    if (apply_mask) node.classList.add("complete-mask");
    else node.classList.remove("complete-mask");

    globals.arrows.forEach(arrow => {
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







// Variable to store the entered text
let enteredText = "";
export function add_menu_functions(add_node_button, delete_button, save_button, load_button, info_button){

    let timeout;

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
        
        container.appendChild(inputBox);
        inputBox.focus();

        // Event listener for "Enter" key
        inputBox.addEventListener("keydown", (event) => {
            if (event.key === "Enter" && inputBox.value.trim() != '') {
                
                enteredText = inputBox.value.trim(); // Store input value
                inputBox.remove(); // Remove input box after entering text

                if (!is_name_available(enteredText)){
                    public_print("Task already in the project"); 
                    const repeated_node = globals.nodes.find(n => n.name === enteredText);
                    
                    const dx = canvas.width/2 - repeated_node.x;
                    const dy = canvas.height/2 - repeated_node.y;

                    move_all(dx, dy);

                    //increase the node to highlight it and then reduce it to original size
                    const prev_diam = parseInt(window.getComputedStyle(repeated_node).getPropertyValue("--diameter").slice(0,-2), 10);     
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
        save_file_menu("save")
    });

    load_button.addEventListener("click", () => {
        save_file_menu("load")
    });

    info_button.addEventListener("click", () => {
        document.querySelector(".help").style.display = "block";
    });
}




async function save_file_menu(type){

    // Get the save files already used
    const save_files = await fetch_save_files()
    if (!save_files) return; // This means the function didn't output a array, so a user isnt logged in 

    if (type == "save") public_print("Choose where to save the current project")
    else public_print("Choose a file to load from")

    // Prevent creating duplicates of the menu
    const is_opened = document.querySelector(".save-files-menu")
    if (is_opened) is_opened.remove() // Refresh the menu, because maybe we changed from load to save menu


    // Create the menu where the save files will be displayed
    const menu = create_new_element("div", container, null, ["save-files-menu"])


    save_files.forEach(s => {
        const num = s[0]
        const name = s[1]
        
        const sf = create_new_element("button", menu, null, ["save-file"])

        const sfnum = create_new_element("div", sf, null, ["save-number"])
        const sfname = create_new_element("div", sf, null, ["file-name"])
        sfnum.textContent = num
        sfname.textContent = name

        const editsf = create_new_element("button", sf, null, ["edit-save-file"])
        editsf.style.maskImage = "url(pencil.svg)";

        let isEditing = false;
        editsf.addEventListener("click", async (e) => {
            e.stopPropagation(); // Prevent parent click
            if (!isEditing) {
                // First click: turn sfnum into editable input
                isEditing = true;
                editsf.style.maskImage = "url(trash.svg)";
                const input = document.createElement("input");
                input.type = "text";
                input.value = sfname.textContent;
                input.className = "file-name";
                sf.replaceChild(input, sfname);
                input.focus();

                input.addEventListener("keydown", (event) => {
                    //If enter is pressed, confirm change in name
                    if (event.key === "Enter" && input.value.trim() !== "") {
                        const new_name = input.value.trim()
                        sfname.textContent = new_name;
                        isEditing = false;
                        editsf.style.maskImage = "url(pencil.svg)";
                        
                        modify_save_file(num, new_name)
                        globals.current_save_file = new_name
                        public_print(new_name)

                        sf.replaceChild(sfname, input);

                    }
                    // Esc means the operation is canceled
                    if (event.key === "Escape") {
                        isEditing = false;
                        editsf.style.maskImage = "url(pencil.svg)";
                        input.remove()
                    }
                });
            } 
            
            else {
            // Second click on the edit save_file button: delete the save file
                await modify_save_file(num, "") // Calling this function with an empty string deletes the save file

                // Refresh the menu
                menu.remove();
                save_file_menu(type); 
            }
        })


        sf.addEventListener("click", function(event){
            menu.remove()

            const conf_box = create_new_element("div", container, null, ["confirmation-box"])
            
            const conf_text = create_new_element("p", conf_box, null, ["confirmation-text"])
            conf_text.textContent = (type == "save") ? "Do you want to overwritte\n\"" + name + "\"" : "Are you sure? The current net will not be saved automatically"
            
            const opt_holder = create_new_element("div", conf_box, null, ["confirmation-text"])
            const option_yes = create_new_element("div", opt_holder, null, ["option"])
            option_yes.textContent = "Yes"
            const option_no = create_new_element("div", opt_holder, null, ["option"])
            option_no.textContent = "No"

            option_yes.addEventListener("click", function(event){
                conf_box.remove()
                if (type === "save"){ // meaning this a save menu
                    saveNodeData(num, name)
                } 
                else{ // this is a loading menu
                    globals.current_save_file = name
                    load(num)
                    centro =  [canvas.width/2, canvas.height/2]; // Reset center of mass, so the nodes dont fly off 
                }
            }); 
            option_no.addEventListener("click", function(event){
                conf_box.remove()
            })
        });
    });

    if (type == "save") {
        // Add the option of a new save file
        const sf = create_new_element("button", menu, null, ["save-file"])
        const sfnum = create_new_element("div", sf, null, ["save-number"])
        const sfname = create_new_element("div", sf, null, ["file-name"])

        sfnum.textContent = save_files.length + 1
        sfname.textContent = "New Save File"

        sf.addEventListener("click", ()=>{

            menu.remove()

            // create a duplicate so that when we click the save file and trigger the document.onClick(), 
            // we only delete this duplicate and maintain the second, important one
            create_new_element("input", container, null, ["input-box"]); 

            const input_box = create_new_element("input", container, null, ["input-box"]);
            input_box.type = "text";
            input_box.placeholder = "Enter task name...";
            input_box.focus();


            input_box.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && input_box.value.trim() != '') {
                    saveNodeData(save_files.length + 1, input_box.value.trim())
                    input_box.remove()
                }
                if (event.key == 'Escape'){
                    input_box.remove();
                }
            });
        });
    }

    // If there are no saved files and we try to load one
    if (type == "load" && save_files.length == 0) {
        const sf = create_new_element("button", menu, null, ["save-file", "no-hover"])
        const sfname = create_new_element("div", sf, null, ["file-name"])
        sfname.textContent = "No save files yet"
    }
}




export function open_options(n){
/**********************************************************************************************************************************
    Recebe:
            n -> nodo que foi clicado
    Retorna:
            Abre a caixa de opções para o nodo
            Enquanto a caixa está aberta, física e arrastar ecrã estão desabilitados
            A caixa permite:
                entrar no modo link, que permite fazer conexões
                mudar o estado do nodo
***********************************************************************************************************************************/
    if (globals.simulating) toggle_physics(); // stop physics simulation 
    globals.box_opened = true;
    const [x, y] = [n.x, n.y];


    ///////// Criar a caixa onde vão estar os botões /////////
    const box = create_new_element("div", container, "box", ["box", n.state]);
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;


    ///////// Estrutura acima da caixa principal para os botões de eliminar e editar nodo /////////
    const sub_box = create_new_element("div", container, "sub-box", ["sub-box", n.state]);
    sub_box.style.left = `${x}px`;
    sub_box.style.top = `${y}px`;


    // Watch if the box was removed. If so, remove the sub-box as well
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.removedNodes) {
                if (node === box) {
                    sub_box.remove();
        }}}});
    observer.observe(container, {childList: true});             

    
    // botões acima da caixa de opções
    const delete_node_button = create_new_element("button", sub_box, null, ["button"])
    const dnb_icon = create_new_element("div", delete_node_button, null, ["icon"])
    dnb_icon.style.maskImage = "url(cross.svg)"

    delete_node_button.addEventListener("click", (event)=> {
        // Apagar conexões que terminam no nodo ou começam no nodo
        globals.arrows.forEach(arrow => {
            if (arrow.child === n || arrow.parent === n) arrow.remove()
        })

        // Atualizar lista de conexões e estado doable/not doable dos parents
        parents = find_parents(n)
        parents.forEach(p => {
            idx = p.connections.indexOf(n)
            p.connections.splice(idx,1) // remove 1 elemento no indice onde está o nodo (remove o nodo da lista de conecções)

            // how many uncompleted dependencies the node now has. If it has none, it's now completable 
            if ((p.connections.filter(n => n.state === "Uncompleted" || n.state === "Default")).length == 0){ 
                if (arrow.parent.state != "Completed") arrow.parent.classList.replace("undoable", "doable");
            }
        })
        n.remove()
    });
    

    const edit_node_button = create_new_element("button", sub_box, null, ["button"])
    const enb_icon = create_new_element("div", edit_node_button, null, ["icon"])
    enb_icon.style.maskImage = "url(pencil.svg)"
    edit_node_button.addEventListener("click", (event)=>{
        const textElement = n.querySelector(".text")
        const previous_name = textElement.textContent // save this in case we cancel the operation
        
        const input = document.createElement("input");
        input.type = "text";
        input.value = textElement.textContent;
        textElement.textContent = ""; // Clear existing text so it doesnt overlap while writing the new one

        input.className = "text"

        textElement.appendChild(input);
        input.focus();

        // If we press enter or click out of the text, confirm changes and delete the input box
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                if (input.value != ""){
                    textElement.textContent = input.value;
                    n.name = input.value
                    input.remove()
                }
                else public_print("Please enter a name for the node")
            }
            // If we press esc, cancel and go back to the previous name
            if (event.key === "Escape"){
                textElement.textContent = previous_name
                input.remove()
            }
        });
        input.addEventListener("blur", function () {
            if (input.value != ""){
                textElement.textContent = input.value;
                n.name = input.value
                input.remove()
            }
        });
    })


    ////////////////// Botão para mudar estado ///////////////////

    // Estrutura contendo o botão e o texto descritivo
    const first_line = create_new_element("div", box, null, ["button-text-wrapper"]);

    // Texto
    const text = create_new_element("div", first_line, null, ["state-text"]);
    text.textContent = (n.state === "Default") ? "Undefined" : n.state;

    // Botão de mudança de estado
    const toggle_state = create_new_element("button", first_line, null, ["rounded-square-btn", n.state]);
    const inner_circle = create_new_element("div", toggle_state, null, ["small-circle"]);

    // Funcionalidade de mudar de estado
    toggle_state.addEventListener("click", (event)=>{
        toggle_state.classList.toggle("active");

        const new_state = (n.state === "Default" || 
                           n.state === "Uncompleted") ? 
                           "Completed" : "Uncompleted";

        box.classList.replace(n.state, new_state);
        sub_box.classList.replace(n.state, new_state);        
        toggle_state.classList.replace(n.state, new_state);
        n.classList.replace(n.state, new_state);
        text.textContent = new_state;

        update_colors(n, n.state, new_state);
    }); 



    ////////////////// Botão para ativar modo de ligações ///////////////////
    const second_line = create_new_element("div", box); 

    const make_connections = create_new_element("button", second_line, "b1", ["link-button"]);  
    make_connections.textContent = "Make Connections";
    make_connections.addEventListener("click", (event)=>{
        // Inicia o modo de selecionar ligações
        globals.link_mode_on = true
        
        origin_node = n;
        draw_bkg();

        box.remove();
        globals.box_opened = false;

        // make it visually obvious that we are in connection mode
        canvas.classList.replace("canvas-default", "canvas-alt"); 
        public_print("Select pre-requisites for this task");
    });
}









export function close_link_mode(){
    canvas.classList.replace("canvas-alt", "canvas-default");
    document.getElementById("Canvas_Text").innerText = "";

    globals.link_mode_on = false

    draw_bkg();
    if (globals.simulating) toggle_physics(); //resume physics simulation
}



export function move_all(dx, dy){
// This function is used to focus the screen on a specific point
// Currently used only to focus on a node when we try to create one with the same name 

    globals.nodes.forEach((node) => {
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





export function creates_loop(n_goal, n2, visited_nodes = new Set()) {
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





// Dinamically change the font size so that it allways fits the container
export function fitTextToDiv(els) {
    els.forEach(el =>{
        let parentHeight = el.clientHeight;
        let fontSize = parentHeight; // start at the height of the parent container
        el.style.fontSize = fontSize + "px";

        while (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            fontSize--;
            el.style.fontSize = fontSize + "px";
            if (fontSize < 5) break; // prevent infinite loop
        }
    })
}
const myDiv = document.querySelectorAll(".file-name");
fitTextToDiv(myDiv);
window.addEventListener("resize", () => fitTextToDiv(myDiv));



export function add_node(x=null, y=null, name=null, state="Default"){
/**********************************************************************************************************************************
    Recebe: 
            (x,y) -> coordenadas do novo nodo no canvas (caso sejam fornecidas; caso contrário, são aleatórias)
    Retorna:
            Adiciona um nodo à lista "nodes", com as propriedades:
                - Lista "connections" (inicialmente vazia)
                - Posição (aleatória ou especificada)
                - Raio fixo e opacidade
                - Nome a partir do texto da caixa de entrada acima do canvas
                - Cor que começa como roxa e vai mudar dependendo do estado do nodo
***********************************************************************************************************************************/

    //check if name already exists, if so place a plus in front
    while (!is_name_available(name)){
        name += '+';
    }


    const node = document.createElement("div");
    node.classList.add("node", state, "doable");
    node.style.left = (x!=null) ? x + "px" : Math.random()*canvas.width + "px";
    node.style.top = (y!=null) ? y + "px" : Math.random()*canvas.height + "px";    
   
    node.connections = [];

    node.name = name;
    node.movimento = [0,0];
    node.state = state;
    node.x = parseInt(node.style.left, 10);
    node.y = parseInt(node.style.top, 10);

    container.appendChild(node);
    globals.nodes.push(node); 

    add_highlight_function(node);
    add_onClick_function(node);

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = name;
    node.appendChild(text);

    if (!globals.simulating) toggle_physics();

    return node
}



let intervalId; // Necessário para criar um ciclo interrompível
export function toggle_physics(){
/**********************************************************************************************************************************
    Recebe: ---
    Retorna:
            Começa a animação/simulação fisica dos nodos:
                nodos nao relacionados afastam-se
                nodos relacionados tentam manter uma distância fixa
                nestrutura tenta manter-se no centro do canvas
***********************************************************************************************************************************/


    if (globals.simulating){ //If we were simulating, stop the simulation
        globals.simulating = false
        clearInterval(intervalId);
    }
    else{ // Otherwise start it
        globals.simulating = true
        intervalId = setInterval(() => { //setInterval calls physics() at regular intervals
            physics();
          }, 10); // Time between function calls in ms
    }

    function physics(){
        const deltaT = 0.01;
        const x0 = 50;
        const junction_strength = 0.2;
        const repel_strength = 200000;
        const center_force = 30;


        for (let i = 0; i<globals.nodes.length; i++){ // calcular a resultante das forças no nodo e guardar em movivento
            const n0 = globals.nodes[i];
            n0.movimento = [0,0];

            for (let j = 0; j<globals.nodes.length; j++){
                if (j!=i){
                    const n1 = globals.nodes[j];

                    let dist = Math.sqrt((n0.x - n1.x)**2 + (n0.y - n1.y)**2); 

                    if(dist < 20){ //limitar a força de repulsão para evitar que os nodos expludam
                        dist = 20;  
                    } 
                    
                    let vetor_diff = [(n1.x - n0.x)/dist, (n1.y - n0.y)/dist] //vetor de n0 para n1, normalizado
                    
                    
                    if (n0.connections.includes(n1)){ //if the 2 nodes are related            
                    // act like a spring that tends to a relaxation length x0
                        const displacement = dist - x0; // quando é: negativo -> afastam-se | positivo -> atraem-se 
                        n0.movimento[0] += vetor_diff[0]*displacement*junction_strength;
                        n0.movimento[1] += vetor_diff[1]*displacement*junction_strength;

                        n1.movimento[0] -= vetor_diff[0]*displacement*junction_strength;
                        n1.movimento[1] -= vetor_diff[1]*displacement*junction_strength;
                    }
                    else{ 
                    // unrelated nodes repel with a force proportional to their distance
                        n0.movimento[0] -= vetor_diff[0]*repel_strength/ ((dist**2));
                        n0.movimento[1] -= vetor_diff[1]*repel_strength/ ((dist**2));
                    }
                }

                //all nodes should be atracted to the center of the screen
                const norm = Math.sqrt(n0.x**2 + n0.y**2);
                const vetor_centro = [(centro[0] - n0.x)/norm, (centro[1] - n0.y)/norm];
                n0.movimento[0] += vetor_centro[0]*center_force;
                n0.movimento[1] += vetor_centro[1]*center_force;
      
            }
        }
        
        // atualizar a posição de cada nodo de acordo com a sua resultante das forças (movimento)
        globals.nodes.forEach((node) => {
            node.x += node.movimento[0]*deltaT;
            node.y += node.movimento[1]*deltaT;

            if (globals.isMouseDown){
                node.initialTranslate.x += node.movimento[0]*deltaT;
                node.initialTranslate.y += node.movimento[1]*deltaT;
            }
            const position_matrix = getTranslateValues(node);
            node.style.transform = `translate(${position_matrix.x + node.movimento[0]*deltaT}px, ${position_matrix.y + node.movimento[1]*deltaT}px)`;

        });

        // Update arrow positions, but account for the fact that the screen might be moved mid simulation (dx,dy != 0)
        const dx = globals.end_coords[0] - globals.start_coords[0];
        const dy = globals.end_coords[1] - globals.start_coords[1];
        update_arrows(dx,dy);
    }
}




    
let bkg_x_off = 0 // Location of the background
let bkg_y_off = 0
export function draw_bkg(x_ofset = 0, y_ofset = 0){    
/**********************************************************************************************************************************
    Recebe:
            x_ofset, y_ofset -> Deslocamentos no plano para redesenhar o grid
    Retorna:
            Desenha o grid de fundo no canvas
***********************************************************************************************************************************/
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    function drawCross(x, y){
        const cross_size = 3;
        const color = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.moveTo(x-cross_size, y);
        ctx.lineTo(x+cross_size, y);
        ctx.moveTo(x, y-cross_size);
        ctx.lineTo(x, y+cross_size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    if (!globals.link_mode_on){
        const step = 20;
        let x_off = x_ofset + bkg_x_off;
        let y_off = y_ofset + bkg_y_off;
        while (x_off > step/2) x_off -= step;
        while (x_off < -step/2) x_off += step;
        while (y_off > step/2) y_off -= step;
        while (y_off < -step/2) y_off += step;
        for (let i = x_off; i <= canvas.width + x_off; i+=step){
            for (let j = y_off; j <= canvas.height + y_off; j+=step){
                drawCross(i, j);
            } 
        }
    }
}




export function update_nodes(){
    const dx = globals.end_coords[0] - globals.start_coords[0];
    const dy = globals.end_coords[1] - globals.start_coords[1]; 

    bkg_x_off += dx;
    bkg_y_off += dy;

    centro[0] += dx;
    centro[1] += dy;

    draw_bkg();
    globals.dragged = false;

    globals.nodes.forEach((node) => {
        node.x += dx;
        node.y += dy;
        node.style.left = node.x + "px";
        node.style.top = node.y + "px";
        node.style.transform = 'translate(-50%, -50%)';
    });
}
















////////////////////////////////// Small functions ////////////////////////////////////

export function print_nodes(){
    for(let i =0; i<globals.nodes.length;i++){
        console.log(globals.nodes[i].classList);
    }
}


export function print(...args) {
    args.forEach(arg => {
        console.log(arg); // Loop through each argument
    });
}




export function getTranslateValues(element) {
    const style = window.getComputedStyle(element);
    const matrix = new WebKitCSSMatrix(style.transform);
    return { x: matrix.m41, y: matrix.m42 }; // m41 = translateX, m42 = translateY
}


export function delete_all(){
    globals.nodes.forEach(element => element.remove());
    globals.arrows.forEach(element => element.remove());
    globals.nodes.length = 0;
}


export function is_name_available(name){
    const bool = globals.nodes.find(n => n.name === name)
    return (bool) ? false : true;
} 


export function public_print(text){
    document.getElementById("Canvas_Text").innerText = text;
}


export function create_new_element(type, where_to_add = container, id = null, classes = []){
    const element = document.createElement(type);
    if (id) element.id = id;

    classes.forEach(c => element.classList.add(c));

    where_to_add.appendChild(element);
    return element;
}


